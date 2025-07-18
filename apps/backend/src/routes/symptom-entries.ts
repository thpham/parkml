import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse, DataCategory } from '@parkml/shared';
import { authenticateToken } from '../middleware/auth';
import { 
  requireDataAccess, 
  AccessControlRequest,
  hasDataCategoryAccess,
  getMaxAccessLevel
} from '../crypto/access-control-middleware';

const router = Router();

// Get symptom entries for a patient
router.get('/', 
  authenticateToken, 
  requireDataAccess([
    DataCategory.MOTOR_SYMPTOMS,
    DataCategory.NON_MOTOR_SYMPTOMS,
    DataCategory.AUTONOMIC_SYMPTOMS,
    DataCategory.DAILY_ACTIVITIES,
    DataCategory.ENVIRONMENTAL_FACTORS,
    DataCategory.SAFETY_INCIDENTS
  ]), 
  async (req: AccessControlRequest, res) => {
  try {
    const { patientId, startDate, endDate, limit = 50 } = req.query;

    if (!patientId) {
      const response: ApiResponse = {
        success: false,
        error: 'Patient ID is required',
      };
      return res.status(400).json(response);
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
        // Filter data based on accessible categories
        motorSymptoms: hasDataCategoryAccess(req, DataCategory.MOTOR_SYMPTOMS) ? entry.motorSymptoms : null,
        nonMotorSymptoms: hasDataCategoryAccess(req, DataCategory.NON_MOTOR_SYMPTOMS) ? entry.nonMotorSymptoms : null,
        autonomicSymptoms: hasDataCategoryAccess(req, DataCategory.AUTONOMIC_SYMPTOMS) ? entry.autonomicSymptoms : null,
        dailyActivities: hasDataCategoryAccess(req, DataCategory.DAILY_ACTIVITIES) ? entry.dailyActivities : null,
        environmentalFactors: hasDataCategoryAccess(req, DataCategory.ENVIRONMENTAL_FACTORS) ? entry.environmentalFactors : null,
        safetyIncidents: hasDataCategoryAccess(req, DataCategory.SAFETY_INCIDENTS) ? entry.safetyIncidents : null,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        // Add access control metadata
        accessLevel: getMaxAccessLevel(req),
        accessibleCategories: req.accessControl?.accessibleCategories || []
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
router.post('/', 
  authenticateToken, 
  requireDataAccess([
    DataCategory.MOTOR_SYMPTOMS,
    DataCategory.NON_MOTOR_SYMPTOMS,
    DataCategory.AUTONOMIC_SYMPTOMS,
    DataCategory.DAILY_ACTIVITIES,
    DataCategory.ENVIRONMENTAL_FACTORS,
    DataCategory.SAFETY_INCIDENTS
  ]), 
  async (req: AccessControlRequest, res) => {
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

    // Access control is handled by middleware

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
        completedBy: req.user?.id!,
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
router.get('/:id', 
  authenticateToken, 
  async (req: AccessControlRequest, res) => {
  try {
    const { id } = req.params;

    // Find the symptom entry first to get patient ID
    const entry = await prisma.symptomEntry.findUnique({
      where: { id },
      include: {
        completedByUser: {
          select: { name: true },
        },
      },
    });

    if (!entry) {
      const response: ApiResponse = {
        success: false,
        error: 'Symptom entry not found',
      };
      return res.status(404).json(response);
    }

    // Create access control middleware dynamically for this patient
    const accessMiddleware = requireDataAccess([
      DataCategory.MOTOR_SYMPTOMS,
      DataCategory.NON_MOTOR_SYMPTOMS,
      DataCategory.AUTONOMIC_SYMPTOMS,
      DataCategory.DAILY_ACTIVITIES,
      DataCategory.ENVIRONMENTAL_FACTORS,
      DataCategory.SAFETY_INCIDENTS
    ]);

    // Override patient ID in request for access control
    req.params.patientId = entry.patientId;

    // Check access control
    await new Promise<void>((resolve, reject) => {
      accessMiddleware(req, res, (error?: any) => {
        if (error) reject(error);
        else resolve();
      });
    }).catch(() => {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied to this patient data',
      };
      return res.status(403).json(response);
    });

    const response: ApiResponse = {
      success: true,
      data: {
        id: entry.id,
        patientId: entry.patientId,
        entryDate: entry.entryDate,
        completedBy: entry.completedBy,
        completedByName: entry.completedByUser.name,
        // Filter data based on accessible categories
        motorSymptoms: hasDataCategoryAccess(req, DataCategory.MOTOR_SYMPTOMS) ? entry.motorSymptoms : null,
        nonMotorSymptoms: hasDataCategoryAccess(req, DataCategory.NON_MOTOR_SYMPTOMS) ? entry.nonMotorSymptoms : null,
        autonomicSymptoms: hasDataCategoryAccess(req, DataCategory.AUTONOMIC_SYMPTOMS) ? entry.autonomicSymptoms : null,
        dailyActivities: hasDataCategoryAccess(req, DataCategory.DAILY_ACTIVITIES) ? entry.dailyActivities : null,
        environmentalFactors: hasDataCategoryAccess(req, DataCategory.ENVIRONMENTAL_FACTORS) ? entry.environmentalFactors : null,
        safetyIncidents: hasDataCategoryAccess(req, DataCategory.SAFETY_INCIDENTS) ? entry.safetyIncidents : null,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        // Add access control metadata
        accessLevel: getMaxAccessLevel(req),
        accessibleCategories: req.accessControl?.accessibleCategories || []
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