import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { 
  authenticateToken, 
  requireClinicAdmin,
  requireSuperAdmin,
  AuthenticatedRequest 
} from '../middleware/auth';

const router = Router();

// Get organization analytics (admin only)
router.get('/organization/:id', 
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
          createdAt: true
        }
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
          id: true
        }
      });

      // Get patient statistics
      const patientCount = await prisma.patient.count({
        where: { organizationId: id }
      });

      // Get assignment statistics
      const assignmentStats = await prisma.caregiverAssignment.groupBy({
        by: ['status'],
        where: {
          patient: {
            organizationId: id
          }
        },
        _count: {
          id: true
        }
      });

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentActivity = await prisma.auditLog.count({
        where: {
          organizationId: id,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });

      // Get symptom entry statistics
      const symptomEntryStats = await prisma.symptomEntry.groupBy({
        by: ['entryDate'],
        where: {
          patient: {
            organizationId: id
          },
          entryDate: {
            gte: thirtyDaysAgo
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          entryDate: 'desc'
        },
        take: 30
      });

      // Get invitation statistics
      const invitationStats = await prisma.invitation.groupBy({
        by: ['status'],
        where: {
          sender: {
            organizationId: id
          }
        },
        _count: {
          id: true
        }
      });

      // Format user statistics
      const userStatsByRole = userStats.reduce((acc: any, stat) => {
        acc[stat.role] = stat._count.id;
        return acc;
      }, {});

      // Format assignment statistics
      const assignmentStatsByStatus = assignmentStats.reduce((acc: any, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {});

      // Format invitation statistics
      const invitationStatsByStatus = invitationStats.reduce((acc: any, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {});

      // Format symptom entry timeline
      const symptomEntryTimeline = symptomEntryStats.map(stat => ({
        date: stat.entryDate.toISOString().split('T')[0],
        count: stat._count.id
      }));

      const response: ApiResponse = {
        success: true,
        data: {
          organization,
          summary: {
            totalUsers: userStats.reduce((sum, stat) => sum + stat._count.id, 0),
            totalPatients: patientCount,
            totalAssignments: assignmentStats.reduce((sum, stat) => sum + stat._count.id, 0),
            totalInvitations: invitationStats.reduce((sum, stat) => sum + stat._count.id, 0),
            recentActivityCount: recentActivity
          },
          userStatsByRole,
          assignmentStatsByStatus,
          invitationStatsByStatus,
          symptomEntryTimeline,
          period: {
            startDate: thirtyDaysAgo.toISOString(),
            endDate: new Date().toISOString()
          }
        }
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
router.get('/system', 
  authenticateToken, 
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res) => {
    try {
      // Get organization statistics
      const organizationStats = await prisma.organization.groupBy({
        by: ['isActive'],
        _count: {
          id: true
        }
      });

      // Get user statistics across all organizations
      const userStats = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      });

      // Get patient count
      const totalPatients = await prisma.patient.count();

      // Get assignment statistics
      const assignmentStats = await prisma.caregiverAssignment.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentActivity = await prisma.auditLog.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });

      // Get top organizations by user count
      const topOrganizations = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              patients: true,
              auditLogs: true
            }
          }
        },
        orderBy: {
          users: {
            _count: 'desc'
          }
        },
        take: 10
      });

      // Get growth metrics (new users/patients per day for last 30 days)
      const growthMetrics = await prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Format statistics
      const organizationStatsByStatus = organizationStats.reduce((acc: any, stat) => {
        acc[stat.isActive ? 'active' : 'inactive'] = stat._count.id;
        return acc;
      }, {});

      const userStatsByRole = userStats.reduce((acc: any, stat) => {
        acc[stat.role] = stat._count.id;
        return acc;
      }, {});

      const assignmentStatsByStatus = assignmentStats.reduce((acc: any, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {});

      const response: ApiResponse = {
        success: true,
        data: {
          summary: {
            totalOrganizations: organizationStats.reduce((sum, stat) => sum + stat._count.id, 0),
            totalUsers: userStats.reduce((sum, stat) => sum + stat._count.id, 0),
            totalPatients,
            totalAssignments: assignmentStats.reduce((sum, stat) => sum + stat._count.id, 0),
            recentActivityCount: recentActivity
          },
          organizationStatsByStatus,
          userStatsByRole,
          assignmentStatsByStatus,
          topOrganizations: topOrganizations.map((org: any) => ({
            id: org.id,
            name: org.name,
            isActive: org.isActive,
            createdAt: org.createdAt,
            userCount: org._count.users,
            patientCount: org._count.patients,
            auditLogCount: org._count.auditLogs
          })),
          growthMetrics: growthMetrics.map(metric => ({
            date: metric.createdAt.toISOString().split('T')[0],
            newUsers: metric._count.id
          })),
          period: {
            startDate: thirtyDaysAgo.toISOString(),
            endDate: new Date().toISOString()
          }
        }
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
router.get('/activity/:userId', 
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
              name: true
            }
          }
        }
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
      const dateFilter: any = {};
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
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: Number(limit)
      });

      // Get activity summary
      const activitySummary = await prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          userId,
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
        },
        _count: {
          id: true
        }
      });

      const activityByAction = activitySummary.reduce((acc: any, activity) => {
        acc[activity.action] = activity._count.id;
        return acc;
      }, {});

      const response: ApiResponse = {
        success: true,
        data: {
          user,
          activitySummary: {
            totalActions: auditLogs.length,
            actionCounts: activityByAction
          },
          auditLogs: auditLogs.map(log => ({
            id: log.id,
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId,
            details: JSON.parse(log.details || '{}'),
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            timestamp: log.createdAt
          })),
          period: {
            startDate: startDate || 'all time',
            endDate: endDate || 'now'
          }
        }
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

export default router;