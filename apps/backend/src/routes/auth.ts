import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from '@otplib/preset-default';
// WebAuthn imports for passkey login
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, logUserActivity } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { SecurityAuditService } from '../services/SecurityAuditService';
import { SessionManagerService } from '../services/SessionManagerService';

// Temporary in-memory challenge storage for passkey authentication
const challengeStore = new Map<string, { challenge: string; userId: string; expiresAt: number }>();

// Clean up expired challenges every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of challengeStore.entries()) {
      if (value.expiresAt < now) {
        challengeStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

// Password strength validation function
const validatePasswordStrength = (
  password: string
): { isValid: boolean; strength: string; errors: string[] } => {
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
    errors,
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
    const validRoles = [
      'super_admin',
      'clinic_admin',
      'professional_caregiver',
      'family_caregiver',
      'patient',
    ];
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
        select: { organizationId: true },
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
                ? {
                    view_symptoms: true,
                    edit_symptoms: true,
                    view_reports: true,
                    receive_notifications: true,
                  }
                : {
                    view_all_symptoms: true,
                    edit_symptoms: true,
                    generate_reports: true,
                    set_reminders: true,
                  }
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
        isActive: user.isActive,
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

// Enhanced login user with 2FA support
router.post('/login', logUserActivity('LOGIN', 'user'), async (req, res) => {
  try {
    const { email, password, twoFactorCode, backupCode } = req.body;

    // Validate input
    if (!email || !password) {
      const response: ApiResponse = {
        success: false,
        error: 'Email and password are required',
      };
      return res.status(400).json(response);
    }

    // Log login attempt (security event will be logged after we identify the user)
    await prisma.loginAttempt.create({
      data: {
        email,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || null,
        success: false, // Will update if successful
        failureReason: null,
      },
    });

    // Find user with 2FA information
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        twoFactorAuth: true,
      },
    });

    if (!user) {
      // Update login attempt with failure reason (no security audit for unknown users)
      await prisma.loginAttempt.updateMany({
        where: {
          email,
          ipAddress: req.ip || 'unknown',
          success: false,
          failureReason: null,
        },
        data: { failureReason: 'invalid_email' },
      });

      const response: ApiResponse = {
        success: false,
        error: 'Invalid credentials',
      };
      return res.status(401).json(response);
    }

    // Check if user is active
    if (!user.isActive) {
      await Promise.all([
        prisma.loginAttempt.updateMany({
          where: {
            email,
            ipAddress: req.ip || 'unknown',
            success: false,
            failureReason: null,
          },
          data: { failureReason: 'account_locked' },
        }),
        SecurityAuditService.logSecurityEvent(
          {
            userId: user.id,
            action: 'failed_login',
            status: 'failed',
            riskLevel: 'high',
            details: {
              email,
              failureReason: 'account_locked',
            },
          },
          req
        ),
      ]);

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
      await Promise.all([
        prisma.loginAttempt.updateMany({
          where: {
            email,
            ipAddress: req.ip || 'unknown',
            success: false,
            failureReason: null,
          },
          data: { failureReason: 'invalid_password' },
        }),
        SecurityAuditService.logSecurityEvent(
          {
            userId: user.id,
            action: 'failed_login',
            status: 'failed',
            riskLevel: 'medium',
            details: {
              email,
              failureReason: 'invalid_password',
              loginMethod: 'password',
            },
          },
          req
        ),
      ]);

      const response: ApiResponse = {
        success: false,
        error: 'Invalid credentials',
      };
      return res.status(401).json(response);
    }

    // Check if 2FA is enabled and handle 2FA verification
    if (user.twoFactorAuth?.isEnabled) {
      // If no 2FA code provided, request it
      if (!twoFactorCode && !backupCode) {
        const response: ApiResponse = {
          success: false,
          error: 'Two-factor authentication required',
          data: {
            requiresTwoFactor: true,
            userId: user.id, // Temporary identifier for 2FA step
          },
        };
        return res.status(200).json(response); // 200 because it's expected flow
      }

      // Verify 2FA code or backup code
      let isValid2FA = false;

      if (twoFactorCode) {
        // Verify TOTP token with time window tolerance
        const tempAuth = authenticator.clone();
        tempAuth.options = { ...tempAuth.options, window: 2 };
        isValid2FA = tempAuth.verify({
          token: twoFactorCode,
          secret: user.twoFactorAuth.secret,
        });
      } else if (backupCode) {
        // Verify backup code
        const backupCodes = JSON.parse(user.twoFactorAuth.backupCodes || '[]');
        const usedCodes = JSON.parse(user.twoFactorAuth.recoveryCodesUsed || '[]');

        isValid2FA =
          backupCodes.includes(backupCode.toUpperCase()) &&
          !usedCodes.includes(backupCode.toUpperCase());

        if (isValid2FA) {
          // Mark backup code as used
          usedCodes.push(backupCode.toUpperCase());
          await prisma.twoFactorAuth.update({
            where: { userId: user.id },
            data: {
              recoveryCodesUsed: JSON.stringify(usedCodes),
              lastUsedAt: new Date(),
            },
          });
        }
      }

      if (!isValid2FA) {
        // Increment failed attempts
        await Promise.all([
          prisma.twoFactorAuth.update({
            where: { userId: user.id },
            data: { failedAttempts: { increment: 1 } },
          }),
          prisma.loginAttempt.updateMany({
            where: {
              email,
              ipAddress: req.ip || 'unknown',
              success: false,
              failureReason: null,
            },
            data: { failureReason: 'invalid_2fa' },
          }),
          SecurityAuditService.logSecurityEvent(
            {
              userId: user.id,
              action: 'failed_login',
              status: 'failed',
              riskLevel: 'high',
              details: {
                email,
                failureReason: 'invalid_2fa',
                loginMethod: twoFactorCode ? '2fa_totp' : 'backup_code',
                twoFactorUsed: true,
              },
            },
            req
          ),
        ]);

        const response: ApiResponse = {
          success: false,
          error: 'Invalid two-factor authentication code',
        };
        return res.status(401).json(response);
      }

      // Update 2FA last used time for TOTP
      if (twoFactorCode) {
        await prisma.twoFactorAuth.update({
          where: { userId: user.id },
          data: { lastUsedAt: new Date() },
        });
      }
    }

    // Create session and log security events
    const sessionData = {
      userId: user.id,
      organizationId: user.organizationId || undefined,
      loginMethod: (user.twoFactorAuth?.isEnabled
        ? twoFactorCode
          ? '2fa_totp'
          : 'backup_code'
        : 'password') as 'password' | '2fa_totp' | 'backup_code',
      twoFactorVerified: !!user.twoFactorAuth?.isEnabled,
    };

    const { sessionToken, sessionId } = await SessionManagerService.createSession(
      sessionData,
      req,
      false // rememberMe - could be extended to support this
    );

    // Log comprehensive security event
    await SecurityAuditService.logSecurityEvent(
      {
        userId: user.id,
        organizationId: user.organizationId || undefined,
        action: 'login',
        resourceType: 'session',
        resourceId: sessionId,
        status: 'success',
        riskLevel: 'low',
        details: {
          loginMethod: sessionData.loginMethod,
          twoFactorUsed: !!user.twoFactorAuth?.isEnabled,
          sessionId,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
        },
        sessionId,
      },
      req
    );

    // Update successful login attempt
    await prisma.loginAttempt.updateMany({
      where: {
        email,
        ipAddress: req.ip || 'unknown',
        success: false,
        failureReason: null,
      },
      data: { success: true },
    });

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token with session information
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive,
        sessionId,
        sessionToken,
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
          twoFactorEnabled: user.twoFactorAuth?.isEnabled || false,
        },
        token,
        sessionId,
        loginMethod: user.twoFactorAuth?.isEnabled
          ? twoFactorCode
            ? '2fa_totp'
            : 'backup_code'
          : 'password',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);

    // Log failed login attempt due to server error
    if (req.body.email) {
      await prisma.loginAttempt.updateMany({
        where: {
          email: req.body.email,
          ipAddress: req.ip || 'unknown',
          success: false,
          failureReason: null,
        },
        data: { failureReason: 'server_error' },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Generate authentication options for passkey login
router.post('/login/passkey/begin', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      const response: ApiResponse = {
        success: false,
        error: 'Email is required for passkey authentication',
      };
      return res.status(400).json(response);
    }

    // Find user and their passkeys
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        passkeys: {
          where: { isActive: true },
          select: {
            id: true,
            credentialId: true,
            publicKey: true,
            counter: true,
            transports: true,
          },
        },
      },
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'No account found with this email',
      };
      return res.status(404).json(response);
    }

    if (!user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Account is deactivated',
      };
      return res.status(403).json(response);
    }

    if (user.passkeys.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No passkeys registered for this account',
      };
      return res.status(400).json(response);
    }

    // Generate authentication options
    const allowCredentials = user.passkeys.map(passkey => ({
      id: passkey.credentialId,
      transports: JSON.parse(passkey.transports || '[]') as AuthenticatorTransportFuture[],
    }));

    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID || 'localhost',
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store challenge in temporary storage
    const challengeKey = `challenge_${user.id}_${Date.now()}`;
    challengeStore.set(challengeKey, {
      challenge: options.challenge,
      userId: user.id,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    const response: ApiResponse = {
      success: true,
      data: {
        options,
        challengeKey,
        userId: user.id, // Temporary identifier for verification step
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Passkey login begin error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate authentication options',
    };
    res.status(500).json(response);
  }
});

