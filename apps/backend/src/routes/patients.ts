import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all patients (organization-scoped)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    let patients: any[] = [];

    switch (req.user.role) {
      case 'super_admin':
        // Super admin can see all patients
        patients = await prisma.patient.findMany({
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;

      case 'clinic_admin':
        // Clinic admin can see patients in their organization
        patients = await prisma.patient.findMany({
          where: {
            organizationId: req.user.organizationId,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;

      case 'professional_caregiver':
      case 'family_caregiver':
        // Caregivers can see patients assigned to them
        patients = await prisma.patient.findMany({
          where: {
            caregiverAssignments: {
              some: {
                caregiverId: req.user.userId,
                status: 'active',
              },
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;

      case 'patient': {
        // Patients can only see their own record
        patients = await prisma.patient.findMany({
          where: {
            userId: req.user.userId,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;
      }

      default: {
        const response: ApiResponse = {
          success: false,
          error: 'Unauthorized role',
        };
        return res.status(403).json(response);
      }
    }

    const response: ApiResponse = {
      success: true,
      data: patients.map((p: any) => ({
        id: p.id,
        user_id: p.userId,
        organization_id: p.organizationId,
        name: p.name,
        date_of_birth: p.dateOfBirth,
        diagnosis_date: p.diagnosisDate,
        emergency_contact: JSON.parse(p.emergencyContact || '{}'),
        privacy_settings: JSON.parse(p.privacySettings || '{}'),
        user: p.user,
        organization: p.organization,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('Get patients error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Create new patient
router.post(
  '/',
  authenticateToken,
  authorizeRole(['patient', 'healthcare_provider']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { name, dateOfBirth, diagnosisDate, userId } = req.body;

      // Validate input
      if (!name || !dateOfBirth || !diagnosisDate) {
        const response: ApiResponse = {
          success: false,
          error: 'Missing required fields',
        };
        return res.status(400).json(response);
      }

      // For patients, they can only create their own record
      const targetUserId = req.user?.role === 'patient' ? req.user.userId : userId;

      if (!targetUserId) {
        const response: ApiResponse = {
          success: false,
          error: 'User ID is required',
        };
        return res.status(400).json(response);
      }

      // Check if patient already exists for this user
      const existingPatient = await prisma.patient.findUnique({
        where: { userId: targetUserId },
      });

      if (existingPatient) {
        const response: ApiResponse = {
          success: false,
          error: 'Patient record already exists for this user',
        };
        return res.status(400).json(response);
      }

      // Create patient
      const patient = await prisma.patient.create({
        data: {
          userId: targetUserId,
          organizationId: req.user?.organizationId || 'default_org',
          name,
          dateOfBirth: new Date(dateOfBirth),
          diagnosisDate: new Date(diagnosisDate),
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: patient.id,
          userId: patient.userId,
          name: patient.name,
          dateOfBirth: patient.dateOfBirth,
          diagnosisDate: patient.diagnosisDate,
          caregiverIds: [],
          healthcareProviderIds: [],
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create patient error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get patient by ID
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    let patient: any = null;

    switch (req.user.role) {
      case 'super_admin':
        // Super admin can access any patient
        patient = await prisma.patient.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            caregiverAssignments: {
              where: { status: 'active' },
              include: {
                caregiver: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        });
        break;

      case 'clinic_admin':
        // Clinic admin can access patients in their organization
        patient = await prisma.patient.findFirst({
          where: {
            id,
            organizationId: req.user.organizationId,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            caregiverAssignments: {
              where: { status: 'active' },
              include: {
                caregiver: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        });
        break;

      case 'professional_caregiver':
      case 'family_caregiver':
        // Caregivers can access patients assigned to them
        patient = await prisma.patient.findFirst({
          where: {
            id,
            caregiverAssignments: {
              some: {
                caregiverId: req.user.userId,
                status: 'active',
              },
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            caregiverAssignments: {
              where: { status: 'active' },
              include: {
                caregiver: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        });
        break;

      case 'patient': {
        // Patients can only access their own record
        patient = await prisma.patient.findFirst({
          where: {
            id,
            userId: req.user.userId,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            caregiverAssignments: {
              where: { status: 'active' },
              include: {
                caregiver: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        });
        break;
      }

      default: {
        const response: ApiResponse = {
          success: false,
          error: 'Unauthorized role',
        };
        return res.status(403).json(response);
      }
    }

    if (!patient) {
      const response: ApiResponse = {
        success: false,
        error: 'Patient not found or access denied',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        id: patient.id,
        userId: patient.userId,
        organizationId: patient.organizationId,
        name: patient.name,
        dateOfBirth: patient.dateOfBirth,
        diagnosisDate: patient.diagnosisDate,
        emergencyContact: JSON.parse(patient.emergencyContact || '{}'),
        privacySettings: JSON.parse(patient.privacySettings || '{}'),
        user: patient.user,
        organization: patient.organization,
        caregiverAssignments: patient.caregiverAssignments,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Get patient error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

export default router;
