/**
 * Access Control Middleware
 * Express middleware for enforcing multi-tier access control on API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { accessControlEngine } from './access-control';
import { AccessLevel, DataCategory, EncryptionContext, ApiResponse } from '@parkml/shared';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Extended Request interface with access control context
 */
export interface AccessControlRequest extends AuthenticatedRequest {
  accessControl?: {
    context: EncryptionContext;
    granted: boolean;
    accessLevel?: AccessLevel;
    accessibleCategories: DataCategory[];
    encryptionKeys: string[];
    expiresAt?: Date;
  };
}

/**
 * Access control middleware factory
 * Creates middleware with specific data category requirements
 */
export function requireDataAccess(
  requiredCategories: DataCategory[],
  minimumAccessLevel: AccessLevel = AccessLevel.CAREGIVER_FAMILY
) {
  return async (req: AccessControlRequest, res: Response, next: NextFunction) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        } as ApiResponse);
      }

      // Extract patient ID from request (params, body, or query)
      const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
      if (!patientId) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID required',
        } as ApiResponse);
      }

      // Build encryption context
      const context: EncryptionContext = {
        patientId: patientId as string,
        requesterId: req.user!.userId,
        accessLevel: minimumAccessLevel,
        organizationId: req.user!.organizationId || '',
        requesterRole: req.user!.role as any,
        dataCategories: requiredCategories,
        emergencyContext: await extractEmergencyContext(req),
        timestamp: new Date(),
      };

      // Evaluate access permissions
      const accessResult = await accessControlEngine.evaluateAccess(context);

      // Audit the access decision
      await accessControlEngine.auditAccessDecision(
        context,
        accessResult,
        req.ip || req.connection.remoteAddress || 'unknown',
        req.get('User-Agent') || 'unknown'
      );

      // Check if access is granted
      if (!accessResult.granted) {
        return res.status(403).json({
          success: false,
          error: accessResult.denialReason || 'Access denied',
        } as ApiResponse);
      }

      // Verify all required categories are accessible
      const inaccessibleCategories = requiredCategories.filter(
        category => !accessResult.accessibleCategories.includes(category)
      );

      if (inaccessibleCategories.length > 0) {
        return res.status(403).json({
          success: false,
          error: `Access denied to data categories: ${inaccessibleCategories.join(', ')}`,
        } as ApiResponse);
      }

      // Attach access control context to request
      req.accessControl = {
        context,
        granted: accessResult.granted,
        accessLevel: accessResult.accessLevel,
        accessibleCategories: accessResult.accessibleCategories,
        encryptionKeys: accessResult.encryptionKeys,
        expiresAt: accessResult.expiresAt,
      };

      next();
    } catch (error) {
      console.error('Access control middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Access control system error',
      } as ApiResponse);
    }
  };
}

/**
 * Emergency access middleware
 * Special middleware for emergency access scenarios
 */
export function requireEmergencyAccess() {
  return async (req: AccessControlRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        } as ApiResponse);
      }

      const emergencyAccessId = req.params.emergencyAccessId || req.body.emergencyAccessId;
      if (!emergencyAccessId) {
        return res.status(400).json({
          success: false,
          error: 'Emergency access ID required',
        } as ApiResponse);
      }

      // Verify emergency access exists and is valid
      const { prisma } = await import('../database/prisma-client');
      const emergencyAccess = await prisma.emergencyAccess.findUnique({
        where: { id: emergencyAccessId },
        include: { patient: true },
      });

      if (!emergencyAccess || !emergencyAccess.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Emergency access not found or inactive',
        } as ApiResponse);
      }

      if (emergencyAccess.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          error: 'Emergency access belongs to different user',
        } as ApiResponse);
      }

      if (emergencyAccess.endTime && emergencyAccess.endTime < new Date()) {
        return res.status(403).json({
          success: false,
          error: 'Emergency access has expired',
        } as ApiResponse);
      }

      // Build emergency context
      const context: EncryptionContext = {
        patientId: emergencyAccess.patientId,
        requesterId: req.user!.userId,
        accessLevel: AccessLevel.EMERGENCY_ACCESS,
        organizationId: req.user!.organizationId || '',
        requesterRole: req.user!.role as any,
        dataCategories: Object.values(DataCategory), // Emergency access to all categories
        emergencyContext: {
          accessType: emergencyAccess.accessType as any,
          reason: emergencyAccess.reason,
          durationHours: 24, // Default emergency duration
          emergencyAccessId: emergencyAccess.id,
        },
        timestamp: new Date(),
      };

      // Evaluate emergency access
      const accessResult = await accessControlEngine.evaluateAccess(context);

      if (!accessResult.granted) {
        return res.status(403).json({
          success: false,
          error: accessResult.denialReason || 'Emergency access denied',
        } as ApiResponse);
      }

      // Attach emergency access context
      req.accessControl = {
        context,
        granted: accessResult.granted,
        accessLevel: accessResult.accessLevel,
        accessibleCategories: accessResult.accessibleCategories,
        encryptionKeys: accessResult.encryptionKeys,
        expiresAt: accessResult.expiresAt,
      };

      next();
    } catch (error) {
      console.error('Emergency access middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Emergency access system error',
      } as ApiResponse);
    }
  };
}

