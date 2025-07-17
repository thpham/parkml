import { Router } from 'express';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { 
  authenticateToken, 
  authorizeRole, 
  logUserActivity,
  AuthenticatedRequest 
} from '../middleware/auth';

const router = Router();

// Get all caregiver assignments (filtered by user role)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    let assignments: any[] = [];

    switch (req.user.role) {
      case 'super_admin':
        assignments = await prisma.caregiverAssignment.findMany({
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                userId: true,
                user: {
                  select: {
                    email: true,
                    name: true
                  }
                }
              }
            },
            caregiver: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'clinic_admin':
        assignments = await prisma.caregiverAssignment.findMany({
          where: {
            patient: {
              organizationId: req.user.organizationId
            }
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
                    name: true
                  }
                }
              }
            },
            caregiver: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'professional_caregiver':
      case 'family_caregiver':
        assignments = await prisma.caregiverAssignment.findMany({
          where: {
            caregiverId: req.user.userId
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
                    name: true
                  }
                }
              }
            },
            caregiver: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'patient':
        // Get patient ID from patient record
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: req.user.userId },
          select: { id: true }
        });

        if (!patientRecord) {
          const response: ApiResponse = {
            success: false,
            error: 'Patient record not found',
          };
          return res.status(404).json(response);
        }

        assignments = await prisma.caregiverAssignment.findMany({
          where: {
            patientId: patientRecord.id
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
                    name: true
                  }
                }
              }
            },
            caregiver: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        break;

      default:
        const response: ApiResponse = {
          success: false,
          error: 'Unauthorized role',
        };
        return res.status(403).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: assignments.map(assignment => ({
        id: assignment.id,
        patientId: assignment.patientId,
        caregiverId: assignment.caregiverId,
        caregiverType: assignment.caregiverType,
        status: assignment.status,
        permissions: JSON.parse(assignment.permissions || '{}'),
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        notes: assignment.notes,
        consentGiven: assignment.consentGiven,
        consentDate: assignment.consentDate,
        patient: assignment.patient,
        caregiver: assignment.caregiver,
        assignedBy: assignment.assignedBy,
        assignedByUser: assignment.assignedByUser,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Get assignments error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Create new caregiver assignment
router.post('/', 
  authenticateToken, 
  authorizeRole(['super_admin', 'clinic_admin', 'patient']),
  logUserActivity('CREATE', 'assignment'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { patientId, caregiverId, caregiverType, permissions, notes } = req.body;

      // Validate input
      if (!patientId || !caregiverId || !caregiverType) {
        const response: ApiResponse = {
          success: false,
          error: 'Missing required fields: patientId, caregiverId, caregiverType',
        };
        return res.status(400).json(response);
      }

      // Validate caregiver type
      if (!['professional', 'family'].includes(caregiverType)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid caregiver type. Must be "professional" or "family"',
        };
        return res.status(400).json(response);
      }

      // Check if patient exists and user has access
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      if (!patient) {
        const response: ApiResponse = {
          success: false,
          error: 'Patient not found',
        };
        return res.status(404).json(response);
      }

      // Check authorization for patient access
      if (req.user.role === 'patient' && patient.userId !== req.user.userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot create assignment for another patient',
        };
        return res.status(403).json(response);
      }

      if (req.user.role === 'clinic_admin' && patient.organizationId !== req.user.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot create assignment for patient in different organization',
        };
        return res.status(403).json(response);
      }

      // Check if caregiver exists
      const caregiver = await prisma.user.findUnique({
        where: { id: caregiverId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true
        }
      });

      if (!caregiver) {
        const response: ApiResponse = {
          success: false,
          error: 'Caregiver not found',
        };
        return res.status(404).json(response);
      }

      // Validate caregiver role matches caregiver type
      if (caregiverType === 'professional' && caregiver.role !== 'professional_caregiver') {
        const response: ApiResponse = {
          success: false,
          error: 'Caregiver role must be "professional_caregiver" for professional caregiver type',
        };
        return res.status(400).json(response);
      }

      if (caregiverType === 'family' && caregiver.role !== 'family_caregiver') {
        const response: ApiResponse = {
          success: false,
          error: 'Caregiver role must be "family_caregiver" for family caregiver type',
        };
        return res.status(400).json(response);
      }

      // Check if assignment already exists
      const existingAssignment = await prisma.caregiverAssignment.findFirst({
        where: {
          patientId,
          caregiverId,
          status: {
            in: ['pending', 'active']
          }
        }
      });

      if (existingAssignment) {
        const response: ApiResponse = {
          success: false,
          error: 'Assignment already exists for this patient-caregiver pair',
        };
        return res.status(400).json(response);
      }

      // Set default permissions based on caregiver type
      const defaultPermissions = caregiverType === 'professional' ? {
        view_all_symptoms: true,
        edit_symptoms: true,
        generate_reports: true,
        set_reminders: true,
        communicate_all: true,
        emergency_contact: true
      } : {
        view_symptoms: true,
        edit_symptoms: true,
        view_reports: true,
        receive_notifications: true,
        communicate_professional: true
      };

      const finalPermissions = permissions || defaultPermissions;

      // Determine initial status based on caregiver type and who's creating
      let initialStatus = 'pending';
      let consentGiven = false;
      let consentDate = null;

      if (caregiverType === 'family' && req.user.role === 'patient') {
        // Family caregivers invited by patients are auto-approved
        initialStatus = 'active';
        consentGiven = true;
        consentDate = new Date();
      } else if (caregiverType === 'professional' && req.user.role === 'patient') {
        // Professional caregivers need patient consent (pending)
        initialStatus = 'pending';
      } else if (req.user.role === 'clinic_admin' || req.user.role === 'super_admin') {
        // Admin assignments need patient consent
        initialStatus = 'pending';
      }

      // Create assignment
      const assignment = await prisma.caregiverAssignment.create({
        data: {
          patientId,
          caregiverId,
          caregiverType,
          status: initialStatus as any,
          permissions: JSON.stringify(finalPermissions),
          startDate: new Date(),
          notes: notes || '',
          assignedBy: req.user.userId,
          consentGiven,
          consentDate
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
                  name: true
                }
              }
            }
          },
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: assignment.id,
          patientId: assignment.patientId,
          caregiverId: assignment.caregiverId,
          caregiverType: assignment.caregiverType,
          status: assignment.status,
          permissions: JSON.parse(assignment.permissions || '{}'),
          startDate: assignment.startDate,
          endDate: assignment.endDate,
          notes: assignment.notes,
          consentGiven: assignment.consentGiven,
          consentDate: assignment.consentDate,
          patient: (assignment as any).patient,
          caregiver: (assignment as any).caregiver,
          assignedBy: assignment.assignedBy,
          assignedByUser: (assignment as any).assignedByUser,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt
        }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create assignment error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Get assignment by ID
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

    const assignment = await prisma.caregiverAssignment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            userId: true,
            organizationId: true,
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        },
        caregiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!assignment) {
      const response: ApiResponse = {
        success: false,
        error: 'Assignment not found',
      };
      return res.status(404).json(response);
    }

    // Check authorization
    let hasAccess = false;

    if (req.user.role === 'super_admin') {
      hasAccess = true;
    } else if (req.user.role === 'clinic_admin' && assignment.patient.organizationId === req.user.organizationId) {
      hasAccess = true;
    } else if (assignment.caregiverId === req.user.userId) {
      hasAccess = true;
    } else if (assignment.patient.userId === req.user.userId) {
      hasAccess = true;
    }

    if (!hasAccess) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied',
      };
      return res.status(403).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        id: assignment.id,
        patientId: assignment.patientId,
        caregiverId: assignment.caregiverId,
        caregiverType: assignment.caregiverType,
        status: assignment.status,
        permissions: JSON.parse(assignment.permissions || '{}'),
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        notes: assignment.notes,
        consentGiven: assignment.consentGiven,
        consentDate: assignment.consentDate,
        patient: assignment.patient,
        caregiver: assignment.caregiver,
        assignedBy: assignment.assignedBy,
        assignedByUser: assignment.assignedByUser,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get assignment error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Update assignment (for status changes, permissions, etc.)
