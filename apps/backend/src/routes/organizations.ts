import { Router, Response } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import {
  authenticateToken,
  requireSuperAdmin,
  requireClinicAdmin,
  logUserActivity,
  AuthenticatedRequest,
} from '../middleware/auth';

const router = Router();

// Get all organizations (super admin only)
router.get(
  '/',
  authenticateToken,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const organizations = await prisma.organization.findMany({
        include: {
          _count: {
            select: {
              users: true,
              patients: true,
              auditLogs: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      const response: ApiResponse = {
        success: true,
        data: organizations.map((org: any) => ({
          id: org.id,
          name: org.name,
          description: org.description,
          settings: JSON.parse(org.settings || '{}'),
          isActive: org.isActive,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
          stats: {
            userCount: org._count.users,
            patientCount: org._count.patients,
            auditLogCount: org._count.auditLogs,
          },
        })),
      };

      res.json(response);
    } catch (error) {
      console.error('Get organizations error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get current user's organization
router.get(
  '/current',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      if (!req.user.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'User is not associated with any organization',
        };
        return res.status(404).json(response);
      }

      const organization = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        include: {
          _count: {
            select: {
              users: true,
              patients: true,
              auditLogs: true,
            },
          },
        },
      });

      if (!organization) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization not found',
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          id: organization.id,
          name: organization.name,
          description: organization.description,
          settings: JSON.parse(organization.settings || '{}'),
          isActive: organization.isActive,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
          stats: {
            userCount: organization._count.users,
            patientCount: organization._count.patients,
            auditLogCount: organization._count.auditLogs,
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get current organization error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Create new organization (super admin only)
router.post(
  '/',
  authenticateToken,
  requireSuperAdmin,
  logUserActivity('CREATE', 'organization'),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { name, description, settings } = req.body;

      // Validate input
      if (!name) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization name is required',
        };
        return res.status(400).json(response);
      }

      // Check if organization name already exists
      const existingOrg = await prisma.organization.findFirst({
        where: { name },
      });

      if (existingOrg) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization name already exists',
        };
        return res.status(400).json(response);
      }

      // Create organization
      const organization = await prisma.organization.create({
        data: {
          name,
          description: description || '',
          settings: JSON.stringify(settings || {}),
          isActive: true,
        },
        include: {
          _count: {
            select: {
              users: true,
              patients: true,
              auditLogs: true,
            },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: organization.id,
          name: organization.name,
          description: organization.description,
          settings: JSON.parse(organization.settings || '{}'),
          isActive: organization.isActive,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
          stats: {
            userCount: organization._count.users,
            patientCount: organization._count.patients,
            auditLogCount: organization._count.auditLogs,
          },
        },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create organization error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get organization by ID
router.get(
  '/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
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

      const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              patients: true,
              auditLogs: true,
            },
          },
        },
      });

      if (!organization) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization not found',
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          id: organization.id,
          name: organization.name,
          description: organization.description,
          settings: JSON.parse(organization.settings || '{}'),
          isActive: organization.isActive,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
          stats: {
            userCount: organization._count.users,
            patientCount: organization._count.patients,
            auditLogCount: organization._count.auditLogs,
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get organization error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Update organization
router.put(
  '/:id',
  authenticateToken,
  logUserActivity('UPDATE', 'organization'),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { id } = req.params;
      const { name, description, settings, isActive } = req.body;

      // Check authorization
      if (req.user.role !== 'super_admin' && req.user.organizationId !== id) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied to update this organization',
        };
        return res.status(403).json(response);
      }

      // Clinic admins can only update settings, not name/description/isActive
      if (req.user.role === 'clinic_admin') {
        if (name !== undefined || description !== undefined || isActive !== undefined) {
          const response: ApiResponse = {
            success: false,
            error: 'Clinic admins can only update organization settings',
          };
          return res.status(403).json(response);
        }
      }

      // Get current organization
      const currentOrg = await prisma.organization.findUnique({
        where: { id },
      });

      if (!currentOrg) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization not found',
        };
        return res.status(404).json(response);
      }

      // Check if new name conflicts with existing organization
      if (name && name !== currentOrg.name) {
        const existingOrg = await prisma.organization.findFirst({
          where: {
            name,
            id: { not: id },
          },
        });

        if (existingOrg) {
          const response: ApiResponse = {
            success: false,
            error: 'Organization name already exists',
          };
          return res.status(400).json(response);
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (settings !== undefined) updateData.settings = JSON.stringify(settings);
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update organization
      const updatedOrg = await prisma.organization.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              users: true,
              patients: true,
              auditLogs: true,
            },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedOrg.id,
          name: updatedOrg.name,
          description: updatedOrg.description,
          settings: JSON.parse(updatedOrg.settings || '{}'),
          isActive: updatedOrg.isActive,
          createdAt: updatedOrg.createdAt,
          updatedAt: updatedOrg.updatedAt,
          stats: {
            userCount: updatedOrg._count.users,
            patientCount: updatedOrg._count.patients,
            auditLogCount: updatedOrg._count.auditLogs,
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Update organization error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Delete organization (super admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireSuperAdmin,
  logUserActivity('DELETE', 'organization'),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;

      // Check if organization exists
      const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              patients: true,
            },
          },
        },
      });

      if (!organization) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization not found',
        };
        return res.status(404).json(response);
      }

      // Prevent deletion of organization with users or patients
      if (organization._count.users > 0 || organization._count.patients > 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot delete organization with existing users or patients',
        };
        return res.status(400).json(response);
      }

      // Delete organization
      await prisma.organization.delete({
        where: { id },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Organization deleted successfully',
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Delete organization error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get organization users (admin only)
router.get(
  '/:id/users',
  authenticateToken,
  requireClinicAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
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

      const users = await prisma.user.findMany({
        where: { organizationId: id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              name: true,
              dateOfBirth: true,
              diagnosisDate: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      const response: ApiResponse = {
        success: true,
        data: users,
      };

      res.json(response);
    } catch (error) {
      console.error('Get organization users error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get organization patients (admin only)
router.get(
  '/:id/patients',
  authenticateToken,
  requireClinicAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
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

      const patients = await prisma.patient.findMany({
        where: { organizationId: id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
          _count: {
            select: {
              caregiverAssignments: true,
              symptomEntries: true,
              weeklySummaries: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      const response: ApiResponse = {
        success: true,
        data: patients.map((patient: any) => ({
          id: patient.id,
          name: patient.name,
          dateOfBirth: patient.dateOfBirth,
          diagnosisDate: patient.diagnosisDate,
          emergencyContact: JSON.parse(patient.emergencyContact || '{}'),
          privacySettings: JSON.parse(patient.privacySettings || '{}'),
          user: patient.user,
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt,
          stats: {
            caregiverCount: patient._count.caregiverAssignments,
            symptomEntryCount: patient._count.symptomEntries,
            weeklySummaryCount: patient._count.weeklySummaries,
          },
        })),
      };

      res.json(response);
    } catch (error) {
      console.error('Get organization patients error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Switch organization (super admin only)
router.post(
  '/switch/:id',
  authenticateToken,
  requireSuperAdmin,
  logUserActivity('SWITCH', 'organization'),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { id } = req.params;

      // Check if organization exists
      const organization = await prisma.organization.findUnique({
        where: { id },
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
          error: 'Cannot switch to inactive organization',
        };
        return res.status(400).json(response);
      }

      // Update user's organization
      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: { organizationId: id },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Organization switched successfully',
          user: {
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
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Switch organization error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

export default router;
