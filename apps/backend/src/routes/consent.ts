import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import {
  authenticateToken,
  authorizeRole,
  logUserActivity,
  AuthenticatedRequest,
} from '../middleware/auth';

// Type definitions for consent management
interface ConsentPermissions {
  [key: string]: boolean | string | number;
}

interface PatientInfo {
  id: string;
  name: string;
  userId: string;
  user?: {
    email: string;
    name: string;
  };
}

interface CaregiverInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignedByUserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ConsentAssignmentWithIncludes {
  id: string;
  patientId: string;
  caregiverId: string;
  caregiverType: string;
  status: string;
  permissions: string;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  consentGiven: boolean;
  consentDate: Date | null;
  assignedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: PatientInfo;
  caregiver: CaregiverInfo;
  assignedByUser: AssignedByUserInfo | null;
}

const router = Router();

// Get pending consent requests for a patient
router.get(
  '/pending',
  authenticateToken,
  authorizeRole(['patient']),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      // Get patient record
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });

      if (!patient) {
        const response: ApiResponse = {
          success: false,
          error: 'Patient record not found',
        };
        return res.status(404).json(response);
      }

      // Get assignments that need patient consent (pending or active without consent)
      const pendingAssignments = await prisma.caregiverAssignment.findMany({
        where: {
          patientId: patient.id,
          status: {
            in: ['pending', 'active'],
          },
          consentGiven: false,
        },
        include: {
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const response: ApiResponse = {
        success: true,
        data: pendingAssignments.map(assignment => ({
          id: assignment.id,
          caregiverId: assignment.caregiverId,
          caregiverType: assignment.caregiverType,
          permissions: JSON.parse(assignment.permissions || '{}') as ConsentPermissions,
          notes: assignment.notes,
          caregiver: assignment.caregiver,
          assignedBy: assignment.assignedBy,
          assignedByUser: assignment.assignedByUser,
          createdAt: assignment.createdAt,
        })),
      };

      res.json(response);
    } catch (error) {
      console.error('Get pending consent requests error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Approve caregiver assignment (patient consent)
router.post(
  '/approve/:assignmentId',
  authenticateToken,
  authorizeRole(['patient']),
  logUserActivity('APPROVE', 'consent'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { assignmentId } = req.params;
      const { permissions } = req.body;

      // Get assignment
      const assignment = await prisma.caregiverAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          patient: {
            select: {
              id: true,
              userId: true,
              name: true,
            },
          },
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!assignment) {
        const response: ApiResponse = {
          success: false,
          error: 'Assignment not found',
        };
        return res.status(404).json(response);
      }

      // Check if this patient owns the assignment
      if (assignment.patient.userId !== req.user.userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot approve assignment for another patient',
        };
        return res.status(403).json(response);
      }

      // Check if assignment needs patient consent (pending or active without consent)
      if (!['pending', 'active'].includes(assignment.status) || assignment.consentGiven) {
        const response: ApiResponse = {
          success: false,
          error: 'Assignment does not require patient consent',
        };
        return res.status(400).json(response);
      }

      // Update assignment with consent
      const updatedAssignment = await prisma.caregiverAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'active',
          consentGiven: true,
          consentDate: new Date(),
          permissions: permissions ? JSON.stringify(permissions) : assignment.permissions,
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              userId: true,
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedAssignment.id,
          patientId: updatedAssignment.patientId,
          caregiverId: updatedAssignment.caregiverId,
          caregiverType: updatedAssignment.caregiverType,
          status: updatedAssignment.status,
          permissions: JSON.parse(updatedAssignment.permissions || '{}') as ConsentPermissions,
          startDate: updatedAssignment.startDate,
          endDate: updatedAssignment.endDate,
          notes: updatedAssignment.notes,
          consentGiven: updatedAssignment.consentGiven,
          consentDate: updatedAssignment.consentDate,
          patient: (updatedAssignment as ConsentAssignmentWithIncludes).patient,
          caregiver: (updatedAssignment as ConsentAssignmentWithIncludes).caregiver,
          assignedBy: updatedAssignment.assignedBy,
          assignedByUser: (updatedAssignment as ConsentAssignmentWithIncludes).assignedByUser,
          createdAt: updatedAssignment.createdAt,
          updatedAt: updatedAssignment.updatedAt,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Approve consent error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Decline caregiver assignment (patient consent)
router.post(
  '/decline/:assignmentId',
  authenticateToken,
  authorizeRole(['patient']),
  logUserActivity('DECLINE', 'consent'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { assignmentId } = req.params;
      const { reason } = req.body;

      // Get assignment
      const assignment = await prisma.caregiverAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          patient: {
            select: {
              id: true,
              userId: true,
              name: true,
            },
          },
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!assignment) {
        const response: ApiResponse = {
          success: false,
          error: 'Assignment not found',
        };
        return res.status(404).json(response);
      }

      // Check if this patient owns the assignment
      if (assignment.patient.userId !== req.user.userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot decline assignment for another patient',
        };
        return res.status(403).json(response);
      }

      // Check if assignment can be declined (pending or active without consent)
      if (!['pending', 'active'].includes(assignment.status) || assignment.consentGiven) {
        const response: ApiResponse = {
          success: false,
          error: 'Assignment cannot be declined at this time',
        };
        return res.status(400).json(response);
      }

      // Update assignment status to declined
      const updatedAssignment = await prisma.caregiverAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'declined',
          notes:
            assignment.notes +
            (reason ? `\nDeclined by patient: ${reason}` : '\nDeclined by patient'),
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              userId: true,
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedAssignment.id,
          patientId: updatedAssignment.patientId,
          caregiverId: updatedAssignment.caregiverId,
          caregiverType: updatedAssignment.caregiverType,
          status: updatedAssignment.status,
          permissions: JSON.parse(updatedAssignment.permissions || '{}') as ConsentPermissions,
          startDate: updatedAssignment.startDate,
          endDate: updatedAssignment.endDate,
          notes: updatedAssignment.notes,
          consentGiven: updatedAssignment.consentGiven,
          consentDate: updatedAssignment.consentDate,
          patient: (updatedAssignment as ConsentAssignmentWithIncludes).patient,
          caregiver: (updatedAssignment as ConsentAssignmentWithIncludes).caregiver,
          assignedBy: updatedAssignment.assignedBy,
          assignedByUser: (updatedAssignment as ConsentAssignmentWithIncludes).assignedByUser,
          createdAt: updatedAssignment.createdAt,
          updatedAt: updatedAssignment.updatedAt,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Decline consent error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Modify permissions for existing active assignment
router.put(
  '/permissions/:assignmentId',
  authenticateToken,
  authorizeRole(['patient']),
  logUserActivity('UPDATE', 'permissions'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { assignmentId } = req.params;
      const { permissions } = req.body;

      if (!permissions || typeof permissions !== 'object') {
        const response: ApiResponse = {
          success: false,
          error: 'Valid permissions object is required',
        };
        return res.status(400).json(response);
      }

      // Get assignment
      const assignment = await prisma.caregiverAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          patient: {
            select: {
              id: true,
              userId: true,
              name: true,
            },
          },
        },
      });

      if (!assignment) {
        const response: ApiResponse = {
          success: false,
          error: 'Assignment not found',
        };
        return res.status(404).json(response);
      }

      // Check if this patient owns the assignment
      if (assignment.patient.userId !== req.user.userId) {
        const response: ApiResponse = {
          success: false,
          error: "Cannot modify permissions for another patient's assignment",
        };
        return res.status(403).json(response);
      }

      // Check if assignment is active
      if (assignment.status !== 'active') {
        const response: ApiResponse = {
          success: false,
          error: 'Can only modify permissions for active assignments',
        };
        return res.status(400).json(response);
      }

      // Update permissions
      const updatedAssignment = await prisma.caregiverAssignment.update({
        where: { id: assignmentId },
        data: {
          permissions: JSON.stringify(permissions),
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              userId: true,
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedAssignment.id,
          patientId: updatedAssignment.patientId,
          caregiverId: updatedAssignment.caregiverId,
          caregiverType: updatedAssignment.caregiverType,
          status: updatedAssignment.status,
          permissions: JSON.parse(updatedAssignment.permissions || '{}') as ConsentPermissions,
          startDate: updatedAssignment.startDate,
          endDate: updatedAssignment.endDate,
          notes: updatedAssignment.notes,
          consentGiven: updatedAssignment.consentGiven,
          consentDate: updatedAssignment.consentDate,
          patient: (updatedAssignment as ConsentAssignmentWithIncludes).patient,
          caregiver: (updatedAssignment as ConsentAssignmentWithIncludes).caregiver,
          assignedBy: updatedAssignment.assignedBy,
          assignedByUser: (updatedAssignment as ConsentAssignmentWithIncludes).assignedByUser,
          createdAt: updatedAssignment.createdAt,
          updatedAt: updatedAssignment.updatedAt,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Update permissions error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Revoke consent (deactivate assignment)
router.post(
  '/revoke/:assignmentId',
  authenticateToken,
  authorizeRole(['patient']),
  logUserActivity('REVOKE', 'consent'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { assignmentId } = req.params;
      const { reason } = req.body;

      // Get assignment
      const assignment = await prisma.caregiverAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          patient: {
            select: {
              id: true,
              userId: true,
              name: true,
            },
          },
        },
      });

      if (!assignment) {
        const response: ApiResponse = {
          success: false,
          error: 'Assignment not found',
        };
        return res.status(404).json(response);
      }

      // Check if this patient owns the assignment
      if (assignment.patient.userId !== req.user.userId) {
        const response: ApiResponse = {
          success: false,
          error: "Cannot revoke consent for another patient's assignment",
        };
        return res.status(403).json(response);
      }

      // Check if assignment is active
      if (assignment.status !== 'active') {
        const response: ApiResponse = {
          success: false,
          error: 'Can only revoke consent for active assignments',
        };
        return res.status(400).json(response);
      }

      // Revoke consent
      const updatedAssignment = await prisma.caregiverAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'revoked',
          endDate: new Date(),
          notes:
            assignment.notes +
            (reason ? `\nConsent revoked by patient: ${reason}` : '\nConsent revoked by patient'),
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              userId: true,
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedAssignment.id,
          patientId: updatedAssignment.patientId,
          caregiverId: updatedAssignment.caregiverId,
          caregiverType: updatedAssignment.caregiverType,
          status: updatedAssignment.status,
          permissions: JSON.parse(updatedAssignment.permissions || '{}') as ConsentPermissions,
          startDate: updatedAssignment.startDate,
          endDate: updatedAssignment.endDate,
          notes: updatedAssignment.notes,
          consentGiven: updatedAssignment.consentGiven,
          consentDate: updatedAssignment.consentDate,
          patient: (updatedAssignment as ConsentAssignmentWithIncludes).patient,
          caregiver: (updatedAssignment as ConsentAssignmentWithIncludes).caregiver,
          assignedBy: updatedAssignment.assignedBy,
          assignedByUser: (updatedAssignment as ConsentAssignmentWithIncludes).assignedByUser,
          createdAt: updatedAssignment.createdAt,
          updatedAt: updatedAssignment.updatedAt,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Revoke consent error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

export default router;
