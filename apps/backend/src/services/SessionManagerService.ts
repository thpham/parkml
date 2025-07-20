import { prisma } from '../database/prisma-client';
import { Request } from 'express';
// JWT is imported but only needed if we want to verify tokens in session service
// import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Type definitions
type SessionWhereClause = {
  userId: string;
  isActive: boolean;
  sessionToken?: {
    not: string;
  };
};

export interface SessionData {
  userId: string;
  organizationId?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  loginMethod?: 'password' | '2fa_totp' | 'backup_code' | 'passkey';
  twoFactorVerified?: boolean;
}

export interface SessionInfo {
  id: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  loginMethod?: string;
}

export class SessionManagerService {
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
  private static readonly MAX_SESSIONS_PER_USER = 10;

  /**
   * Create a new user session with comprehensive tracking
   */
  static async createSession(
    sessionData: SessionData,
    request: Request,
    rememberMe = false
  ): Promise<{ sessionToken: string; sessionId: string }> {
    const sessionToken = this.generateSecureToken();
    const sessionId = crypto.randomUUID();

    const expiresAt = new Date(
      Date.now() + (rememberMe ? this.REMEMBER_ME_DURATION : this.SESSION_DURATION)
    );

    // Extract device information
    const deviceFingerprint =
      sessionData.deviceFingerprint || this.generateDeviceFingerprint(request);
    const ipAddress = sessionData.ipAddress || this.extractIpAddress(request);
    const userAgent = sessionData.userAgent || request.get('User-Agent') || null;
    const location = sessionData.location || (await this.approximateLocation(ipAddress));

    // Clean up old sessions if user has too many
    await this.cleanupOldSessions(sessionData.userId);

    // Create the session
    const session = await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: sessionData.userId,
        sessionToken,
        deviceFingerprint,
        ipAddress,
        userAgent,
        location,
        isActive: true,
        expiresAt,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      },
    });

    // Log session creation
    await this.logSessionEvent(
      sessionData.userId,
      'session_created',
      sessionId,
      {
        deviceFingerprint,
        ipAddress,
        userAgent,
        location,
        loginMethod: sessionData.loginMethod,
        rememberMe,
        expiresAt: expiresAt.toISOString(),
      },
      request
    );

    return {
      sessionToken,
      sessionId: session.id,
    };
  }

  /**
   * Validate and refresh a session
   */
  static async validateSession(
    sessionToken: string,
    request: Request
  ): Promise<{
    isValid: boolean;
    userId?: string;
    sessionId?: string;
    organizationId?: string;
    shouldRefresh?: boolean;
  }> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionToken },
        include: {
          user: {
            select: {
              id: true,
              organizationId: true,
              isActive: true,
            },
          },
        },
      });

      if (!session || !session.isActive || !session.user.isActive) {
        return { isValid: false };
      }

      // Check if session has expired
      if (session.expiresAt < new Date()) {
        await this.terminateSession(sessionToken, 'expired', request);
        return { isValid: false };
      }

      // Check for suspicious activity (IP change, etc.)
      const currentIp = this.extractIpAddress(request);
      const currentUserAgent = request.get('User-Agent') || null;

      if (session.ipAddress !== currentIp || session.userAgent !== currentUserAgent) {
        await this.logSessionEvent(
          session.userId,
          'session_anomaly_detected',
          session.id,
          {
            originalIp: session.ipAddress,
            currentIp,
            originalUserAgent: session.userAgent,
            currentUserAgent,
            riskLevel: 'medium',
          },
          request
        );
      }

      // Update last accessed time
      const shouldRefresh = Date.now() - session.lastAccessedAt.getTime() > 5 * 60 * 1000; // 5 minutes

      if (shouldRefresh) {
        await prisma.userSession.update({
          where: { id: session.id },
          data: { lastAccessedAt: new Date() },
        });
      }

      return {
        isValid: true,
        userId: session.userId,
        sessionId: session.id,
        organizationId: session.user.organizationId || undefined,
        shouldRefresh,
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return { isValid: false };
    }
  }

  /**
   * Terminate a specific session
   */
  static async terminateSession(
    sessionToken: string,
    reason: string,
    request: Request
  ): Promise<void> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionToken },
      });

      if (session) {
        await prisma.userSession.update({
          where: { sessionToken },
          data: { isActive: false },
        });

        await this.logSessionEvent(
          session.userId,
          'session_terminated',
          session.id,
          { reason, terminatedAt: new Date().toISOString() },
          request
        );
      }
    } catch (error) {
      console.error('Session termination error:', error);
    }
  }

  /**
   * Terminate a specific session by ID
   */
  static async terminateSessionById(
    sessionId: string,
    reason: string,
    request: Request
  ): Promise<boolean> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || !session.isActive) {
        return false;
      }

      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isActive: false },
      });

      await this.logSessionEvent(
        session.userId,
        'session_terminated',
        sessionId,
        { reason, terminatedAt: new Date().toISOString() },
        request
      );

      return true;
    } catch (error) {
      console.error('Session termination by ID error:', error);
      return false;
    }
  }

  /**
   * Terminate all sessions for a user (except optionally current one)
   */
  static async terminateAllUserSessions(
    userId: string,
    request: Request,
    exceptSessionToken?: string
  ): Promise<number> {
    try {
      const whereClause: SessionWhereClause = {
        userId,
        isActive: true,
      };

      if (exceptSessionToken) {
        whereClause.sessionToken = { not: exceptSessionToken };
      }

      const sessions = await prisma.userSession.findMany({
        where: whereClause,
        select: { id: true },
      });

      const terminatedCount = await prisma.userSession.updateMany({
        where: whereClause,
        data: { isActive: false },
      });

      await this.logSessionEvent(
        userId,
        'all_sessions_terminated',
        null,
        {
          terminatedCount: terminatedCount.count,
          sessionIds: sessions.map(s => s.id),
          keepCurrentSession: !!exceptSessionToken,
        },
        request
      );

      return terminatedCount.count;
    } catch (error) {
      console.error('All sessions termination error:', error);
      return 0;
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(
    userId: string,
    currentSessionToken?: string
  ): Promise<SessionInfo[]> {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { lastAccessedAt: 'desc' },
    });

    return sessions.map(session => ({
      id: session.id,
      deviceFingerprint: session.deviceFingerprint || undefined,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      location: session.location || undefined,
      isActive: session.isActive,
      isCurrent: session.sessionToken === currentSessionToken,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      expiresAt: session.expiresAt,
    }));
  }

  /**
   * Clean up expired sessions automatically
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.userSession.updateMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { isActive: false }],
        },
        data: { isActive: false },
      });

      return result.count;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Clean up old sessions for a user (keep only the most recent ones)
   */
  private static async cleanupOldSessions(userId: string): Promise<void> {
    const activeSessions = await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { lastAccessedAt: 'desc' },
    });

    if (activeSessions.length >= this.MAX_SESSIONS_PER_USER) {
      const sessionsToDeactivate = activeSessions.slice(this.MAX_SESSIONS_PER_USER - 1);

      await prisma.userSession.updateMany({
        where: {
          id: { in: sessionsToDeactivate.map(s => s.id) },
        },
        data: { isActive: false },
      });
    }
  }

  /**
   * Generate a secure session token
   */
  private static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a device fingerprint based on request headers
   */
  private static generateDeviceFingerprint(request: Request): string {
    const userAgent = request.get('User-Agent') || '';
    const acceptLanguage = request.get('Accept-Language') || '';
    const acceptEncoding = request.get('Accept-Encoding') || '';

    const fingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}:${acceptLanguage}:${acceptEncoding}`)
      .digest('hex');

    return fingerprint.substring(0, 32);
  }

  /**
   * Extract IP address from request
   */
  private static extractIpAddress(request: Request): string {
    return (
      request.ip ||
      request.headers['x-forwarded-for']?.toString().split(',')[0] ||
      request.connection.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Approximate location based on IP address
   * In a real implementation, you'd use a GeoIP service
   */
  private static async approximateLocation(ipAddress: string): Promise<string | null> {
    // Placeholder - in production you'd use a service like MaxMind GeoIP
    if (
      ipAddress === 'unknown' ||
      ipAddress.startsWith('127.') ||
      ipAddress.startsWith('192.168.')
    ) {
      return 'Local Network';
    }
    return 'Unknown Location';
  }

  /**
   * Log session-related events
   */
  private static async logSessionEvent(
    userId: string,
    action: string,
    sessionId: string | null,
    details: Record<string, unknown>,
    request: Request
  ): Promise<void> {
    try {
      await prisma.securityAuditLog.create({
        data: {
          userId,
          action,
          resourceType: 'session',
          resourceId: sessionId,
          ipAddress: this.extractIpAddress(request),
          userAgent: request.get('User-Agent') || null,
          status: 'success',
          riskLevel: (details.riskLevel as string) || 'low',
          details: JSON.stringify(details),
          sessionId,
        },
      });
    } catch (error) {
      console.error('Failed to log session event:', error);
    }
  }

  /**
   * Get session statistics for monitoring
   */
  static async getSessionStatistics(): Promise<{
    totalActiveSessions: number;
    sessionsLast24h: number;
    averageSessionDuration: number;
    topUserAgents: Array<{ userAgent: string; count: number }>;
    topLocations: Array<{ location: string; count: number }>;
  }> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalActiveSessions, sessionsLast24h, recentSessions, userAgentStats, locationStats] =
      await Promise.all([
        prisma.userSession.count({
          where: { isActive: true },
        }),

        prisma.userSession.count({
          where: {
            createdAt: { gte: yesterday },
          },
        }),

        prisma.userSession.findMany({
          where: {
            isActive: false,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          select: {
            createdAt: true,
            lastAccessedAt: true,
          },
        }),

        prisma.userSession.groupBy({
          by: ['userAgent'],
          where: {
            createdAt: { gte: yesterday },
            userAgent: { not: null },
          },
          _count: { userAgent: true },
          orderBy: { _count: { userAgent: 'desc' } },
          take: 5,
        }),

        prisma.userSession.groupBy({
          by: ['location'],
          where: {
            createdAt: { gte: yesterday },
            location: { not: null },
          },
          _count: { location: true },
          orderBy: { _count: { location: 'desc' } },
          take: 5,
        }),
      ]);

    // Calculate average session duration
    const averageSessionDuration =
      recentSessions.length > 0
        ? recentSessions.reduce((acc, session) => {
            const duration = session.lastAccessedAt.getTime() - session.createdAt.getTime();
            return acc + duration;
          }, 0) / recentSessions.length
        : 0;

    return {
      totalActiveSessions,
      sessionsLast24h,
      averageSessionDuration: Math.round(averageSessionDuration / (1000 * 60)), // in minutes
      topUserAgents: userAgentStats.map(stat => ({
        userAgent: stat.userAgent || 'Unknown',
        count: stat._count.userAgent,
      })),
      topLocations: locationStats.map(stat => ({
        location: stat.location || 'Unknown',
        count: stat._count.location,
      })),
    };
  }
}
