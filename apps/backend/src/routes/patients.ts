import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all patients (for healthcare providers and caregivers)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    let query = '';
    let params: any[] = [];

    if (req.user?.role === 'healthcare_provider') {
      query = `
        SELECT p.id, p.user_id, p.name, p.date_of_birth, p.diagnosis_date, p.created_at, p.updated_at
        FROM patients p
        JOIN patient_healthcare_providers php ON p.id = php.patient_id
        WHERE php.healthcare_provider_id = $1
        ORDER BY p.name
      `;
      params = [req.user.userId];
    } else if (req.user?.role === 'caregiver') {
      query = `
        SELECT p.id, p.user_id, p.name, p.date_of_birth, p.diagnosis_date, p.created_at, p.updated_at
        FROM patients p
        JOIN patient_caregivers pc ON p.id = pc.patient_id
        WHERE pc.caregiver_id = $1
        ORDER BY p.name
      `;
      params = [req.user.userId];
    } else if (req.user?.role === 'patient') {
      query = `
        SELECT p.id, p.user_id, p.name, p.date_of_birth, p.diagnosis_date, p.created_at, p.updated_at
        FROM patients p
        WHERE p.user_id = $1
        ORDER BY p.name
      `;
      params = [req.user.userId];
    }

    const result = await pool.query(query, params);

    const response: ApiResponse = {
      success: true,
      data: result.rows,
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
    const existingPatient = await pool.query(
      'SELECT id FROM patients WHERE user_id = $1',
      [targetUserId]
    );

    if (existingPatient.rows.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Patient record already exists for this user',
      };
      return res.status(400).json(response);
    }

    // Create patient
    const result = await pool.query(
      'INSERT INTO patients (id, user_id, name, date_of_birth, diagnosis_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [uuidv4(), targetUserId, name, new Date(dateOfBirth), new Date(diagnosisDate)]
    );

    const patient = result.rows[0];

    const response: ApiResponse = {
      success: true,
      data: {
        id: patient.id,
        userId: patient.user_id,
        name: patient.name,
        dateOfBirth: patient.date_of_birth,
        diagnosisDate: patient.diagnosis_date,
        caregiverIds: [],
        healthcareProviderIds: [],
        createdAt: patient.created_at,
        updatedAt: patient.updated_at,
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
    let query = '';
    let params: any[] = [];

    if (req.user?.role === 'healthcare_provider') {
      query = `
        SELECT p.id, p.user_id, p.name, p.date_of_birth, p.diagnosis_date, p.created_at, p.updated_at
        FROM patients p
        JOIN patient_healthcare_providers php ON p.id = php.patient_id
        WHERE p.id = $1 AND php.healthcare_provider_id = $2
      `;
      params = [id, req.user.userId];
    } else if (req.user?.role === 'caregiver') {
      query = `
        SELECT p.id, p.user_id, p.name, p.date_of_birth, p.diagnosis_date, p.created_at, p.updated_at
        FROM patients p
        JOIN patient_caregivers pc ON p.id = pc.patient_id
        WHERE p.id = $1 AND pc.caregiver_id = $2
      `;
      params = [id, req.user.userId];
    } else if (req.user?.role === 'patient') {
      query = `
        SELECT p.id, p.user_id, p.name, p.date_of_birth, p.diagnosis_date, p.created_at, p.updated_at
        FROM patients p
        WHERE p.id = $1 AND p.user_id = $2
      `;
      params = [id, req.user.userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Patient not found or access denied',
      };
      return res.status(404).json(response);
    }

    // Get caregivers and healthcare providers
    const caregivers = await pool.query(
      'SELECT caregiver_id FROM patient_caregivers WHERE patient_id = $1',
      [id]
    );

    const healthcareProviders = await pool.query(
      'SELECT healthcare_provider_id FROM patient_healthcare_providers WHERE patient_id = $1',
      [id]
    );

    const patient = result.rows[0];

    const response: ApiResponse = {
      success: true,
      data: {
        id: patient.id,
        userId: patient.user_id,
        name: patient.name,
        dateOfBirth: patient.date_of_birth,
        diagnosisDate: patient.diagnosis_date,
        caregiverIds: caregivers.rows.map(row => row.caregiver_id),
        healthcareProviderIds: healthcareProviders.rows.map(row => row.healthcare_provider_id),
        createdAt: patient.created_at,
        updatedAt: patient.updated_at,
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