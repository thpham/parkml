// Core encryption types for the ParkML multi-party encryption system

/**
 * Access levels for medical data encryption
 * Defines hierarchical access tiers with different cryptographic permissions
 */
export enum AccessLevel {
  /** Full access - Patient owns their data */
  PATIENT_FULL = 'patient_full',
  /** Professional caregiver access - Medical professionals with treatment authorization */
  CAREGIVER_PROFESSIONAL = 'caregiver_professional',
  /** Family caregiver access - Family members with limited access */
  CAREGIVER_FAMILY = 'caregiver_family',
  /** Emergency access - Temporary access during medical emergencies */
  EMERGENCY_ACCESS = 'emergency_access',
  /** Research access - Anonymized data for research purposes */
  RESEARCH_ANONYMIZED = 'research_anonymized',
  /** Analytics access - Aggregated data for population health insights */
  ANALYTICS_AGGREGATED = 'analytics_aggregated',
}

/**
 * Data categories for fine-grained access control
 * Different types of medical data with varying sensitivity levels
 */
export enum DataCategory {
  /** Basic patient demographics and contact information */
  DEMOGRAPHICS = 'demographics',
  /** Motor symptoms data (tremors, rigidity, bradykinesia) */
  MOTOR_SYMPTOMS = 'motor_symptoms',
  /** Non-motor symptoms (cognitive, mood, sleep) */
  NON_MOTOR_SYMPTOMS = 'non_motor_symptoms',
  /** Autonomic symptoms (blood pressure, bladder/bowel) */
  AUTONOMIC_SYMPTOMS = 'autonomic_symptoms',
  /** Daily activities and functionality assessments */
  DAILY_ACTIVITIES = 'daily_activities',
  /** Medication information and compliance */
  MEDICATION_DATA = 'medication_data',
  /** Emergency contact information */
  EMERGENCY_CONTACTS = 'emergency_contacts',
  /** Safety incidents and fall reports */
  SAFETY_INCIDENTS = 'safety_incidents',
  /** Environmental factors affecting symptoms */
  ENVIRONMENTAL_FACTORS = 'environmental_factors',
}

/**
 * Encryption context for access control decisions
 * Contains all necessary information for encryption/decryption operations
 */
export interface EncryptionContext {
  /** Patient whose data is being accessed */
  patientId: string;
  /** Requesting user's ID */
  requesterId: string;
  /** Access level being requested */
  accessLevel: AccessLevel;
  /** Organization context for multi-tenant isolation */
  organizationId: string;
  /** Role of the requesting user */
  requesterRole:
    | 'super_admin'
    | 'clinic_admin'
    | 'professional_caregiver'
    | 'family_caregiver'
    | 'patient';
  /** Specific data categories being requested */
  dataCategories: DataCategory[];
  /** Optional emergency access context */
  emergencyContext?: EmergencyAccessContext;
  /** Timestamp of the request */
  timestamp: Date;
}

/**
 * Emergency access context for urgent medical situations
 */
export interface EmergencyAccessContext {
  /** Type of emergency access */
  accessType: 'medical_emergency' | 'technical_support' | 'data_recovery' | 'audit_investigation';
  /** Reason for emergency access */
  reason: string;
  /** Duration of emergency access in hours */
  durationHours: number;
  /** Emergency access ID for audit trail */
  emergencyAccessId: string;
}

/**
 * Attribute-Based Encryption (ABE) policy definition
 * Defines access rules using cryptographic attributes
 */
export interface ABEPolicy {
  /** Cryptographic attributes required for access */
  attributes: string[];
  /** Boolean policy expression (e.g., "patient:123 AND role:doctor") */
  policy: string;
  /** Optional expiration date for time-limited access */
  expiration?: Date;
  /** Data categories covered by this policy */
  dataCategories: DataCategory[];
  /** Access level granted by this policy */
  accessLevel: AccessLevel;
  /** Organization scope for multi-tenant isolation */
  organizationId: string;
}

/**
 * Encryption key material for different key types
 */
