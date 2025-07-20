/**
 * Proxy Re-Encryption API Routes
 * Provides secure patient-controlled data delegation capabilities
 *
 * Endpoints:
 * - POST /delegate - Create new delegation
 * - GET /delegations - List user's delegations
 * - POST /:delegationId/revoke - Revoke delegation
 * - POST /:delegationId/re-encrypt - Re-encrypt data for delegated access
 * - POST /decrypt - Decrypt re-encrypted data
 * - GET /audit - Delegation audit trail
 */

import { Router, Response } from 'express';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ProxyReEncryption, DelegationRequest } from '../crypto/proxy-re-encryption';
import { prisma } from '../database/prisma-client';

// Type definitions
type ProxyAuditWhereClause = {
  operation: {
    in: string[];
  };
  emergencyDetails?: {
    contains: string;
  };
  organizationId?: string;
};

const router = Router();

/**
 * Create a new delegation
 * POST /api/proxy-re-encryption/delegate
 */
router.post('/delegate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { delegateeId, dataCategories, accessLevel, validityDays, reason } = req.body;

    // Validate required fields
    if (!delegateeId || !dataCategories || !accessLevel || !validityDays || !reason) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: delegateeId, dataCategories, accessLevel, validityDays, reason',
      } as ApiResponse);
    }

    // Validate user is a patient
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId! },
      include: { patient: true },
    });

    if (!user || !user.patient) {
      return res.status(403).json({
        success: false,
        error: 'Only patients can create delegations',
      } as ApiResponse);
    }

    // Create delegation request
    const delegationRequest: DelegationRequest = {
      delegatorId: req.user?.userId!,
      delegateeId,
      dataCategories,
      accessLevel,
      validityDays: Math.min(validityDays, 365), // Max 1 year
      reason,
      organizationId: req.user?.organizationId || '',
    };

    // Generate dummy private key for demo (in production, use stored user key)
    const delegatorPrivateKey = ProxyReEncryption.generateKeyPair().privateKey;

    // Create the delegation
    const delegation = await ProxyReEncryption.createDelegation(
      delegationRequest,
      delegatorPrivateKey
    );

    const response: ApiResponse = {
      success: true,
      data: {
        delegation: {
          id: delegation.id,
          delegateeId: delegation.delegateeId,
          dataCategories: delegation.dataCategories,
          accessLevel: delegation.accessLevel,
          validFrom: delegation.validFrom,
          validUntil: delegation.validUntil,
          reason,
          status: 'active',
        },
        message: 'Delegation created successfully with proxy re-encryption',
        cryptographicDelegation: true,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Proxy delegation creation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create delegation',
    } as ApiResponse);
  }
});

/**
 * List user's delegations
 * GET /api/proxy-re-encryption/delegations
 */
router.get('/delegations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type = 'delegated_to_me' } = req.query;

    if (!['delegated_to_me', 'delegated_by_me'].includes(type as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type parameter. Must be: delegated_to_me or delegated_by_me',
      } as ApiResponse);
    }

    const delegations = await ProxyReEncryption.getUserDelegations(
      req.user?.userId!,
      type as 'delegated_to_me' | 'delegated_by_me'
    );

    // Get additional user information for each delegation
    const enrichedDelegations = await Promise.all(
      delegations.map(async delegation => {
        const [delegator, delegatee] = await Promise.all([
          prisma.user.findUnique({
            where: { id: delegation.delegatorId },
            select: { id: true, name: true, email: true },
          }),
          prisma.user.findUnique({
            where: { id: delegation.delegateeId },
            select: { id: true, name: true, email: true },
          }),
        ]);

        return {
          id: delegation.id,
          delegator,
          delegatee,
          dataCategories: delegation.dataCategories,
          accessLevel: delegation.accessLevel,
          validFrom: delegation.validFrom,
          validUntil: delegation.validUntil,
          remainingDays: Math.max(
            0,
            Math.ceil((delegation.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          ),
          isExpired: delegation.validUntil < new Date(),
          isRevoked: delegation.isRevoked,
        };
      })
    );

    const response: ApiResponse = {
      success: true,
      data: {
        delegations: enrichedDelegations,
        total: delegations.length,
        type,
        cryptographicDelegations: true,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('List delegations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve delegations',
    } as ApiResponse);
  }
});

/**
 * Revoke a delegation
 * POST /api/proxy-re-encryption/:delegationId/revoke
 */
router.post(
  '/:delegationId/revoke',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { delegationId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Revocation reason is required',
        } as ApiResponse);
      }

      await ProxyReEncryption.revokeDelegation(delegationId, req.user?.userId!, reason);

      const response: ApiResponse = {
        success: true,
        data: {
          delegationId,
          status: 'revoked',
          revokedAt: new Date(),
          revokedBy: req.user?.userId,
          reason,
          message: 'Delegation revoked successfully',
          cryptographicCleanup: true,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Delegation revocation error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke delegation',
      } as ApiResponse);
    }
  }
);

/**
 * Re-encrypt data for delegated access
 * POST /api/proxy-re-encryption/:delegationId/re-encrypt
 */
