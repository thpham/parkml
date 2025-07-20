/**
 * Attribute-Based Encryption (ABE) Implementation
 * Core cryptographic engine for patient-controlled access to medical data
 */

import { webcrypto } from 'crypto';
import { sha256 } from '@noble/hashes/sha256';
import { secp256k1 } from '@noble/curves/secp256k1';
import {
  ABEPolicy,
  AccessLevel,
  DataCategory,
  EncryptionContext,
  EncryptedDataContainer,
  AccessControlResult,
  EncryptionMetadata,
} from '@parkml/shared';

/**
 * ABE Master Authority
 * Manages master keys and attribute authorities for the ABE scheme
 */
export class ABEMasterAuthority {
  private masterSecretKey!: Uint8Array;
  private masterPublicKey!: Uint8Array;
  private organizationAuthorities: Map<string, OrganizationAuthority>;

  constructor() {
    this.organizationAuthorities = new Map();
    this.generateMasterKeys();
  }

  /**
   * Generate master keys for the ABE system
   */
  private generateMasterKeys(): void {
    // Generate master secret key using cryptographically secure random
    this.masterSecretKey = webcrypto.getRandomValues(new Uint8Array(32));

    // Derive master public key from secret key using secp256k1
    this.masterPublicKey = secp256k1.getPublicKey(this.masterSecretKey, true);

    console.log('🔑 ABE Master keys generated');
  }

  /**
   * Create organization authority for multi-tenant support
   */
  public createOrganizationAuthority(organizationId: string): OrganizationAuthority {
    if (this.organizationAuthorities.has(organizationId)) {
      return this.organizationAuthorities.get(organizationId)!;
    }

    const orgAuthority = new OrganizationAuthority(organizationId, this.masterSecretKey);
    this.organizationAuthorities.set(organizationId, orgAuthority);

    console.log(`🏢 Created organization authority for: ${organizationId}`);
    return orgAuthority;
  }

  /**
   * Get organization authority
   */
  public getOrganizationAuthority(organizationId: string): OrganizationAuthority {
    const authority = this.organizationAuthorities.get(organizationId);
    if (!authority) {
      throw new Error(`No authority found for organization: ${organizationId}`);
    }
    return authority;
  }

  /**
   * Get master public key
   */
  public getMasterPublicKey(): Uint8Array {
    return this.masterPublicKey;
  }
}

/**
 * Organization Authority
 * Manages attribute keys and policies for a specific healthcare organization
 */
export class OrganizationAuthority {
  private organizationId: string;
  private authorityKey: Uint8Array;
  private attributeKeys: Map<string, Uint8Array>;

  constructor(organizationId: string, masterSecretKey: Uint8Array) {
    this.organizationId = organizationId;
    this.attributeKeys = new Map();

    // Derive organization authority key from master secret
    const orgData = new TextEncoder().encode(organizationId);
    this.authorityKey = sha256(new Uint8Array([...masterSecretKey, ...orgData]));
  }

  /**
   * Generate attribute key for a specific attribute
   */
  public generateAttributeKey(attribute: string): Uint8Array {
    if (this.attributeKeys.has(attribute)) {
      return this.attributeKeys.get(attribute)!;
    }

    const attrData = new TextEncoder().encode(attribute);
    const attributeKey = sha256(new Uint8Array([...this.authorityKey, ...attrData]));

    this.attributeKeys.set(attribute, attributeKey);
    return attributeKey;
  }

  /**
   * Generate user secret key based on user attributes
   */
  public generateUserSecretKey(userId: string, attributes: string[]): UserSecretKey {
    const userKeys = new Map<string, Uint8Array>();

    for (const attribute of attributes) {
      const attributeKey = this.generateAttributeKey(attribute);
      const userData = new TextEncoder().encode(`${userId}:${attribute}`);
      const userAttributeKey = sha256(new Uint8Array([...attributeKey, ...userData]));
      userKeys.set(attribute, userAttributeKey);
    }

    return new UserSecretKey(userId, userKeys, this.organizationId);
  }

  /**
   * Get organization ID
   */
  public getOrganizationId(): string {
    return this.organizationId;
  }
}

/**
 * User Secret Key
 * Contains attribute-specific keys for a user
 */
export class UserSecretKey {
  private userId: string;
  private attributeKeys: Map<string, Uint8Array>;
  private organizationId: string;

  constructor(userId: string, attributeKeys: Map<string, Uint8Array>, organizationId: string) {
    this.userId = userId;
    this.attributeKeys = attributeKeys;
    this.organizationId = organizationId;
  }

  /**
   * Get user's key for a specific attribute
   */
  public getAttributeKey(attribute: string): Uint8Array | null {
    return this.attributeKeys.get(attribute) || null;
  }

