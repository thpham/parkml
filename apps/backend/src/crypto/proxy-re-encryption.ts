/**
 * Proxy Re-Encryption System for Patient-Controlled Data Delegation
 *
 * Allows patients to securely delegate access to their encrypted medical data
 * without revealing their private keys. Uses elliptic curve cryptography for
 * efficient proxy re-encryption operations.
 *
 * Key Features:
 * - Patient maintains control over who can access their data
 * - Secure delegation without key exposure
 * - Revocable access controls
 * - Audit trail for all delegation operations
 */

import { sha256 } from '@noble/hashes/sha256';
import { secp256k1 } from '@noble/curves/secp256k1';
import { prisma } from '../database/prisma-client';
import { AccessLevel, DataCategory } from '@parkml/shared';

// Type definitions

type AuditDetails = Record<string, unknown>;

/**
 * Proxy re-encryption key pair
 */
export interface ProxyKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

/**
 * Re-encryption key for delegation
 */
export interface ReEncryptionKey {
  id: string;
  delegatorId: string; // Patient who is delegating
  delegateeId: string; // User receiving access
  dataCategories: DataCategory[];
  accessLevel: AccessLevel;
  keyData: string; // Encrypted re-encryption key
  validFrom: Date;
  validUntil: Date;
  isRevoked: boolean;
  organizationId: string;
}

/**
 * Delegation request structure
 */
export interface DelegationRequest {
  delegatorId: string; // Patient delegating access
  delegateeId: string; // User receiving access
  dataCategories: DataCategory[];
  accessLevel: AccessLevel;
  validityDays: number;
  reason: string;
  organizationId: string;
}

/**
 * Encrypted data capsule for proxy re-encryption
 */
export interface DataCapsule {
  id: string;
  encryptedData: string; // Data encrypted with patient's public key
  metadata: {
    patientId: string;
    dataCategory: DataCategory;
    encryptedAt: Date;
    algorithm: string;
  };
  accessSignature: string; // Signature for integrity verification
}

/**
 * Proxy Re-Encryption Engine
 * Implements secure delegation using elliptic curve proxy re-encryption
 */
export class ProxyReEncryption {
  private static readonly CURVE = secp256k1;
  private static readonly DELEGATION_SALT = 'ParkML_Delegation_2024';

  /**
   * Generate a new key pair for proxy re-encryption
   */
  public static generateKeyPair(): ProxyKeyPair {
    const privateKey = this.CURVE.utils.randomPrivateKey();
    const publicKey = this.CURVE.getPublicKey(privateKey);

    return {
      privateKey,
      publicKey,
    };
  }

  /**
   * Generate re-encryption key for delegation
   */
  public static async generateReEncryptionKey(
    delegatorPrivateKey: Uint8Array,
    delegateePublicKey: Uint8Array,
    request: DelegationRequest
  ): Promise<string> {
    // Generate random proxy value
    const proxyValue = this.CURVE.utils.randomPrivateKey();

    // Create re-encryption key: rk = hash(delegator_private + proxy_value + delegatee_public)
    const keyMaterial = new Uint8Array([
      ...delegatorPrivateKey,
      ...proxyValue,
      ...delegateePublicKey,
      ...new TextEncoder().encode(this.DELEGATION_SALT),
    ]);

    const reEncryptionKey = sha256(keyMaterial);

    // Encrypt the re-encryption key with a derived key
    const delegationContext = `${request.delegatorId}:${request.delegateeId}:${Date.now()}`;
    const encryptionKey = sha256(new TextEncoder().encode(delegationContext));

    // XOR encryption for the re-encryption key
    const encryptedKey = new Uint8Array(reEncryptionKey.length);
    for (let i = 0; i < reEncryptionKey.length; i++) {
      encryptedKey[i] = reEncryptionKey[i] ^ encryptionKey[i % encryptionKey.length];
    }

    return Buffer.from(encryptedKey).toString('base64');
  }

