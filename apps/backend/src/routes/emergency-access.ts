import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { 
  authenticateToken, 
  requireClinicAdmin,
  logUserActivity,
  AuthenticatedRequest 
} from '../middleware/auth';
import { EmergencyAccessCleanupService } from '../services/emergency-access-cleanup';

const router = Router();

// Request emergency access to patient data
router.post('/request', 
  authenticateToken,
  logUserActivity('REQUEST_EMERGENCY_ACCESS', 'emergency_access'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { patientId, reason, accessType = 'medical_emergency', duration = 24 } = req.body;

      // Validate required fields
      if (!patientId || !reason) {
        const response: ApiResponse = {
          success: false,
          error: 'Patient ID and reason are required',
        };
        return res.status(400).json(response);
      }

      // Validate patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        }
      });

      if (!patient) {
        const response: ApiResponse = {
          success: false,
          error: 'Patient not found',
        };
        return res.status(404).json(response);
      }

      // Check if user has permission to request emergency access
      // Super admins can access any patient
      // Clinic admins can access patients in their organization
      // Professional caregivers can access patients in their organization
      const canRequestAccess = 
        req.user.role === 'super_admin' ||
        (req.user.role === 'clinic_admin' && patient.organizationId === req.user.organizationId) ||
        (req.user.role === 'professional_caregiver' && patient.organizationId === req.user.organizationId);

      if (!canRequestAccess) {
        const response: ApiResponse = {
          success: false,
          error: 'Insufficient permissions to request emergency access',
        };
        return res.status(403).json(response);
      }

      // Check if user already has active emergency access
      const existingAccess = await prisma.emergencyAccess.findFirst({
        where: {
          userId: req.user.userId,
          patientId,
          isActive: true,
          endTime: {
            gt: new Date()
          }
        }
      });

      if (existingAccess) {
        const response: ApiResponse = {
          success: false,
          error: 'Active emergency access already exists for this patient',
        };
        return res.status(400).json(response);
      }

      // Calculate end time
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000); // Convert hours to milliseconds

      // Create emergency access record
      const emergencyAccess = await prisma.emergencyAccess.create({
        data: {
          userId: req.user.userId,
          patientId,
          reason,
          accessType,
          startTime,
          endTime,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      // Log the emergency access request
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          organizationId: patient.organizationId,
          action: 'REQUEST_EMERGENCY_ACCESS',
          resource: 'emergency_access',
          resourceId: emergencyAccess.id,
          details: JSON.stringify({
            patientId,
            reason,
            accessType,
            duration,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
          }),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: emergencyAccess.id,
          patientId: emergencyAccess.patientId,
          reason: emergencyAccess.reason,
          accessType: emergencyAccess.accessType,
          startTime: emergencyAccess.startTime,
          endTime: emergencyAccess.endTime,
          isActive: emergencyAccess.isActive,
          user: emergencyAccess.user,
          createdAt: emergencyAccess.createdAt
        }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Request emergency access error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get emergency access records (admin only)
router.get('/', 
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

      const { page = 1, limit = 50, patientId, userId, isActive, startDate, endDate } = req.query;

      // Build where clause
      const whereClause: any = {};

      // Organization filtering for clinic admins
      if (req.user.role === 'clinic_admin') {
        whereClause.user = {
          organizationId: req.user.organizationId
        };
      }

      // Patient filtering
      if (patientId) {
        whereClause.patientId = patientId;
      }

      // User filtering
      if (userId) {
        whereClause.userId = userId;
      }

      // Active status filtering
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      // Date range filtering
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          whereClause.createdAt.lte = new Date(endDate as string);
        }
      }

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      const [emergencyAccesses, totalCount] = await Promise.all([
        prisma.emergencyAccess.findMany({
          where: whereClause,
          include: {
            user: {
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
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.emergencyAccess.count({ where: whereClause })
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          emergencyAccesses: emergencyAccesses.map(access => ({
            id: access.id,
            patientId: access.patientId,
            reason: access.reason,
            accessType: access.accessType,
            startTime: access.startTime,
            endTime: access.endTime,
            isActive: access.isActive,
            user: access.user,
            createdAt: access.createdAt,
            updatedAt: access.updatedAt
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / Number(limit))
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get emergency access error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get emergency access by ID
router.get('/:id', 
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

      const emergencyAccess = await prisma.emergencyAccess.findUnique({
        where: { id },
        include: {
          user: {
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
          }
        }
      });

      if (!emergencyAccess) {
        const response: ApiResponse = {
          success: false,
          error: 'Emergency access record not found',
        };
        return res.status(404).json(response);
      }

      // Check authorization
      if (req.user.role === 'clinic_admin' && 
          emergencyAccess.user.organizationId !== req.user.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied to emergency access record from different organization',
        };
        return res.status(403).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          id: emergencyAccess.id,
          patientId: emergencyAccess.patientId,
          reason: emergencyAccess.reason,
          accessType: emergencyAccess.accessType,
          startTime: emergencyAccess.startTime,
          endTime: emergencyAccess.endTime,
          isActive: emergencyAccess.isActive,
          user: emergencyAccess.user,
          createdAt: emergencyAccess.createdAt,
          updatedAt: emergencyAccess.updatedAt
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get emergency access error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Revoke emergency access
router.post('/:id/revoke', 
  authenticateToken,
  requireClinicAdmin,
  logUserActivity('REVOKE_EMERGENCY_ACCESS', 'emergency_access'),
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
      const { reason } = req.body;

      // Get emergency access record
      const emergencyAccess = await prisma.emergencyAccess.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              organizationId: true
            }
          }
        }
      });

      if (!emergencyAccess) {
        const response: ApiResponse = {
          success: false,
          error: 'Emergency access record not found',
        };
        return res.status(404).json(response);
      }

      // Check authorization
      if (req.user.role === 'clinic_admin' && 
          emergencyAccess.user.organizationId !== req.user.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied to emergency access record from different organization',
        };
        return res.status(403).json(response);
      }

      // Check if access is already inactive
      if (!emergencyAccess.isActive) {
        const response: ApiResponse = {
          success: false,
          error: 'Emergency access is already inactive',
        };
        return res.status(400).json(response);
      }

      // Revoke emergency access
      const updatedAccess = await prisma.emergencyAccess.update({
        where: { id },
        data: {
          isActive: false,
          endTime: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              organizationId: true
            }
          }
        }
      });

      // Log the revocation
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          organizationId: req.user.organizationId!,
          action: 'REVOKE_EMERGENCY_ACCESS',
          resource: 'emergency_access',
          resourceId: id,
          details: JSON.stringify({
            originalUserId: emergencyAccess.userId,
            patientId: emergencyAccess.patientId,
            reason: reason || 'Manual revocation',
            revokedAt: new Date().toISOString()
          }),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedAccess.id,
          patientId: updatedAccess.patientId,
          reason: updatedAccess.reason,
          accessType: updatedAccess.accessType,
          startTime: updatedAccess.startTime,
          endTime: updatedAccess.endTime,
          isActive: updatedAccess.isActive,
          user: updatedAccess.user,
          createdAt: updatedAccess.createdAt,
          updatedAt: updatedAccess.updatedAt
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Revoke emergency access error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Check if user has active emergency access to patient
router.get('/check/:patientId', 
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { patientId } = req.params;

      // Check for active emergency access
      const emergencyAccess = await prisma.emergencyAccess.findFirst({
        where: {
          userId: req.user.userId,
          patientId,
          isActive: true,
          endTime: {
            gt: new Date()
          }
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          hasAccess: !!emergencyAccess,
          access: emergencyAccess ? {
            id: emergencyAccess.id,
            reason: emergencyAccess.reason,
            accessType: emergencyAccess.accessType,
            startTime: emergencyAccess.startTime,
            endTime: emergencyAccess.endTime,
            createdAt: emergencyAccess.createdAt
          } : null
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Check emergency access error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Emergency access statistics (admin only)
router.get('/stats/summary', 
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

      const { startDate, endDate } = req.query;

      // Build where clause
      const whereClause: any = {};

      // Organization filtering for clinic admins
      if (req.user.role === 'clinic_admin') {
        whereClause.user = {
          organizationId: req.user.organizationId
        };
      }

      // Date range filtering
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          whereClause.createdAt.lte = new Date(endDate as string);
        }
      }

      // Get statistics
      const [totalAccess, activeAccess, accessByType, accessByUser] = await Promise.all([
        prisma.emergencyAccess.count({
          where: whereClause
        }),
        prisma.emergencyAccess.count({
          where: {
            ...whereClause,
            isActive: true,
            endTime: {
              gt: new Date()
            }
          }
        }),
        prisma.emergencyAccess.groupBy({
          by: ['accessType'],
          where: whereClause,
          _count: {
            id: true
          }
        }),
        prisma.emergencyAccess.groupBy({
          by: ['userId'],
          where: whereClause,
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: 10
        })
      ]);

      // Format statistics
      const accessByTypeFormatted = accessByType.reduce((acc: any, stat) => {
        acc[stat.accessType] = stat._count.id;
        return acc;
      }, {});

      // Get user details for top users
      const topUserIds = accessByUser.map(stat => stat.userId);
      const topUsers = await prisma.user.findMany({
        where: {
          id: {
            in: topUserIds
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      const topUsersWithCounts = accessByUser.map(stat => {
        const user = topUsers.find(u => u.id === stat.userId);
        return {
          user,
          count: stat._count.id
        };
      });

      const response: ApiResponse = {
        success: true,
        data: {
          summary: {
            totalAccess,
            activeAccess,
            expiredAccess: totalAccess - activeAccess
          },
          accessByType: accessByTypeFormatted,
          topUsers: topUsersWithCounts,
          period: {
            startDate: startDate || 'all time',
            endDate: endDate || 'now'
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get emergency access statistics error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Manual cleanup endpoint (admin only)
router.post('/cleanup', 
  authenticateToken,
  requireClinicAdmin,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const result = await EmergencyAccessCleanupService.cleanupExpiredAccess();
      
      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Emergency access cleanup completed',
          cleaned: result.cleaned,
          active: result.active,
          total: result.total
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Manual emergency access cleanup error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// System-wide emergency access statistics (admin only)
router.get('/stats/system', 
  authenticateToken,
  requireClinicAdmin,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const stats = await EmergencyAccessCleanupService.getEmergencyAccessStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get system emergency access stats error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

export default router;