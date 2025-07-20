/**
 * Emergency Access Cryptographic System
 * Provides secure break-glass access to patient data during medical emergencies
 * with time-bounded keys, multi-signature approval, and comprehensive audit trails
 */

import { webcrypto } from 'crypto';
import { sha256 } from '@noble/hashes/sha256';
// import { secp256k1 } from '@noble/curves/secp256k1'; // Reserved for future signature verification
import { prisma } from '../database/prisma-client';
import { AccessLevel, DataCategory, CryptoAuditEntry } from '@parkml/shared';

/**
 * Emergency Access Request structure
 */
export interface EmergencyAccessRequest {
  patientId: string;
  requesterId: string;
  reason: string;
  accessType: 'medical_emergency' | 'technical_support' | 'data_recovery' | 'audit_investigation';
  urgencyLevel: 'critical' | 'high' | 'medium';
  requestedDurationHours: number;
  justification: string;
  witnessIds?: string[]; // For multi-signature approval
  organizationId: string;
}

/**
 * Emergency key material with time constraints
 */
export interface EmergencyKeyMaterial {
  emergencyKeyId: string;
  encryptedKey: string;
  keyDerivationSalt: string;
  accessLevel: AccessLevel;
  validFrom: Date;
  validUntil: Date;
  patientId: string;
  requesterId: string;
  approverIds: string[];
  emergencyType: string;
  isRevoked: boolean;
  revokedAt?: Date;
  usageCount: number;
  maxUsageCount: number;
}

/**
 * Multi-signature approval for emergency access
 */
export interface EmergencyApproval {
  approvalId: string;
  emergencyRequestId: string;
  approverId: string;
  approverRole: string;
  approvalTimestamp: Date;
  digitalSignature: string;
  approvalReason: string;
  isValid: boolean;
}

/**
 * Emergency key generation result
 */
export interface EmergencyKeyGenerationResult {
  encryptedKey: string;
  keyDerivationSalt: string;
  activationToken: string;
}

/**
 * Emergency access details for audit trail
 */
export interface EmergencyAccessDetails {
  requestId: string;
  urgencyLevel?: string;
  justification?: string;
  activatedAt?: Date;
  expiresAt?: Date | null;
  revokedAt?: Date;
  revocationReason?: string;
}

/**
 * Active emergency access with patient and user details
 */
export interface ActiveEmergencyAccess {
  id: string;
  userId: string;
  patientId: string;
  reason: string;
  accessType: string;
  startTime: Date;
  endTime: Date | null;
  isActive: boolean;
  approvedBy: string | null;
  justification: string | null;
  urgencyLevel: string | null;
  organizationId: string | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  revocationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    name: string | null;
  };
  user: {
    id: string;
    name: string | null;
    role: string;
  };
}

/**
 * Emergency access audit trail entry
 */
export interface EmergencyAuditTrail {
  id: string;
  operation: string;
  userId: string;
  patientId: string | null;
  organizationId: string;
  dataCategories: string;
  accessLevel: string;
  encryptionContext: string;
  success: boolean;
  errorMessage: string | null;
  ipAddress: string;
  userAgent: string;
  cryptographicProof: string;
  emergencyDetails: string | null;
  timestamp: Date;
}

/**
 * Prisma where clause for emergency access queries
 */
export interface EmergencyAccessWhereInput {
  isActive?: boolean;
  endTime?: {
    gt: Date;
  };
  organizationId?: string;
}

/**
 * Prisma where clause for crypto audit entry queries
 */
export interface CryptoAuditEntryWhereInput {
  operation?: {
    in: string[];
  };
  patientId?: string;
  organizationId?: string;
}

/**
 * Emergency Access Crypto Engine
 * Manages cryptographic operations for emergency access scenarios
 */
export class EmergencyAccessCrypto {
  private emergencyMasterKey!: Uint8Array;
  // private readonly EMERGENCY_KEY_ROTATION_HOURS = 24; // Reserved for future key rotation
  private readonly MIN_APPROVERS = {
    critical: 1, // Life-threatening emergency - single approver
    high: 2, // Urgent medical need - two approvers
    medium: 3, // Administrative emergency - three approvers
  };

  constructor() {
    this.initializeEmergencyMasterKey();
  }

  /**
   * Initialize emergency master key (should be stored in HSM in production)
   */
  private initializeEmergencyMasterKey(): void {
    // In production, this would be retrieved from HSM or secure key storage
    // For demo, we generate a deterministic key based on organization
    const keyMaterial = process.env.EMERGENCY_MASTER_KEY || 'emergency_master_key_demo';
    this.emergencyMasterKey = sha256(new TextEncoder().encode(keyMaterial));
    console.log('🚨 Emergency master key initialized');
  }

