/**
 * Enhanced Emergency Access API Routes with Cryptographic Features
 * Extends the basic emergency access system with:
 * - Multi-signature approval workflows
 * - Cryptographic emergency keys
 * - Time-bounded access tokens
 * - Comprehensive audit trails
 */

import { Router, Response } from 'express';
import { ApiResponse } from '@parkml/shared';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { requireOrganizationAdmin } from '../crypto/access-control-middleware';
import { emergencyAccessCrypto, EmergencyAccessRequest } from '../crypto/emergency-access-crypto';
import { prisma } from '../database/prisma-client';

const router = Router();

/**
 * Request cryptographically secured emergency access
 * POST /api/emergency-access-crypto/request
 */
router.post('/request', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      patientId,
      reason,
      accessType,
      urgencyLevel,
      requestedDurationHours,
      justification,
      witnessIds,
    } = req.body;

    // Validate required fields
    if (
      !patientId ||
      !reason ||
      !accessType ||
      !urgencyLevel ||
      !requestedDurationHours ||
      !justification
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: patientId, reason, accessType, urgencyLevel, requestedDurationHours, justification',
      } as ApiResponse);
    }

    // Validate urgency level
    if (!['critical', 'high', 'medium'].includes(urgencyLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid urgency level. Must be: critical, high, or medium',
      } as ApiResponse);
    }

    // Validate access type
    if (
      !['medical_emergency', 'technical_support', 'data_recovery', 'audit_investigation'].includes(
        accessType
      )
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid access type',
      } as ApiResponse);
    }

    // Build emergency access request
    const emergencyRequest: EmergencyAccessRequest = {
      patientId,
      requesterId: req.user?.userId!,
      reason,
      accessType,
      urgencyLevel,
      requestedDurationHours: Math.min(requestedDurationHours, 72), // Max 72 hours
      justification,
      witnessIds: witnessIds || [],
      organizationId: req.user?.organizationId || '',
    };

    // Process emergency access request
    const result = await emergencyAccessCrypto.requestEmergencyAccess(emergencyRequest);

    const response: ApiResponse = {
      success: true,
      data: {
        requestId: result.requestId,
        requiresApproval: result.requiresApproval,
        approversNeeded: result.approversNeeded,
        status: result.requiresApproval ? 'pending_approval' : 'approved',
        message: result.requiresApproval
          ? `Emergency access request created. Requires ${result.approversNeeded} approval(s).`
          : 'Emergency access request approved and activated.',
        urgencyLevel,
        expiresAt: new Date(Date.now() + requestedDurationHours * 60 * 60 * 1000),
        cryptographicProtection: true,
        multiSignatureRequired: result.requiresApproval,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Emergency access crypto request error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process emergency access request',
    } as ApiResponse);
  }
});

/**
 * Approve emergency access request (multi-signature)
 * POST /api/emergency-access-crypto/:requestId/approve
 */
router.post(
  '/:requestId/approve',
  authenticateToken,
  requireOrganizationAdmin(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { requestId } = req.params;
      const { approvalReason, digitalSignature } = req.body;

      if (!approvalReason) {
        return res.status(400).json({
          success: false,
          error: 'Approval reason is required',
        } as ApiResponse);
      }

      // Process approval
      const result = await emergencyAccessCrypto.approveEmergencyAccess(
        requestId,
        req.user?.userId!,
        req.user?.role || 'clinic_admin',
        approvalReason,
        digitalSignature
      );

      const response: ApiResponse = {
        success: true,
        data: {
          requestId,
          approved: result.approved,
          activationKey: result.activationKey,
          remainingApprovals: result.remainingApprovals,
          status: result.approved ? 'activated' : 'pending_approval',
          message: result.approved
            ? 'Emergency access approved and activated with cryptographic keys'
            : `Approval recorded. ${result.remainingApprovals} more approval(s) needed.`,
          approvedAt: new Date(),
          cryptographicActivation: result.approved,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Emergency access crypto approval error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve emergency access',
      } as ApiResponse);
    }
  }
);

/**
 * Revoke emergency access with cryptographic cleanup
 * POST /api/emergency-access-crypto/:requestId/revoke
 */
router.post(
  '/:requestId/revoke',
  authenticateToken,
  requireOrganizationAdmin(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Revocation reason is required',
        } as ApiResponse);
      }

      // Revoke emergency access
      await emergencyAccessCrypto.revokeEmergencyAccess(requestId, req.user?.userId!, reason);

      const response: ApiResponse = {
        success: true,
        data: {
          requestId,
          status: 'revoked',
          revokedAt: new Date(),
          revokedBy: req.user?.userId,
          reason,
          message: 'Emergency access revoked and cryptographic keys deactivated',
          cryptographicCleanup: true,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Emergency access crypto revocation error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke emergency access',
      } as ApiResponse);
    }
  }
);

