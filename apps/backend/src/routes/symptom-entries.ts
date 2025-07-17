import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get symptom entries for a patient
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { patientId, startDate, endDate, limit = 50 } = req.query;

    if (!patientId) {
      const response: ApiResponse = {
        success: false,
        error: 'Patient ID is required',
      };
      return res.status(400).json(response);
    }

    // Check if user has access to this patient
    let hasAccess = false;

    if (req.user?.role === 'healthcare_provider') {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId as string,
          healthcareProviders: {
            some: {
              healthcareProviderId: req.user.userId,
            },
          },
        },
      });
      hasAccess = !!patient;
    } else if (req.user?.role === 'caregiver') {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId as string,
          caregivers: {
            some: {
              caregiverId: req.user.userId,
            },
          },
        },
      });
      hasAccess = !!patient;
    } else if (req.user?.role === 'patient') {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId as string,
          userId: req.user.userId,
        },
      });
      hasAccess = !!patient;
    }

    if (!hasAccess) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied to this patient',
      };
      return res.status(403).json(response);
    }

    // Build query for symptom entries with date filtering
    const whereClause: any = {
      patientId: patientId as string,
    };

    if (startDate) {
      whereClause.entryDate = {
        ...whereClause.entryDate,
        gte: new Date(startDate as string),
      };
    }

    if (endDate) {
      whereClause.entryDate = {
        ...whereClause.entryDate,
        lte: new Date(endDate as string),
      };
    }

    const symptomEntries = await prisma.symptomEntry.findMany({
      where: whereClause,
      include: {
        completedByUser: {
          select: { name: true },
        },
      },
      orderBy: {
        entryDate: 'desc',
      },
      take: parseInt(limit as string),
    });

    const response: ApiResponse = {
      success: true,
      data: symptomEntries.map((entry: any) => ({
        id: entry.id,
        patientId: entry.patientId,
        entryDate: entry.entryDate,
        completedBy: entry.completedBy,
        completedByName: entry.completedByUser.name,
        motorSymptoms: entry.motorSymptoms,
        nonMotorSymptoms: entry.nonMotorSymptoms,
        autonomicSymptoms: entry.autonomicSymptoms,
        dailyActivities: entry.dailyActivities,
        environmentalFactors: entry.environmentalFactors,
        safetyIncidents: entry.safetyIncidents,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('Get symptom entries error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Create new symptom entry
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      patientId,
      entryDate,
      motorSymptoms,
      nonMotorSymptoms,
      autonomicSymptoms,
      dailyActivities,
      environmentalFactors,
      safetyIncidents,
      notes,
    } = req.body;

    // Validate input
    if (!patientId || !entryDate || !motorSymptoms || !nonMotorSymptoms || !autonomicSymptoms || !dailyActivities || !environmentalFactors) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields',
      };
      return res.status(400).json(response);
    }

    // Check if user has access to this patient
    let hasAccess = false;

    if (req.user?.role === 'healthcare_provider') {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          healthcareProviders: {
            some: {
              healthcareProviderId: req.user.userId,
            },
          },
        },
      });
      hasAccess = !!patient;
    } else if (req.user?.role === 'caregiver') {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          caregivers: {
            some: {
              caregiverId: req.user.userId,
            },
          },
        },
      });
      hasAccess = !!patient;
    } else if (req.user?.role === 'patient') {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          userId: req.user.userId,
        },
      });
      hasAccess = !!patient;
    }

    if (!hasAccess) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied to this patient',
      };
      return res.status(403).json(response);
    }

    // Check if entry already exists for this date
    const existingEntry = await prisma.symptomEntry.findFirst({
      where: {
        patientId,
        entryDate: new Date(entryDate),
      },
    });

    if (existingEntry) {
      const response: ApiResponse = {
        success: false,
        error: 'Symptom entry already exists for this date',
      };
      return res.status(400).json(response);
    }

    // Create symptom entry
    const entry = await prisma.symptomEntry.create({
      data: {
        patientId,
        entryDate: new Date(entryDate),
        completedBy: req.user?.userId!,
        motorSymptoms: JSON.stringify(motorSymptoms),
        nonMotorSymptoms: JSON.stringify(nonMotorSymptoms),
        autonomicSymptoms: JSON.stringify(autonomicSymptoms),
        dailyActivities: JSON.stringify(dailyActivities),
        environmentalFactors: JSON.stringify(environmentalFactors),
        safetyIncidents: JSON.stringify(safetyIncidents || []),
        notes: notes || '',
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        id: entry.id,
        patientId: entry.patientId,
        entryDate: entry.entryDate,
        completedBy: entry.completedBy,
        motorSymptoms: entry.motorSymptoms,
        nonMotorSymptoms: entry.nonMotorSymptoms,
        autonomicSymptoms: entry.autonomicSymptoms,
        dailyActivities: entry.dailyActivities,
        environmentalFactors: entry.environmentalFactors,
        safetyIncidents: entry.safetyIncidents,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create symptom entry error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Get symptom entry by ID
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Get symptom entry with access check
    let entry: any = null;

    if (req.user?.role === 'healthcare_provider') {
      entry = await prisma.symptomEntry.findFirst({
        where: {
          id,
          patient: {
            healthcareProviders: {
              some: {
                healthcareProviderId: req.user.userId,
              },
            },
          },
        },
        include: {
          completedByUser: {
            select: { name: true },
          },
        },
      });
    } else if (req.user?.role === 'caregiver') {
      entry = await prisma.symptomEntry.findFirst({
        where: {
          id,
          patient: {
            caregivers: {
              some: {
                caregiverId: req.user.userId,
              },
            },
          },
        },
        include: {
          completedByUser: {
            select: { name: true },
          },
        },
      });
    } else if (req.user?.role === 'patient') {
      entry = await prisma.symptomEntry.findFirst({
        where: {
          id,
          patient: {
            userId: req.user.userId,
          },
        },
        include: {
          completedByUser: {
            select: { name: true },
          },
        },
      });
    }

    if (!entry) {
      const response: ApiResponse = {
        success: false,
        error: 'Symptom entry not found or access denied',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        id: entry.id,
        patientId: entry.patientId,
        entryDate: entry.entryDate,
        completedBy: entry.completedBy,
        completedByName: entry.completedByUser.name,
        motorSymptoms: entry.motorSymptoms,
        nonMotorSymptoms: entry.nonMotorSymptoms,
        autonomicSymptoms: entry.autonomicSymptoms,
        dailyActivities: entry.dailyActivities,
        environmentalFactors: entry.environmentalFactors,
        safetyIncidents: entry.safetyIncidents,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Get symptom entry error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

export default router;