import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '@parkml/shared';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    organizationId?: string;
    isActive: boolean;
  };
}

export interface EmergencyAccessRequest extends AuthenticatedRequest {
  emergencyAccess?: {
    id: string;
    reason: string;
    accessType: string;
    patientId: string;
    expiresAt: Date;
  };
}

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  super_admin: 5,
  clinic_admin: 4,
  professional_caregiver: 3,
  family_caregiver: 2,
  patient: 1
};

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: 'Access token required',
    };
    res.status(401).json(response);
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
      userId: string;
      email: string;
      role: string;
      organizationId?: string;
      isActive: boolean;
    };

    // Check if user is active
    if (!decoded.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Account is deactivated',
      };
      res.status(403).json(response);
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid token',
    };
    res.status(403).json(response);
    return;
  }
};

export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions',
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

export const authorizeRoleLevel = (minimumLevel: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role as keyof typeof ROLE_HIERARCHY];
    if (!userLevel || userLevel < minimumLevel) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions',
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

export const authorizeOrganization = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    const response: ApiResponse = {
      success: false,
      error: 'Authentication required',
    };
    res.status(401).json(response);
    return;
  }

  // Super admins can access all organizations
  if (req.user.role === 'super_admin') {
    next();
    return;
  }

  // Other roles must have an organization
  if (!req.user.organizationId) {
    const response: ApiResponse = {
      success: false,
      error: 'Organization access required',
    };
    res.status(403).json(response);
    return;
  }

  next();
};

export const authorizePatientAccess = (patientIdParam: string = 'patientId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    const patientId = req.params[patientIdParam];
    if (!patientId) {
      const response: ApiResponse = {
        success: false,
        error: 'Patient ID required',
      };
      res.status(400).json(response);
      return;
    }

    try {
      // Super admins and clinic admins can access patients in their organization
      if (req.user.role === 'super_admin' || req.user.role === 'clinic_admin') {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          select: { organizationId: true }
        });

        if (!patient) {
          const response: ApiResponse = {
            success: false,
            error: 'Patient not found',
          };
          res.status(404).json(response);
          return;
        }

        // Super admins can access all patients
        if (req.user.role === 'super_admin') {
          next();
          return;
        }

        // Clinic admins can only access patients in their organization
        if (patient.organizationId === req.user.organizationId) {
          next();
          return;
        }
      }

      // Patients can only access their own data
      if (req.user.role === 'patient') {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          select: { userId: true }
        });

        if (patient && patient.userId === req.user.userId) {
          next();
          return;
        }
      }

      // Caregivers can only access assigned patients
      if (req.user.role === 'professional_caregiver' || req.user.role === 'family_caregiver') {
        const assignment = await prisma.caregiverAssignment.findFirst({
          where: {
            patientId: patientId,
            caregiverId: req.user.userId,
            status: 'active'
          }
        });

        if (assignment) {
          next();
          return;
        }
      }

      // Check for emergency access
      const emergencyAccess = await prisma.emergencyAccess.findFirst({
        where: {
          userId: req.user.userId,
          patientId: patientId,
          isActive: true,
          endTime: {
            gt: new Date()
          }
        }
      });

      if (emergencyAccess) {
        // Add emergency access info to request
        (req as EmergencyAccessRequest).emergencyAccess = {
          id: emergencyAccess.id,
          reason: emergencyAccess.reason,
          accessType: emergencyAccess.accessType,
          patientId: emergencyAccess.patientId,
          expiresAt: emergencyAccess.endTime || new Date()
        };
        next();
        return;
      }

      const response: ApiResponse = {
        success: false,
        error: 'Access denied to patient data',
      };
      res.status(403).json(response);
      return;

    } catch (error) {
      console.error('Error in patient access authorization:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Authorization check failed',
      };
      res.status(500).json(response);
      return;
    }
  };
};

export const logUserActivity = (action: string, resource: string) => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    try {
      // Get resource ID from request params or body
      const resourceId = req.params.id || req.body.id || 'unknown';
      
      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          organizationId: req.user.organizationId || 'default_org',
          action,
          resource,
          resourceId,
          details: JSON.stringify({
            method: req.method,
            path: req.path,
            params: req.params,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          }),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      next();
    } catch (error) {
      console.error('Error logging user activity:', error);
      // Don't block the request if logging fails
      next();
    }
  };
};

export const checkEmergencyAccess = (req: EmergencyAccessRequest, res: Response, next: NextFunction): void => {
  if (req.emergencyAccess) {
    // Add emergency access header to response
    res.set('X-Emergency-Access', 'true');
    res.set('X-Emergency-Reason', req.emergencyAccess.reason);
    res.set('X-Emergency-Expires', req.emergencyAccess.expiresAt.toISOString());
    
    console.log(`🚨 Emergency access used: ${req.emergencyAccess.reason} by user ${req.user?.userId}`);
  }
  next();
};

// Role-based middleware shortcuts
export const requireSuperAdmin = authorizeRole(['super_admin']);
export const requireClinicAdmin = authorizeRole(['super_admin', 'clinic_admin']);
export const requireProfessionalCaregiver = authorizeRole(['super_admin', 'clinic_admin', 'professional_caregiver']);
export const requireAnyCaregiver = authorizeRole(['super_admin', 'clinic_admin', 'professional_caregiver', 'family_caregiver']);
export const requirePatient = authorizeRole(['patient']);

// Combined middleware for common patterns
export const requireAuthAndOrg = [authenticateToken, authorizeOrganization];
export const requirePatientData = (patientIdParam?: string) => [
  authenticateToken,
  authorizePatientAccess(patientIdParam),
  checkEmergencyAccess
];