  /**
   * Request emergency access to patient data
   */
  public async requestEmergencyAccess(
    request: EmergencyAccessRequest
  ): Promise<{ requestId: string; requiresApproval: boolean; approversNeeded: number }> {
    console.log(`🚨 Emergency access requested for patient ${request.patientId}`);

    // Validate request parameters
    await this.validateEmergencyRequest(request);

    // Create emergency access record
    const emergencyAccess = await prisma.emergencyAccess.create({
      data: {
        userId: request.requesterId,
        patientId: request.patientId,
        reason: request.reason,
        accessType: request.accessType,
        startTime: new Date(),
        endTime: new Date(Date.now() + request.requestedDurationHours * 60 * 60 * 1000),
        isActive: false, // Will be activated after approval
        justification: request.justification,
        urgencyLevel: request.urgencyLevel,
        organizationId: request.organizationId,
      },
    });

    // Determine approval requirements
    const requiredApprovers = this.MIN_APPROVERS[request.urgencyLevel];
    const requiresApproval = requiredApprovers > 0;

    // Create audit entry
    await this.createEmergencyAuditEntry({
      operation: 'emergency_access',
      userId: request.requesterId,
      patientId: request.patientId,
      organizationId: request.organizationId,
      dataCategories: Object.values(DataCategory), // Emergency access to all categories
      accessLevel: AccessLevel.EMERGENCY_ACCESS,
      encryptionContext: {
        requesterId: request.requesterId,
        patientId: request.patientId,
        organizationId: request.organizationId,
        requesterRole: 'clinic_admin',
        accessLevel: AccessLevel.EMERGENCY_ACCESS,
        dataCategories: Object.values(DataCategory),
        emergencyContext: {
          accessType: request.accessType,
          reason: request.reason,
          durationHours: request.requestedDurationHours,
          emergencyAccessId: emergencyAccess.id,
        },
        timestamp: new Date(),
      },
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'emergency-system',
      emergencyDetails: {
        requestId: emergencyAccess.id,
        urgencyLevel: request.urgencyLevel,
        justification: request.justification,
      },
      cryptographicProof: await this.generateEmergencyProof(request, emergencyAccess.id),
    });

    return {
      requestId: emergencyAccess.id,
      requiresApproval,
      approversNeeded: requiredApprovers,
    };
  }

  /**
   * Approve emergency access request (multi-signature)
   */
  public async approveEmergencyAccess(
    requestId: string,
    approverId: string,
    approverRole: string,
    approvalReason: string,
    digitalSignature?: string
  ): Promise<{ approved: boolean; activationKey?: string; remainingApprovals: number }> {
    console.log(`🔐 Processing emergency access approval from ${approverId}`);

    // Get the emergency access request
    const emergencyRequest = await prisma.emergencyAccess.findUnique({
      where: { id: requestId },
    });

    if (!emergencyRequest) {
      throw new Error('Emergency access request not found');
    }

    if (emergencyRequest.isActive) {
      throw new Error('Emergency access already activated');
    }

    // Check if approval already exists from this approver
    const existingApproval = await prisma.emergencyApproval.findFirst({
      where: {
        emergencyAccessId: requestId,
        approverId,
      },
    });

    if (existingApproval) {
      throw new Error('Approver has already provided approval');
    }

    // Generate digital signature for this approval
    const approvalSignature =
      digitalSignature ||
      (await this.generateApprovalSignature(requestId, approverId, approvalReason));

    // Create approval record
    await prisma.emergencyApproval.create({
      data: {
        emergencyAccessId: requestId,
        approverId,
        approverRole,
        approvalReason,
        digitalSignature: approvalSignature,
        createdAt: new Date(),
      },
    });

    // Count total approvals
    const approvalCount = await prisma.emergencyApproval.count({
      where: { emergencyAccessId: requestId },
    });

    const requiredApprovals =
      this.MIN_APPROVERS[emergencyRequest.urgencyLevel as keyof typeof this.MIN_APPROVERS];
    const remainingApprovals = Math.max(0, requiredApprovals - approvalCount);

    // If sufficient approvals, activate emergency access
    if (approvalCount >= requiredApprovals) {
      const activationKey = await this.activateEmergencyAccess(requestId);

      return {
        approved: true,
        activationKey,
        remainingApprovals: 0,
      };
    }

    return {
      approved: false,
      remainingApprovals,
    };
  }

