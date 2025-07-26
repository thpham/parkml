/**
 * Crypto Service
 * Main service orchestrating all cryptographic operations for the ParkML platform
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * User role types for crypto service operations
 */
type UserRole =
  | 'super_admin'
  | 'clinic_admin'
  | 'professional_caregiver'
  | 'family_caregiver'
  | 'patient';

/**
 * Authenticated user interface for crypto operations
 */
interface AuthenticatedUser {
  userId: string;
  organizationId?: string;
  role: UserRole;
}

/**
 * Express request with authenticated user context
 */
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  encryptionContext?: RequestEncryptionContextProvider;
}

// Extend Request interface to include encryption context
interface CryptoRequest extends Request {
  encryptionContext?: RequestEncryptionContextProvider;
}
import { prisma } from '../database/prisma-client';
import { ABECrypto } from './abe-crypto';
import { WASMCryptoLoader, HomomorphicEncryption } from './wasm-loader';
import {
  PrismaEncryptionMiddleware,
  RequestEncryptionContextProvider,
} from './encryption-middleware';
import {
  AccessLevel,
  DataCategory,
  HomomorphicComputationRequest,
  CryptoAuditEntry,
} from '@parkml/shared';

/**
 * Main Crypto Service
 * Central orchestrator for all encryption operations
 */
export class CryptoService {
  private abeCrypto: ABECrypto;
  private isInitialized = false;

  constructor() {
    this.abeCrypto = new ABECrypto();
  }

  /**
   * Initialize the crypto service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🔐 Initializing ParkML Crypto Service...');

    try {
      // Initialize WASM crypto modules
      await WASMCryptoLoader.initializeSEAL();

      // Initialize organization authorities for existing organizations
      await this.initializeOrganizationAuthorities();

      this.isInitialized = true;
      console.log('✅ ParkML Crypto Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Crypto Service:', error);
      throw error;
    }
  }

  /**
   * Check if crypto service is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Generate encryption keys for a user
   */
  public async generateUserKeys(
    userId: string,
    organizationId: string,
    userRole: string,
    patientIds: string[] = []
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Crypto service not initialized');
    }

    // Generate ABE user secret key
    const userSecretKey = this.abeCrypto.generateUserSecretKey(
      userId,
      organizationId,
      userRole,
      patientIds
    );

    // Store encrypted user keys in database
    await prisma.encryptionKey.create({
      data: {
        userId,
        organizationId,
        keyType: 'patient',
        encryptedKey: userSecretKey.serialize(),
        attributes: JSON.stringify(userSecretKey.getAttributes()),
        isActive: true,
      },
    });

    // Create audit entry
    await this.createCryptoAuditEntry({
      operation: 'key_generation',
      userId,
      organizationId,
      dataCategories: [],
      accessLevel: AccessLevel.PATIENT_FULL,
      encryptionContext: {
        requesterId: userId,
        organizationId,
        requesterRole: userRole as
          | 'super_admin'
          | 'clinic_admin'
          | 'professional_caregiver'
          | 'family_caregiver'
          | 'patient',
        patientId: '',
        accessLevel: AccessLevel.PATIENT_FULL,
        dataCategories: [],
        timestamp: new Date(),
      },
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      cryptographicProof: this.generateAuditProof(),
    });

