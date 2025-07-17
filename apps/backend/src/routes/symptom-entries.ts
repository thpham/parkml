import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
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
    let accessQuery = '';
    let accessParams: any[] = [];

    if (req.user?.role === 'healthcare_provider') {
      accessQuery = `
        SELECT 1 FROM patients p
        JOIN patient_healthcare_providers php ON p.id = php.patient_id
        WHERE p.id = $1 AND php.healthcare_provider_id = $2
      `;
      accessParams = [patientId, req.user.userId];
    } else if (req.user?.role === 'caregiver') {
      accessQuery = `
        SELECT 1 FROM patients p
        JOIN patient_caregivers pc ON p.id = pc.patient_id
        WHERE p.id = $1 AND pc.caregiver_id = $2
      `;
      accessParams = [patientId, req.user.userId];
    } else if (req.user?.role === 'patient') {
      accessQuery = `
        SELECT 1 FROM patients p
        WHERE p.id = $1 AND p.user_id = $2
      `;
      accessParams = [patientId, req.user.userId];
    }

    const accessResult = await pool.query(accessQuery, accessParams);

    if (accessResult.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied to this patient',
      };
      return res.status(403).json(response);
    }

    // Build query for symptom entries
    let query = `
      SELECT se.*, u.name as completed_by_name
      FROM symptom_entries se
      JOIN users u ON se.completed_by = u.id
      WHERE se.patient_id = $1
    `;
    let params: any[] = [patientId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND se.entry_date >= $${paramIndex}`;
      params.push(new Date(startDate as string));
      paramIndex++;
    }

    if (endDate) {
      query += ` AND se.entry_date <= $${paramIndex}`;
      params.push(new Date(endDate as string));
      paramIndex++;
    }

    query += ` ORDER BY se.entry_date DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string));

    const result = await pool.query(query, params);

    const response: ApiResponse = {
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        patientId: row.patient_id,
        entryDate: row.entry_date,
        completedBy: row.completed_by,
        completedByName: row.completed_by_name,
        motorSymptoms: row.motor_symptoms,
        nonMotorSymptoms: row.non_motor_symptoms,
        autonomicSymptoms: row.autonomic_symptoms,
        dailyActivities: row.daily_activities,
        environmentalFactors: row.environmental_factors,
        safetyIncidents: row.safety_incidents,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
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
    let accessQuery = '';
    let accessParams: any[] = [];

    if (req.user?.role === 'healthcare_provider') {
      accessQuery = `
        SELECT 1 FROM patients p
        JOIN patient_healthcare_providers php ON p.id = php.patient_id
        WHERE p.id = $1 AND php.healthcare_provider_id = $2
      `;
      accessParams = [patientId, req.user.userId];
    } else if (req.user?.role === 'caregiver') {
      accessQuery = `
        SELECT 1 FROM patients p
        JOIN patient_caregivers pc ON p.id = pc.patient_id
        WHERE p.id = $1 AND pc.caregiver_id = $2
      `;
      accessParams = [patientId, req.user.userId];
    } else if (req.user?.role === 'patient') {
      accessQuery = `
        SELECT 1 FROM patients p
        WHERE p.id = $1 AND p.user_id = $2
      `;
      accessParams = [patientId, req.user.userId];
    }

    const accessResult = await pool.query(accessQuery, accessParams);

    if (accessResult.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied to this patient',
      };
      return res.status(403).json(response);
    }

    // Check if entry already exists for this date
    const existingEntry = await pool.query(
      'SELECT id FROM symptom_entries WHERE patient_id = $1 AND entry_date = $2',
      [patientId, new Date(entryDate)]
    );

    if (existingEntry.rows.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Symptom entry already exists for this date',
      };
      return res.status(400).json(response);
    }

    // Create symptom entry
    const result = await pool.query(
      `INSERT INTO symptom_entries (
        id, patient_id, entry_date, completed_by, motor_symptoms, non_motor_symptoms,
        autonomic_symptoms, daily_activities, environmental_factors, safety_incidents, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        uuidv4(),
        patientId,
        new Date(entryDate),
        req.user?.userId,
        JSON.stringify(motorSymptoms),
        JSON.stringify(nonMotorSymptoms),
        JSON.stringify(autonomicSymptoms),
        JSON.stringify(dailyActivities),
        JSON.stringify(environmentalFactors),
        JSON.stringify(safetyIncidents || []),
        notes || '',
      ]
    );

    const entry = result.rows[0];

    const response: ApiResponse = {
      success: true,
      data: {
        id: entry.id,
        patientId: entry.patient_id,
        entryDate: entry.entry_date,
        completedBy: entry.completed_by,
        motorSymptoms: entry.motor_symptoms,
        nonMotorSymptoms: entry.non_motor_symptoms,
        autonomicSymptoms: entry.autonomic_symptoms,
        dailyActivities: entry.daily_activities,
        environmentalFactors: entry.environmental_factors,
        safetyIncidents: entry.safety_incidents,
        notes: entry.notes,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
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
    let query = '';
    let params: any[] = [];

    if (req.user?.role === 'healthcare_provider') {
      query = `
        SELECT se.*, u.name as completed_by_name
        FROM symptom_entries se
        JOIN patients p ON se.patient_id = p.id
        JOIN patient_healthcare_providers php ON p.id = php.patient_id
        JOIN users u ON se.completed_by = u.id
        WHERE se.id = $1 AND php.healthcare_provider_id = $2
      `;
      params = [id, req.user.userId];
    } else if (req.user?.role === 'caregiver') {
      query = `
        SELECT se.*, u.name as completed_by_name
        FROM symptom_entries se
        JOIN patients p ON se.patient_id = p.id
        JOIN patient_caregivers pc ON p.id = pc.patient_id
        JOIN users u ON se.completed_by = u.id
        WHERE se.id = $1 AND pc.caregiver_id = $2
      `;
      params = [id, req.user.userId];
    } else if (req.user?.role === 'patient') {
      query = `
        SELECT se.*, u.name as completed_by_name
        FROM symptom_entries se
        JOIN patients p ON se.patient_id = p.id
        JOIN users u ON se.completed_by = u.id
        WHERE se.id = $1 AND p.user_id = $2
      `;
      params = [id, req.user.userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Symptom entry not found or access denied',
      };
      return res.status(404).json(response);
    }

    const entry = result.rows[0];

    const response: ApiResponse = {
      success: true,
      data: {
        id: entry.id,
        patientId: entry.patient_id,
        entryDate: entry.entry_date,
        completedBy: entry.completed_by,
        completedByName: entry.completed_by_name,
        motorSymptoms: entry.motor_symptoms,
        nonMotorSymptoms: entry.non_motor_symptoms,
        autonomicSymptoms: entry.autonomic_symptoms,
        dailyActivities: entry.daily_activities,
        environmentalFactors: entry.environmental_factors,
        safetyIncidents: entry.safety_incidents,
        notes: entry.notes,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
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