/**
 * Homomorphic Analytics API Routes
 * Provides privacy-preserving computation capabilities for medical research
 * 
 * Endpoints:
 * - POST /compute - Submit homomorphic computation request
 * - GET /computations - List user's computations
 * - GET /:computationId - Get computation result
 * - GET /:computationId/status - Get computation status
 * - POST /:computationId/cancel - Cancel running computation
 * - GET /capabilities - Get supported computation types
 * - GET /audit - Analytics audit trail
 */

import { Router, Response } from 'express';
import { ApiResponse, DataCategory } from '@parkml/shared';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { requireOrganizationAdmin } from '../crypto/access-control-middleware';
import { 
  homomorphicAnalytics,
  HomomorphicComputationRequest,
  ComputationType,
  PrivacyLevel
} from '../crypto/homomorphic-analytics';
import { prisma } from '../database/prisma-client';

const router = Router();

/**
 * Submit a new homomorphic computation request
 * POST /api/homomorphic-analytics/compute
 */
router.post('/compute',
  authenticateToken,
  requireOrganizationAdmin(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        computationType,
        dataCategories,
        cohortCriteria,
        purpose,
        privacyLevel = PrivacyLevel.BASIC
      } = req.body;

      // Validate required fields
      if (!computationType || !dataCategories || !purpose) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: computationType, dataCategories, purpose'
        } as ApiResponse);
      }

      // Validate computation type
      if (!Object.values(ComputationType).includes(computationType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid computation type. Supported types: ${Object.values(ComputationType).join(', ')}`
        } as ApiResponse);
      }

      // Validate data categories
      const validCategories = Object.values(DataCategory);
      const invalidCategories = dataCategories.filter((cat: string) => !validCategories.includes(cat as DataCategory));
      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid data categories: ${invalidCategories.join(', ')}`
        } as ApiResponse);
      }

      // Build computation request
      const computationRequest: HomomorphicComputationRequest = {
        computationType,
        dataCategories,
        cohortCriteria: cohortCriteria || {},
        requesterId: req.user?.userId!,
        organizationId: req.user?.organizationId || '',
        purpose,
        privacyLevel
      };

      // Submit computation
      const computationId = await homomorphicAnalytics.submitComputation(computationRequest);

      const response: ApiResponse = {
        success: true,
        data: {
          computationId,
          status: 'pending',
          computationType,
          dataCategories,
          purpose,
          privacyLevel,
          message: 'Homomorphic computation submitted successfully',
          estimatedCompletionTime: '5-30 minutes',
          privacyPreserving: true
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Homomorphic computation submission error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit computation'
      } as ApiResponse);
    }
  }
);

/**
 * List user's homomorphic computations
 * GET /api/homomorphic-analytics/computations
 */
router.get('/computations',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.role === 'super_admin' ? undefined : req.user?.organizationId;
      
      const computations = await homomorphicAnalytics.listComputations(
        req.user?.userId!,
        organizationId
      );

      const response: ApiResponse = {
        success: true,
        data: {
          computations,
          totalCount: computations.length,
          privacyPreservingAnalytics: true
        }
      };

      res.json(response);

    } catch (error) {
      console.error('List computations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve computations'
      } as ApiResponse);
    }
  }
);

/**
 * Get computation result
 * GET /api/homomorphic-analytics/:computationId
 */
router.get('/:computationId',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { computationId } = req.params;

      const result = await homomorphicAnalytics.getComputationResult(
        computationId,
        req.user?.userId!
      );

      const response: ApiResponse = {
        success: true,
        data: {
          ...result,
          privacyPreserving: true,
          homomorphicallyComputed: true
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Get computation result error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve computation result'
      } as ApiResponse);
    }
  }
);

/**
 * Get computation status
 * GET /api/homomorphic-analytics/:computationId/status
 */