  /**
   * Check if user has a specific attribute
   */
  public hasAttribute(attribute: string): boolean {
    return this.attributeKeys.has(attribute);
  }

  /**
   * Get all user attributes
   */
  public getAttributes(): string[] {
    return Array.from(this.attributeKeys.keys());
  }

  /**
   * Serialize user key for storage
   */
  public serialize(): string {
    const keyData = {
      userId: this.userId,
      organizationId: this.organizationId,
      attributeKeys: Object.fromEntries(
        Array.from(this.attributeKeys.entries()).map(([attr, key]) => [attr, Array.from(key)])
      ),
    };
    return JSON.stringify(keyData);
  }

  /**
   * Deserialize user key from storage
   */
  public static deserialize(serializedKey: string): UserSecretKey {
    const keyData = JSON.parse(serializedKey);
    const attributeKeys = new Map<string, Uint8Array>(
      Object.entries(keyData.attributeKeys).map(([attr, keyArray]: [string, unknown]) => [
        attr,
        new Uint8Array(keyArray as number[]),
      ])
    );
    return new UserSecretKey(keyData.userId, attributeKeys, keyData.organizationId);
  }
}

/**
 * ABE Crypto Engine
 * Main interface for ABE encryption and decryption operations
 */
export class ABECrypto {
  private masterAuthority: ABEMasterAuthority;
  private policyEvaluator: PolicyEvaluator;

  constructor() {
    this.masterAuthority = new ABEMasterAuthority();
    this.policyEvaluator = new PolicyEvaluator();
  }

  /**
   * Encrypt data using ABE with specified policy
   */
  public async encrypt(
    data: string,
    policy: ABEPolicy,
    organizationId: string
  ): Promise<EncryptedDataContainer> {
    // Generate symmetric key for actual data encryption
    const dataKey = webcrypto.getRandomValues(new Uint8Array(32));

    // Encrypt data with AES-GCM
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await webcrypto.subtle.importKey('raw', dataKey, { name: 'AES-GCM' }, false, [
      'encrypt',
    ]);

    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await webcrypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encodedData
    );

    // Encrypt the data key using ABE
    const encryptedDataKey = await this.encryptDataKey(dataKey, policy, organizationId);

    // Create encrypted container
    const container: EncryptedDataContainer = {
      dataId: this.generateDataId(),
      ciphertext: this.encodeEncryptedPayload(encryptedData, iv, encryptedDataKey),
      algorithm: 'ABE',
      abePolicy: policy,
      metadata: this.createEncryptionMetadata(data, policy, organizationId),
      signature: '', // Will be set after signing
      version: '1.0',
    };

    // Sign the container for integrity
    container.signature = await this.signContainer(container);

