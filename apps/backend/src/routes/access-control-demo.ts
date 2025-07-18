/**
 * Access Control Demo Routes
 * Demonstrates multi-tier access control capabilities
 */

import { Router } from 'express';
import { ApiResponse, DataCategory, AccessLevel } from '@parkml/shared';
import { authenticateToken } from '../middleware/auth';
import { 
  requireDataAccess, 
  requirePatientAccess,
  requireOrganizationAdmin,
  requireEmergencyAccess,
  AccessControlRequest,
  hasDataCategoryAccess,
  getMaxAccessLevel,
  isTemporaryAccess,
  getRemainingAccessMinutes
} from '../crypto/access-control-middleware';

const router = Router();

/**
 * Demonstrate different access levels to motor symptoms data
 */
router.get('/motor-symptoms/:patientId', 
  authenticateToken,
  requireDataAccess([DataCategory.MOTOR_SYMPTOMS], AccessLevel.CAREGIVER_FAMILY),
  async (req: AccessControlRequest, res) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          accessLevel: getMaxAccessLevel(req),
          canAccessMotorSymptoms: hasDataCategoryAccess(req, DataCategory.MOTOR_SYMPTOMS),
          temporaryAccess: isTemporaryAccess(req),
          remainingMinutes: getRemainingAccessMinutes(req),
          accessibleCategories: req.accessControl?.accessibleCategories || [],
          message: 'Motor symptoms access granted'
        }
      };
      res.json(response);
    } catch (error) {
      console.error('Motor symptoms demo error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * Demonstrate professional caregiver access to sensitive autonomic data
 */
router.get('/autonomic-symptoms/:patientId', 
  authenticateToken,
  requireDataAccess([DataCategory.AUTONOMIC_SYMPTOMS], AccessLevel.CAREGIVER_PROFESSIONAL),
  async (req: AccessControlRequest, res) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          accessLevel: getMaxAccessLevel(req),
          canAccessAutonomic: hasDataCategoryAccess(req, DataCategory.AUTONOMIC_SYMPTOMS),
          canAccessMedication: hasDataCategoryAccess(req, DataCategory.MEDICATION_DATA),
          professionalOnly: true,
          message: 'Professional caregiver access to sensitive medical data'
        }
      };
      res.json(response);
    } catch (error) {
      console.error('Autonomic symptoms demo error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * Demonstrate patient-only access to their complete data
 */
router.get('/patient-data/:patientId', 
  authenticateToken,
  requirePatientAccess(),
  async (_req: AccessControlRequest, res) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          accessLevel: AccessLevel.PATIENT_FULL,
          fullDataAccess: true,
          accessibleCategories: Object.values(DataCategory),
          message: 'Patient has full access to their own data'
        }
      };
      res.json(response);
    } catch (error) {
      console.error('Patient data demo error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * Demonstrate emergency access to all data categories
 */
router.get('/emergency-access/:emergencyAccessId', 
  authenticateToken,
  requireEmergencyAccess(),
  async (req: AccessControlRequest, res) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          accessLevel: AccessLevel.EMERGENCY_ACCESS,
          emergencyAccess: true,
          temporaryAccess: isTemporaryAccess(req),
          remainingMinutes: getRemainingAccessMinutes(req),
          accessibleCategories: req.accessControl?.accessibleCategories || [],
          emergencyContext: req.accessControl?.context.emergencyContext,
          message: 'Emergency access granted to all data categories'
        }
      };
      res.json(response);
    } catch (error) {
      console.error('Emergency access demo error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * Demonstrate administrative access within organization
 */
router.get('/admin-access/:patientId', 
  authenticateToken,
  requireOrganizationAdmin(),
  requireDataAccess([
    DataCategory.DEMOGRAPHICS,
    DataCategory.MOTOR_SYMPTOMS,
    DataCategory.NON_MOTOR_SYMPTOMS
  ], AccessLevel.CAREGIVER_PROFESSIONAL),
  async (req: AccessControlRequest, res) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          accessLevel: getMaxAccessLevel(req),
          administrativeAccess: true,
          organizationScope: true,
          accessibleCategories: req.accessControl?.accessibleCategories || [],
          message: 'Administrative access to patient data within organization'
        }
      };
      res.json(response);
    } catch (error) {
      console.error('Admin access demo error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * Demonstrate multi-category access with granular permissions
 */
router.get('/multi-category/:patientId', 
  authenticateToken,
  requireDataAccess([
    DataCategory.MOTOR_SYMPTOMS,
    DataCategory.NON_MOTOR_SYMPTOMS,
    DataCategory.DAILY_ACTIVITIES,
    DataCategory.SAFETY_INCIDENTS
  ], AccessLevel.CAREGIVER_FAMILY),
  async (req: AccessControlRequest, res) => {
    try {
      const dataAccess = {
        motorSymptoms: hasDataCategoryAccess(req, DataCategory.MOTOR_SYMPTOMS),
        nonMotorSymptoms: hasDataCategoryAccess(req, DataCategory.NON_MOTOR_SYMPTOMS),
        autonomicSymptoms: hasDataCategoryAccess(req, DataCategory.AUTONOMIC_SYMPTOMS),
        dailyActivities: hasDataCategoryAccess(req, DataCategory.DAILY_ACTIVITIES),
        medicationData: hasDataCategoryAccess(req, DataCategory.MEDICATION_DATA),
        emergencyContacts: hasDataCategoryAccess(req, DataCategory.EMERGENCY_CONTACTS),
        safetyIncidents: hasDataCategoryAccess(req, DataCategory.SAFETY_INCIDENTS),
        environmentalFactors: hasDataCategoryAccess(req, DataCategory.ENVIRONMENTAL_FACTORS)
      };

      const response: ApiResponse = {
        success: true,
        data: {
          accessLevel: getMaxAccessLevel(req),
          dataAccess,
          accessibleCategories: req.accessControl?.accessibleCategories || [],
          deniedCategories: Object.values(DataCategory).filter(
            category => !req.accessControl?.accessibleCategories.includes(category)
          ),
          message: 'Granular access control demonstration'
        }
      };
      res.json(response);
    } catch (error) {
      console.error('Multi-category demo error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * Get access control summary for current user
 */
router.get('/access-summary', 
  authenticateToken,
  async (req: AccessControlRequest, res) => {
    try {
      const { role, organizationId } = req.user || {};
      
      const response: ApiResponse = {
        success: true,
        data: {
          userRole: role,
          organizationId,
          availableAccessLevels: getAvailableAccessLevels(role),
          dataCategories: Object.values(DataCategory),
          accessLevels: Object.values(AccessLevel),
          message: 'Access control system summary'
        }
      };
      res.json(response);
    } catch (error) {
      console.error('Access summary error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * Helper function to get available access levels for a user role
 */
function getAvailableAccessLevels(role?: string): AccessLevel[] {
  switch (role) {
    case 'patient':
      return [AccessLevel.PATIENT_FULL];
    case 'professional_caregiver':
      return [AccessLevel.CAREGIVER_PROFESSIONAL, AccessLevel.EMERGENCY_ACCESS];
    case 'family_caregiver':
      return [AccessLevel.CAREGIVER_FAMILY, AccessLevel.EMERGENCY_ACCESS];
    case 'clinic_admin':
      return [AccessLevel.CAREGIVER_PROFESSIONAL, AccessLevel.EMERGENCY_ACCESS];
    case 'super_admin':
      return Object.values(AccessLevel);
    default:
      return [];
  }
}

export default router;