export interface EncryptionKeyMaterial {
  /** Unique identifier for the key */
  keyId: string;
  /** Type of encryption key */
  keyType: 'master' | 'patient' | 'delegation' | 'emergency' | 'organization' | 'research';
  /** The actual encrypted key material */
  encryptedKey: string;
  /** Public key component (for asymmetric schemes) */
  publicKey?: string;
  /** Cryptographic attributes associated with this key */
  attributes: string[];
  /** Key derivation metadata */
  derivationPath?: string;
  /** Key expiration date */
  expiresAt?: Date;
  /** Whether the key is currently active */
  isActive: boolean;
  /** Organization context */
  organizationId: string;
  /** User context (if user-specific key) */
  userId?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Encrypted data container
 * Standardized format for all encrypted medical data
 */
export interface EncryptedDataContainer {
  /** Unique identifier for the encrypted data */
  dataId: string;
  /** The actual encrypted content */
  ciphertext: string;
  /** Encryption algorithm used */
  algorithm: 'ABE' | 'PRE' | 'HE' | 'AES-GCM';
  /** ABE policy used for encryption (if applicable) */
  abePolicy?: ABEPolicy;
  /** Encryption metadata */
  metadata: EncryptionMetadata;
  /** Digital signature for integrity */
  signature: string;
  /** Version of the encryption scheme */
  version: string;
}

/**
 * Encryption metadata
 */
export interface EncryptionMetadata {
  /** Data category of the encrypted content */
  dataCategory: DataCategory;
  /** Patient ID (may be anonymized for research data) */
  patientId: string;
  /** Organization context */
  organizationId: string;
  /** Encryption timestamp */
  encryptedAt: Date;
  /** Key ID used for encryption */
  keyId: string;
  /** Size of original data */
  originalSize: number;
  /** Size of encrypted data */
  encryptedSize: number;
  /** Hash of original data for integrity checking */
  originalHash: string;
}

/**
 * Proxy Re-Encryption delegation
 * Enables patient-controlled access delegation to caregivers
 */
export interface ProxyReEncryptionDelegation {
  /** Unique delegation identifier */
  delegationId: string;
  /** Patient delegating access */
  patientUserId: string;
  /** Caregiver receiving access */
  caregiverUserId: string;
  /** Re-encryption key for the delegation */
  reEncryptionKey: string;
  /** Data categories included in the delegation */
  dataCategories: DataCategory[];
  /** Access level granted */
  accessLevel: AccessLevel;
  /** Delegation expiration date */
  expiresAt: Date;
  /** Whether the delegation is currently active */
  isActive: boolean;
  /** Reason for the delegation */
  reason?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Revocation timestamp (if revoked) */
  revokedAt?: Date;
}

/**
 * Homomorphic encryption computation request
 * For privacy-preserving analytics on encrypted data
 */
export interface HomomorphicComputationRequest {
  /** Unique computation identifier */
  computationId: string;
  /** Type of computation to perform */
  computationType: 'sum' | 'mean' | 'count' | 'variance' | 'correlation' | 'regression';
  /** Organization scope for the computation */
  organizationId?: string;
  /** Data categories to include in computation */
  dataCategories: DataCategory[];
  /** Patient cohort criteria */
  cohortCriteria: CohortCriteria;
  /** Requesting user/organization */
  requesterId: string;
  /** Purpose of the computation */
  purpose: string;
  /** Timestamp of the request */
  requestedAt: Date;
}

/**
 * Cohort criteria for analytics computations
 */
export interface CohortCriteria {
  /** Age range */
  ageRange?: { min: number; max: number };
  /** Diagnosis date range */
  diagnosisDateRange?: { start: Date; end: Date };
  /** Specific organizations to include */
  organizationIds?: string[];
  /** Exclude specific patients */
  excludePatientIds?: string[];
  /** Additional filters */
  additionalFilters?: Record<string, unknown>;
}

/**
 * Cryptographic audit trail entry
 */
export interface CryptoAuditEntry {
  /** Unique audit entry identifier */
  auditId: string;
  /** Type of cryptographic operation */
  operation:
    | 'encrypt'
    | 'decrypt'
    | 'key_generation'
    | 'key_delegation'
    | 'key_revocation'
    | 'emergency_access';
  /** User performing the operation */
  userId: string;
  /** Patient data involved (if applicable) */
  patientId?: string;
  /** Organization context */
  organizationId: string;
  /** Data categories involved */
  dataCategories: DataCategory[];
  /** Access level used */
  accessLevel: AccessLevel;
  /** Encryption context details */
  encryptionContext: Partial<EncryptionContext>;
  /** Operation success status */
  success: boolean;
  /** Error message (if operation failed) */
  errorMessage?: string;
  /** IP address of the request */
  ipAddress: string;
  /** User agent string */
  userAgent: string;
  /** Timestamp of the operation */
  timestamp: Date;
  /** Cryptographic proof/signature of the audit entry */
  cryptographicProof: string;
}

/**
 * Key generation request
 */
export interface KeyGenerationRequest {
  /** Type of key to generate */
  keyType: 'master' | 'patient' | 'delegation' | 'emergency' | 'organization';
  /** User context (if user-specific) */
  userId?: string;
  /** Organization context */
  organizationId: string;
  /** Attributes for the key */
  attributes: string[];
  /** Key expiration (optional) */
  expiresAt?: Date;
  /** Purpose of the key */
  purpose: string;
}

/**
 * Access control evaluation result
 */
export interface AccessControlResult {
  /** Whether access is granted */
  granted: boolean;
  /** Access level granted (if any) */
  accessLevel?: AccessLevel;
  /** Data categories accessible */
  accessibleCategories: DataCategory[];
  /** Reason for denial (if access denied) */
  denialReason?: string;
  /** Encryption keys to use for access */
  encryptionKeys: string[];
  /** Expiration time for the access */
  expiresAt?: Date;
}