    return container;
  }

  /**
   * Decrypt data using ABE with user's secret key
   */
  public async decrypt(
    container: EncryptedDataContainer,
    userSecretKey: UserSecretKey,
    context: EncryptionContext
  ): Promise<string> {
    // Verify container signature
    if (!(await this.verifyContainer(container))) {
      throw new Error('Container signature verification failed');
    }

    // Check access control
    const accessResult = await this.evaluateAccess(container.abePolicy!, userSecretKey, context);
    if (!accessResult.granted) {
      throw new Error(`Access denied: ${accessResult.denialReason}`);
    }

    // Decode encrypted payload
    const { encryptedData, iv, encryptedDataKey } = this.decodeEncryptedPayload(
      container.ciphertext
    );

    // Decrypt data key using ABE
    const dataKey = await this.decryptDataKey(
      encryptedDataKey,
      userSecretKey,
      container.abePolicy!
    );

    // Decrypt data with AES-GCM
    const cryptoKey = await webcrypto.subtle.importKey('raw', dataKey, { name: 'AES-GCM' }, false, [
      'decrypt',
    ]);

    const decryptedData = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedData
    );

    return new TextDecoder().decode(decryptedData);
  }

  /**
   * Generate policy for medical data access
   */
  public generatePolicy(
    patientId: string,
    dataCategories: DataCategory[],
    accessLevel: AccessLevel,
    organizationId: string,
    expirationHours?: number
  ): ABEPolicy {
    const attributes = this.generateAttributes(
      patientId,
      dataCategories,
      accessLevel,
      organizationId
    );
    const policyExpression = this.generatePolicyExpression(attributes, accessLevel);

    const policy: ABEPolicy = {
      attributes,
      policy: policyExpression,
      dataCategories,
      accessLevel,
      organizationId,
    };

    if (expirationHours) {
      policy.expiration = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
    }

    return policy;
  }

  /**
   * Evaluate access control for a given context
   */
  public async evaluateAccess(
    policy: ABEPolicy,
    userSecretKey: UserSecretKey,
    context: EncryptionContext
  ): Promise<AccessControlResult> {
    // Check policy expiration
    if (policy.expiration && new Date() > policy.expiration) {
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'Policy has expired',
        encryptionKeys: [],
      };
    }

    // Evaluate policy expression against user attributes
    const userAttributes = userSecretKey.getAttributes();
    const policyResult = this.policyEvaluator.evaluate(policy.policy, userAttributes);

    if (!policyResult) {
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'Insufficient attributes for policy',
        encryptionKeys: [],
      };
    }

    // Check organization context
    if (
      userSecretKey['organizationId'] !== policy.organizationId &&
      !userAttributes.includes('role:super_admin')
    ) {
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'Organization mismatch',
        encryptionKeys: [],
      };
    }

    // Determine accessible data categories based on access level
    const accessibleCategories = this.determineAccessibleCategories(
      policy.dataCategories,
      policy.accessLevel,
      context.requesterRole
    );

    return {
      granted: true,
      accessLevel: policy.accessLevel,
      accessibleCategories,
      encryptionKeys: [userSecretKey.serialize()],
      expiresAt: policy.expiration,
    };
  }

  /**
   * Create organization authority for multi-tenant support
   */
  public createOrganizationAuthority(organizationId: string): OrganizationAuthority {
    return this.masterAuthority.createOrganizationAuthority(organizationId);
  }

  /**
   * Generate user secret key
   */
  public generateUserSecretKey(
    userId: string,
    organizationId: string,
    userRole: string,
    patientIds: string[] = []
  ): UserSecretKey {
    const authority = this.masterAuthority.getOrganizationAuthority(organizationId);
    const attributes = this.generateUserAttributes(userId, organizationId, userRole, patientIds);
    return authority.generateUserSecretKey(userId, attributes);
  }

  /**
   * Private helper methods
   */

  private async encryptDataKey(
    dataKey: Uint8Array,
    policy: ABEPolicy,
    _organizationId: string
  ): Promise<string> {
    // Simplified ABE encryption using policy attributes
    // In a full implementation, this would use proper ABE schemes like CP-ABE
    const policyHash = sha256(new TextEncoder().encode(policy.policy));
    const encryptionKey = sha256(new Uint8Array([...policyHash, ...dataKey]));

    // XOR encryption (simplified for demo - use proper ABE in production)
    const encrypted = new Uint8Array(dataKey.length);
    for (let i = 0; i < dataKey.length; i++) {
      encrypted[i] = dataKey[i] ^ encryptionKey[i % encryptionKey.length];
    }

    return Buffer.from(encrypted).toString('base64');
  }

  private async decryptDataKey(
    encryptedDataKey: string,
    userSecretKey: UserSecretKey,
    policy: ABEPolicy
  ): Promise<Uint8Array> {
    // Simplified ABE decryption
    const policyHash = sha256(new TextEncoder().encode(policy.policy));
    const encrypted = Buffer.from(encryptedDataKey, 'base64');

    // Generate decryption key from user attributes
    const userAttrs = userSecretKey.getAttributes().join(',');
    const decryptionSeed = sha256(new TextEncoder().encode(userAttrs));
    const decryptionKey = sha256(new Uint8Array([...policyHash, ...decryptionSeed]));

    // XOR decryption
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ decryptionKey[i % decryptionKey.length];
    }

    return decrypted;
  }

  private generateAttributes(
    patientId: string,
    dataCategories: DataCategory[],
    accessLevel: AccessLevel,
    organizationId: string
  ): string[] {
    const attributes = [`patient:${patientId}`, `org:${organizationId}`, `access:${accessLevel}`];

    dataCategories.forEach(category => {
      attributes.push(`data:${category}`);
    });

    return attributes;
  }

  private generatePolicyExpression(attributes: string[], accessLevel: AccessLevel): string {
    const baseExpression = attributes.join(' AND ');

    switch (accessLevel) {
      case AccessLevel.PATIENT_FULL:
        return `${baseExpression} AND role:patient`;
      case AccessLevel.CAREGIVER_PROFESSIONAL:
        return `${baseExpression} AND (role:professional_caregiver OR role:clinic_admin)`;
      case AccessLevel.CAREGIVER_FAMILY:
        return `${baseExpression} AND role:family_caregiver`;
      case AccessLevel.EMERGENCY_ACCESS:
        return `${baseExpression} AND emergency:active`;
      default:
        return baseExpression;
    }
  }

  private generateUserAttributes(
    userId: string,
    organizationId: string,
    userRole: string,
    patientIds: string[]
  ): string[] {
    const attributes = [`user:${userId}`, `org:${organizationId}`, `role:${userRole}`];

    // Add patient assignments for caregivers
    patientIds.forEach(patientId => {
      attributes.push(`assigned:${patientId}`);
    });

    return attributes;
  }

  private determineAccessibleCategories(
    policyCategories: DataCategory[],
    accessLevel: AccessLevel,
    requesterRole: string
  ): DataCategory[] {
    // Filter categories based on access level and role
    switch (accessLevel) {
      case AccessLevel.PATIENT_FULL:
        return policyCategories; // Patients have access to all their data

      case AccessLevel.CAREGIVER_PROFESSIONAL:
        return policyCategories.filter(
          cat =>
            cat !== DataCategory.EMERGENCY_CONTACTS || requesterRole === 'professional_caregiver'
        );

      case AccessLevel.CAREGIVER_FAMILY:
        return policyCategories.filter(
          cat => ![DataCategory.MEDICATION_DATA, DataCategory.EMERGENCY_CONTACTS].includes(cat)
        );

      case AccessLevel.EMERGENCY_ACCESS:
        return [DataCategory.EMERGENCY_CONTACTS, DataCategory.MEDICATION_DATA];

      default:
        return [];
    }
  }

  private generateDataId(): string {
    return `data_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private encodeEncryptedPayload(
    encryptedData: ArrayBuffer,
    iv: Uint8Array,
    encryptedDataKey: string
  ): string {
    const payload = {
      data: Buffer.from(encryptedData).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      key: encryptedDataKey,
    };
    return JSON.stringify(payload);
  }

  private decodeEncryptedPayload(ciphertext: string): {
    encryptedData: ArrayBuffer;
    iv: Uint8Array;
    encryptedDataKey: string;
  } {
    const payload = JSON.parse(ciphertext);
    return {
      encryptedData: Buffer.from(payload.data, 'base64').buffer,
      iv: new Uint8Array(Buffer.from(payload.iv, 'base64')),
      encryptedDataKey: payload.key,
    };
  }

  private createEncryptionMetadata(
    originalData: string,
    policy: ABEPolicy,
    organizationId: string
  ): EncryptionMetadata {
    const originalHash = Buffer.from(sha256(new TextEncoder().encode(originalData))).toString(
      'hex'
    );

    return {
      dataCategory: policy.dataCategories[0], // Primary category
      patientId: policy.attributes.find(attr => attr.startsWith('patient:'))?.split(':')[1] || '',
      organizationId,
      encryptedAt: new Date(),
      keyId: 'abe_key', // Simplified
      originalSize: originalData.length,
      encryptedSize: 0, // Will be updated
      originalHash,
    };
  }

  private async signContainer(container: EncryptedDataContainer): Promise<string> {
    const containerData = JSON.stringify({
      dataId: container.dataId,
      ciphertext: container.ciphertext,
      algorithm: container.algorithm,
      metadata: container.metadata,
    });

    const hash = sha256(new TextEncoder().encode(containerData));
    return Buffer.from(hash).toString('hex');
  }

  private async verifyContainer(container: EncryptedDataContainer): Promise<boolean> {
    const expectedSignature = await this.signContainer({
      ...container,
      signature: '', // Remove signature for verification
    });

    return container.signature === expectedSignature;
  }
}

/**
 * Policy Evaluator
 * Evaluates ABE policy expressions against user attributes
 */
export class PolicyEvaluator {
  /**
   * Evaluate a policy expression against user attributes
   */
  public evaluate(policyExpression: string, userAttributes: string[]): boolean {
    // Simplified policy evaluation - in production, use a proper policy language parser
    const normalizedPolicy = policyExpression.toLowerCase();
    const userAttrSet = new Set(userAttributes.map(attr => attr.toLowerCase()));

    // Handle AND operations
    if (normalizedPolicy.includes(' and ')) {
      const conditions = normalizedPolicy.split(' and ').map(c => c.trim());
      return conditions.every(condition => this.evaluateCondition(condition, userAttrSet));
    }

    // Handle OR operations
    if (normalizedPolicy.includes(' or ')) {
      const conditions = normalizedPolicy.split(' or ').map(c => c.trim());
      return conditions.some(condition => this.evaluateCondition(condition, userAttrSet));
    }

    // Single condition
    return this.evaluateCondition(normalizedPolicy, userAttrSet);
  }

  private evaluateCondition(condition: string, userAttributes: Set<string>): boolean {
    // Remove parentheses and trim
    const cleanCondition = condition.replace(/[()]/g, '').trim();

    // Check if user has the required attribute
    return userAttributes.has(cleanCondition);
  }
}
