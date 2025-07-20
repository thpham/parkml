/**
 * Prisma Encryption Middleware
 * Transparent encryption/decryption for medical data in the database
 */

import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { ABECrypto, UserSecretKey } from './abe-crypto';
import {
  AccessLevel,
  DataCategory,
  EncryptionContext,
  EncryptedDataContainer,
} from '@parkml/shared';

/**
 * Authenticated user interface for requests
 */
interface AuthenticatedUser {
  userId: string;
  organizationId?: string;
  role: UserRole;
}

/**
 * Extended Express request with authentication
 */
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  encryptionContext?: RequestEncryptionContextProvider;
}

/**
 * Prisma middleware parameters
 */
interface PrismaMiddlewareParams {
  model?: string;
  action: string;
  args: {
    data?: Record<string, unknown>;
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
    [key: string]: unknown;
  };
  dataPath: string[];
  runInTransaction: boolean;
}

/**
 * Database record with optional encryption flag
 */
interface DatabaseRecord {
  [key: string]: unknown;
  isEncrypted?: boolean;
}

/**
 * User role types
 */
type UserRole =
  | 'super_admin'
  | 'clinic_admin'
  | 'professional_caregiver'
  | 'family_caregiver'
  | 'patient';

/**
 * Database query result - can be single record, array, or other result
 */
type DatabaseQueryResult = DatabaseRecord | DatabaseRecord[] | null | undefined | unknown;

/**
 * Encryption field configuration
 * Defines which fields should be encrypted and how
 */
interface EncryptionFieldConfig {
  model: string;
  fields: {
    fieldName: string;
    dataCategory: DataCategory;
    accessLevel: AccessLevel;
    isJson: boolean;
  }[];
}

/**
 * Encryption middleware configuration
 */
const ENCRYPTION_CONFIG: EncryptionFieldConfig[] = [
  {
    model: 'SymptomEntry',
    fields: [
      {
        fieldName: 'motorSymptoms',
        dataCategory: DataCategory.MOTOR_SYMPTOMS,
        accessLevel: AccessLevel.CAREGIVER_PROFESSIONAL,
        isJson: true,
      },
      {
        fieldName: 'nonMotorSymptoms',
        dataCategory: DataCategory.NON_MOTOR_SYMPTOMS,
        accessLevel: AccessLevel.CAREGIVER_PROFESSIONAL,
        isJson: true,
      },
      {
        fieldName: 'autonomicSymptoms',
        dataCategory: DataCategory.AUTONOMIC_SYMPTOMS,
        accessLevel: AccessLevel.CAREGIVER_PROFESSIONAL,
        isJson: true,
      },
      {
        fieldName: 'dailyActivities',
        dataCategory: DataCategory.DAILY_ACTIVITIES,
        accessLevel: AccessLevel.CAREGIVER_FAMILY,
        isJson: true,
      },
      {
        fieldName: 'environmentalFactors',
        dataCategory: DataCategory.ENVIRONMENTAL_FACTORS,
        accessLevel: AccessLevel.CAREGIVER_FAMILY,
        isJson: true,
      },
      {
        fieldName: 'safetyIncidents',
        dataCategory: DataCategory.SAFETY_INCIDENTS,
        accessLevel: AccessLevel.CAREGIVER_PROFESSIONAL,
        isJson: true,
      },
    ],
  },
  {
    model: 'Patient',
    fields: [
      {
        fieldName: 'emergencyContact',
        dataCategory: DataCategory.EMERGENCY_CONTACTS,
        accessLevel: AccessLevel.EMERGENCY_ACCESS,
        isJson: true,
      },
      {
        fieldName: 'privacySettings',
        dataCategory: DataCategory.DEMOGRAPHICS,
        accessLevel: AccessLevel.PATIENT_FULL,
        isJson: true,
      },
    ],
  },
  {
    model: 'CaregiverAssignment',
    fields: [
      {
        fieldName: 'permissions',
        dataCategory: DataCategory.DEMOGRAPHICS,
        accessLevel: AccessLevel.CAREGIVER_PROFESSIONAL,
        isJson: true,
      },
    ],
  },
  {
    model: 'Organization',
    fields: [
      {
        fieldName: 'settings',
        dataCategory: DataCategory.DEMOGRAPHICS,
        accessLevel: AccessLevel.CAREGIVER_PROFESSIONAL,
        isJson: true,
      },
    ],
  },
];

/**
 * Encryption context provider
 * Extracts encryption context from Prisma operations
 */
export interface EncryptionContextProvider {
  getContext(): EncryptionContext | null;
  getUserSecretKey(): UserSecretKey | null;
}

/**
 * Prisma Encryption Middleware
 * Provides transparent encryption/decryption for medical data
 */
export class PrismaEncryptionMiddleware {
  private abeCrypto: ABECrypto;
  private contextProvider: EncryptionContextProvider;

  constructor(contextProvider: EncryptionContextProvider) {
    this.abeCrypto = new ABECrypto();
    this.contextProvider = contextProvider;
  }