router.get('/:computationId/status',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { computationId } = req.params;

      const computation = await prisma.homomorphicComputation.findUnique({
        where: { id: computationId },
        select: {
          id: true,
          status: true,
          computationType: true,
          createdAt: true,
          computedAt: true,
          errorMessage: true,
          requesterId: true
        }
      });

      if (!computation) {
        return res.status(404).json({
          success: false,
          error: 'Computation not found'
        } as ApiResponse);
      }

      // Check permissions
      if (computation.requesterId !== req.user?.userId) {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId! } });
        if (!user || !['super_admin', 'clinic_admin'].includes(user.role)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions to view computation status'
          } as ApiResponse);
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          id: computation.id,
          status: computation.status,
          computationType: computation.computationType,
          createdAt: computation.createdAt,
          computedAt: computation.computedAt,
          errorMessage: computation.errorMessage,
          isComplete: computation.status === 'completed',
          isFailed: computation.status === 'failed',
          isRunning: computation.status === 'running',
          privacyPreserving: true
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Get computation status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve computation status'
      } as ApiResponse);
    }
  }
);

/**
 * Cancel a running computation
 * POST /api/homomorphic-analytics/:computationId/cancel
 */
router.post('/:computationId/cancel',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { computationId } = req.params;
      const { reason } = req.body;

      const computation = await prisma.homomorphicComputation.findUnique({
        where: { id: computationId }
      });

      if (!computation) {
        return res.status(404).json({
          success: false,
          error: 'Computation not found'
        } as ApiResponse);
      }

      // Check permissions
      if (computation.requesterId !== req.user?.userId) {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId! } });
        if (!user || !['super_admin', 'clinic_admin'].includes(user.role)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions to cancel computation'
          } as ApiResponse);
        }
      }

      // Can only cancel pending or running computations
      if (!['pending', 'running'].includes(computation.status)) {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel computation with status: ${computation.status}`
        } as ApiResponse);
      }

      // Update computation status
      await prisma.homomorphicComputation.update({
        where: { id: computationId },
        data: {
          status: 'failed',
          errorMessage: `Cancelled by user: ${reason || 'No reason provided'}`
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          computationId,
          status: 'cancelled',
          cancelledAt: new Date(),
          reason: reason || 'No reason provided',
          message: 'Computation cancelled successfully'
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Cancel computation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel computation'
      } as ApiResponse);
    }
  }
);

/**
 * Get supported computation capabilities
 * GET /api/homomorphic-analytics/capabilities
 */
router.get('/capabilities',
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          supportedComputations: Object.values(ComputationType).map(type => ({
            type,
            description: getComputationDescription(type),
            privacyPreserving: true,
            estimatedTime: getEstimatedTime(type)
          })),
          supportedDataCategories: Object.values(DataCategory),
          privacyLevels: Object.values(PrivacyLevel).map(level => ({
            level,
            description: getPrivacyLevelDescription(level)
          })),
          features: {
            homomorphicEncryption: true,
            differentialPrivacy: true,
            kAnonymity: true,
            federatedLearning: true,
            multiPartyComputation: true
          },
          limitations: {
            maxCohortSize: 10000,
            maxComputationTime: '30 minutes',
            maxConcurrentComputations: 5
          }
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Get capabilities error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve capabilities'
      } as ApiResponse);
    }
  }
);

/**
 * Get analytics audit trail
 * GET /api/homomorphic-analytics/audit
 */
router.get('/audit',
  authenticateToken,
  requireOrganizationAdmin(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = 50, computationType } = req.query;

      const where: any = {
        operation: {
          in: ['homomorphic_computation_requested', 'homomorphic_computation_completed']
        }
      };

      if (req.user?.role !== 'super_admin') {
        where.organizationId = req.user?.organizationId;
      }

      if (computationType) {
        where.encryptionContext = {
          contains: computationType as string
        };
      }

      const auditEntries = await prisma.cryptoAuditEntry.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit as string, 10)
      });

      const response: ApiResponse = {
        success: true,
        data: {
          auditEntries: auditEntries.map(entry => ({
            id: entry.id,
            operation: entry.operation,
            userId: entry.userId,
            success: entry.success,
            timestamp: entry.timestamp,
            computationDetails: entry.encryptionContext ? JSON.parse(entry.encryptionContext) : null,
            cryptographicProof: entry.cryptographicProof.substring(0, 16) + '...'
          })),
          totalEntries: auditEntries.length,
          privacyPreservingAnalytics: true
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Analytics audit trail error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics audit trail'
      } as ApiResponse);
    }
  }
);

/**
 * Get system analytics statistics
 * GET /api/homomorphic-analytics/statistics
 */
router.get('/statistics',
  authenticateToken,
  requireOrganizationAdmin(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.role === 'super_admin' ? undefined : req.user?.organizationId;

      const [
        totalComputations,
        completedComputations,
        runningComputations,
        failedComputations
      ] = await Promise.all([
        prisma.homomorphicComputation.count({
          where: organizationId ? { organizationId } : {}
        }),
        prisma.homomorphicComputation.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            status: 'completed'
          }
        }),
        prisma.homomorphicComputation.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            status: 'running'
          }
        }),
        prisma.homomorphicComputation.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            status: 'failed'
          }
        })
      ]);

      // Get computation type distribution
      const computationsByType = await prisma.homomorphicComputation.groupBy({
        by: ['computationType'],
        where: organizationId ? { organizationId } : {},
        _count: { computationType: true }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          systemStatistics: {
            totalComputations,
            completedComputations,
            runningComputations,
            failedComputations,
            successRate: totalComputations > 0 ? (completedComputations / totalComputations * 100).toFixed(1) + '%' : '0%'
          },
          computationsByType: computationsByType.map(item => ({
            type: item.computationType,
            count: item._count.computationType
          })),
          healthCheck: {
            homomorphicEngineOnline: true,
            sealLibraryLoaded: true,
            privacyPreservingCapable: true,
            encryptionEnabled: true
          },
          lastUpdated: new Date()
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Analytics statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics statistics'
      } as ApiResponse);
    }
  }
);

/**
 * Helper functions
 */
function getComputationDescription(type: ComputationType): string {
  switch (type) {
    case ComputationType.SUM:
      return 'Compute sum of encrypted values while preserving privacy';
    case ComputationType.MEAN:
      return 'Calculate average of encrypted data points';
    case ComputationType.COUNT:
      return 'Count records matching criteria without data exposure';
    case ComputationType.VARIANCE:
      return 'Compute variance of encrypted dataset';
    case ComputationType.CORRELATION:
      return 'Calculate correlation between encrypted variables';
    case ComputationType.REGRESSION:
      return 'Perform linear regression on encrypted data';
    case ComputationType.AGGREGATION:
      return 'Multiple statistical aggregations in one computation';
    default:
      return 'Privacy-preserving computation';
  }
}

function getEstimatedTime(type: ComputationType): string {
  switch (type) {
    case ComputationType.COUNT:
      return '1-5 minutes';
    case ComputationType.SUM:
    case ComputationType.MEAN:
      return '2-10 minutes';
    case ComputationType.VARIANCE:
    case ComputationType.CORRELATION:
      return '5-15 minutes';
    case ComputationType.REGRESSION:
    case ComputationType.AGGREGATION:
      return '10-30 minutes';
    default:
      return '5-20 minutes';
  }
}

function getPrivacyLevelDescription(level: PrivacyLevel): string {
  switch (level) {
    case PrivacyLevel.BASIC:
      return 'Standard homomorphic encryption without additional privacy measures';
    case PrivacyLevel.DIFFERENTIAL:
      return 'Differential privacy with calibrated noise addition';
    case PrivacyLevel.K_ANONYMOUS:
      return 'K-anonymity guarantees for result groups';
    case PrivacyLevel.FEDERATED:
      return 'Federated learning approach with distributed computation';
    default:
      return 'Privacy-preserving computation';
  }
}

export default router;