router.put('/:id', 
  authenticateToken, 
  logUserActivity('UPDATE', 'assignment'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { id } = req.params;
      const { status, permissions, notes, consentGiven, endDate } = req.body;

      // Get current assignment
      const currentAssignment = await prisma.caregiverAssignment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              userId: true,
              organizationId: true
            }
          }
        }
      });

      if (!currentAssignment) {
        const response: ApiResponse = {
          success: false,
          error: 'Assignment not found',
        };
        return res.status(404).json(response);
      }

      // Check authorization
      let canUpdate = false;

      if (req.user.role === 'super_admin') {
        canUpdate = true;
      } else if (req.user.role === 'clinic_admin' && currentAssignment.patient.organizationId === req.user.organizationId) {
        canUpdate = true;
      } else if (currentAssignment.patient.userId === req.user.userId) {
        // Patients can update consent and some permissions
        canUpdate = true;
      } else if (currentAssignment.caregiverId === req.user.userId) {
        // Caregivers can update notes and some status changes
        canUpdate = true;
      }

      if (!canUpdate) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        return res.status(403).json(response);
      }

      // Prepare update data
      const updateData: any = {};

      if (status !== undefined) {
        // Validate status changes
        const validStatuses = ['pending', 'active', 'inactive', 'declined', 'revoked'];
        if (!validStatuses.includes(status)) {
          const response: ApiResponse = {
            success: false,
            error: 'Invalid status',
          };
          return res.status(400).json(response);
        }
        updateData.status = status as any;
      }

      if (permissions !== undefined) {
        updateData.permissions = JSON.stringify(permissions);
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      if (consentGiven !== undefined) {
        updateData.consentGiven = consentGiven;
        if (consentGiven) {
          updateData.consentDate = new Date();
          // If consent is given, activate the assignment
          updateData.status = 'active';
        }
      }

      if (endDate !== undefined) {
        updateData.endDate = endDate ? new Date(endDate) : null;
        if (endDate) {
          updateData.status = 'inactive';
        }
      }

      // Update assignment
      const updatedAssignment = await prisma.caregiverAssignment.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              userId: true,
              user: {
                select: {
                  email: true,
                  name: true
                }
              }
            }
          },
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedAssignment.id,
          patientId: updatedAssignment.patientId,
          caregiverId: updatedAssignment.caregiverId,
          caregiverType: updatedAssignment.caregiverType,
          status: updatedAssignment.status,
          permissions: JSON.parse(updatedAssignment.permissions || '{}'),
          startDate: updatedAssignment.startDate,
          endDate: updatedAssignment.endDate,
          notes: updatedAssignment.notes,
          consentGiven: updatedAssignment.consentGiven,
          consentDate: updatedAssignment.consentDate,
          patient: updatedAssignment.patient,
          caregiver: updatedAssignment.caregiver,
          assignedBy: updatedAssignment.assignedBy,
          assignedByUser: updatedAssignment.assignedByUser,
          createdAt: updatedAssignment.createdAt,
          updatedAt: updatedAssignment.updatedAt
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Update assignment error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Delete assignment
router.delete('/:id', 
  authenticateToken, 
  authorizeRole(['super_admin', 'clinic_admin', 'patient']),
  logUserActivity('DELETE', 'assignment'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { id } = req.params;

      // Get current assignment
      const assignment = await prisma.caregiverAssignment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              userId: true,
              organizationId: true
            }
          }
        }
      });

      if (!assignment) {
        const response: ApiResponse = {
          success: false,
          error: 'Assignment not found',
        };
        return res.status(404).json(response);
      }

      // Check authorization
      let canDelete = false;

      if (req.user.role === 'super_admin') {
        canDelete = true;
      } else if (req.user.role === 'clinic_admin' && assignment.patient.organizationId === req.user.organizationId) {
        canDelete = true;
      } else if (assignment.patient.userId === req.user.userId) {
        // Patients can delete their own assignments
        canDelete = true;
      }

      if (!canDelete) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        return res.status(403).json(response);
      }

      // Delete assignment
      await prisma.caregiverAssignment.delete({
        where: { id }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Assignment deleted successfully'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Delete assignment error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

export default router;