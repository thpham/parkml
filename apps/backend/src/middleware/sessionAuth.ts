import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SessionManagerService } from '../services/SessionManagerService';
import { SecurityAuditService } from '../services/SecurityAuditService';
import { JwtPayload } from '@parkml/shared';
import { ApiResponse } from '@parkml/shared';

export interface SessionAuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    organizationId?: string;
    isActive: boolean;
    sessionId: string;
    sessionToken: string;
  };
  session?: {
    id: string;
    isValid: boolean;
    shouldRefresh: boolean;
  };
}

/**
 * Enhanced authentication middleware that validates both JWT tokens and sessions
 * This provides comprehensive session management with security audit trails
 */
export const authenticateSession = async (
  req: SessionAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        error: 'No authorization token provided',
      };
      res.status(401).json(response);
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as JwtPayload;
    } catch (error) {
      // Skip security audit logging for invalid tokens since we don't have a valid userId
      console.log('Invalid token access attempt:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      const response: ApiResponse = {
        success: false,
        error: 'Invalid token',
      };
      res.status(401).json(response);
      return;
    }

    // Extract session information from token
    const { userId, email, role, organizationId, isActive, sessionId, sessionToken } = decoded;

    if (!sessionId || !sessionToken) {
      // Fallback for older tokens without session information
      req.user = { userId, email, role, organizationId, isActive, sessionId: '', sessionToken: '' };
      next();
      return;
    }

    // Validate session
    const sessionValidation = await SessionManagerService.validateSession(sessionToken, req);

    if (!sessionValidation.isValid) {
      await SecurityAuditService.logSecurityEvent(
        {
          userId,
          action: 'invalid_session_access',
          status: 'failed',
          riskLevel: 'high',
          details: {
            sessionId,
            reason: 'session_validation_failed',
            userAgent: req.get('User-Agent'),
          },
        },
        req
      );

      const response: ApiResponse = {
        success: false,
        error: 'Session expired or invalid',
      };
      res.status(401).json(response);
      return;
    }

    // Check if user IDs match between token and session
    if (sessionValidation.userId !== userId) {
      await SecurityAuditService.logSecurityEvent(
        {
          userId,
          action: 'session_user_mismatch',
          status: 'suspicious',
          riskLevel: 'critical',
          details: {
            tokenUserId: userId,
            sessionUserId: sessionValidation.userId,
            sessionId,
            userAgent: req.get('User-Agent'),
          },
        },
        req
      );

      const response: ApiResponse = {
        success: false,
        error: 'Authentication error',
      };
      res.status(401).json(response);
      return;
    }

    // Set user and session information
    req.user = {
      userId,
      email,
      role,
      organizationId: sessionValidation.organizationId,
      isActive,
      sessionId,
      sessionToken,
    };

    req.session = {
      id: sessionId,
      isValid: true,
      shouldRefresh: sessionValidation.shouldRefresh || false,
    };

    // Log successful authentication with session validation
    if (sessionValidation.shouldRefresh) {
      await SecurityAuditService.logSecurityEvent(
        {
          userId,
          organizationId: sessionValidation.organizationId,
          action: 'session_access',
          resourceType: 'session',
          resourceId: sessionId,
          status: 'success',
          riskLevel: 'low',
          details: {
            sessionRefreshed: true,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
          },
          sessionId,
        },
        req
      );
    }

    next();
  } catch (error) {
    console.error('Session authentication error:', error);

    // Skip security audit logging for authentication errors since we don't have a valid userId
    console.log('Authentication error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    const response: ApiResponse = {
      success: false,
      error: 'Authentication failed',
    };
    res.status(500).json(response);
  }
};

/**
 * Logout middleware that properly terminates sessions
 */
export const logoutSession = async (
  req: SessionAuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.sessionToken) {
      await SessionManagerService.terminateSession(req.user.sessionToken, 'user_logout', req);

      await SecurityAuditService.logSecurityEvent(
        {
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          action: 'logout',
          resourceType: 'session',
          resourceId: req.user.sessionId,
          status: 'success',
          riskLevel: 'low',
          details: {
            logoutReason: 'user_initiated',
            timestamp: new Date().toISOString(),
          },
          sessionId: req.user.sessionId,
        },
        req
      );
    }

    next();
  } catch (error) {
    console.error('Logout session error:', error);
    next(); // Continue with logout even if session termination fails
  }
};

/**
 * Middleware to log out all user sessions except current one
 */
export const logoutAllOtherSessions = async (
  req: SessionAuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const terminatedCount = await SessionManagerService.terminateAllUserSessions(
      req.user.userId,
      req,
      req.user.sessionToken // Keep current session
    );

    await SecurityAuditService.logSecurityEvent(
      {
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'logout_all_sessions',
        resourceType: 'session',
        status: 'success',
        riskLevel: 'medium',
        details: {
          terminatedSessionsCount: terminatedCount,
          keepCurrentSession: true,
          timestamp: new Date().toISOString(),
        },
        sessionId: req.user.sessionId,
      },
      req
    );

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Successfully logged out ${terminatedCount} other sessions`,
        terminatedSessions: terminatedCount,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Logout all sessions error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to logout other sessions',
    };
    res.status(500).json(response);
  }
};
