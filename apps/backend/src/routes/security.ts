import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';
import { authenticator } from '@otplib/preset-default';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';

// Type definitions
type AuditLogFilters = {
  userId: string;
  action?: string;
  riskLevel?: string;
  timestamp?: {
    gte?: Date;
    lte?: Date;
  };
  OR?: Array<{
    timestamp?: {
      gte?: Date;
    };
    ipAddress?: {
      contains: string;
    };
    userAgent?: {
      contains: string;
    };
    location?: {
      contains: string;
    };
    details?: {
      contains: string;
    };
  }>;
};

// Debug TOTP configuration on startup

// Temporary storage for WebAuthn challenges (in production, use Redis or proper session store)
interface ChallengeData {
  challenge: string;
  expiresAt: number;
}

const challengeStore = new Map<string, ChallengeData>();

// Clean up expired challenges every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [userId, data] of challengeStore.entries()) {
      if (data.expiresAt < now) {
        challengeStore.delete(userId);
      }
    }
  },
  5 * 60 * 1000
);

// Extended AuthenticatedRequest with session support
interface AuthenticatedRequestWithSession extends AuthenticatedRequest {
  session?: {
    challenge?: string;
  };
}

const router = Router();

// Cleanup function for expired 2FA setups
export async function cleanup2FASetups() {
  try {
    const SETUP_EXPIRY_SECONDS = 60;
    const expiryTime = new Date(Date.now() - SETUP_EXPIRY_SECONDS * 1000);

    const expiredSetups = await prisma.twoFactorAuth.deleteMany({
      where: {
        isEnabled: false,
        createdAt: {
          lt: expiryTime,
        },
      },
    });

    if (expiredSetups.count > 0) {
      // Cleanup completed
    }

    return expiredSetups.count;
  } catch (error) {
    console.error('Error cleaning up expired 2FA setups:', error);
    return 0;
  }
}

// RP (Relying Party) information for WebAuthn
const rpName = 'ParkML';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

// =====================================
// 2FA (TOTP) Authentication Routes
// =====================================