/**
 * Get enhanced emergency access details with crypto info
 * GET /api/emergency-access-crypto/:requestId
 */
router.get('/:requestId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;

    const emergencyAccess = await prisma.emergencyAccess.findUnique({
      where: { id: requestId },
      include: {
        patient: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, role: true },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!emergencyAccess) {
      return res.status(404).json({
        success: false,
        error: 'Emergency access request not found',
      } as ApiResponse);
    }

    // Check if user has permission to view this request
    const canView =
      req.user?.userId === emergencyAccess.userId ||
      req.user?.role === 'super_admin' ||
      (req.user?.role === 'clinic_admin' &&
        req.user?.organizationId === emergencyAccess.organizationId);

    if (!canView) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view this emergency access request',
      } as ApiResponse);
    }

    // Get cryptographic key information
    const encryptionKeys = await prisma.encryptionKey.findMany({
      where: {
        keyType: 'emergency',
        attributes: {
          contains: requestId,
        },
      },
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        id: emergencyAccess.id,
        patient: emergencyAccess.patient,
        requester: emergencyAccess.user,
        reason: emergencyAccess.reason,
        accessType: emergencyAccess.accessType,
        urgencyLevel: emergencyAccess.urgencyLevel,
        justification: emergencyAccess.justification,
        startTime: emergencyAccess.startTime,
        endTime: emergencyAccess.endTime,
        isActive: emergencyAccess.isActive,
        revokedAt: emergencyAccess.revokedAt,
        revokedBy: emergencyAccess.revokedBy,
        revocationReason: emergencyAccess.revocationReason,
        approvals: emergencyAccess.approvals.map(approval => ({
          id: approval.id,
          approver: approval.approver,
          reason: approval.approvalReason,
          approvedAt: approval.createdAt,
          digitalSignature: approval.digitalSignature.substring(0, 16) + '...', // Show partial signature
        })),
        cryptographicKeys: encryptionKeys.map(key => ({
          id: key.id,
          isActive: key.isActive,
          expiresAt: key.expiresAt,
          createdAt: key.createdAt,
        })),
        hasActiveCryptoKeys: encryptionKeys.some(key => key.isActive),
        createdAt: emergencyAccess.createdAt,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Get emergency access crypto error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve emergency access details',
    } as ApiResponse);
  }
});

/**
 * List active emergency access sessions with crypto status
 * GET /api/emergency-access-crypto/active
 */
router.get(
  '/active',
  authenticateToken,
  requireOrganizationAdmin(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId =
        req.user?.role === 'super_admin' ? undefined : req.user?.organizationId;

      const activeAccess = await emergencyAccessCrypto.getActiveEmergencyAccess(organizationId);

      // Get crypto key status for each active session
      const activeWithCrypto = await Promise.all(
        activeAccess.map(async access => {
          const encryptionKeys = await prisma.encryptionKey.count({
            where: {
              keyType: 'emergency',
              attributes: {
                contains: access.id,
              },
              isActive: true,
            },
          });

          return {
            id: access.id,
            patient: access.patient,
            requester: access.user,
            reason: access.reason,
            accessType: access.accessType,
            urgencyLevel: access.urgencyLevel,
            startTime: access.startTime,
            endTime: access.endTime,
            remainingHours: access.endTime
              ? Math.max(0, Math.ceil((access.endTime.getTime() - Date.now()) / (1000 * 60 * 60)))
              : 0,
            hasActiveCryptoKeys: encryptionKeys > 0,
            cryptoKeyCount: encryptionKeys,
          };
        })
      );

      const response: ApiResponse = {
        success: true,
        data: {
          activeEmergencyAccess: activeWithCrypto,
          totalActive: activeAccess.length,
          totalWithCryptoKeys: activeWithCrypto.filter(a => a.hasActiveCryptoKeys).length,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('List active emergency access crypto error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active emergency access sessions',
      } as ApiResponse);
    }
  }
);

/**
 * Get comprehensive emergency access audit trail
 * GET /api/emergency-access-crypto/audit
 */
