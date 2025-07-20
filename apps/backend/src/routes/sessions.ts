import { Router } from 'express';
import { SessionManagerService } from '../services/SessionManagerService';
import { SecurityAuditService } from '../services/SecurityAuditService';
import { authenticateSession, logoutSession, logoutAllOtherSessions } from '../middleware/sessionAuth';
import type { SessionAuthenticatedRequest } from '../middleware/sessionAuth';
import { ApiResponse } from '@parkml/shared';

const router = Router();

/**
 * Get all active sessions for the current user
 */
router.get('/', authenticateSession, async (req: SessionAuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const sessions = await SessionManagerService.getUserSessions(
      req.user.userId,
      req.user.sessionToken
    );

    const response: ApiResponse = {
      success: true,
      data: { sessions },
    };

    res.json(response);
  } catch (error) {
    console.error('Get sessions error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve sessions',
    };
    res.status(500).json(response);
  }
});

/**
 * Get session statistics (for admin users)
 */
router.get('/statistics', authenticateSession, async (req: SessionAuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    // Check if user has admin privileges
    if (!['super_admin', 'clinic_admin'].includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions',
      };
      return res.status(403).json(response);
    }

    const statistics = await SessionManagerService.getSessionStatistics();

    // Log admin access to session statistics
    await SecurityAuditService.logSecurityEvent({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'admin_session_statistics_access',
      resourceType: 'session',
      status: 'success',
      riskLevel: 'low',
      details: {
        totalActiveSessions: statistics.totalActiveSessions,
        sessionsLast24h: statistics.sessionsLast24h,
        timestamp: new Date().toISOString()
      },
      sessionId: req.user.sessionId
    }, req);

    const response: ApiResponse = {
      success: true,
      data: { statistics },
    };

    res.json(response);
  } catch (error) {
    console.error('Get session statistics error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve session statistics',
    };
    res.status(500).json(response);
  }
});

/**
 * Terminate a specific session
 */
router.delete('/:sessionId', authenticateSession, async (req: SessionAuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { sessionId } = req.params;

    // Get session token for the session to be terminated
    // Note: In a real implementation, you'd need to add a method to get session token by ID
    // For now, we'll use a placeholder approach
    if (sessionId === req.user.sessionId) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot terminate current session. Use logout instead.',
      };
      return res.status(400).json(response);
    }

    // For security, users can only terminate their own sessions
    const userSessions = await SessionManagerService.getUserSessions(req.user.userId);
    const targetSession = userSessions.find(s => s.id === sessionId);

    if (!targetSession) {
      const response: ApiResponse = {
        success: false,
        error: 'Session not found or not owned by user',
      };
      return res.status(404).json(response);
    }

    // Terminate the session
    const terminated = await SessionManagerService.terminateSessionById(sessionId, 'user_requested', req);

    if (!terminated) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to terminate session or session already inactive',
      };
      return res.status(400).json(response);
    }

    await SecurityAuditService.logSecurityEvent({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'session_terminated',
      resourceType: 'session',
      resourceId: sessionId,
      status: 'success',
      riskLevel: 'low',
      details: {
        terminatedSessionId: sessionId,
        terminationReason: 'user_requested',
        timestamp: new Date().toISOString()
      },
      sessionId: req.user.sessionId
    }, req);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Session terminated successfully' },
    };

    res.json(response);
  } catch (error) {
    console.error('Terminate session error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to terminate session',
    };
    res.status(500).json(response);
  }
});

/**
 * Logout from current session
 */
router.post('/logout', authenticateSession, logoutSession, async (_req: SessionAuthenticatedRequest, res) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
    };

    res.json(response);
  } catch (error) {
    console.error('Logout error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Logout failed',
    };
    res.status(500).json(response);
  }
});

/**
 * Logout from all other sessions (keep current)
 */
router.post('/logout-all-others', authenticateSession, logoutAllOtherSessions);

/**
 * Logout from all sessions (including current)
 */
router.post('/logout-all', authenticateSession, async (req: SessionAuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const terminatedCount = await SessionManagerService.terminateAllUserSessions(
      req.user.userId,
      req
    );

    await SecurityAuditService.logSecurityEvent({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'logout_all_sessions',
      resourceType: 'session',
      status: 'success',
      riskLevel: 'medium',
      details: {
        terminatedSessionsCount: terminatedCount,
        includeCurrentSession: true,
        timestamp: new Date().toISOString()
      },
      sessionId: req.user.sessionId
    }, req);

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Successfully logged out from all ${terminatedCount} sessions`,
        terminatedSessions: terminatedCount
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Logout all sessions error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to logout from all sessions',
    };
    res.status(500).json(response);
  }
});

/**
 * Get security audit logs for the current user
 */
router.get('/audit-logs', authenticateSession, async (req: SessionAuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { page = 1, action } = req.query;
    // const limit = 20; // Available for pagination implementation

    const securityStats = await SecurityAuditService.getUserSecurityStats(req.user.userId);

    // Log access to security audit logs
    await SecurityAuditService.logSecurityEvent({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'security_audit_access',
      resourceType: 'audit_log',
      status: 'success',
      riskLevel: 'low',
      details: {
        pageAccessed: page,
        filterAction: action,
        timestamp: new Date().toISOString()
      },
      sessionId: req.user.sessionId
    }, req);

    const response: ApiResponse = {
      success: true,
      data: { 
        securityStats,
        // Note: You'd implement pagination and filtering in SecurityAuditService
        auditLogs: [] // Placeholder - would need to implement getUserAuditLogs
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Get audit logs error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve audit logs',
    };
    res.status(500).json(response);
  }
});

/**
 * Cleanup expired sessions (admin endpoint)
 */
router.post('/cleanup', authenticateSession, async (req: SessionAuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    // Check if user has admin privileges
    if (!['super_admin', 'clinic_admin'].includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions',
      };
      return res.status(403).json(response);
    }

    const cleanedCount = await SessionManagerService.cleanupExpiredSessions();

    await SecurityAuditService.logSecurityEvent({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'session_cleanup_executed',
      resourceType: 'session',
      status: 'success',
      riskLevel: 'low',
      details: {
        cleanedSessionsCount: cleanedCount,
        executedBy: req.user.userId,
        timestamp: new Date().toISOString()
      },
      sessionId: req.user.sessionId
    }, req);

    const response: ApiResponse = {
      success: true,
      data: { 
        message: `Cleaned up ${cleanedCount} expired sessions`,
        cleanedSessions: cleanedCount 
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Session cleanup error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to cleanup expired sessions',
    };
    res.status(500).json(response);
  }
});

export default router;