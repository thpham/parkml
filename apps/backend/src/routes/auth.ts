import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, logUserActivity } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, organizationId, invitationToken } = req.body;

    // Validate input
    if (!email || !password || !name || !role) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields',
      };
      return res.status(400).json(response);
    }

    // Validate role
    const validRoles = ['super_admin', 'clinic_admin', 'professional_caregiver', 'family_caregiver', 'patient'];
    if (!validRoles.includes(role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid role',
      };
      return res.status(400).json(response);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const response: ApiResponse = {
        success: false,
        error: 'User already exists',
      };
      return res.status(400).json(response);
    }

    // Handle invitation-based registration
    let invitation = null;
    if (invitationToken) {
      invitation = await prisma.invitation.findUnique({
        where: { token: invitationToken },
      });

      if (!invitation) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid invitation token',
        };
        return res.status(400).json(response);
      }

      if (invitation.status !== 'pending') {
        const response: ApiResponse = {
          success: false,
          error: 'Invitation has already been used or expired',
        };
        return res.status(400).json(response);
      }

      if (invitation.expiresAt < new Date()) {
        const response: ApiResponse = {
          success: false,
          error: 'Invitation has expired',
        };
        return res.status(400).json(response);
      }

      if (invitation.email !== email) {
        const response: ApiResponse = {
          success: false,
          error: 'Email does not match invitation',
        };
        return res.status(400).json(response);
      }

      if (invitation.role !== role) {
        const response: ApiResponse = {
          success: false,
          error: 'Role does not match invitation',
        };
        return res.status(400).json(response);
      }
    }

    // Determine organization
    let finalOrganizationId = organizationId;
    if (invitation) {
      // Get organization from invitation sender
      const invitationSender = await prisma.user.findUnique({
        where: { id: invitation.invitedBy },
        select: { organizationId: true }
      });
      finalOrganizationId = invitationSender?.organizationId || 'default_org';
    } else if (!organizationId) {
      // Default organization for direct registration
      finalOrganizationId = 'default_org';
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        organizationId: finalOrganizationId,
        lastLoginAt: new Date(),
      },
    });

    // Update invitation status if applicable
    if (invitation) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          invitedUser: user.id,
          acceptedAt: new Date(),
        },
      });

      // Create caregiver assignment if this is a caregiver invitation
      if (invitation.patientId && invitation.caregiverType) {
        await prisma.caregiverAssignment.create({
          data: {
            patientId: invitation.patientId,
            caregiverId: user.id,
            caregiverType: invitation.caregiverType,
            assignedBy: invitation.invitedBy,
            status: invitation.caregiverType === 'family' ? 'active' : 'pending', // Family caregivers auto-approved
            permissions: JSON.stringify(
              invitation.caregiverType === 'family' 
                ? { view_symptoms: true, edit_symptoms: true, view_reports: true, receive_notifications: true }
                : { view_all_symptoms: true, edit_symptoms: true, generate_reports: true, set_reminders: true }
            ),
            startDate: new Date(),
            notes: `Created from invitation: ${invitation.message || 'No message'}`,
          },
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Login user
router.post('/login', logUserActivity('LOGIN', 'user'), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      const response: ApiResponse = {
        success: false,
        error: 'Email and password are required',
      };
      return res.status(400).json(response);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid credentials',
      };
      return res.status(401).json(response);
    }

    // Check if user is active
    if (!user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Account is deactivated',
      };
      return res.status(403).json(response);
    }

    // Check if organization is active
    if (user.organization && !user.organization.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Organization is deactivated',
      };
      return res.status(403).json(response);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid credentials',
      };
      return res.status(401).json(response);
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organization,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            diagnosisDate: true,
            emergencyContact: true,
            privacySettings: true
          }
        }
      }
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organization,
          patient: user.patient,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Profile error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Update user profile
router.put('/profile', authenticateToken, logUserActivity('UPDATE', 'user'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { name, email } = req.body;

    // Validate input
    if (!name && !email) {
      const response: ApiResponse = {
        success: false,
        error: 'No fields to update',
      };
      return res.status(400).json(response);
    }

    // Check if new email is already taken
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        const response: ApiResponse = {
          success: false,
          error: 'Email already in use',
        };
        return res.status(400).json(response);
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          organizationId: updatedUser.organizationId,
          organization: updatedUser.organization,
          isActive: updatedUser.isActive,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Profile update error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Change password
router.put('/password', authenticateToken, logUserActivity('UPDATE', 'user'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      return res.status(401).json(response);
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      const response: ApiResponse = {
        success: false,
        error: 'Current password and new password are required',
      };
      return res.status(400).json(response);
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      return res.status(404).json(response);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      const response: ApiResponse = {
        success: false,
        error: 'Current password is incorrect',
      };
      return res.status(401).json(response);
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash: newPasswordHash },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Password updated successfully',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Password change error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

export default router;