// Get 2FA status
router.get('/2fa/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: req.user.userId },
      select: {
        isEnabled: true,
        setupCompletedAt: true,
        lastUsedAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        isEnabled: twoFactorAuth?.isEnabled || false,
        setupCompletedAt: twoFactorAuth?.setupCompletedAt,
        lastUsedAt: twoFactorAuth?.lastUsedAt,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('2FA status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// Setup 2FA - Generate secret and QR code
router.post('/2fa/setup', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    // Check if 2FA is already enabled
    const existingTwoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId: req.user.userId },
    });

    if (existingTwoFactor?.isEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is already enabled for this account',
      } as ApiResponse);
    }

    // If there's an existing setup in progress (not enabled), check if it's still valid
    if (existingTwoFactor?.secret && !existingTwoFactor.isEnabled) {
      // Check if setup has expired (60 seconds for security)
      const SETUP_EXPIRY_SECONDS = 60;
      const setupAge = Date.now() - existingTwoFactor.createdAt.getTime();
      const setupAgeSeconds = setupAge / 1000;

      if (setupAgeSeconds > SETUP_EXPIRY_SECONDS) {
        // Delete expired setup (use deleteMany to avoid error if record doesn't exist)
        await prisma.twoFactorAuth.deleteMany({
          where: { userId: req.user.userId },
        });

        // Log security event
        await prisma.securityAuditLog.create({
          data: {
            userId: req.user.userId,
            action: '2fa_setup_expired',
            resourceType: '2fa',
            resourceId: req.user.userId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown',
            status: 'success',
            riskLevel: 'low',
            details: JSON.stringify({ expiredAfterSeconds: setupAgeSeconds.toFixed(1) }),
          },
        });

        // Continue to create new setup below
      } else {
        // Parse existing backup codes
        const backupCodes = JSON.parse(existingTwoFactor.backupCodes || '[]');

        // Recreate TOTP URL from existing secret
        const user = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { email: true },
        });

        const issuer = 'ParkML';
        const label = `${issuer}:${user?.email}`;
        const totpUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${existingTwoFactor.secret}&issuer=${encodeURIComponent(issuer)}`;

        return res.json({
          success: true,
          data: {
            secret: existingTwoFactor.secret,
            qrCodeUrl: totpUrl,
            qrCodeDataUrl: existingTwoFactor.qrCodeUrl || '',
            backupCodes,
            manualEntryKey: existingTwoFactor.secret,
          },
        } as ApiResponse);
      }
    }

    // Get user info for QR code
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret();

    // Create TOTP URL for QR code
    const issuer = 'ParkML';
    const label = `${issuer}:${user.email}`;
    const totpUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(totpUrl);

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Save or update 2FA setup (but not enabled yet)
    await prisma.twoFactorAuth.upsert({
      where: { userId: req.user.userId },
      update: {
        secret,
        qrCodeUrl: qrCodeDataUrl,
        backupCodes: JSON.stringify(backupCodes),
        isEnabled: false,
        setupCompletedAt: null,
      },
      create: {
        userId: req.user.userId,
        secret,
        qrCodeUrl: qrCodeDataUrl,
        backupCodes: JSON.stringify(backupCodes),
        isEnabled: false,
      },
    });

    // Log security audit
    await prisma.securityAuditLog.create({
      data: {
        userId: req.user.userId,
        action: '2fa_setup_initiated',
        resourceType: '2fa',
        resourceId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown',
        status: 'success',
        riskLevel: 'low',
      },
    });

    res.json({
      success: true,
      data: {
        secret,
        qrCodeUrl: totpUrl,
        qrCodeDataUrl: qrCodeDataUrl,
        backupCodes,
        manualEntryKey: secret,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('2FA setup error:', error);

    // If there's an error, try to clean up any incomplete setup and let user restart
    if (req.user) {
      try {
        await prisma.twoFactorAuth.deleteMany({
          where: {
            userId: req.user.userId,
            isEnabled: false,
          },
        });
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to initialize 2FA setup. Please try again.',
    } as ApiResponse);
  }
});

// Reset/cleanup incomplete 2FA setup
router.delete('/2fa/setup', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    // Delete any incomplete 2FA setup
    const deletedSetup = await prisma.twoFactorAuth.deleteMany({
      where: {
        userId: req.user.userId,
        isEnabled: false,
      },
    });

    // Log security event
    await prisma.securityAuditLog.create({
      data: {
        userId: req.user.userId,
        action: '2fa_setup_reset',
        resourceType: '2fa',
        resourceId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown',
        status: 'success',
        riskLevel: 'low',
        details: JSON.stringify({ deletedCount: deletedSetup.count }),
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Incomplete 2FA setup cleaned up successfully',
        deletedCount: deletedSetup.count,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('2FA cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// Verify and enable 2FA
router.post('/2fa/verify', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required',
      } as ApiResponse);
    }

    // Get 2FA setup
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: req.user.userId },
    });

    if (!twoFactorAuth) {
      return res.status(404).json({
        success: false,
        error: '2FA setup not found. Please restart the setup process.',
      } as ApiResponse);
    }

    // Check if setup has expired (60 seconds for verification)
    if (!twoFactorAuth.isEnabled) {
      const SETUP_EXPIRY_SECONDS = 60;
      const setupAge = Date.now() - twoFactorAuth.updatedAt.getTime();
      const setupAgeSeconds = setupAge / 1000;

      if (setupAgeSeconds > SETUP_EXPIRY_SECONDS) {
        // Delete expired setup (use deleteMany to avoid error if record doesn't exist)
        await prisma.twoFactorAuth.deleteMany({
          where: { userId: req.user.userId },
        });

        // Log security event
        await prisma.securityAuditLog.create({
          data: {
            userId: req.user.userId,
            action: '2fa_verification_expired',
            resourceType: '2fa',
            resourceId: req.user.userId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown',
            status: 'failed',
            riskLevel: 'medium',
            details: JSON.stringify({ expiredAfterSeconds: setupAgeSeconds.toFixed(1) }),
          },
        });

        return res.status(400).json({
          success: false,
          error: 'Setup expired. Please restart the 2FA setup process.',
        } as ApiResponse);
      }
    }

    if (twoFactorAuth.isEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is already enabled for this account.',
      } as ApiResponse);
    }

    // Verify TOTP token with time window tolerance (±2 time windows = ±60 seconds)
    // Create a temporary authenticator instance with window tolerance
    const tempAuth = authenticator.clone();
    tempAuth.options = { ...tempAuth.options, window: 2 };

    const isValid = tempAuth.verify({
      token,
      secret: twoFactorAuth.secret,
    });

    if (!isValid) {
      // Increment failed attempts
      await prisma.twoFactorAuth.update({
        where: { userId: req.user.userId },
        data: { failedAttempts: { increment: 1 } },
      });

      // Log failed verification
      await prisma.securityAuditLog.create({
        data: {
          userId: req.user.userId,
          action: '2fa_verification_failed',
          resourceType: '2fa',
          resourceId: req.user.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          status: 'failed',
          riskLevel: 'medium',
        },
      });

      return res.status(400).json({
        success: false,
        error: 'Invalid verification code',
      } as ApiResponse);
    }

    // Enable 2FA
    await prisma.$transaction([
      prisma.twoFactorAuth.update({
        where: { userId: req.user.userId },
        data: {
          isEnabled: true,
          setupCompletedAt: new Date(),
          lastUsedAt: new Date(),
          failedAttempts: 0,
        },
      }),
      // Update user security score
      prisma.user.update({
        where: { id: req.user.userId },
        data: {
          securityScore: { increment: 15 }, // Boost for enabling 2FA
        },
      }),
      // Log successful enablement
      prisma.securityAuditLog.create({
        data: {
          userId: req.user.userId,
          action: '2fa_enabled',
          resourceType: '2fa',
          resourceId: req.user.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          status: 'success',
          riskLevel: 'low',
        },
      }),
    ]);

    // Get the updated 2FA setup with backup codes to return to frontend
    const updatedTwoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: req.user.userId },
    });

    const backupCodes = updatedTwoFactorAuth?.backupCodes
      ? JSON.parse(updatedTwoFactorAuth.backupCodes)
      : [];

    res.json({
      success: true,
      data: {
        message: '2FA enabled successfully',
        backupCodes, // Include backup codes in response so frontend can display them immediately
      },
    } as ApiResponse);
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    const { token, backupCode } = req.body;

    if (!token && !backupCode) {
      return res.status(400).json({
        success: false,
        error: 'Verification token or backup code is required',
      } as ApiResponse);
    }

    // Get 2FA setup
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: req.user.userId },
    });

    if (!twoFactorAuth?.isEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled',
      } as ApiResponse);
    }

    let isValid = false;

    if (token) {
      // Verify TOTP token with time window tolerance
      const tempAuth = authenticator.clone();
      tempAuth.options = { ...tempAuth.options, window: 2 };
      isValid = tempAuth.verify({ token, secret: twoFactorAuth.secret });
    } else if (backupCode) {
      // Verify backup code
      const backupCodes = JSON.parse(twoFactorAuth.backupCodes || '[]');
      const usedCodes = JSON.parse(twoFactorAuth.recoveryCodesUsed || '[]');

      isValid =
        backupCodes.includes(backupCode.toUpperCase()) &&
        !usedCodes.includes(backupCode.toUpperCase());

      if (isValid) {
        // Mark backup code as used
        usedCodes.push(backupCode.toUpperCase());
        await prisma.twoFactorAuth.update({
          where: { userId: req.user.userId },
          data: { recoveryCodesUsed: JSON.stringify(usedCodes) },
        });
      }
    }

    if (!isValid) {
      // Log failed attempt
      await prisma.securityAuditLog.create({
        data: {
          userId: req.user.userId,
          action: '2fa_disable_failed',
          resourceType: '2fa',
          resourceId: req.user.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          status: 'failed',
          riskLevel: 'high',
        },
      });

      return res.status(400).json({
        success: false,
        error: 'Invalid verification code or backup code',
      } as ApiResponse);
    }

    // Disable 2FA - Clear ALL 2FA data for security
    await prisma.$transaction([
      prisma.twoFactorAuth.update({
        where: { userId: req.user.userId },
        data: {
          isEnabled: false,
          secret: '', // Clear TOTP secret
          backupCodes: null, // Clear backup codes
          recoveryCodesUsed: '[]', // Reset used codes tracking
          lastUsedAt: null, // Clear usage tracking
          qrCodeUrl: null, // Clear QR code
          setupCompletedAt: null, // Clear setup timestamp
          failedAttempts: 0, // Reset failed attempts
        },
      }),
      // Update user security score
      prisma.user.update({
        where: { id: req.user.userId },
        data: {
          securityScore: { decrement: 15 }, // Penalty for disabling 2FA
        },
      }),
      // Log successful disablement
      prisma.securityAuditLog.create({
        data: {
          userId: req.user.userId,
          action: '2fa_disabled',
          resourceType: '2fa',
          resourceId: req.user.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          status: 'success',
          riskLevel: 'medium',
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        message: '2FA disabled successfully',
      },
    } as ApiResponse);
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// Regenerate backup codes
router.post(
  '/2fa/backup-codes/regenerate',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        } as ApiResponse);
      }

      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required',
        } as ApiResponse);
      }

      // Get 2FA setup
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId: req.user.userId },
      });

      if (!twoFactorAuth?.isEnabled) {
        return res.status(400).json({
          success: false,
          error: '2FA is not enabled',
        } as ApiResponse);
      }

      // Verify TOTP token with time window tolerance
      const tempAuth = authenticator.clone();
      tempAuth.options = { ...tempAuth.options, window: 2 };
      const isValid = tempAuth.verify({ token, secret: twoFactorAuth.secret });

      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code',
        } as ApiResponse);
      }

      // Generate new backup codes
      const newBackupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Update backup codes
      await prisma.$transaction([
        prisma.twoFactorAuth.update({
          where: { userId: req.user.userId },
          data: {
            backupCodes: JSON.stringify(newBackupCodes),
            recoveryCodesUsed: '[]', // Reset used codes
          },
        }),
        // Log backup codes regeneration
        prisma.securityAuditLog.create({
          data: {
            userId: req.user.userId,
            action: '2fa_backup_codes_regenerated',
            resourceType: '2fa',
            resourceId: req.user.userId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown',
            status: 'success',
            riskLevel: 'low',
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          backupCodes: newBackupCodes,
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Backup codes regeneration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// Check backup codes status (without returning actual codes)
router.get(
  '/2fa/backup-codes/status',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        } as ApiResponse);
      }

      // Get 2FA setup
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId: req.user.userId },
      });

      if (!twoFactorAuth?.isEnabled) {
        return res.status(400).json({
          success: false,
          error: '2FA is not enabled',
        } as ApiResponse);
      }

      // Parse backup codes to check if any exist
      const backupCodes = JSON.parse(twoFactorAuth.backupCodes || '[]');
      const hasBackupCodes = Array.isArray(backupCodes) && backupCodes.length > 0;

      return res.json({
        success: true,
        data: {
          hasBackupCodes,
          codesCount: hasBackupCodes ? backupCodes.length : 0,
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Backup codes status check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// =====================================
// Passkey (WebAuthn) Routes
// =====================================

// Generate registration options for new passkey
router.post(
  '/passkeys/register/begin',
  authenticateToken,
  async (req: AuthenticatedRequestWithSession, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        } as ApiResponse);
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          passkeys: {
            where: { isActive: true },
            select: { credentialId: true },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        } as ApiResponse);
      }

      // Generate registration options
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email,
        userDisplayName: user.name || user.email,
        attestationType: 'none',
        excludeCredentials: user.passkeys.map(passkey => ({
          id: passkey.credentialId,
          transports: ['usb', 'ble', 'nfc', 'internal'] as const,
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      // Store challenge in temporary storage with TTL (5 minutes)
      const challengeData: ChallengeData = {
        challenge: options.challenge,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };
      challengeStore.set(req.user.userId, challengeData);

      res.json({
        success: true,
        data: options,
      } as ApiResponse);
    } catch (error) {
      console.error('Passkey registration begin error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// Complete passkey registration
router.post(
  '/passkeys/register/complete',
  authenticateToken,
  async (req: AuthenticatedRequestWithSession, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        } as ApiResponse);
      }

      const { deviceName, attestationResponse } = req.body;

      if (!deviceName || !attestationResponse) {
        return res.status(400).json({
          success: false,
          error: 'Device name and attestation response are required',
        } as ApiResponse);
      }

      // Get stored challenge from challengeStore
      const challengeData = challengeStore.get(req.user.userId);
      if (!challengeData) {
        return res.status(400).json({
          success: false,
          error: 'No challenge found. Please restart registration.',
        } as ApiResponse);
      }

      // Check if challenge has expired
      if (challengeData.expiresAt < Date.now()) {
        challengeStore.delete(req.user.userId);
        return res.status(400).json({
          success: false,
          error: 'Challenge expired. Please restart registration.',
        } as ApiResponse);
      }

      const expectedChallenge = challengeData.challenge;

      // Verify registration response
      const verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({
          success: false,
          error: 'Passkey registration verification failed',
        } as ApiResponse);
      }

      const { credential } = verification.registrationInfo;

      // Save passkey to database
      await prisma.$transaction([
        prisma.passkey.create({
          data: {
            userId: req.user.userId,
            credentialId: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString('base64'),
            deviceName,
            counter: credential.counter,
            deviceType: 'unknown', // Could be detected from user agent
            transports: JSON.stringify(['usb', 'ble', 'nfc', 'internal']),
          },
        }),
        // Update user security score
        prisma.user.update({
          where: { id: req.user.userId },
          data: {
            securityScore: { increment: 10 }, // Boost for adding passkey
          },
        }),
        // Log passkey addition
        prisma.securityAuditLog.create({
          data: {
            userId: req.user.userId,
            action: 'passkey_added',
            resourceType: 'passkey',
            resourceId: credential.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown',
            status: 'success',
            riskLevel: 'low',
            details: JSON.stringify({ deviceName }),
          },
        }),
      ]);

      // Clear challenge from storage
      challengeStore.delete(req.user.userId);

      res.json({
        success: true,
        data: {
          message: 'Passkey registered successfully',
          deviceName,
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Passkey registration complete error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// Get user's passkeys
router.get('/passkeys', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    const passkeys = await prisma.passkey.findMany({
      where: {
        userId: req.user.userId,
        isActive: true,
      },
      select: {
        id: true,
        credentialId: true,
        deviceName: true,
        deviceType: true,
        createdAt: true,
        lastUsedAt: true,
        isBackupEligible: true,
        isBackupDevice: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { passkeys },
    } as ApiResponse);
  } catch (error) {
    console.error('Get passkeys error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// Delete a passkey
router.delete('/passkeys/:passkeyId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    const { passkeyId } = req.params;

    // Find the passkey
    const passkey = await prisma.passkey.findFirst({
      where: {
        id: passkeyId,
        userId: req.user.userId,
        isActive: true,
      },
    });

    if (!passkey) {
      return res.status(404).json({
        success: false,
        error: 'Passkey not found',
      } as ApiResponse);
    }

    // Deactivate passkey (soft delete)
    await prisma.$transaction([
      prisma.passkey.update({
        where: { id: passkeyId },
        data: { isActive: false },
      }),
      // Update user security score
      prisma.user.update({
        where: { id: req.user.userId },
        data: {
          securityScore: { decrement: 5 }, // Small penalty for removing passkey
        },
      }),
      // Log passkey removal
      prisma.securityAuditLog.create({
        data: {
          userId: req.user.userId,
          action: 'passkey_removed',
          resourceType: 'passkey',
          resourceId: passkey.credentialId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          status: 'success',
          riskLevel: 'low',
          details: JSON.stringify({ deviceName: passkey.deviceName }),
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        message: 'Passkey removed successfully',
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Delete passkey error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// =====================================
// Security Status and Statistics Routes
// =====================================

// Get comprehensive security status
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    // Get user's current security data
    const [user, twoFactorAuth, passkeys, recentLogins, failedAttempts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          securityScore: true,
          passwordChangedAt: true,
          passwordHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.twoFactorAuth.findUnique({
        where: { userId: req.user.userId },
        select: { isEnabled: true },
      }),
      prisma.passkey.count({
        where: {
          userId: req.user.userId,
          isActive: true,
        },
      }),
      prisma.securityAuditLog.count({
        where: {
          userId: req.user.userId,
          action: 'login',
          status: 'success',
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.securityAuditLog.count({
        where: {
          userId: req.user.userId,
          action: 'failed_login',
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    // Calculate password strength (simplified)
    let passwordStrength: 'weak' | 'medium' | 'strong' = 'medium';
    if (user?.securityScore) {
      if (user.securityScore >= 85) passwordStrength = 'strong';
      else if (user.securityScore < 60) passwordStrength = 'weak';
    }

    // Get last password change
    const lastPasswordChange =
      user?.passwordChangedAt || user?.passwordHistory[0]?.createdAt || null;

    res.json({
      success: true,
      data: {
        passwordStrength,
        twoFactorEnabled: twoFactorAuth?.isEnabled || false,
        passkeyCount: passkeys,
        lastPasswordChange,
        recentLoginAttempts: failedAttempts,
        recentSuccessfulLogins: recentLogins,
        securityScore: user?.securityScore || 65,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Security status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// =====================================
// Security Audit Routes
// =====================================

// Get security audit logs
router.get('/audit-logs', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    const { page = 1, limit = 50, action, riskLevel, startDate, endDate, search } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build filters
    const filters: AuditLogFilters = {
      userId: req.user.userId,
    };

    if (action) {
      filters.action = action as string;
    }

    if (riskLevel) {
      filters.riskLevel = riskLevel as string;
    }

    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) {
        filters.timestamp.gte = new Date(startDate as string);
      }
      if (endDate) {
        filters.timestamp.lte = new Date(endDate as string);
      }
    }

    if (search) {
      filters.OR = [
        { ipAddress: { contains: search as string } },
        { userAgent: { contains: search as string } },
        { location: { contains: search as string } },
        { details: { contains: search as string } },
      ];
    }

    // Get logs and total count
    const [rawLogs, totalCount] = await Promise.all([
      prisma.securityAuditLog.findMany({
        where: filters,
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: limitNum,
      }),
      prisma.securityAuditLog.count({ where: filters }),
    ]);

    // Helper function to detect device type from user agent
    const detectDeviceType = (
      userAgent: string | null
    ): 'desktop' | 'mobile' | 'tablet' | 'unknown' => {
      if (!userAgent) return 'unknown';
      const ua = userAgent.toLowerCase();
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
      if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
      if (
        ua.includes('desktop') ||
        ua.includes('windows') ||
        ua.includes('mac') ||
        ua.includes('linux')
      )
        return 'desktop';
      return 'unknown';
    };

    // Helper function to extract device name from user agent
    const extractDeviceName = (userAgent: string | null): string => {
      if (!userAgent) return 'Unknown Device';

      // Simple device name extraction
      const ua = userAgent.toLowerCase();
      if (ua.includes('chrome')) return 'Chrome Browser';
      if (ua.includes('firefox')) return 'Firefox Browser';
      if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari Browser';
      if (ua.includes('edge')) return 'Edge Browser';
      if (ua.includes('mobile')) return 'Mobile Device';
      if (ua.includes('tablet')) return 'Tablet Device';

      return 'Unknown Device';
    };

    // Helper function to get approximate location from IP (enhanced)
    const getLocationFromIP = (ipAddress: string | null): string => {
      if (!ipAddress) return 'Unknown Location';
      if (
        ipAddress.includes('127.0.0.1') ||
        ipAddress.includes('localhost') ||
        ipAddress === '::1'
      ) {
        return 'Local Development';
      }
      // In production, you'd use a geolocation service here
      return 'External Location';
    };

    // Transform logs to match frontend format
    const logs = rawLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      action: log.action as string, // Cast to frontend action type
      deviceType: detectDeviceType(log.userAgent),
      deviceName: extractDeviceName(log.userAgent),
      ipAddress: log.ipAddress || 'Unknown',
      location: log.location || getLocationFromIP(log.ipAddress),
      userAgent: log.userAgent || 'Unknown',
      success: log.status === 'success',
      details:
        log.details && log.details !== '{}'
          ? (() => {
              try {
                const parsed = JSON.parse(log.details);
                // Format details for better display
                return Object.entries(parsed)
                  .filter(([key, value]) => value && key !== 'timestamp')
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(', ');
              } catch {
                return log.details;
              }
            })()
          : undefined,
    }));

    // Get summary statistics
    const stats = await prisma.securityAuditLog.groupBy({
      by: ['action'],
      where: {
        userId: req.user.userId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      _count: {
        action: true,
      },
    });

    const uniqueDevices = await prisma.securityAuditLog.groupBy({
      by: ['userAgent'],
      where: {
        userId: req.user.userId,
        action: { in: ['login', 'password_change'] },
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _count: {
        userAgent: true,
      },
    });

    const summary = {
      totalEntries: totalCount,
      successfulLogins: stats.find(s => s.action === 'login')?._count.action || 0,
      failedAttempts: stats.find(s => s.action === 'failed_login')?._count.action || 0,
      uniqueDevices: uniqueDevices.length,
    };

    res.json({
      success: true,
      data: {
        logs,
        totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        summary,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// Export audit logs
router.get('/audit-logs/export', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    const { format = 'csv', startDate, endDate } = req.query;

    // Build filters
    const filters: AuditLogFilters = {
      userId: req.user.userId,
    };

    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) {
        filters.timestamp.gte = new Date(startDate as string);
      }
      if (endDate) {
        filters.timestamp.lte = new Date(endDate as string);
      }
    }

    // Get all logs for export
    const logs = await prisma.securityAuditLog.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
    });

    if (format === 'csv') {
      // Generate CSV
      const csvHeader =
        'Timestamp,Action,Resource Type,IP Address,User Agent,Status,Risk Level,Details\n';
      const csvRows = logs
        .map(
          log =>
            `"${log.timestamp.toISOString()}","${log.action}","${log.resourceType || ''}","${log.ipAddress || ''}","${log.userAgent || ''}","${log.status}","${log.riskLevel}","${log.details}"`
        )
        .join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="security-audit-${new Date().toISOString().split('T')[0]}.csv"`
      );
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: { logs },
      } as ApiResponse);
    }

    // Log the export
    await prisma.securityAuditLog.create({
      data: {
        userId: req.user.userId,
        action: 'audit_log_exported',
        resourceType: 'audit_log',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown',
        status: 'success',
        riskLevel: 'low',
        details: JSON.stringify({ format, recordCount: logs.length }),
      },
    });
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

export default router;
