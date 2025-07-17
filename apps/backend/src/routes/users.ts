import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { 
  authenticateToken, 
  requireClinicAdmin,
  requireSuperAdmin,
  logUserActivity,
  AuthenticatedRequest 
} from '../middleware/auth';

const router = Router();

// Get all users (filtered by organization for clinic admins)
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

      const { page = 1, limit = 50, role, isActive, search } = req.query;

      // Build where clause
      const whereClause: any = {};

      // Organization filtering
      if (req.user.role === 'clinic_admin') {
        whereClause.organizationId = req.user.organizationId;
      } else if (req.user.role === 'super_admin') {
        // Super admin can see all users
        // Optional organization filter can be added here
      }

      // Role filtering
      if (role) {
        whereClause.role = Array.isArray(role) ? { in: role } : role;
      }

      // Active status filtering
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      // Search filtering
      if (search) {
        whereClause.OR = [
          { name: { contains: search as string } },
          { email: { contains: search as string } }
        ];
      }

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            organizationId: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            },
            patient: {
              select: {
                id: true,
                name: true,
                dateOfBirth: true,
                diagnosisDate: true
              }
            },
            _count: {
              select: {
                caregiverAssignments: true,
                createdAssignments: true,
                sentInvitations: true,
                symptomEntries: true,
                auditLogs: true
              }
            }
          },
          orderBy: { name: 'asc' },
          skip,
          take: Number(limit)
        }),
        prisma.user.count({ where: whereClause })
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          users: users.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            organization: user.organization,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            patient: user.patient,
            stats: {
              caregiverAssignmentCount: user._count.caregiverAssignments,
              createdAssignmentCount: user._count.createdAssignments,
              sentInvitationCount: user._count.sentInvitations,
              symptomEntryCount: user._count.symptomEntries,
              auditLogCount: user._count.auditLogs
            }
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
      console.error('Get users error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get user by ID
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

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          },
          patient: {
            select: {
              id: true,
              name: true,
              dateOfBirth: true,
              diagnosisDate: true,
              emergencyContact: true,
              privacySettings: true
            }
          },
          caregiverAssignments: {
            select: {
              id: true,
              patientId: true,
              status: true,
              caregiverType: true,
              startDate: true,
              endDate: true,
              patient: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              caregiverAssignments: true,
              createdAssignments: true,
              sentInvitations: true,
              symptomEntries: true,
              auditLogs: true
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
      if (req.user.role === 'clinic_admin' && user.organizationId !== req.user.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied to user in different organization',
        };
        return res.status(403).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organization,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          patient: user.patient,
          caregiverAssignments: user.caregiverAssignments,
          stats: {
            caregiverAssignmentCount: user._count.caregiverAssignments,
            createdAssignmentCount: user._count.createdAssignments,
            sentInvitationCount: user._count.sentInvitations,
            symptomEntryCount: user._count.symptomEntries,
            auditLogCount: user._count.auditLogs
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get user error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Update user (admin only)
router.put('/:id', 
  authenticateToken, 
  requireClinicAdmin,
  logUserActivity('UPDATE', 'user'),
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
      const { name, email, role, isActive, organizationId } = req.body;

      // Get current user
      const currentUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!currentUser) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        return res.status(404).json(response);
      }

      // Check authorization
      if (req.user.role === 'clinic_admin' && currentUser.organizationId !== req.user.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied to user in different organization',
        };
        return res.status(403).json(response);
      }

      // Clinic admins cannot change certain fields
      if (req.user.role === 'clinic_admin') {
        if (role !== undefined && role !== currentUser.role) {
          const response: ApiResponse = {
            success: false,
            error: 'Clinic admins cannot change user roles',
          };
          return res.status(403).json(response);
        }

        if (organizationId !== undefined && organizationId !== currentUser.organizationId) {
          const response: ApiResponse = {
            success: false,
            error: 'Clinic admins cannot transfer users to different organizations',
          };
          return res.status(403).json(response);
        }
      }

      // Check if new email conflicts with existing user
      if (email && email !== currentUser.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          const response: ApiResponse = {
            success: false,
            error: 'Email already in use by another user',
          };
          return res.status(400).json(response);
        }
      }

      // Validate role if provided
      if (role !== undefined) {
        const validRoles = ['super_admin', 'clinic_admin', 'professional_caregiver', 'family_caregiver', 'patient'];
        if (!validRoles.includes(role)) {
          const response: ApiResponse = {
            success: false,
            error: 'Invalid role',
          };
          return res.status(400).json(response);
        }
      }

      // Validate organization if provided
      if (organizationId !== undefined && organizationId !== currentUser.organizationId) {
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId }
        });

        if (!organization) {
          const response: ApiResponse = {
            success: false,
            error: 'Organization not found',
          };
          return res.status(404).json(response);
        }

        if (!organization.isActive) {
          const response: ApiResponse = {
            success: false,
            error: 'Cannot transfer user to inactive organization',
          };
          return res.status(400).json(response);
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (organizationId !== undefined) updateData.organizationId = organizationId;

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          },
          patient: {
            select: {
              id: true,
              name: true,
              dateOfBirth: true,
              diagnosisDate: true
            }
          }
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          organizationId: updatedUser.organizationId,
          organization: updatedUser.organization,
          isActive: updatedUser.isActive,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          patient: updatedUser.patient
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Update user error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Deactivate user (admin only)
router.post('/:id/deactivate', 
  authenticateToken, 
  requireClinicAdmin,
  logUserActivity('DEACTIVATE', 'user'),
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

      // Get current user
      const currentUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!currentUser) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        return res.status(404).json(response);
      }

      // Check authorization
      if (req.user.role === 'clinic_admin' && currentUser.organizationId !== req.user.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied to user in different organization',
        };
        return res.status(403).json(response);
      }

      // Prevent self-deactivation
      if (currentUser.id === req.user.userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot deactivate your own account',
        };
        return res.status(400).json(response);
      }

      // Deactivate user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: false },
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

      // Deactivate all active caregiver assignments for this user
      await prisma.caregiverAssignment.updateMany({
        where: {
          caregiverId: id,
          status: 'active'
        },
        data: {
          status: 'inactive',
          endDate: new Date(),
          notes: 'User deactivated'
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          organizationId: updatedUser.organizationId,
          organization: updatedUser.organization,
          isActive: updatedUser.isActive,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Deactivate user error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Reactivate user (admin only)
router.post('/:id/reactivate', 
  authenticateToken, 
  requireClinicAdmin,
  logUserActivity('REACTIVATE', 'user'),
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

      // Get current user
      const currentUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!currentUser) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        return res.status(404).json(response);
      }

      // Check authorization
      if (req.user.role === 'clinic_admin' && currentUser.organizationId !== req.user.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied to user in different organization',
        };
        return res.status(403).json(response);
      }

      // Reactivate user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: true },
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

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          organizationId: updatedUser.organizationId,
          organization: updatedUser.organization,
          isActive: updatedUser.isActive,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Reactivate user error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Delete user (super admin only)
router.delete('/:id', 
  authenticateToken, 
  requireSuperAdmin,
  logUserActivity('DELETE', 'user'),
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

      // Get current user
      const currentUser = await prisma.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              caregiverAssignments: true,
              createdAssignments: true,
              symptomEntries: true
            }
          }
        }
      });

      if (!currentUser) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        return res.status(404).json(response);
      }

      // Prevent self-deletion
      if (currentUser.id === req.user.userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot delete your own account',
        };
        return res.status(400).json(response);
      }

      // Check if user has data that prevents deletion
      if ((currentUser as any)._count.caregiverAssignments > 0 || 
          (currentUser as any)._count.createdAssignments > 0 || 
          (currentUser as any)._count.symptomEntries > 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot delete user with existing data. Deactivate instead.',
        };
        return res.status(400).json(response);
      }

      // Delete user
      await prisma.user.delete({
        where: { id }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'User deleted successfully'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Delete user error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

export default router;