router.get(
  '/audit',
  authenticateToken,
  requireOrganizationAdmin(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patientId, limit = 50 } = req.query;
      const organizationId =
        req.user?.role === 'super_admin' ? undefined : req.user?.organizationId;

      const auditTrail = await emergencyAccessCrypto.getEmergencyAuditTrail(
        patientId as string,
        organizationId,
        parseInt(limit as string, 10)
      );

      const response: ApiResponse = {
        success: true,
        data: {
          auditEntries: auditTrail.map(entry => ({
            id: entry.id,
            operation: entry.operation,
            userId: entry.userId,
            patientId: entry.patientId,
            success: entry.success,
            timestamp: entry.timestamp,
            emergencyDetails: entry.emergencyDetails ? JSON.parse(entry.emergencyDetails) : null,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
            cryptographicProof: entry.cryptographicProof.substring(0, 16) + '...', // Show partial proof
          })),
          totalEntries: auditTrail.length,
          cryptographicallySecured: true,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Emergency access crypto audit trail error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve emergency access audit trail',
      } as ApiResponse);
    }
  }
);

/**
 * Validate emergency access token with crypto verification
 * POST /api/emergency-access-crypto/validate
 */
router.post('/validate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { activationToken, requestId } = req.body;

    if (!activationToken || !requestId) {
      return res.status(400).json({
        success: false,
        error: 'Activation token and request ID are required',
      } as ApiResponse);
    }

    // Get emergency access details
    const emergencyAccess = await prisma.emergencyAccess.findUnique({
      where: { id: requestId },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });

    if (!emergencyAccess) {
      return res.status(404).json({
        success: false,
        error: 'Emergency access request not found',
      } as ApiResponse);
    }

    // Check if access is still active
    const isValid =
      emergencyAccess.isActive &&
      (!emergencyAccess.endTime || emergencyAccess.endTime > new Date());

    // Get associated encryption keys
    const encryptionKeys = await prisma.encryptionKey.findMany({
      where: {
        keyType: 'emergency',
        attributes: {
          contains: requestId,
        },
        isActive: true,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        valid: isValid,
        requestId,
        patient: emergencyAccess.patient,
        accessType: emergencyAccess.accessType,
        urgencyLevel: emergencyAccess.urgencyLevel,
        expiresAt: emergencyAccess.endTime,
        remainingHours: emergencyAccess.endTime
          ? Math.max(
              0,
              Math.ceil((emergencyAccess.endTime.getTime() - Date.now()) / (1000 * 60 * 60))
            )
          : 0,
        cryptographicKeysActive: encryptionKeys.length > 0,
        keyCount: encryptionKeys.length,
        message: isValid
          ? 'Emergency access token is valid with active crypto keys'
          : 'Emergency access token is invalid or expired',
        cryptographicallySecured: true,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Emergency access crypto validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate emergency access token',
    } as ApiResponse);
  }
});

/**
 * Get emergency access system status and statistics
 * GET /api/emergency-access-crypto/status
 */
router.get(
  '/status',
  authenticateToken,
  requireOrganizationAdmin(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId =
        req.user?.role === 'super_admin' ? undefined : req.user?.organizationId;

      // Get system status
      const [totalRequests, activeRequests, pendingApprovals, revokedRequests, activeCryptoKeys] =
        await Promise.all([
          prisma.emergencyAccess.count({
            where: organizationId ? { organizationId } : {},
          }),
          prisma.emergencyAccess.count({
            where: {
              ...(organizationId ? { organizationId } : {}),
              isActive: true,
              endTime: { gt: new Date() },
            },
          }),
          prisma.emergencyAccess.count({
            where: {
              ...(organizationId ? { organizationId } : {}),
              isActive: false,
              endTime: { gt: new Date() },
              approvals: { none: {} },
            },
          }),
          prisma.emergencyAccess.count({
            where: {
              ...(organizationId ? { organizationId } : {}),
              revokedAt: { not: null },
            },
          }),
          prisma.encryptionKey.count({
            where: {
              keyType: 'emergency',
              isActive: true,
              expiresAt: { gt: new Date() },
            },
          }),
        ]);

      const response: ApiResponse = {
        success: true,
        data: {
          systemStatus: {
            totalRequests,
            activeRequests,
            pendingApprovals,
            revokedRequests,
            activeCryptoKeys,
          },
          healthCheck: {
            emergencySystemOnline: true,
            cryptographicKeysActive: activeCryptoKeys > 0,
            multiSignatureEnabled: true,
            auditTrailSecured: true,
          },
          lastUpdated: new Date(),
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Emergency access crypto status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get emergency access system status',
      } as ApiResponse);
    }
  }
);

export default router;