// Verify passkey authentication and complete login
router.post('/login/passkey/complete', logUserActivity('LOGIN', 'user'), async (req, res) => {
  try {
    const { userId, challengeKey, authenticationResponse } = req.body;

    if (!userId || !challengeKey || !authenticationResponse) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID, challenge key, and authentication response are required',
      };
      return res.status(400).json(response);
    }

    // Get stored challenge
    const storedChallenge = challengeStore.get(challengeKey);

    if (
      !storedChallenge ||
      storedChallenge.expiresAt < Date.now() ||
      storedChallenge.userId !== userId
    ) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication challenge not found or expired',
      };
      return res.status(400).json(response);
    }

    // Find user with passkeys
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        passkeys: {
          where: {
            credentialId: authenticationResponse.id,
            isActive: true,
          },
        },
        twoFactorAuth: true,
      },
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      return res.status(404).json(response);
    }

    if (!user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Account is deactivated',
      };
      return res.status(403).json(response);
    }

    if (user.organization && !user.organization.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Organization is deactivated',
      };
      return res.status(403).json(response);
    }

    const passkey = user.passkeys[0];
    if (!passkey) {
      const response: ApiResponse = {
        success: false,
        error: 'Passkey not found or inactive',
      };
      return res.status(400).json(response);
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
      credential: {
        id: passkey.credentialId,
        publicKey: Buffer.from(passkey.publicKey, 'base64'),
        counter: passkey.counter,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      // Log failed login attempt
      await prisma.loginAttempt.create({
        data: {
          email: user.email,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || null,
          success: false,
          failureReason: 'invalid_passkey',
        },
      });

      const response: ApiResponse = {
        success: false,
        error: 'Passkey verification failed',
      };
      return res.status(401).json(response);
    }

    // Update passkey counter and last used
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    // Clean up used challenge
    challengeStore.delete(challengeKey);

    // Create session and log security events
    const passkeySessionData = {
      userId: user.id,
      organizationId: user.organizationId || undefined,
      loginMethod: 'passkey' as const,
      twoFactorVerified: false, // Passkey is considered strong authentication
    };

    const { sessionToken: passkeySessionToken, sessionId: passkeySessionId } =
      await SessionManagerService.createSession(passkeySessionData, req, false);

    // Log comprehensive security event
    await SecurityAuditService.logSecurityEvent(
      {
        userId: user.id,
        organizationId: user.organizationId || undefined,
        action: 'login',
        resourceType: 'session',
        resourceId: passkeySessionId,
        status: 'success',
        riskLevel: 'low',
        details: {
          loginMethod: 'passkey',
          passkeyId: passkey.id,
          deviceName: passkey.deviceName,
          passkeyUsed: true,
          sessionId: passkeySessionId,
          timestamp: new Date().toISOString(),
        },
        sessionId: passkeySessionId,
      },
      req
    );

    // Log successful login attempt
    await prisma.loginAttempt.create({
      data: {
        email: user.email,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || null,
        success: true,
      },
    });

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token with session information
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive,
        sessionId: passkeySessionId,
        sessionToken: passkeySessionToken,
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
          twoFactorEnabled: user.twoFactorAuth?.isEnabled || false,
        },
        token,
        sessionId: passkeySessionId,
        loginMethod: 'passkey',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Passkey login complete error:', error);

    // Log failed login attempt due to server error
    if (req.body.userId) {
      const user = await prisma.user.findUnique({
        where: { id: req.body.userId },
        select: { email: true },
      });

      if (user) {
        await prisma.loginAttempt.create({
          data: {
            email: user.email,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || null,
            success: false,
            failureReason: 'server_error',
          },
        });
      }
    }

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
            isActive: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            diagnosisDate: true,
            emergencyContact: true,
            privacySettings: true,
          },
        },
        twoFactorAuth: {
          select: {
            isEnabled: true,
            setupCompletedAt: true,
            lastUsedAt: true,
          },
        },
        passkeys: {
          select: {
            id: true,
            deviceName: true,
            deviceType: true,
            createdAt: true,
            lastUsedAt: true,
            isActive: true,
          },
        },
        userPreferences: true,
        userNotificationSettings: true,
      },
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
        country: user.addressCountry,
      },
      emergencyContact: {
        name: user.emergencyContactName,
        phone: user.emergencyContactPhone,
        relationship: user.emergencyContactRelationship,
      },
      medicalInfo: {
        allergies: user.medicalAllergies,
        medications: user.medicalMedications,
        emergencyNotes: user.medicalEmergencyNotes,
      },
      // Security Information
      securityScore: user.securityScore,
      passwordChangedAt: user.passwordChangedAt,
      twoFactorEnabled: user.twoFactorAuth?.isEnabled || false,
      passkeyCount: user.passkeys?.filter(p => p.isActive).length || 0,
      // Settings
      preferences: user.userPreferences,
      notificationSettings: user.userNotificationSettings,
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
router.put(
  '/profile',
  authenticateToken,
  logUserActivity('UPDATE', 'user'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const { name, email, phone, dateOfBirth, address, emergencyContact, medicalInfo } = req.body;

      // Validate that at least one field is being updated
      const hasUpdates =
        name || email || phone || dateOfBirth || address || emergencyContact || medicalInfo;
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
          ...(emergencyContact?.name !== undefined && {
            emergencyContactName: emergencyContact.name,
          }),
          ...(emergencyContact?.phone !== undefined && {
            emergencyContactPhone: emergencyContact.phone,
          }),
          ...(emergencyContact?.relationship !== undefined && {
            emergencyContactRelationship: emergencyContact.relationship,
          }),
          // Medical information fields
          ...(medicalInfo?.allergies !== undefined && { medicalAllergies: medicalInfo.allergies }),
          ...(medicalInfo?.medications !== undefined && {
            medicalMedications: medicalInfo.medications,
          }),
          ...(medicalInfo?.emergencyNotes !== undefined && {
            medicalEmergencyNotes: medicalInfo.emergencyNotes,
          }),
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
          twoFactorAuth: {
            select: {
              isEnabled: true,
              setupCompletedAt: true,
            },
          },
          passkeys: {
            select: {
              id: true,
              deviceName: true,
              deviceType: true,
              createdAt: true,
              lastUsedAt: true,
              isActive: true,
            },
          },
        },
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
          country: updatedUser.addressCountry,
        },
        emergencyContact: {
          name: updatedUser.emergencyContactName,
          phone: updatedUser.emergencyContactPhone,
          relationship: updatedUser.emergencyContactRelationship,
        },
        medicalInfo: {
          allergies: updatedUser.medicalAllergies,
          medications: updatedUser.medicalMedications,
          emergencyNotes: updatedUser.medicalEmergencyNotes,
        },
        // Security Information
        securityScore: updatedUser.securityScore,
        passwordChangedAt: updatedUser.passwordChangedAt,
        twoFactorEnabled: updatedUser.twoFactorAuth?.isEnabled || false,
        passkeyCount: updatedUser.passkeys?.filter(p => p.isActive).length || 0,
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
  }
);

