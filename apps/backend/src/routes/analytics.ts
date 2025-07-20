import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, requireClinicAdmin, AuthenticatedRequest } from '../middleware/auth';

// Analytics interfaces
interface StatCount {
  _count: {
    id: number;
  };
}

interface RoleStatCount extends StatCount {
  role: string;
}

interface StatusStatCount extends StatCount {
  status: string;
}

interface ActiveStatCount extends StatCount {
  isActive: boolean;
}

interface StatsByKey {
  [key: string]: number;
}

interface SymptomEntryStatCount extends StatCount {
  entryDate: Date;
}

interface AccessTypeStatCount extends StatCount {
  accessType: string;
}

interface ActionStatCount extends StatCount {
  action: string;
}

interface CreatedAtStatCount extends StatCount {
  createdAt: Date;
}

interface OrganizationFilter {
  organizationId?: string;
}

interface DateFilter {
  gte?: Date;
  lte?: Date;
  gt?: Date;
}

interface WhereClause {
  patient?: {
    organizationId?: string;
  };
  isActive?: boolean;
  endTime?: DateFilter;
  createdAt?: DateFilter;
}

interface EmergencyAccessWithRelations {
  id: string;
  patient: {
    organizationId: string;
    organization: {
      id: string;
      name: string;
    };
  };
}

interface OrganizationWithCounts {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  _count: {
    users: number;
    patients: number;
    auditLogs: number;
  };
  emergencyAccessCount: number;
  assignmentCount: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  organizationId: string;
  userId: string;
}

interface EmergencyAccessEntry {
  id: string;
  accessType: string;
  reason: string;
  isActive: boolean;
  startTime: Date;
  endTime: Date | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    role: string;
  };
  patient: {
    id: string;
    name: string;
    organization: {
      id: string;
      name: string;
    };
  };
}

const router = Router();