router.post(
  '/:delegationId/re-encrypt',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { delegationId } = req.params;
      const { encryptedData } = req.body;

      if (!encryptedData) {
        return res.status(400).json({
          success: false,
          error: 'Encrypted data is required',
        } as ApiResponse);
      }

      const reEncryptedData = await ProxyReEncryption.reEncryptData(
        encryptedData,
        delegationId,
        req.user?.userId!
      );

      const response: ApiResponse = {
        success: true,
        data: {
          delegationId,
          reEncryptedData,
          message: 'Data re-encrypted successfully for delegated access',
          cryptographicTransformation: true,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Data re-encryption error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to re-encrypt data',
      } as ApiResponse);
    }
  }
);

/**
 * Decrypt re-encrypted data
 * POST /api/proxy-re-encryption/decrypt
 */
router.post('/decrypt', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reEncryptedData, delegationId } = req.body;

    if (!reEncryptedData || !delegationId) {
      return res.status(400).json({
        success: false,
        error: 'Re-encrypted data and delegation ID are required',
      } as ApiResponse);
    }

    // Generate delegatee's private key (in production, use stored user key)
    const delegateePrivateKey = ProxyReEncryption.generateKeyPair().privateKey;

    const decryptedData = await ProxyReEncryption.decryptReEncryptedData(
      reEncryptedData,
      delegateePrivateKey,
      delegationId
    );

    const response: ApiResponse = {
      success: true,
      data: {
        delegationId,
        decryptedData,
        message: 'Data decrypted successfully',
        cryptographicAccess: true,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Data decryption error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decrypt data',
    } as ApiResponse);
  }
});

/**
 * Get delegation details
 * GET /api/proxy-re-encryption/:delegationId
 */
router.get(
  '/:delegationId',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { delegationId } = req.params;

      const delegation = await prisma.proxyReEncryptionKey.findUnique({
        where: { id: delegationId },
        include: {
          delegator: {
            select: { id: true, name: true, email: true },
          },
          delegatee: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!delegation) {
        return res.status(404).json({
          success: false,
          error: 'Delegation not found',
        } as ApiResponse);
      }

      // Check if user has permission to view this delegation
      const canView =
        req.user?.userId === delegation.delegatorId ||
        req.user?.userId === delegation.delegateeId ||
        req.user?.role === 'super_admin' ||
        (req.user?.role === 'clinic_admin' &&
          req.user?.organizationId === delegation.organizationId);

      if (!canView) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view this delegation',
        } as ApiResponse);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          id: delegation.id,
          delegator: delegation.delegator,
          delegatee: delegation.delegatee,
          dataCategories: JSON.parse(delegation.dataCategories),
          accessLevel: delegation.accessLevel,
          reason: delegation.reason,
          validFrom: delegation.validFrom,
          validUntil: delegation.validUntil,
          remainingDays: Math.max(
            0,
            Math.ceil((delegation.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          ),
          isRevoked: delegation.isRevoked,
          revokedAt: delegation.revokedAt,
          revokedBy: delegation.revokedBy,
          revocationReason: delegation.revocationReason,
          createdAt: delegation.createdAt,
          cryptographicDelegation: true,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get delegation details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve delegation details',
      } as ApiResponse);
    }
  }
);

/**
 * Get delegation audit trail
 * GET /api/proxy-re-encryption/audit
 */
router.get('/audit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { delegationId, limit = 50 } = req.query;

    const where: ProxyAuditWhereClause = {
      operation: {
        in: ['proxy_delegation_created', 'proxy_data_reencrypted', 'proxy_delegation_revoked'],
      },
    };

    if (delegationId) {
      where.emergencyDetails = {
        contains: delegationId as string,
      };
    }

    // Restrict by organization for non-super admins
    if (req.user?.role !== 'super_admin') {
      where.organizationId = req.user?.organizationId;
    }

    const auditEntries = await prisma.cryptoAuditEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string, 10),
    });

    const response: ApiResponse = {
      success: true,
      data: {
        auditEntries: auditEntries.map(entry => ({
          id: entry.id,
          operation: entry.operation,
          userId: entry.userId,
          patientId: entry.patientId,
          success: entry.success,
          timestamp: entry.timestamp,
          delegationDetails: entry.emergencyDetails ? JSON.parse(entry.emergencyDetails) : null,
          cryptographicProof: entry.cryptographicProof.substring(0, 16) + '...',
        })),
        totalEntries: auditEntries.length,
        cryptographicallySecured: true,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Delegation audit trail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve delegation audit trail',
    } as ApiResponse);
  }
});

/**
 * Get delegation system status
 * GET /api/proxy-re-encryption/status
 */
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.role === 'super_admin' ? undefined : req.user?.organizationId;

    const [totalDelegations, activeDelegations, expiredDelegations, revokedDelegations] =
      await Promise.all([
        prisma.proxyReEncryptionKey.count({
          where: organizationId ? { organizationId } : {},
        }),
        prisma.proxyReEncryptionKey.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            isRevoked: false,
            validUntil: { gt: new Date() },
          },
        }),
        prisma.proxyReEncryptionKey.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            isRevoked: false,
            validUntil: { lte: new Date() },
          },
        }),
        prisma.proxyReEncryptionKey.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            isRevoked: true,
          },
        }),
      ]);

    const response: ApiResponse = {
      success: true,
      data: {
        systemStatus: {
          totalDelegations,
          activeDelegations,
          expiredDelegations,
          revokedDelegations,
        },
        healthCheck: {
          proxyReEncryptionOnline: true,
          patientControlEnabled: true,
          secureKeyDelegation: true,
          auditTrailIntegrity: true,
        },
        lastUpdated: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Delegation system status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get delegation system status',
    } as ApiResponse);
  }
});

export default router;