  /**
   * Create Prisma middleware function
   */
  public createMiddleware(): Prisma.Middleware {
    return async (params, next) => {
      try {
        // Encrypt data on write operations
        if (this.isWriteOperation(params.action)) {
          await this.encryptFields(params);
        }

        // Execute the database operation
        const result = await next(params);

        // Decrypt data on read operations
        if (this.isReadOperation(params.action) && result) {
          return await this.decryptFields(result, params);
        }

        return result;
      } catch (error) {
        console.error('Encryption middleware error:', error);
        // Don't block database operations on encryption errors
        // In production, you might want to handle this differently
        return await next(params);
      }
    };
  }

  /**
   * Encrypt fields before database write
   */
  private async encryptFields(params: PrismaMiddlewareParams): Promise<void> {
    const config = this.getEncryptionConfig(params.model);
    if (!config || !params.args.data) {
      return;
    }

    const context = this.contextProvider.getContext();
    if (!context) {
      console.warn('No encryption context available for write operation');
      return;
    }

    for (const fieldConfig of config.fields) {
      const fieldValue = params.args.data[fieldConfig.fieldName];
      if (fieldValue !== undefined && fieldValue !== null) {
        try {
          const encryptedValue = await this.encryptField(fieldValue, fieldConfig, context);
          params.args.data[fieldConfig.fieldName] = encryptedValue;

          // Mark the record as encrypted
          if ('isEncrypted' in params.args.data) {
            params.args.data.isEncrypted = true;
          }
        } catch (error) {
          console.error(`Failed to encrypt field ${fieldConfig.fieldName}:`, error);
          // Continue without encryption for now
        }
      }
    }
  }

  /**
   * Decrypt fields after database read
   */
  private async decryptFields(
    result: DatabaseQueryResult,
    params: PrismaMiddlewareParams
  ): Promise<DatabaseQueryResult> {
    if (!result) return result;

    const config = this.getEncryptionConfig(params.model);
    if (!config) return result;

    const context = this.contextProvider.getContext();
    const userSecretKey = this.contextProvider.getUserSecretKey();

    if (!context || !userSecretKey) {
      console.warn('No decryption context available for read operation');
      return result;
    }

    // Handle arrays of results
    if (Array.isArray(result)) {
      return Promise.all(
        result.map(item => this.decryptRecord(item, config, context, userSecretKey))
      );
    }

    // Handle single result
    return await this.decryptRecord(result as DatabaseRecord, config, context, userSecretKey);
  }

  /**
   * Decrypt a single record
   */
  private async decryptRecord(
    record: DatabaseRecord,
    config: EncryptionFieldConfig,
    context: EncryptionContext,
    userSecretKey: UserSecretKey
  ): Promise<DatabaseRecord> {
    if (!record || !record.isEncrypted) {
      return record;
    }

    const decryptedRecord = { ...record };

    for (const fieldConfig of config.fields) {
      const fieldValue = record[fieldConfig.fieldName];
      if (fieldValue && typeof fieldValue === 'string') {
        try {
          const decryptedValue = await this.decryptField(
            fieldValue,
            fieldConfig,
            context,
            userSecretKey
          );
          decryptedRecord[fieldConfig.fieldName] = decryptedValue;
        } catch (error) {
          console.error(`Failed to decrypt field ${fieldConfig.fieldName}:`, error);
          // Leave field encrypted if decryption fails
          decryptedRecord[fieldConfig.fieldName] = '[ENCRYPTED]';
        }
      }
    }

    return decryptedRecord;
  }

  /**
   * Encrypt a single field
   */
  private async encryptField(
    value: unknown,
    fieldConfig: {
      fieldName: string;
      dataCategory: DataCategory;
      accessLevel: AccessLevel;
      isJson: boolean;
    },
    context: EncryptionContext
  ): Promise<string> {
    // Convert value to string for encryption
    const stringValue = fieldConfig.isJson ? JSON.stringify(value) : String(value);

    // Generate ABE policy for this field
    const policy = this.abeCrypto.generatePolicy(
      context.patientId,
      [fieldConfig.dataCategory],
      fieldConfig.accessLevel,
      context.organizationId
    );

    // Encrypt the field value
    const encryptedContainer = await this.abeCrypto.encrypt(
      stringValue,
      policy,
      context.organizationId
    );

    // Return serialized encrypted container
    return JSON.stringify(encryptedContainer);
  }

  /**
   * Decrypt a single field
   */
  private async decryptField(
    encryptedValue: string,
    fieldConfig: {
      fieldName: string;
      dataCategory: DataCategory;
      accessLevel: AccessLevel;
      isJson: boolean;
    },
    context: EncryptionContext,
    userSecretKey: UserSecretKey
  ): Promise<unknown> {
    try {
      // Parse encrypted container
      const container: EncryptedDataContainer = JSON.parse(encryptedValue);

      // Decrypt the field value
      const decryptedString = await this.abeCrypto.decrypt(container, userSecretKey, context);

      // Convert back to original type
      return fieldConfig.isJson ? JSON.parse(decryptedString) : decryptedString;
    } catch (error) {
      // If decryption fails, check if it's due to access control
      if (error instanceof Error && error.message.includes('Access denied')) {
        // Return a filtered view or indication of restricted access
        return this.getRestrictedFieldValue(fieldConfig.dataCategory, context.requesterRole);
      }
      throw error;
    }
  }