// Change password
router.put(
  '/password',
  authenticateToken,
  logUserActivity('UPDATE', 'user'),
  async (req: AuthenticatedRequest, res) => {
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
            strength: passwordValidation.strength,
          },
        };
        return res.status(400).json(response);
      }

      // Get current user with password history
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          passwordHistory: {
            orderBy: { createdAt: 'desc' },
            take: 5, // Check last 5 passwords
          },
        },
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
            passwordHash: user.passwordHash,
          },
        }),
        // Update user password and security info
        prisma.user.update({
          where: { id: req.user.userId },
          data: {
            passwordHash: newPasswordHash,
            passwordChangedAt: new Date(),
            securityScore: securityScore,
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
              securityScoreChange: securityScore - (user.securityScore || 65),
            }),
          },
        }),
        // Clean up old password history (keep only last 5)
        prisma.passwordHistory.deleteMany({
          where: {
            userId: req.user.userId,
            id: {
              notIn: user.passwordHistory.slice(0, 4).map(p => p.id),
            },
          },
        }),
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Password updated successfully',
          passwordStrength: passwordValidation.strength,
          securityScore: securityScore,
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
  }
);

// =====================================
// Security Features Redirects
// =====================================
// These routes redirect to the correct security endpoints

// 2FA Setup - redirect to security module
router.post('/2fa/setup', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/2fa/setup',
    redirectTo: '/api/security/2fa/setup',
  });
});