    console.log(`🔑 Generated encryption keys for user: ${userId}`);
  }

  /**
   * Request access delegation using proxy re-encryption
   */
  public async requestAccessDelegation(
    patientUserId: string,
    caregiverUserId: string,
    dataCategories: DataCategory[],
    accessLevel: AccessLevel,
    expirationHours: number = 24 * 7, // Default 1 week
    reason?: string
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Crypto service not initialized');
    }

    // Generate re-encryption key (simplified for demo)
    const reEncryptionKey = this.generateReEncryptionKey(patientUserId, caregiverUserId);

    // Store delegation in database
    const delegation = await prisma.proxyReEncryptionKey.create({
      data: {
        delegatorId: patientUserId,
        delegateeId: caregiverUserId,
        keyData: reEncryptionKey,
        dataCategories: JSON.stringify(dataCategories),
        accessLevel,
        reason: reason || 'Access delegation',
        validUntil: new Date(Date.now() + expirationHours * 60 * 60 * 1000),
        organizationId: 'default_org', // Default organization
        isRevoked: false,
      },
    });

    // Create audit entry
    await this.createCryptoAuditEntry({
      operation: 'key_delegation',
      userId: patientUserId,
      patientId: patientUserId,
      organizationId: '', // Will be filled by middleware
      dataCategories,
      accessLevel,
      encryptionContext: {
        patientId: patientUserId,
        requesterId: caregiverUserId,
        organizationId: '',
        requesterRole: 'professional_caregiver',
        accessLevel,
        dataCategories,
        timestamp: new Date(),
      },
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      cryptographicProof: this.generateAuditProof(),
    });

    console.log(`🔄 Created access delegation: ${delegation.id}`);
    return delegation.id;
  }

  /**
   * Revoke access delegation
   */
  public async revokeAccessDelegation(delegationId: string, userId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Crypto service not initialized');
    }

    // Update delegation to revoked
    const delegation = await prisma.proxyReEncryptionKey.update({
      where: { id: delegationId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: userId,
      },
    });

    // Create audit entry
    await this.createCryptoAuditEntry({
      operation: 'key_revocation',
      userId,
      patientId: delegation.delegatorId,
      organizationId: '', // Will be filled by middleware
      dataCategories: JSON.parse(delegation.dataCategories),
      accessLevel: delegation.accessLevel as AccessLevel,
      encryptionContext: {
        requesterId: userId,
        patientId: delegation.delegatorId,
        organizationId: '',
        requesterRole: 'clinic_admin',
        accessLevel: delegation.accessLevel as AccessLevel,
        dataCategories: JSON.parse(delegation.dataCategories),
        timestamp: new Date(),
      },
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      cryptographicProof: this.generateAuditProof(),
    });

    console.log(`❌ Revoked access delegation: ${delegationId}`);
  }

  /**
   * Request homomorphic computation
   */
  public async requestHomomorphicComputation(
    request: HomomorphicComputationRequest
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Crypto service not initialized');
    }

    // Store computation request
    const computation = await prisma.homomorphicComputation.create({
      data: {
        computationType: request.computationType,
        organizationId: request.organizationId,
        dataCategories: JSON.stringify(request.dataCategories),
        cohortCriteria: JSON.stringify(request.cohortCriteria),
        requesterId: request.requesterId,
        purpose: request.purpose,
        status: 'pending',
      },
    });

    // Start computation asynchronously
    this.processHomomorphicComputation(computation.id).catch(error => {
      console.error(`Failed to process homomorphic computation ${computation.id}:`, error);
    });

    console.log(`📊 Created homomorphic computation request: ${computation.id}`);
    return computation.id;
  }

  /**
   * Get encryption middleware for Prisma
   */
  public createEncryptionMiddleware(): Prisma.Middleware {
    if (!this.isInitialized) {
      throw new Error('Crypto service not initialized');
    }

    // Create a dummy context provider for now
    // In a real implementation, this would be request-scoped
    const contextProvider = {
      getContext: () => null,
      getUserSecretKey: () => null,
    };

    const middleware = new PrismaEncryptionMiddleware(contextProvider);
    return middleware.createMiddleware();
  }

  /**
   * Create request encryption context provider
   */
  public createRequestContextProvider(req: AuthenticatedRequest): RequestEncryptionContextProvider {
    return new RequestEncryptionContextProvider(req, this.abeCrypto);
  }

  /**
   * Get ABE crypto instance
   */
  public getABECrypto(): ABECrypto {
    return this.abeCrypto;
  }

  /**
   * Private helper methods
   */

  private async initializeOrganizationAuthorities(): Promise<void> {
    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
    });

    for (const org of organizations) {
      this.abeCrypto.createOrganizationAuthority(org.id);
    }

    console.log(`🏢 Initialized ${organizations.length} organization authorities`);
  }

  private generateReEncryptionKey(patientUserId: string, caregiverUserId: string): string {
    // Simplified re-encryption key generation
    // In a real implementation, use proper proxy re-encryption schemes
    const combined = `${patientUserId}:${caregiverUserId}:${Date.now()}`;
    return Buffer.from(combined).toString('base64');
  }

  private async processHomomorphicComputation(computationId: string): Promise<void> {
    try {
      // Update status to running
      await prisma.homomorphicComputation.update({
        where: { id: computationId },
        data: { status: 'running' },
      });

      // Get computation details
      const computation = await prisma.homomorphicComputation.findUnique({
        where: { id: computationId },
      });

      if (!computation) {
        throw new Error('Computation not found');
      }

      // Simulate computation process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create dummy encrypted result
      const he = new HomomorphicEncryption();
      const sampleData = [1, 2, 3, 4, 5]; // Sample medical data
      const encryptedResult = he.encryptNumbers(sampleData);

      // Update with result
      await prisma.homomorphicComputation.update({
        where: { id: computationId },
        data: {
          status: 'completed',
          encryptedResult,
          computedAt: new Date(),
        },
      });

      console.log(`✅ Completed homomorphic computation: ${computationId}`);
    } catch (error) {
      console.error(`❌ Failed homomorphic computation ${computationId}:`, error);

      await prisma.homomorphicComputation.update({
        where: { id: computationId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private async createCryptoAuditEntry(
    entry: Omit<CryptoAuditEntry, 'auditId' | 'timestamp'>
  ): Promise<void> {
    await prisma.cryptoAuditEntry.create({
      data: {
        operation: entry.operation,
        userId: entry.userId,
        patientId: entry.patientId,
        organizationId: entry.organizationId,
        dataCategories: JSON.stringify(entry.dataCategories),
        accessLevel: entry.accessLevel,
        encryptionContext: JSON.stringify(entry.encryptionContext),
        success: entry.success,
        errorMessage: entry.errorMessage,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        cryptographicProof: entry.cryptographicProof,
      },
    });
  }

  private generateAuditProof(): string {
    // Generate cryptographic proof for audit trail
    // In a real implementation, this would be a proper digital signature
    return `proof_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Cleanup crypto service
   */
  public cleanup(): void {
    WASMCryptoLoader.cleanup();
    this.isInitialized = false;
    console.log('🧹 Crypto service cleaned up');
  }
}

// Global crypto service instance
export const cryptoService = new CryptoService();

/**
 * Initialize crypto service on module load
 */
export async function initializeCrypto(): Promise<void> {
  await cryptoService.initialize();
}

/**
 * Express middleware factory for encryption context
 */
export function createCryptoMiddleware() {
  return (req: CryptoRequest, res: Response, next: NextFunction) => {
    if (!cryptoService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Encryption service not available',
      });
    }

    // Attach encryption context provider to request
    req.encryptionContext = cryptoService.createRequestContextProvider(req);
    next();
  };
}