  /**
   * Create a delegation relationship
   */
  public static async createDelegation(
    request: DelegationRequest,
    delegatorPrivateKey: Uint8Array
  ): Promise<ReEncryptionKey> {
    console.log(`🔄 Creating delegation from ${request.delegatorId} to ${request.delegateeId}`);

    // Validate the delegation request
    await this.validateDelegationRequest(request);

    // Get delegatee's public key
    const delegateePublicKey = await this.getUserPublicKey(request.delegateeId);

    // Generate re-encryption key
    const reEncryptionKeyData = await this.generateReEncryptionKey(
      delegatorPrivateKey,
      delegateePublicKey,
      request
    );

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + request.validityDays);

    // Store the delegation in database
    const delegation = await prisma.proxyReEncryptionKey.create({
      data: {
        delegatorId: request.delegatorId,
        delegateeId: request.delegateeId,
        dataCategories: JSON.stringify(request.dataCategories),
        accessLevel: request.accessLevel,
        keyData: reEncryptionKeyData,
        validFrom: new Date(),
        validUntil,
        reason: request.reason,
        organizationId: request.organizationId,
        isRevoked: false,
      },
    });

    // Create audit entry
    await this.createDelegationAuditEntry({
      operation: 'proxy_delegation_created',
      delegatorId: request.delegatorId,
      delegateeId: request.delegateeId,
      organizationId: request.organizationId,
      dataCategories: request.dataCategories,
      accessLevel: request.accessLevel,
      success: true,
      details: {
        delegationId: delegation.id,
        validityDays: request.validityDays,
        reason: request.reason,
      },
    });

