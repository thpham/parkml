import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, logUserActivity } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

// Password strength validation function
const validatePasswordStrength = (password: string): { isValid: boolean; strength: string; errors: string[] } => {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Numbers
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special characters
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Common patterns check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters');
    score -= 1;
  }

  // Determine strength
  let strength = 'weak';
  if (score >= 5 && errors.length === 0) {
    strength = 'strong';
  } else if (score >= 3 && errors.length <= 1) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0 && score >= 3,
    strength,
    errors
  };
};

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
        },
        twoFactorAuth: {
          select: {
            isEnabled: true,
            setupCompletedAt: true,
            lastUsedAt: true
          }
        },
        passkeys: {
          select: {
            id: true,
            deviceName: true,
            deviceType: true,
            createdAt: true,
            lastUsedAt: true,
            isActive: true
          }
        },
        userPreferences: true,
        userNotificationSettings: true
      }
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      return res.status(404).json(response);
    }

    // Build comprehensive profile
    const profile = {
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
      // Personal Information
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      address: {
        street: user.addressStreet,
        city: user.addressCity,
        postalCode: user.addressPostalCode,
        country: user.addressCountry
      },
      emergencyContact: {
        name: user.emergencyContactName,
        phone: user.emergencyContactPhone,
        relationship: user.emergencyContactRelationship
      },
      medicalInfo: {
        allergies: user.medicalAllergies,
        medications: user.medicalMedications,
        emergencyNotes: user.medicalEmergencyNotes
      },
      // Security Information
      securityScore: user.securityScore,
      passwordChangedAt: user.passwordChangedAt,
      twoFactorEnabled: user.twoFactorAuth?.isEnabled || false,
      passkeyCount: user.passkeys?.filter(p => p.isActive).length || 0,
      // Settings
      preferences: user.userPreferences,
      notificationSettings: user.userNotificationSettings
    };

    const response: ApiResponse = {
      success: true,
      data: { user: profile },
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

    const { 
      name, 
      email, 
      phone, 
      dateOfBirth,
      address,
      emergencyContact,
      medicalInfo 
    } = req.body;

    // Validate that at least one field is being updated
    const hasUpdates = name || email || phone || dateOfBirth || address || emergencyContact || medicalInfo;
    if (!hasUpdates) {
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

    // Validate date of birth if provided
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid date of birth',
        };
        return res.status(400).json(response);
      }
    }

    // Update user with all new fields
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        // Address fields
        ...(address?.street !== undefined && { addressStreet: address.street }),
        ...(address?.city !== undefined && { addressCity: address.city }),
        ...(address?.postalCode !== undefined && { addressPostalCode: address.postalCode }),
        ...(address?.country !== undefined && { addressCountry: address.country }),
        // Emergency contact fields
        ...(emergencyContact?.name !== undefined && { emergencyContactName: emergencyContact.name }),
        ...(emergencyContact?.phone !== undefined && { emergencyContactPhone: emergencyContact.phone }),
        ...(emergencyContact?.relationship !== undefined && { emergencyContactRelationship: emergencyContact.relationship }),
        // Medical information fields
        ...(medicalInfo?.allergies !== undefined && { medicalAllergies: medicalInfo.allergies }),
        ...(medicalInfo?.medications !== undefined && { medicalMedications: medicalInfo.medications }),
        ...(medicalInfo?.emergencyNotes !== undefined && { medicalEmergencyNotes: medicalInfo.emergencyNotes }),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        twoFactorAuth: {
          select: {
            isEnabled: true,
            setupCompletedAt: true
          }
        },
        passkeys: {
          select: {
            id: true,
            deviceName: true,
            deviceType: true,
            createdAt: true,
            lastUsedAt: true,
            isActive: true
          }
        }
      }
    });

    // Build response profile
    const profile = {
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
      // Personal Information
      phone: updatedUser.phone,
      dateOfBirth: updatedUser.dateOfBirth,
      address: {
        street: updatedUser.addressStreet,
        city: updatedUser.addressCity,
        postalCode: updatedUser.addressPostalCode,
        country: updatedUser.addressCountry
      },
      emergencyContact: {
        name: updatedUser.emergencyContactName,
        phone: updatedUser.emergencyContactPhone,
        relationship: updatedUser.emergencyContactRelationship
      },
      medicalInfo: {
        allergies: updatedUser.medicalAllergies,
        medications: updatedUser.medicalMedications,
        emergencyNotes: updatedUser.medicalEmergencyNotes
      },
      // Security Information
      securityScore: updatedUser.securityScore,
      passwordChangedAt: updatedUser.passwordChangedAt,
      twoFactorEnabled: updatedUser.twoFactorAuth?.isEnabled || false,
      passkeyCount: updatedUser.passkeys?.filter(p => p.isActive).length || 0
    };

    const response: ApiResponse = {
      success: true,
      data: { user: profile },
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

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      const response: ApiResponse = {
        success: false,
        error: 'Password does not meet security requirements',
        data: {
          errors: passwordValidation.errors,
          strength: passwordValidation.strength
        }
      };
      return res.status(400).json(response);
    }

    // Get current user with password history
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        passwordHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Check last 5 passwords
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

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      const response: ApiResponse = {
        success: false,
        error: 'Current password is incorrect',
      };
      return res.status(401).json(response);
    }

    // Check if new password matches current password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      const response: ApiResponse = {
        success: false,
        error: 'New password must be different from current password',
      };
      return res.status(400).json(response);
    }

    // Check password history to prevent reuse
    for (const historicalPassword of user.passwordHistory) {
      const isReused = await bcrypt.compare(newPassword, historicalPassword.passwordHash);
      if (isReused) {
        const response: ApiResponse = {
          success: false,
          error: 'Password has been used recently. Please choose a different password.',
        };
        return res.status(400).json(response);
      }
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Calculate new security score based on password strength
    let securityScore = user.securityScore || 65;
    if (passwordValidation.strength === 'strong') {
      securityScore = Math.min(100, securityScore + 10);
    } else if (passwordValidation.strength === 'medium') {
      securityScore = Math.min(100, securityScore + 5);
    }

    // Update password and security info
    await prisma.$transaction([
      // Save current password to history
      prisma.passwordHistory.create({
        data: {
          userId: req.user.userId,
          passwordHash: user.passwordHash
        }
      }),
      // Update user password and security info
      prisma.user.update({
        where: { id: req.user.userId },
        data: { 
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
          securityScore: securityScore
        },
      }),
      // Log security audit
      prisma.securityAuditLog.create({
        data: {
          userId: req.user.userId,
          action: 'password_change',
          resourceType: 'password',
          resourceId: req.user.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          status: 'success',
          riskLevel: 'low',
          details: JSON.stringify({
            passwordStrength: passwordValidation.strength,
            securityScoreChange: securityScore - (user.securityScore || 65)
          })
        }
      }),
      // Clean up old password history (keep only last 5)
      prisma.passwordHistory.deleteMany({
        where: {
          userId: req.user.userId,
          id: {
            notIn: user.passwordHistory.slice(0, 4).map(p => p.id)
          }
        }
      })
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Password updated successfully',
        passwordStrength: passwordValidation.strength,
        securityScore: securityScore
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

// =====================================
// Security Features Redirects
// =====================================
// These routes redirect to the correct security endpoints

// 2FA Setup - redirect to security module
router.post('/2fa/setup', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/2fa/setup',
    redirectTo: '/api/security/2fa/setup'
  });
});

// 2FA Verify
router.post('/2fa/verify', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/2fa/verify',
    redirectTo: '/api/security/2fa/verify'
  });
});

// 2FA Disable
router.post('/2fa/disable', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/2fa/disable',
    redirectTo: '/api/security/2fa/disable'
  });
});

// Passkey List
router.get('/passkey/list', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/passkeys',
    redirectTo: '/api/security/passkeys'
  });
});

// Passkey Register Begin
router.get('/passkey/register/begin', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/passkeys/register/begin',
    redirectTo: '/api/security/passkeys/register/begin'
  });
});

// Passkey Register Complete
router.post('/passkey/register/complete', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/passkeys/register/complete',
    redirectTo: '/api/security/passkeys/register/complete'
  });
});

// Audit Logs
router.get('/audit-logs', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/audit-logs',
    redirectTo: '/api/security/audit-logs'
  });
});

export default router;