/**
 * Patient-only access middleware
 * Ensures only the patient can access their own data
 */
export function requirePatientAccess() {
  return async (req: AccessControlRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        } as ApiResponse);
      }

      if (req.user!.role !== 'patient') {
        return res.status(403).json({
          success: false,
          error: 'Patient access required',
        } as ApiResponse);
      }

      const patientId = req.params.patientId || req.body.patientId;
      if (!patientId) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID required',
        } as ApiResponse);
      }

      // Verify user is the patient
      const { prisma } = await import('../database/prisma-client');
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId as string,
          userId: req.user!.userId,
        },
      });

      if (!patient) {
        return res.status(403).json({
          success: false,
          error: "Cannot access other patient's data",
        } as ApiResponse);
      }

      // Grant full patient access
      req.accessControl = {
        context: {
          patientId: patient.id,
          requesterId: req.user!.userId,
          accessLevel: AccessLevel.PATIENT_FULL,
          organizationId: req.user!.organizationId || '',
          requesterRole: 'patient',
          dataCategories: Object.values(DataCategory),
          timestamp: new Date(),
        },
        granted: true,
        accessLevel: AccessLevel.PATIENT_FULL,
        accessibleCategories: Object.values(DataCategory),
        encryptionKeys: [`patient_key_${req.user!.userId}`],
      };

      next();
    } catch (error) {
      console.error('Patient access middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Patient access system error',
      } as ApiResponse);
    }
  };
}

/**
 * Organization admin middleware
 * Ensures user has admin rights within the organization
 */
export function requireOrganizationAdmin() {
  return async (req: AccessControlRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        } as ApiResponse);
      }

      if (!['clinic_admin', 'super_admin'].includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          error: 'Administrative access required',
        } as ApiResponse);
      }

      next();
    } catch (error) {
      console.error('Organization admin middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Administrative access system error',
      } as ApiResponse);
    }
  };
}

/**
 * Super admin middleware
 * Ensures user has super admin rights (highest privilege level)
 */
export function requireSuperAdmin() {
  return async (req: AccessControlRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        } as ApiResponse);
      }

      if (req.user!.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Super admin access required',
        } as ApiResponse);
      }

      next();
    } catch (error) {
      console.error('Super admin middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Super admin access system error',
      } as ApiResponse);
    }
  };
}

/**
 * Extract emergency context from request if present
 */
async function extractEmergencyContext(req: Request): Promise<any> {
  const emergencyAccessId = req.headers['x-emergency-access-id'] as string;
  if (!emergencyAccessId) {
    return undefined;
  }

  try {
    const { prisma } = await import('../database/prisma-client');
    const emergencyAccess = await prisma.emergencyAccess.findUnique({
      where: { id: emergencyAccessId },
    });

    if (!emergencyAccess || !emergencyAccess.isActive) {
      return undefined;
    }

    return {
      accessType: emergencyAccess.accessType,
      reason: emergencyAccess.reason,
      durationHours: 24, // Default duration
      emergencyAccessId: emergencyAccess.id,
    };
  } catch (error) {
    console.error('Error extracting emergency context:', error);
    return undefined;
  }
}

/**
 * Utility function to check if user has specific data category access
 */
export function hasDataCategoryAccess(req: AccessControlRequest, category: DataCategory): boolean {
  return req.accessControl?.accessibleCategories.includes(category) || false;
}

/**
 * Utility function to get maximum access level for user
 */
export function getMaxAccessLevel(req: AccessControlRequest): AccessLevel | null {
  return req.accessControl?.accessLevel || null;
}

/**
 * Utility function to check if access is temporary (with expiration)
 */
export function isTemporaryAccess(req: AccessControlRequest): boolean {
  return !!req.accessControl?.expiresAt;
}

/**
 * Utility function to get remaining access time in minutes
 */
export function getRemainingAccessMinutes(req: AccessControlRequest): number | null {
  const expiresAt = req.accessControl?.expiresAt;
  if (!expiresAt) {
    return null;
  }

  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}