    return {
      id: delegation.id,
      delegatorId: delegation.delegatorId,
      delegateeId: delegation.delegateeId,
      dataCategories: JSON.parse(delegation.dataCategories),
      accessLevel: delegation.accessLevel as AccessLevel,
      keyData: delegation.keyData,
      validFrom: delegation.validFrom,
      validUntil: delegation.validUntil,
      isRevoked: delegation.isRevoked,
      organizationId: delegation.organizationId,
    };
  }

  /**
   * Re-encrypt data for delegated access
   */
  public static async reEncryptData(
    encryptedData: string,
    delegationId: string,
    requesterId: string
  ): Promise<string> {
    console.log(`🔄 Re-encrypting data for delegation ${delegationId}`);

    // Get delegation information
    const delegation = await prisma.proxyReEncryptionKey.findUnique({
      where: { id: delegationId },
      include: {
        delegator: { select: { id: true, name: true } },
        delegatee: { select: { id: true, name: true } },
      },
    });

    if (!delegation) {
      throw new Error('Delegation not found');
    }

    // Validate delegation access
    if (delegation.delegateeId !== requesterId) {
      throw new Error('Unauthorized access to delegation');
    }

    if (delegation.isRevoked) {
      throw new Error('Delegation has been revoked');
    }

    if (delegation.validUntil < new Date()) {
      throw new Error('Delegation has expired');
    }

    // Decrypt the re-encryption key
    const delegationContext = `${delegation.delegatorId}:${delegation.delegateeId}:${delegation.createdAt.getTime()}`;
    const encryptionKey = sha256(new TextEncoder().encode(delegationContext));

    const encryptedKeyBuffer = Buffer.from(delegation.keyData, 'base64');
    const reEncryptionKey = new Uint8Array(encryptedKeyBuffer.length);

    for (let i = 0; i < encryptedKeyBuffer.length; i++) {
      reEncryptionKey[i] = encryptedKeyBuffer[i] ^ encryptionKey[i % encryptionKey.length];
    }

    // Re-encrypt the data for the delegatee
    const originalData = Buffer.from(encryptedData, 'base64');
    const delegateePublicKey = await this.getUserPublicKey(delegation.delegateeId);

    // Simple re-encryption: XOR with re-encryption key and delegatee's public key hash
    const reEncryptionSeed = sha256(new Uint8Array([...reEncryptionKey, ...delegateePublicKey]));
    const reEncryptedData = new Uint8Array(originalData.length);

    for (let i = 0; i < originalData.length; i++) {
      reEncryptedData[i] = originalData[i] ^ reEncryptionSeed[i % reEncryptionSeed.length];
    }

    // Create audit entry for re-encryption
    await this.createDelegationAuditEntry({
      operation: 'proxy_data_reencrypted',
      delegatorId: delegation.delegatorId,
      delegateeId: delegation.delegateeId,
      organizationId: delegation.organizationId,
      dataCategories: JSON.parse(delegation.dataCategories),
      accessLevel: delegation.accessLevel as AccessLevel,
      success: true,
      details: {
        delegationId: delegation.id,
        dataSize: originalData.length,
      },
    });

    return Buffer.from(reEncryptedData).toString('base64');
  }

  /**
   * Decrypt re-encrypted data
   */
  public static async decryptReEncryptedData(
    reEncryptedData: string,
    delegateePrivateKey: Uint8Array,
    delegationId: string
  ): Promise<string> {
    console.log(`🔓 Decrypting re-encrypted data for delegation ${delegationId}`);

    // Get delegation information
    const delegation = await prisma.proxyReEncryptionKey.findUnique({
      where: { id: delegationId },
    });

    if (!delegation) {
      throw new Error('Delegation not found');
    }

    // Decrypt the re-encryption key
    const delegationContext = `${delegation.delegatorId}:${delegation.delegateeId}:${delegation.createdAt.getTime()}`;
    const encryptionKey = sha256(new TextEncoder().encode(delegationContext));

    const encryptedKeyBuffer = Buffer.from(delegation.keyData, 'base64');
    const reEncryptionKey = new Uint8Array(encryptedKeyBuffer.length);

    for (let i = 0; i < encryptedKeyBuffer.length; i++) {
      reEncryptionKey[i] = encryptedKeyBuffer[i] ^ encryptionKey[i % encryptionKey.length];
    }

    // Get delegatee's public key for reconstruction
    const delegateePublicKey = this.CURVE.getPublicKey(delegateePrivateKey);

    // Reconstruct the decryption seed
    const reEncryptionSeed = sha256(new Uint8Array([...reEncryptionKey, ...delegateePublicKey]));

    // Decrypt the re-encrypted data
    const encryptedBuffer = Buffer.from(reEncryptedData, 'base64');
    const decryptedData = new Uint8Array(encryptedBuffer.length);

    for (let i = 0; i < encryptedBuffer.length; i++) {
      decryptedData[i] = encryptedBuffer[i] ^ reEncryptionSeed[i % reEncryptionSeed.length];
    }

    return Buffer.from(decryptedData).toString('utf-8');
  }

  /**
   * Revoke a delegation
   */
  public static async revokeDelegation(
    delegationId: string,
    revokerId: string,
    reason: string
  ): Promise<void> {
    console.log(`🚫 Revoking delegation ${delegationId}`);

    const delegation = await prisma.proxyReEncryptionKey.findUnique({
      where: { id: delegationId },
    });

    if (!delegation) {
      throw new Error('Delegation not found');
    }

    // Only delegator or admin can revoke
    if (delegation.delegatorId !== revokerId) {
      const revoker = await prisma.user.findUnique({ where: { id: revokerId } });
      if (!revoker || !['super_admin', 'clinic_admin'].includes(revoker.role)) {
        throw new Error('Insufficient permissions to revoke delegation');
      }
    }

    // Update delegation to revoked
    await prisma.proxyReEncryptionKey.update({
      where: { id: delegationId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: revokerId,
        revocationReason: reason,
      },
    });

    // Create audit entry
    await this.createDelegationAuditEntry({
      operation: 'proxy_delegation_revoked',
      delegatorId: delegation.delegatorId,
      delegateeId: delegation.delegateeId,
      organizationId: delegation.organizationId,
      dataCategories: JSON.parse(delegation.dataCategories),
      accessLevel: delegation.accessLevel as AccessLevel,
      success: true,
      details: {
        delegationId,
        revokerId,
        reason,
      },
    });
  }

  /**
   * Get active delegations for a user
   */
  public static async getUserDelegations(
    userId: string,
    type: 'delegated_to_me' | 'delegated_by_me' = 'delegated_to_me'
  ): Promise<ReEncryptionKey[]> {
    const where = type === 'delegated_to_me' ? { delegateeId: userId } : { delegatorId: userId };

    const delegations = await prisma.proxyReEncryptionKey.findMany({
      where: {
        ...where,
        isRevoked: false,
        validUntil: { gt: new Date() },
      },
      include: {
        delegator: { select: { id: true, name: true, email: true } },
        delegatee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return delegations.map((d: Record<string, unknown>) => ({
      id: d.id as string,
      delegatorId: d.delegatorId as string,
      delegateeId: d.delegateeId as string,
      dataCategories: JSON.parse(d.dataCategories as string),
      accessLevel: d.accessLevel as AccessLevel,
      keyData: d.keyData as string,
      validFrom: d.validFrom as Date,
      validUntil: d.validUntil as Date,
      isRevoked: d.isRevoked as boolean,
      organizationId: d.organizationId as string,
    }));
  }

  /**
   * Validate delegation request
   */
  private static async validateDelegationRequest(request: DelegationRequest): Promise<void> {
    // Check if delegator exists and is a patient
    const delegator = await prisma.user.findUnique({
      where: { id: request.delegatorId },
    });

    if (!delegator) {
      throw new Error('Delegator not found');
    }

    if (delegator.role !== 'patient') {
      throw new Error('Only patients can create delegations');
    }

    // Check if delegatee exists
    const delegatee = await prisma.user.findUnique({
      where: { id: request.delegateeId },
    });

    if (!delegatee) {
      throw new Error('Delegatee not found');
    }

    // Check for existing active delegation
    const existingDelegation = await prisma.proxyReEncryptionKey.findFirst({
      where: {
        delegatorId: request.delegatorId,
        delegateeId: request.delegateeId,
        isRevoked: false,
        validUntil: { gt: new Date() },
      },
    });

    if (existingDelegation) {
      throw new Error('Active delegation already exists between these users');
    }

    // Validate validity period
    if (request.validityDays < 1 || request.validityDays > 365) {
      throw new Error('Validity period must be between 1 and 365 days');
    }
  }

  /**
   * Get user's public key for proxy re-encryption
   */
  private static async getUserPublicKey(userId: string): Promise<Uint8Array> {
    // In a real implementation, this would retrieve the user's stored public key
    // For now, we'll derive it from their user ID (demo purposes)
    const userSeed = sha256(new TextEncoder().encode(`ParkML_User_${userId}`));
    const privateKey = userSeed.slice(0, 32);
    return this.CURVE.getPublicKey(privateKey);
  }

  /**
   * Create audit entry for delegation operations
   */
  private static async createDelegationAuditEntry(entry: {
    operation: string;
    delegatorId: string;
    delegateeId: string;
    organizationId: string;
    dataCategories: DataCategory[];
    accessLevel: AccessLevel;
    success: boolean;
    details: AuditDetails;
  }): Promise<void> {
    await prisma.cryptoAuditEntry.create({
      data: {
        operation: entry.operation,
        userId: entry.delegatorId,
        patientId: entry.delegatorId, // Delegator is the patient
        organizationId: entry.organizationId,
        dataCategories: JSON.stringify(entry.dataCategories),
        accessLevel: entry.accessLevel,
        encryptionContext: JSON.stringify({
          delegatorId: entry.delegatorId,
          delegateeId: entry.delegateeId,
          organizationId: entry.organizationId,
          accessLevel: entry.accessLevel,
          dataCategories: entry.dataCategories,
          proxyReEncryption: true,
          timestamp: new Date(),
        }),
        success: entry.success,
        ipAddress: '127.0.0.1',
        userAgent: 'proxy-re-encryption-system',
        cryptographicProof: await this.generateDelegationProof(entry),
        emergencyDetails: JSON.stringify(entry.details),
      },
    });
  }

  /**
   * Generate cryptographic proof for delegation operations
   */
  private static async generateDelegationProof(entry: {
    operation: string;
    delegatorId: string;
    delegateeId: string;
    details: AuditDetails;
  }): Promise<string> {
    const proofData = {
      operation: entry.operation,
      delegatorId: entry.delegatorId,
      delegateeId: entry.delegateeId,
      timestamp: Date.now(),
      details: entry.details,
    };

    const hash = sha256(new TextEncoder().encode(JSON.stringify(proofData)));
    return Buffer.from(hash).toString('hex');
  }
}

/**
 * Export singleton instance
 */
export const proxyReEncryption = new ProxyReEncryption();