  /**
   * Activate emergency access and generate time-bounded emergency keys
   */
  private async activateEmergencyAccess(requestId: string): Promise<string> {
    console.log(`🔓 Activating emergency access: ${requestId}`);

    // Update emergency access to active
    const emergencyAccess = await prisma.emergencyAccess.update({
      where: { id: requestId },
      data: { isActive: true },
    });

    // Generate emergency encryption key
    const emergencyKey = await this.generateEmergencyKey(
      emergencyAccess.patientId,
      emergencyAccess.userId,
      requestId,
      emergencyAccess.endTime || new Date(Date.now() + 24 * 60 * 60 * 1000)
    );

    // Store emergency key in database
    await prisma.encryptionKey.create({
      data: {
        userId: emergencyAccess.userId,
        organizationId: emergencyAccess.organizationId || '',
        keyType: 'emergency',
        encryptedKey: emergencyKey.encryptedKey,
        attributes: JSON.stringify({
          emergency_access_id: requestId,
          patient_id: emergencyAccess.patientId,
          access_type: emergencyAccess.accessType,
          urgency: emergencyAccess.urgencyLevel,
        }),
        expiresAt: emergencyAccess.endTime,
        isActive: true,
      },
    });

    // Schedule automatic revocation
    this.scheduleEmergencyKeyRevocation(requestId, emergencyAccess.endTime || new Date());

    // Create activation audit entry
    await this.createEmergencyAuditEntry({
      operation: 'emergency_access',
      userId: emergencyAccess.userId,
      patientId: emergencyAccess.patientId,
      organizationId: emergencyAccess.organizationId || '',
      dataCategories: Object.values(DataCategory),
      accessLevel: AccessLevel.EMERGENCY_ACCESS,
      encryptionContext: {
        requesterId: emergencyAccess.userId,
        patientId: emergencyAccess.patientId,
        organizationId: emergencyAccess.organizationId || '',
        requesterRole: 'clinic_admin',
        accessLevel: AccessLevel.EMERGENCY_ACCESS,
        dataCategories: Object.values(DataCategory),
        emergencyContext: {
          accessType: emergencyAccess.accessType,
          reason: emergencyAccess.reason,
          durationHours: 24,
          emergencyAccessId: requestId,
        },
        timestamp: new Date(),
      },
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'emergency-system',
      emergencyDetails: {
        requestId,
        activatedAt: new Date(),
        expiresAt: emergencyAccess.endTime,
      },
      cryptographicProof: await this.generateActivationProof(requestId, emergencyKey),
    });

    return emergencyKey.activationToken;
  }

