import { prisma } from '../database/prisma-client';
import { Request } from 'express';

export interface SecurityEvent {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  status: 'success' | 'failed' | 'suspicious';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
  sessionId?: string;
  organizationId?: string;
}

export interface DeviceInfo {
  fingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
}

export class SecurityAuditService {
  /**
   * Log a security event with comprehensive context
   */
  static async logSecurityEvent(
    event: SecurityEvent,
    request: Request,
    deviceInfo?: Partial<DeviceInfo>
  ): Promise<void> {
    try {
      // Skip logging if userId is 'unknown' since we have a foreign key constraint
      if (event.userId === 'unknown') {
        return;
      }
      // Extract device and network information
      const ipAddress =
        deviceInfo?.ipAddress ||
        request.ip ||
        request.headers['x-forwarded-for']?.toString().split(',')[0] ||
        request.socket?.remoteAddress ||
        'unknown';

      const userAgent = deviceInfo?.userAgent || request.get('User-Agent') || null;

      // Get location info (enhanced with better detection)
      const location = deviceInfo?.location || this.getLocationFromIP(ipAddress);

      // Determine risk level based on event context
      const riskLevel = event.riskLevel || this.calculateRiskLevel(event, request);

      // Enhanced details with context
      const enhancedDetails = {
        ...event.details,
        timestamp: new Date().toISOString(),
        requestId: request.headers['x-request-id'] || null,
        referrer: request.get('Referer') || null,
        acceptLanguage: request.get('Accept-Language') || null,
        ...(event.action === 'login' && {
          loginMethod: event.details?.loginMethod || 'password',
          twoFactorUsed: event.details?.twoFactorUsed || false,
          passkeyUsed: event.details?.passkeyUsed || false,
        }),
        ...(event.status === 'failed' && {
          failureReason: event.details?.failureReason || 'unknown',
          attemptCount: event.details?.attemptCount || 1,
        }),
      };

      // Create audit log entry
      await prisma.securityAuditLog.create({
        data: {
          userId: event.userId,
          organizationId: event.organizationId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          ipAddress,
          userAgent,
          deviceFingerprint: deviceInfo?.fingerprint,
          location,
          status: event.status,
          riskLevel,
          details: JSON.stringify(enhancedDetails),
          sessionId: event.sessionId,
        },
      });

      // Check for suspicious patterns and alert if necessary
      if (riskLevel === 'high' || riskLevel === 'critical') {
        await this.handleHighRiskEvent(event, ipAddress, userAgent);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - security logging should not break the main flow
    }
  }

  /**
   * Get location information from IP address
   */
  private static getLocationFromIP(ipAddress: string): string {
    if (!ipAddress || ipAddress === 'unknown') return 'Unknown Location';
    if (ipAddress.includes('127.0.0.1') || ipAddress.includes('localhost') || ipAddress === '::1') {
      return 'Local Development';
    }
    // In production, you would integrate with a geolocation service like MaxMind or IP-API
    // For now, we'll provide a more descriptive default
    return 'External Location';
  }

  /**
   * Calculate risk level based on event context and patterns
   */
  private static calculateRiskLevel(
    event: SecurityEvent,
    request: Request
  ): 'low' | 'medium' | 'high' | 'critical' {
    // const ipAddress = request.ip || 'unknown'; // Available if needed for IP-based risk calculation
    const userAgent = request.get('User-Agent') || '';

    // Critical risk events
    if (
      event.action === 'emergency_access' ||
      event.action === 'admin_override' ||
      event.status === 'suspicious'
    ) {
      return 'critical';
    }

    // High risk events
    if (
      (event.action === 'password_change' && event.status === 'failed') ||
      event.action === 'failed_login' ||
      event.action === '2fa_disabled' ||
      userAgent.includes('bot') ||
      userAgent.includes('crawler')
    ) {
      return 'high';
    }

    // Medium risk events
    if (
      (event.action === 'login' && event.details?.fromNewDevice) ||
      event.action === 'passkey_added' ||
      event.action === '2fa_enabled' ||
      event.action === 'password_change'
    ) {
      return 'medium';
    }

    // Default to low risk
    return 'low';
  }

  /**
   * Handle high-risk security events
   */
  private static async handleHighRiskEvent(
    event: SecurityEvent,
    ipAddress: string,
    userAgent: string | null
  ): Promise<void> {
    try {
      // Check for failed login patterns
      if (event.action === 'failed_login') {
        await this.checkFailedLoginPatterns(event.userId, ipAddress);
      }

      // Check for unusual access patterns
      if (event.action === 'login' && event.status === 'success') {
        await this.checkUnusualAccessPatterns(event.userId, ipAddress, userAgent);
      }

      // Log critical events for admin review
      if (event.riskLevel === 'critical') {
        await this.notifyAdminsOfCriticalEvent(event, ipAddress);
      }
    } catch (error) {
      console.error('Failed to handle high-risk event:', error);
    }
  }

  /**
   * Check for failed login patterns that might indicate brute force
   */
  private static async checkFailedLoginPatterns(userId: string, ipAddress: string): Promise<void> {
    const recentFailures = await prisma.securityAuditLog.count({
      where: {
        userId,
        action: 'failed_login',
        timestamp: {
          gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
        },
      },
    });

    const ipFailures = await prisma.securityAuditLog.count({
      where: {
        ipAddress,
        action: 'failed_login',
        timestamp: {
          gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
        },
      },
    });

    // If more than 5 failures in 15 minutes, log as suspicious
    if (recentFailures >= 5 || ipFailures >= 10) {
      await prisma.securityAuditLog.create({
        data: {
          userId,
          action: 'brute_force_detected',
          resourceType: 'authentication',
          ipAddress,
          status: 'suspicious',
          riskLevel: 'critical',
          details: JSON.stringify({
            userFailures: recentFailures,
            ipFailures,
            detectionTime: new Date().toISOString(),
          }),
        },
      });
    }
  }

  /**
   * Check for unusual access patterns
   */
  private static async checkUnusualAccessPatterns(
    userId: string,
    ipAddress: string,
    userAgent: string | null
  ): Promise<void> {
    // Check if this is a new IP for the user
    const existingIpSessions = await prisma.securityAuditLog.count({
      where: {
        userId,
        ipAddress,
        action: 'login',
        status: 'success',
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    // Check if this is a new user agent
    const existingUASessions = await prisma.securityAuditLog.count({
      where: {
        userId,
        userAgent,
        action: 'login',
        status: 'success',
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    if (existingIpSessions === 0 || existingUASessions === 0) {
      await prisma.securityAuditLog.create({
        data: {
          userId,
          action: 'new_device_detected',
          resourceType: 'session',
          ipAddress,
          userAgent,
          status: 'success',
          riskLevel: 'medium',
          details: JSON.stringify({
            newIp: existingIpSessions === 0,
            newUserAgent: existingUASessions === 0,
            detectionTime: new Date().toISOString(),
          }),
        },
      });
    }
  }

  /**
   * Notify admins of critical security events
   */
  private static async notifyAdminsOfCriticalEvent(
    event: SecurityEvent,
    ipAddress: string
  ): Promise<void> {
    // This could be enhanced to send actual notifications
    // For now, we create a special audit entry for admin review
    await prisma.securityAuditLog.create({
      data: {
        userId: event.userId,
        action: 'admin_notification_required',
        resourceType: 'security',
        ipAddress,
        status: 'success',
        riskLevel: 'critical',
        details: JSON.stringify({
          originalEvent: event,
          requiresAdminReview: true,
          notificationTime: new Date().toISOString(),
        }),
      },
    });
  }

  /**
   * Get security statistics for a user
   */
  static async getUserSecurityStats(userId: string): Promise<{
    totalEvents: number;
    recentLogins: number;
    failedAttempts: number;
    deviceCount: number;
    riskDistribution: Record<string, number>;
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalEvents, recentLogins, failedAttempts, deviceData, riskData] = await Promise.all([
      // Total events
      prisma.securityAuditLog.count({
        where: { userId },
      }),

      // Recent successful logins
      prisma.securityAuditLog.count({
        where: {
          userId,
          action: 'login',
          status: 'success',
          timestamp: { gte: thirtyDaysAgo },
        },
      }),

      // Failed attempts
      prisma.securityAuditLog.count({
        where: {
          userId,
          action: 'failed_login',
          timestamp: { gte: thirtyDaysAgo },
        },
      }),

      // Unique devices
      prisma.securityAuditLog.findMany({
        where: {
          userId,
          action: 'login',
          status: 'success',
          timestamp: { gte: thirtyDaysAgo },
        },
        select: {
          ipAddress: true,
          userAgent: true,
        },
        distinct: ['ipAddress', 'userAgent'],
      }),

      // Risk level distribution
      prisma.securityAuditLog.groupBy({
        by: ['riskLevel'],
        where: {
          userId,
          timestamp: { gte: thirtyDaysAgo },
        },
        _count: { riskLevel: true },
      }),
    ]);

    const riskDistribution = riskData.reduce(
      (acc, item) => {
        acc[item.riskLevel] = item._count.riskLevel;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalEvents,
      recentLogins,
      failedAttempts,
      deviceCount: deviceData.length,
      riskDistribution,
    };
  }

  /**
   * Get organization security overview (for admins)
   */
  static async getOrganizationSecurityOverview(organizationId: string): Promise<{
    totalEvents: number;
    criticalEvents: number;
    suspiciousActivities: number;
    userStats: Array<{
      userId: string;
      userName: string;
      riskScore: number;
      lastActivity: Date;
    }>;
  }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalEvents, criticalEvents, suspiciousActivities] = await Promise.all([
      prisma.securityAuditLog.count({
        where: {
          organizationId,
          timestamp: { gte: sevenDaysAgo },
        },
      }),

      prisma.securityAuditLog.count({
        where: {
          organizationId,
          riskLevel: 'critical',
          timestamp: { gte: sevenDaysAgo },
        },
      }),

      prisma.securityAuditLog.count({
        where: {
          organizationId,
          status: 'suspicious',
          timestamp: { gte: sevenDaysAgo },
        },
      }),
    ]);

    // Get user activity and risk scores
    const userActivities = await prisma.securityAuditLog.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        timestamp: { gte: sevenDaysAgo },
      },
      _count: { riskLevel: true },
      _max: { timestamp: true },
    });

    // Calculate user risk scores and get user names
    const userStats = await Promise.all(
      userActivities.map(async activity => {
        const user = await prisma.user.findUnique({
          where: { id: activity.userId },
          select: { name: true },
        });

        const highRiskEvents = await prisma.securityAuditLog.count({
          where: {
            userId: activity.userId,
            organizationId,
            riskLevel: { in: ['high', 'critical'] },
            timestamp: { gte: sevenDaysAgo },
          },
        });

        const riskScore = Math.min(100, (highRiskEvents / activity._count.riskLevel) * 100);

        return {
          userId: activity.userId,
          userName: user?.name || 'Unknown User',
          riskScore: Math.round(riskScore),
          lastActivity: activity._max.timestamp || new Date(),
        };
      })
    );

    return {
      totalEvents,
      criticalEvents,
      suspiciousActivities,
      userStats: userStats.sort((a, b) => b.riskScore - a.riskScore),
    };
  }
}