  /**
   * Get restricted field value for access-denied scenarios
   */
  private getRestrictedFieldValue(dataCategory: DataCategory, requesterRole: UserRole): string {
    switch (dataCategory) {
      case DataCategory.EMERGENCY_CONTACTS:
        return requesterRole === 'professional_caregiver'
          ? '[RESTRICTED - Emergency Only]'
          : '[RESTRICTED]';
      case DataCategory.MEDICATION_DATA:
        return requesterRole === 'family_caregiver'
          ? '[RESTRICTED - Professional Only]'
          : '[RESTRICTED]';
      default:
        return '[RESTRICTED]';
    }
  }

  /**
   * Get encryption configuration for a model
   */
  private getEncryptionConfig(modelName: string | undefined): EncryptionFieldConfig | null {
    if (!modelName) return null;
    return ENCRYPTION_CONFIG.find(config => config.model === modelName) || null;
  }

  /**
   * Check if operation is a write operation
   */
  private isWriteOperation(action: string): boolean {
    return ['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(action);
  }

  /**
   * Check if operation is a read operation
   */
  private isReadOperation(action: string): boolean {
    return [
      'findUnique',
      'findFirst',
      'findMany',
      'findUniqueOrThrow',
      'findFirstOrThrow',
    ].includes(action);
  }
}

/**
 * Request-scoped encryption context provider
 * Extracts context from Express request
 */
export class RequestEncryptionContextProvider implements EncryptionContextProvider {
  private context: EncryptionContext | null = null;
  private userSecretKey: UserSecretKey | null = null;

  constructor(
    private req: AuthenticatedRequest,
    private abeCrypto: ABECrypto
  ) {}

  /**
   * Set encryption context from authenticated request
   */
  public async setContext(
    patientId: string,
    accessLevel: AccessLevel,
    dataCategories: DataCategory[] = []
  ): Promise<void> {
    if (!this.req.user) {
      throw new Error('No authenticated user available for encryption context');
    }

    this.context = {
      patientId,
      requesterId: this.req.user.userId,
      accessLevel,
      organizationId: this.req.user.organizationId || '',
      requesterRole: this.req.user.role,
      dataCategories,
      timestamp: new Date(),
    };

    // Generate user secret key based on their attributes
    this.userSecretKey = this.abeCrypto.generateUserSecretKey(
      this.req.user.userId,
      this.req.user.organizationId || '',
      this.req.user.role,
      this.getUserPatientIds()
    );
  }

  /**
   * Set emergency access context
   */
  public async setEmergencyContext(
    patientId: string,
    emergencyAccessId: string,
    accessType: 'medical_emergency' | 'technical_support' | 'data_recovery' | 'audit_investigation'
  ): Promise<void> {
    if (!this.req.user) {
      throw new Error('No authenticated user available for emergency encryption context');
    }

    this.context = {
      patientId,
      requesterId: this.req.user.userId,
      accessLevel: AccessLevel.EMERGENCY_ACCESS,
      organizationId: this.req.user.organizationId || '',
      requesterRole: this.req.user.role,
      dataCategories: [DataCategory.EMERGENCY_CONTACTS, DataCategory.MEDICATION_DATA],
      emergencyContext: {
        accessType,
        reason: 'Emergency access granted',
        durationHours: 24,
        emergencyAccessId,
      },
      timestamp: new Date(),
    };

    // Generate emergency user secret key with emergency attributes
    const emergencyAttributes = [
      `user:${this.req.user.userId}`,
      `org:${this.req.user.organizationId}`,
      `role:${this.req.user.role}`,
      `emergency:active`,
      `patient:${patientId}`,
    ];

    const authority = this.abeCrypto.createOrganizationAuthority(
      this.req.user.organizationId || ''
    );
    this.userSecretKey = authority.generateUserSecretKey(this.req.user.userId, emergencyAttributes);
  }

  public getContext(): EncryptionContext | null {
    return this.context;
  }

  public getUserSecretKey(): UserSecretKey | null {
    return this.userSecretKey;
  }

  /**
   * Get patient IDs this user has access to
   */
  private getUserPatientIds(): string[] {
    // This would be populated from the user's caregiver assignments
    // For now, return empty array - this will be populated by the auth middleware
    return [];
  }

  /**
   * Clear encryption context
   */
  public clear(): void {
    this.context = null;
    this.userSecretKey = null;
  }
}

/**
 * Express middleware to set up encryption context
 */
export function createEncryptionContextMiddleware(abeCrypto: ABECrypto) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    // Create encryption context provider for this request
    req.encryptionContext = new RequestEncryptionContextProvider(req, abeCrypto);
    next();
  };
}