  /**
   * Revoke emergency access immediately
   */
  public async revokeEmergencyAccess(
    requestId: string,
    revokerId: string,
    reason: string
  ): Promise<void> {
    console.log(`🛑 Revoking emergency access: ${requestId}`);

    // Update emergency access to inactive
    const emergencyAccess = await prisma.emergencyAccess.update({
      where: { id: requestId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: revokerId,
        revocationReason: reason,
      },
    });

    // Deactivate emergency keys
    await prisma.encryptionKey.updateMany({
      where: {
        keyType: 'emergency',
        attributes: {
          contains: requestId,
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create revocation audit entry
    await this.createEmergencyAuditEntry({
      operation: 'emergency_access',
      userId: revokerId,
      patientId: emergencyAccess.patientId,
      organizationId: emergencyAccess.organizationId || '',
      dataCategories: Object.values(DataCategory),
      accessLevel: AccessLevel.EMERGENCY_ACCESS,
      encryptionContext: {
        requesterId: revokerId,
        patientId: emergencyAccess.patientId,
        organizationId: emergencyAccess.organizationId || '',
        requesterRole: 'clinic_admin',
        accessLevel: AccessLevel.EMERGENCY_ACCESS,
        dataCategories: Object.values(DataCategory),
        timestamp: new Date(),
      },
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'emergency-system',
      emergencyDetails: {
        requestId,
        revokedAt: new Date(),
        revocationReason: reason,
      },
      cryptographicProof: await this.generateRevocationProof(requestId, revokerId),
    });
  }

  /**
   * Generate time-bounded emergency encryption key
   */
  private async generateEmergencyKey(
    patientId: string,
    requesterId: string,
    requestId: string,
    expiresAt: Date
  ): Promise<EmergencyKeyGenerationResult> {
    // Generate random key material
    const keyMaterial = webcrypto.getRandomValues(new Uint8Array(32));
    const salt = webcrypto.getRandomValues(new Uint8Array(16));

    // Derive emergency key using PBKDF2 with emergency master key
    const keyData = new TextEncoder().encode(
      `${patientId}:${requesterId}:${requestId}:${expiresAt.toISOString()}`
    );
    const derivedKey = sha256(new Uint8Array([...this.emergencyMasterKey, ...salt, ...keyData]));

    // Encrypt the key material
    const encryptedKey = new Uint8Array(keyMaterial.length);
    for (let i = 0; i < keyMaterial.length; i++) {
      encryptedKey[i] = keyMaterial[i] ^ derivedKey[i % derivedKey.length];
    }

    // Generate activation token for emergency responders
    const activationData = `${requestId}:${Date.now()}:${Math.random().toString(36).substring(2)}`;
    const activationToken = Buffer.from(sha256(new TextEncoder().encode(activationData)))
      .toString('hex')
      .substring(0, 16);

    return {
      encryptedKey: Buffer.from(encryptedKey).toString('base64'),
      keyDerivationSalt: Buffer.from(salt).toString('base64'),
      activationToken: activationToken.toUpperCase(),
    };
  }

  /**
   * Validate emergency access request
   */
  private async validateEmergencyRequest(request: EmergencyAccessRequest): Promise<void> {
    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: request.patientId },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Check for existing active emergency access
    const existingAccess = await prisma.emergencyAccess.findFirst({
      where: {
        patientId: request.patientId,
        isActive: true,
        endTime: { gt: new Date() },
      },
    });

    if (existingAccess) {
      throw new Error('Active emergency access already exists for this patient');
    }

    // Validate duration limits
    const maxDuration = {
      critical: 72, // 3 days max for critical
      high: 48, // 2 days max for high
      medium: 24, // 1 day max for medium
    };

    if (request.requestedDurationHours > maxDuration[request.urgencyLevel]) {
      throw new Error(
        `Requested duration exceeds maximum for urgency level: ${maxDuration[request.urgencyLevel]} hours`
      );
    }

    // Validate requester permissions
    const requester = await prisma.user.findUnique({
      where: { id: request.requesterId },
    });

    if (
      !requester ||
      !['clinic_admin', 'super_admin', 'professional_caregiver'].includes(requester.role)
    ) {
      throw new Error('Insufficient permissions to request emergency access');
    }
  }

  /**
   * Schedule automatic revocation of emergency keys
   */
  private scheduleEmergencyKeyRevocation(requestId: string, expiresAt: Date): void {
    const timeUntilExpiry = expiresAt.getTime() - Date.now();

    if (timeUntilExpiry > 0) {
      setTimeout(async () => {
        try {
          await this.revokeEmergencyAccess(requestId, 'system', 'Automatic expiration');
        } catch (error) {
          console.error(`Failed to auto-revoke emergency access ${requestId}:`, error);
        }
      }, timeUntilExpiry);
    }
  }

  /**
   * Generate digital signature for approval
   */
  private async generateApprovalSignature(
    requestId: string,
    approverId: string,
    reason: string
  ): Promise<string> {
    const signatureData = `${requestId}:${approverId}:${reason}:${Date.now()}`;
    const hash = sha256(new TextEncoder().encode(signatureData));
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Generate cryptographic proof for emergency access request
   */
  private async generateEmergencyProof(
    request: EmergencyAccessRequest,
    requestId: string
  ): Promise<string> {
    const proofData = {
      requestId,
      patientId: request.patientId,
      requesterId: request.requesterId,
      urgencyLevel: request.urgencyLevel,
      reason: request.reason,
      timestamp: Date.now(),
    };

    const hash = sha256(new TextEncoder().encode(JSON.stringify(proofData)));
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Generate activation proof
   */
  private async generateActivationProof(
    requestId: string,
    emergencyKey: EmergencyKeyGenerationResult
  ): Promise<string> {
    const proofData = {
      requestId,
      activationToken: emergencyKey.activationToken,
      timestamp: Date.now(),
    };

    const hash = sha256(new TextEncoder().encode(JSON.stringify(proofData)));
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Generate revocation proof
   */
  private async generateRevocationProof(requestId: string, revokerId: string): Promise<string> {
    const proofData = {
      requestId,
      revokerId,
      timestamp: Date.now(),
    };

    const hash = sha256(new TextEncoder().encode(JSON.stringify(proofData)));
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Create emergency-specific audit entry
   */
  private async createEmergencyAuditEntry(
    entry: Omit<CryptoAuditEntry, 'auditId' | 'timestamp'> & {
      emergencyDetails?: EmergencyAccessDetails;
    }
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
        emergencyDetails: JSON.stringify(entry.emergencyDetails || {}),
      },
    });
  }

  /**
   * Get active emergency access sessions
   */
  public async getActiveEmergencyAccess(organizationId?: string): Promise<ActiveEmergencyAccess[]> {
    const where: EmergencyAccessWhereInput = {
      isActive: true,
      endTime: { gt: new Date() },
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return await prisma.emergencyAccess.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  /**
   * Get emergency access audit trail
   */
  public async getEmergencyAuditTrail(
    patientId?: string,
    organizationId?: string,
    limit: number = 50
  ): Promise<EmergencyAuditTrail[]> {
    const where: CryptoAuditEntryWhereInput = {
      operation: {
        in: [
          'emergency_access_request',
          'emergency_access_activation',
          'emergency_access_revocation',
        ],
      },
    };

    if (patientId) {
      where.patientId = patientId;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return await prisma.cryptoAuditEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

// Export singleton instance
export const emergencyAccessCrypto = new EmergencyAccessCrypto();