// Get organization analytics (admin only)
router.get(
  '/organization/:id',
  authenticateToken,
  requireClinicAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { id } = req.params;

      // Check authorization
      if (req.user.role !== 'super_admin' && req.user.organizationId !== id) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied to this organization',
        };
        return res.status(403).json(response);
      }

      // Get organization details
      const organization = await prisma.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!organization) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization not found',
        };
        return res.status(404).json(response);
      }

      // Get user statistics
      const userStats = await prisma.user.groupBy({
        by: ['role'],
        where: { organizationId: id },
        _count: {
          id: true,
        },
      });

      // Get patient statistics
      const patientCount = await prisma.patient.count({
        where: { organizationId: id },
      });

      // Get assignment statistics
      const assignmentStats = await prisma.caregiverAssignment.groupBy({
        by: ['status'],
        where: {
          patient: {
            organizationId: id,
          },
        },
        _count: {
          id: true,
        },
      });

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentActivity = await prisma.auditLog.count({
        where: {
          organizationId: id,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Get symptom entry statistics
      const symptomEntryStats = await prisma.symptomEntry.groupBy({
        by: ['entryDate'],
        where: {
          patient: {
            organizationId: id,
          },
          entryDate: {
            gte: thirtyDaysAgo,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          entryDate: 'desc',
        },
        take: 30,
      });

      // Get invitation statistics
      const invitationStats = await prisma.invitation.groupBy({
        by: ['status'],
        where: {
          sender: {
            organizationId: id,
          },
        },
        _count: {
          id: true,
        },
      });

      // Format user statistics
      const userStatsByRole = userStats.reduce((acc: StatsByKey, stat: RoleStatCount) => {
        acc[stat.role] = stat._count.id;
        return acc;
      }, {} as StatsByKey);

      // Format assignment statistics
      const assignmentStatsByStatus = assignmentStats.reduce(
        (acc: StatsByKey, stat: StatusStatCount) => {
          acc[stat.status] = stat._count.id;
          return acc;
        },
        {} as StatsByKey
      );

      // Format invitation statistics
      const invitationStatsByStatus = invitationStats.reduce(
        (acc: StatsByKey, stat: StatusStatCount) => {
          acc[stat.status] = stat._count.id;
          return acc;
        },
        {} as StatsByKey
      );

      // Format symptom entry timeline
      const symptomEntryTimeline = symptomEntryStats.map((stat: SymptomEntryStatCount) => ({
        date: stat.entryDate.toISOString().split('T')[0],
        count: stat._count.id,
      }));

      const response: ApiResponse = {
        success: true,
        data: {
          organization,
          summary: {
            totalUsers: userStats.reduce(
              (sum: number, stat: RoleStatCount) => sum + stat._count.id,
              0
            ),
            totalPatients: patientCount,
            totalAssignments: assignmentStats.reduce(
              (sum: number, stat: StatusStatCount) => sum + stat._count.id,
              0
            ),
            totalInvitations: invitationStats.reduce(
              (sum: number, stat: StatusStatCount) => sum + stat._count.id,
              0
            ),
            recentActivityCount: recentActivity,
          },
          userStatsByRole,
          assignmentStatsByStatus,
          invitationStatsByStatus,
          symptomEntryTimeline,
          period: {
            startDate: thirtyDaysAgo.toISOString(),
            endDate: new Date().toISOString(),
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get organization analytics error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get system-wide analytics (super admin only)
router.get(
  '/system',
  authenticateToken,
  requireClinicAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { organizationId, timeRange = '30' } = req.query;

      // Calculate date range
      const days = parseInt(timeRange as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Build where clause for organization filtering
      let orgFilter: OrganizationFilter = {};
      if (req.user.role === 'clinic_admin') {
        // Clinic admins can only see their organization
        orgFilter = { organizationId: req.user.organizationId };
      } else if (organizationId) {
        // Super admins can filter by specific organization
        orgFilter = { organizationId: organizationId as string };
      }
      // Get organization statistics
      const organizationStatsGrouped = await prisma.organization.groupBy({
        by: ['isActive'],
        where: organizationId ? { id: organizationId as string } : {},
        _count: {
          id: true,
        },
      });

      // Get user statistics
      const userStats = await prisma.user.groupBy({
        by: ['role'],
        where: {
          ...orgFilter,
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
      });

      // Get patient count
      const totalPatients = await prisma.patient.count({
        where: {
          ...orgFilter,
          createdAt: {
            gte: startDate,
          },
        },
      });

      // Get assignment statistics
      const assignmentStats = await prisma.caregiverAssignment.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate,
          },
          ...(Object.keys(orgFilter).length > 0
            ? {
                patient: {
                  organizationId: orgFilter.organizationId,
                },
              }
            : {}),
        },
        _count: {
          id: true,
        },
      });

      // Get recent activity
      const recentActivity = await prisma.auditLog.count({
        where: {
          ...orgFilter,
          createdAt: {
            gte: startDate,
          },
        },
      });

      // Get top organizations by user count (only for super admins)
      const topOrganizations =
        req.user.role === 'super_admin'
          ? await prisma.organization.findMany({
              where: organizationId ? { id: organizationId as string } : {},
              select: {
                id: true,
                name: true,
                isActive: true,
                createdAt: true,
                _count: {
                  select: {
                    users: true,
                    patients: true,
                    auditLogs: true,
                  },
                },
              },
              orderBy: {
                users: {
                  _count: 'desc',
                },
              },
              take: 10,
            })
          : [];

      // Get emergency access and assignment counts per organization (only for super admins)
      const organizationStats =
        req.user.role === 'super_admin'
          ? await Promise.all(
              topOrganizations.map(async org => {
                const [emergencyAccessCount, assignmentCount] = await Promise.all([
                  prisma.emergencyAccess.count({
                    where: {
                      patient: {
                        organizationId: org.id,
                      },
                    },
                  }),
                  prisma.caregiverAssignment.count({
                    where: {
                      patient: {
                        organizationId: org.id,
                      },
                    },
                  }),
                ]);

                return {
                  ...org,
                  emergencyAccessCount,
                  assignmentCount,
                };
              })
            )
          : [];

      // Get growth metrics (new users/patients per day for specified period)
      const growthMetrics = await prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          ...orgFilter,
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Format statistics
      const organizationStatsByStatus = organizationStatsGrouped.reduce(
        (acc: StatsByKey, stat: ActiveStatCount) => {
          acc[stat.isActive ? 'active' : 'inactive'] = stat._count.id;
          return acc;
        },
        {} as StatsByKey
      );

      const userStatsByRole = userStats.reduce((acc: StatsByKey, stat: RoleStatCount) => {
        acc[stat.role] = stat._count.id;
        return acc;
      }, {} as StatsByKey);

      const assignmentStatsByStatus = assignmentStats.reduce(
        (acc: StatsByKey, stat: StatusStatCount) => {
          acc[stat.status] = stat._count.id;
          return acc;
        },
        {} as StatsByKey
      );

      const response: ApiResponse = {
        success: true,
        data: {
          totalOrganizations: organizationStatsGrouped.reduce(
            (sum: number, stat: ActiveStatCount) => sum + stat._count.id,
            0
          ),
          totalUsers: userStats.reduce(
            (sum: number, stat: RoleStatCount) => sum + stat._count.id,
            0
          ),
          totalPatients,
          totalAssignments: assignmentStats.reduce(
            (sum: number, stat: StatusStatCount) => sum + stat._count.id,
            0
          ),
          activeAssignments: assignmentStatsByStatus.active || 0,
          totalEmergencyAccess: 0, // Will be populated by emergency access API
          activeEmergencyAccess: 0, // Will be populated by emergency access API
          organizations: organizationStats.map((org: OrganizationWithCounts) => ({
            id: org.id,
            name: org.name,
            isActive: org.isActive,
            createdAt: org.createdAt,
            userCount: org._count.users,
            patientCount: org._count.patients,
            assignmentCount: org.assignmentCount,
            emergencyAccessCount: org.emergencyAccessCount,
          })),
          summary: {
            totalOrganizations: organizationStatsGrouped.reduce(
              (sum: number, stat: ActiveStatCount) => sum + stat._count.id,
              0
            ),
            totalUsers: userStats.reduce(
              (sum: number, stat: RoleStatCount) => sum + stat._count.id,
              0
            ),
            totalPatients,
            totalAssignments: assignmentStats.reduce(
              (sum: number, stat: StatusStatCount) => sum + stat._count.id,
              0
            ),
            recentActivityCount: recentActivity,
          },
          organizationStatsByStatus,
          userStatsByRole,
          assignmentStatsByStatus,
          growthMetrics: growthMetrics.map((metric: CreatedAtStatCount) => ({
            date: metric.createdAt.toISOString().split('T')[0],
            newUsers: metric._count.id,
          })),
          period: {
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString(),
            timeRange: days,
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get system analytics error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get user activity report
router.get(
  '/activity/:userId',
  authenticateToken,
  requireClinicAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { userId } = req.params;
      const { startDate, endDate, limit = 100 } = req.query;

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        return res.status(404).json(response);
      }

      // Check authorization
      if (req.user.role !== 'super_admin' && req.user.organizationId !== user.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied to user in different organization',
        };
        return res.status(403).json(response);
      }

      // Build date filter
      const dateFilter: DateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate as string);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate as string);
      }

      // Get audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId,
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Number(limit),
      });

      // Get activity summary
      const activitySummary = await prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          userId,
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        _count: {
          id: true,
        },
      });

      const activityByAction = activitySummary.reduce(
        (acc: StatsByKey, activity: ActionStatCount) => {
          acc[activity.action] = activity._count.id;
          return acc;
        },
        {} as StatsByKey
      );

      const response: ApiResponse = {
        success: true,
        data: {
          user,
          activitySummary: {
            totalActions: auditLogs.length,
            actionCounts: activityByAction,
          },
          auditLogs: auditLogs.map((log: AuditLogEntry) => ({
            id: log.id,
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId,
            details: JSON.parse(log.details || '{}') as Record<string, unknown>,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            timestamp: log.createdAt,
          })),
          period: {
            startDate: startDate || 'all time',
            endDate: endDate || 'now',
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get user activity error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get emergency access analytics (admin only)
router.get(
  '/emergency-access',
  authenticateToken,
  requireClinicAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      // Build where clause for organization filtering
      const whereClause: WhereClause = {};
      if (req.user.role === 'clinic_admin') {
        whereClause.patient = {
          organizationId: req.user.organizationId,
        };
      }

      // Get emergency access statistics
      const [totalAccess, activeAccess, accessByType, accessByOrganization, recentAccess] =
        await Promise.all([
          prisma.emergencyAccess.count({
            where: whereClause,
          }),
          prisma.emergencyAccess.count({
            where: {
              ...whereClause,
              isActive: true,
              endTime: {
                gt: new Date(),
              },
            },
          }),
          prisma.emergencyAccess.groupBy({
            by: ['accessType'],
            where: whereClause,
            _count: {
              id: true,
            },
          }),
          // Group by organization (only for super admins)
          req.user.role === 'super_admin'
            ? prisma.emergencyAccess
                .findMany({
                  where: whereClause,
                  include: {
                    patient: {
                      select: {
                        organizationId: true,
                        organization: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                })
                .then(accesses => {
                  const orgCounts: Record<
                    string,
                    { organizationId: string; organizationName: string; count: number }
                  > = {};
                  accesses.forEach((access: EmergencyAccessWithRelations) => {
                    const orgId = access.patient.organizationId;
                    const orgName = access.patient.organization.name;
                    if (!orgCounts[orgId]) {
                      orgCounts[orgId] = {
                        organizationId: orgId,
                        organizationName: orgName,
                        count: 0,
                      };
                    }
                    orgCounts[orgId].count++;
                  });
                  return Object.values(orgCounts);
                })
            : Promise.resolve([]),
          prisma.emergencyAccess.findMany({
            where: {
              ...whereClause,
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
              patient: {
                select: {
                  id: true,
                  name: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          }),
        ]);

      // Format the data to match frontend expectations
      const byType = accessByType.reduce((acc: StatsByKey, stat: AccessTypeStatCount) => {
        acc[stat.accessType] = stat._count.id;
        return acc;
      }, {} as StatsByKey);

      const response: ApiResponse = {
        success: true,
        data: {
          total: totalAccess,
          active: activeAccess,
          expired: totalAccess - activeAccess,
          byType,
          byOrganization: accessByOrganization,
          recentAccess: recentAccess.map((access: EmergencyAccessEntry) => ({
            id: access.id,
            accessType: access.accessType,
            reason: access.reason,
            isActive: access.isActive,
            startTime: access.startTime,
            endTime: access.endTime,
            user: access.user,
            patient: access.patient,
            createdAt: access.createdAt,
          })),
          summary: {
            totalRequests: totalAccess,
            activeRequests: activeAccess,
            expiredRequests: totalAccess - activeAccess,
            medicalEmergencies: byType.medical_emergency || 0,
            technicalSupport: byType.technical_support || 0,
            dataRecovery: byType.data_recovery || 0,
            auditInvestigation: byType.audit_investigation || 0,
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get emergency access analytics error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

export default router;