// 2FA Verify
router.post('/2fa/verify', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/2fa/verify',
    redirectTo: '/api/security/2fa/verify',
  });
});

// 2FA Disable
router.post('/2fa/disable', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/2fa/disable',
    redirectTo: '/api/security/2fa/disable',
  });
});

// Passkey List
router.get('/passkey/list', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/passkeys',
    redirectTo: '/api/security/passkeys',
  });
});

// Passkey Register Begin
router.get('/passkey/register/begin', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/passkeys/register/begin',
    redirectTo: '/api/security/passkeys/register/begin',
  });
});

// Passkey Register Complete
router.post('/passkey/register/complete', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/passkeys/register/complete',
    redirectTo: '/api/security/passkeys/register/complete',
  });
});

// Logout endpoint using same auth as other endpoints
router.post(
  '/logout',
  authenticateToken,
  logUserActivity('LOGOUT', 'user'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      // Log security audit event
      await prisma.securityAuditLog.create({
        data: {
          userId: req.user.userId,
          action: 'logout',
          resourceType: 'session',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          status: 'success',
          riskLevel: 'low',
          details: JSON.stringify({
            logoutMethod: 'user_initiated',
            timestamp: new Date().toISOString(),
          }),
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Logout error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  }
);

// Audit Logs
router.get('/audit-logs', (_req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved. Please use /api/security/audit-logs',
    redirectTo: '/api/security/audit-logs',
  });
});

export default router;
