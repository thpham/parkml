import { prisma } from '../database/prisma-client';

// Type definitions for database query results
type EmergencyAccessRecord = {
  id: string;
  userId: string;
  patientId: string;
  reason: string;
  accessType: string;
  endTime: Date | null;
  user: {
    organizationId: string | null;
  };
};

type AccessByTypeResult = {
  accessType: string;
  _count: {
    id: number;
  };
};

type AccessByUserResult = {
  userId: string;
  _count: {
    id: number;
  };
};

type UserWithOrganization = {
  id: string;
  organizationId: string | null;
  organization: {
    name: string;
  } | null;
};

type OrganizationStat = {
  organizationId: string;
  organizationName: string;
  count: number;
};

type EmergencyAccessWithUser = {
  id: string;
  userId: string;
  patientId: string;
  reason: string;
  endTime: Date | null;
  user: {
    email: string;
  };
};

/**
 * Service to clean up expired emergency access records
 */
export class EmergencyAccessCleanupService {
  /**
   * Clean up expired emergency access records
   * Automatically sets isActive to false for expired records
   */
  static async cleanupExpiredAccess(): Promise<{
    cleaned: number;
    active: number;
    total: number;
  }> {
    try {
      const now = new Date();

      // Get all emergency access records
      const totalRecords = await prisma.emergencyAccess.count();

      // Get currently active records
      const activeRecords = await prisma.emergencyAccess.count({
        where: {
          isActive: true,
          endTime: {
            gt: now,
          },
        },
      });

      // Find and update expired records
      const expiredRecords = await prisma.emergencyAccess.findMany({
        where: {
          isActive: true,
          endTime: {
            lte: now,
          },
        },
        select: {
          id: true,
          userId: true,
          patientId: true,
          reason: true,
          accessType: true,
          endTime: true,
          user: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      // Update expired records to inactive
      if (expiredRecords.length > 0) {
        await prisma.emergencyAccess.updateMany({
          where: {
            id: {
              in: expiredRecords.map(record => record.id),
            },
          },
          data: {
            isActive: false,
          },
        });

        // Create audit log entries for expired access
        const auditLogEntries = expiredRecords.map((record: EmergencyAccessRecord) => ({
          userId: record.userId,
          organizationId: record.user.organizationId || 'default_org',
          action: 'EXPIRE_EMERGENCY_ACCESS',
          resource: 'emergency_access',
          resourceId: record.id,
          details: JSON.stringify({
            reason: record.reason,
            accessType: record.accessType,
            patientId: record.patientId,
            originalEndTime: record.endTime?.toISOString(),
            expiredAt: now.toISOString(),
            autoExpired: true,
          }),
          ipAddress: 'system',
          userAgent: 'emergency-access-cleanup-service',
        }));

        await prisma.auditLog.createMany({
          data: auditLogEntries,
        });

        console.log(
          `🧹 Emergency access cleanup: ${expiredRecords.length} expired records cleaned up`
        );
      }

      return {
        cleaned: expiredRecords.length,
        active: activeRecords,
        total: totalRecords,
      };
    } catch (error) {
      console.error('Error in emergency access cleanup:', error);
      throw error;
    }
  }

  /**
   * Get emergency access statistics
   */
  static async getEmergencyAccessStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    byType: Record<string, number>;
    byOrganization: Array<{
      organizationId: string;
      organizationName: string;
      count: number;
    }>;
  }> {
    try {
      const now = new Date();

      // Get total count
      const total = await prisma.emergencyAccess.count();

      // Get active count
      const active = await prisma.emergencyAccess.count({
        where: {
          isActive: true,
          endTime: {
            gt: now,
          },
        },
      });

      // Get expired count
      const expired = await prisma.emergencyAccess.count({
        where: {
          OR: [
            { isActive: false },
            {
              isActive: true,
              endTime: {
                lte: now,
              },
            },
          ],
        },
      });

      // Get access by type
      const accessByType = await prisma.emergencyAccess.groupBy({
        by: ['accessType'],
        _count: {
          id: true,
        },
      });

      const byType = accessByType.reduce(
        (acc: Record<string, number>, item: AccessByTypeResult) => {
          acc[item.accessType] = item._count.id;
          return acc;
        },
        {} as Record<string, number>
      );

      // Get access by organization
      const accessByOrg = await prisma.emergencyAccess.groupBy({
        by: ['userId'],
        _count: {
          id: true,
        },
      });

      const userIds = accessByOrg.map(item => item.userId);
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: {
          id: true,
          organizationId: true,
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      const byOrganization = accessByOrg
        .map((item: AccessByUserResult) => {
          const user = users.find((u: UserWithOrganization) => u.id === item.userId);
          return {
            organizationId: user?.organizationId || 'unknown',
            organizationName: user?.organization?.name || 'Unknown Organization',
            count: item._count.id,
          };
        })
        .reduce((acc: OrganizationStat[], item: OrganizationStat) => {
          const existing = acc.find(
            (a: OrganizationStat) => a.organizationId === item.organizationId
          );
          if (existing) {
            existing.count += item.count;
          } else {
            acc.push(item);
          }
          return acc;
        }, [] as OrganizationStat[]);

      return {
        total,
        active,
        expired,
        byType,
        byOrganization,
      };
    } catch (error) {
      console.error('Error getting emergency access stats:', error);
      throw error;
    }
  }

  /**
   * Send alerts for emergency access that will expire soon
   * @param hoursBeforeExpiration - Hours before expiration to send alert
   */
  static async sendExpirationAlerts(hoursBeforeExpiration: number = 2): Promise<{
    alertsSent: number;
    records: Array<{
      id: string;
      userId: string;
      userEmail: string;
      patientId: string;
      reason: string;
      expiresAt: Date;
    }>;
  }> {
    try {
      const now = new Date();
      const alertThreshold = new Date(now.getTime() + hoursBeforeExpiration * 60 * 60 * 1000);

      // Find records that will expire soon
      const soonToExpire = await prisma.emergencyAccess.findMany({
        where: {
          isActive: true,
          endTime: {
            gt: now,
            lte: alertThreshold,
          },
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      const records = soonToExpire.map((record: EmergencyAccessWithUser) => ({
        id: record.id,
        userId: record.userId,
        userEmail: record.user.email,
        patientId: record.patientId,
        reason: record.reason,
        expiresAt: record.endTime || new Date(),
      }));

      // In a real implementation, you would send actual alerts here
      // For now, we'll just log them
      if (records.length > 0) {
        console.log(
          `⚠️  Emergency access expiration alerts: ${records.length} records expiring soon`
        );
        records.forEach(
          (record: { userEmail: string; userId: string; patientId: string; expiresAt: Date }) => {
            console.log(
              `  - User ${record.userEmail} (${record.userId}) emergency access to patient ${record.patientId} expires at ${record.expiresAt.toISOString()}`
            );
          }
        );
      }

      return {
        alertsSent: records.length,
        records,
      };
    } catch (error) {
      console.error('Error sending expiration alerts:', error);
      throw error;
    }
  }
}

/**
 * Initialize the emergency access cleanup service
 * This should be called when the server starts
 */
export function initializeEmergencyAccessCleanup(): void {
  // Run cleanup immediately on startup
  EmergencyAccessCleanupService.cleanupExpiredAccess()
    .then(result => {
      console.log('🚀 Emergency access cleanup service initialized:', result);
    })
    .catch(error => {
      console.error('❌ Failed to initialize emergency access cleanup service:', error);
    });

  // Schedule cleanup every 5 minutes
  setInterval(
    async () => {
      try {
        await EmergencyAccessCleanupService.cleanupExpiredAccess();
      } catch (error) {
        console.error('❌ Scheduled emergency access cleanup failed:', error);
      }
    },
    5 * 60 * 1000
  ); // 5 minutes

  // Schedule expiration alerts every 30 minutes
  setInterval(
    async () => {
      try {
        await EmergencyAccessCleanupService.sendExpirationAlerts(2); // 2 hours before expiration
      } catch (error) {
        console.error('❌ Scheduled expiration alerts failed:', error);
      }
    },
    30 * 60 * 1000
  ); // 30 minutes

  console.log(
    '🔄 Emergency access cleanup service scheduled (cleanup every 5 minutes, alerts every 30 minutes)'
  );
}

export default EmergencyAccessCleanupService;
