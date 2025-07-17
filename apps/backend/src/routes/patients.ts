import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all patients (for healthcare providers and caregivers)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    let patients: any[] = [];

    if (req.user?.role === 'healthcare_provider') {
      patients = await prisma.patient.findMany({
        where: {
          healthcareProviders: {
            some: {
              healthcareProviderId: req.user.userId,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } else if (req.user?.role === 'caregiver') {
      patients = await prisma.patient.findMany({
        where: {
          caregivers: {
            some: {
              caregiverId: req.user.userId,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } else if (req.user?.role === 'patient') {
      patients = await prisma.patient.findMany({
        where: {
          userId: req.user.userId,
        },
        orderBy: { name: 'asc' },
      });
    }

    const response: ApiResponse = {
      success: true,
      data: patients.map(p => ({
        id: p.id,
        user_id: p.userId,
        name: p.name,
        date_of_birth: p.dateOfBirth,
        diagnosis_date: p.diagnosisDate,
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
router.post('/', authenticateToken, authorizeRole(['patient', 'healthcare_provider']), async (req: AuthenticatedRequest, res) => {
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
});

// Get patient by ID
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Check if user has access to this patient
    let patient: any = null;

    if (req.user?.role === 'healthcare_provider') {
      patient = await prisma.patient.findFirst({
        where: {
          id,
          healthcareProviders: {
            some: {
              healthcareProviderId: req.user.userId,
            },
          },
        },
        include: {
          caregivers: { select: { caregiverId: true } },
          healthcareProviders: { select: { healthcareProviderId: true } },
        },
      });
    } else if (req.user?.role === 'caregiver') {
      patient = await prisma.patient.findFirst({
        where: {
          id,
          caregivers: {
            some: {
              caregiverId: req.user.userId,
            },
          },
        },
        include: {
          caregivers: { select: { caregiverId: true } },
          healthcareProviders: { select: { healthcareProviderId: true } },
        },
      });
    } else if (req.user?.role === 'patient') {
      patient = await prisma.patient.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
        include: {
          caregivers: { select: { caregiverId: true } },
          healthcareProviders: { select: { healthcareProviderId: true } },
        },
      });
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
        name: patient.name,
        dateOfBirth: patient.dateOfBirth,
        diagnosisDate: patient.diagnosisDate,
        caregiverIds: patient.caregivers.map((c: any) => c.caregiverId),
        healthcareProviderIds: patient.healthcareProviders.map((h: any) => h.healthcareProviderId),
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