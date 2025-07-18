/**
 * Multi-tier Access Control Engine
 * Implements fine-grained access control for medical data based on user roles,
 * patient relationships, and data categories
 */

import { prisma } from '../database/prisma-client';
import { 
  AccessLevel, 
  DataCategory, 
  EncryptionContext,
  AccessControlResult
} from '@parkml/shared';

/**
 * Access control matrix defining permissions for each role and data category
 */
const ACCESS_CONTROL_MATRIX: Record<string, Partial<Record<DataCategory, AccessLevel[]>>> = {
  // Patients have full access to their own data
  patient: {
    [DataCategory.DEMOGRAPHICS]: [AccessLevel.PATIENT_FULL],
    [DataCategory.MOTOR_SYMPTOMS]: [AccessLevel.PATIENT_FULL],
    [DataCategory.NON_MOTOR_SYMPTOMS]: [AccessLevel.PATIENT_FULL],
    [DataCategory.AUTONOMIC_SYMPTOMS]: [AccessLevel.PATIENT_FULL],
    [DataCategory.DAILY_ACTIVITIES]: [AccessLevel.PATIENT_FULL],
    [DataCategory.MEDICATION_DATA]: [AccessLevel.PATIENT_FULL],
    [DataCategory.EMERGENCY_CONTACTS]: [AccessLevel.PATIENT_FULL],
    [DataCategory.SAFETY_INCIDENTS]: [AccessLevel.PATIENT_FULL],
    [DataCategory.ENVIRONMENTAL_FACTORS]: [AccessLevel.PATIENT_FULL]
  },

  // Professional caregivers have comprehensive medical access
  professional_caregiver: {
    [DataCategory.DEMOGRAPHICS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.MOTOR_SYMPTOMS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.NON_MOTOR_SYMPTOMS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.AUTONOMIC_SYMPTOMS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.DAILY_ACTIVITIES]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.MEDICATION_DATA]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.EMERGENCY_CONTACTS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.SAFETY_INCIDENTS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.ENVIRONMENTAL_FACTORS]: [AccessLevel.CAREGIVER_PROFESSIONAL]
  },

  // Family caregivers have limited access excluding sensitive medical details
  family_caregiver: {
    [DataCategory.DEMOGRAPHICS]: [AccessLevel.CAREGIVER_FAMILY],
    [DataCategory.MOTOR_SYMPTOMS]: [AccessLevel.CAREGIVER_FAMILY],
    [DataCategory.NON_MOTOR_SYMPTOMS]: [AccessLevel.CAREGIVER_FAMILY],
    [DataCategory.DAILY_ACTIVITIES]: [AccessLevel.CAREGIVER_FAMILY],
    [DataCategory.EMERGENCY_CONTACTS]: [AccessLevel.CAREGIVER_FAMILY],
    [DataCategory.SAFETY_INCIDENTS]: [AccessLevel.CAREGIVER_FAMILY],
    [DataCategory.ENVIRONMENTAL_FACTORS]: [AccessLevel.CAREGIVER_FAMILY]
    // Note: Excluded AUTONOMIC_SYMPTOMS and MEDICATION_DATA for privacy
  },

  // Clinic admins have organizational oversight access
  clinic_admin: {
    [DataCategory.DEMOGRAPHICS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.MOTOR_SYMPTOMS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.NON_MOTOR_SYMPTOMS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.AUTONOMIC_SYMPTOMS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.DAILY_ACTIVITIES]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.MEDICATION_DATA]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.EMERGENCY_CONTACTS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.SAFETY_INCIDENTS]: [AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.ENVIRONMENTAL_FACTORS]: [AccessLevel.CAREGIVER_PROFESSIONAL]
  },

  // Super admins have system-wide access
  super_admin: {
    [DataCategory.DEMOGRAPHICS]: [AccessLevel.PATIENT_FULL, AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.MOTOR_SYMPTOMS]: [AccessLevel.PATIENT_FULL, AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.NON_MOTOR_SYMPTOMS]: [AccessLevel.PATIENT_FULL, AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.AUTONOMIC_SYMPTOMS]: [AccessLevel.PATIENT_FULL, AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.DAILY_ACTIVITIES]: [AccessLevel.PATIENT_FULL, AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.MEDICATION_DATA]: [AccessLevel.PATIENT_FULL, AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.EMERGENCY_CONTACTS]: [AccessLevel.PATIENT_FULL, AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.SAFETY_INCIDENTS]: [AccessLevel.PATIENT_FULL, AccessLevel.CAREGIVER_PROFESSIONAL],
    [DataCategory.ENVIRONMENTAL_FACTORS]: [AccessLevel.PATIENT_FULL, AccessLevel.CAREGIVER_PROFESSIONAL]
  }
};

/**
 * Emergency access levels for different emergency types
 */
const EMERGENCY_ACCESS_LEVELS: Record<string, AccessLevel> = {
  medical_emergency: AccessLevel.EMERGENCY_ACCESS,
  technical_support: AccessLevel.CAREGIVER_PROFESSIONAL,
  data_recovery: AccessLevel.CAREGIVER_PROFESSIONAL,
  audit_investigation: AccessLevel.CAREGIVER_PROFESSIONAL
};

/**
 * Access Control Engine
 * Evaluates access permissions based on context and relationships
 */
export class AccessControlEngine {
  /**
   * Evaluate access permissions for a given context
   */
  public async evaluateAccess(context: EncryptionContext): Promise<AccessControlResult> {
    try {
      // Check if this is the patient requesting their own data
      if (await this.isPatientAccessingOwnData(context)) {
        return this.grantFullPatientAccess(context);
      }

      // Check emergency access
      if (context.emergencyContext) {
        return await this.evaluateEmergencyAccess(context);
      }

      // Check caregiver assignments
      const caregiverAccess = await this.evaluateCaregiverAccess(context);
      if (caregiverAccess.granted) {
        return caregiverAccess;
      }

      // Check organizational access for admins
      const organizationalAccess = await this.evaluateOrganizationalAccess(context);
      if (organizationalAccess.granted) {
        return organizationalAccess;
      }

      // Default: Access denied
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'No valid access relationship found',
        encryptionKeys: []
      };

    } catch (error) {
      console.error('Access control evaluation error:', error);
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'Access control system error',
        encryptionKeys: []
      };
    }
  }

  /**
   * Check if patient is accessing their own data
   */
  private async isPatientAccessingOwnData(context: EncryptionContext): Promise<boolean> {
    if (context.requesterRole !== 'patient') {
      return false;
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: context.patientId,
        userId: context.requesterId
      }
    });

    return !!patient;
  }

  /**
   * Grant full patient access to their own data
   */
  private grantFullPatientAccess(context: EncryptionContext): AccessControlResult {
    return {
      granted: true,
      accessLevel: AccessLevel.PATIENT_FULL,
      accessibleCategories: context.dataCategories,
      encryptionKeys: [`patient_key_${context.requesterId}`],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  /**
   * Evaluate emergency access permissions
   */
  private async evaluateEmergencyAccess(context: EncryptionContext): Promise<AccessControlResult> {
    if (!context.emergencyContext) {
      return { granted: false, accessibleCategories: [], encryptionKeys: [] };
    }

    // Verify emergency access record exists and is active
    const emergencyAccess = await prisma.emergencyAccess.findUnique({
      where: { id: context.emergencyContext.emergencyAccessId }
    });

    if (!emergencyAccess || !emergencyAccess.isActive) {
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'Emergency access not found or inactive',
        encryptionKeys: []
      };
    }

    // Check if emergency access is still valid (not expired)
    if (emergencyAccess.endTime && emergencyAccess.endTime < new Date()) {
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'Emergency access has expired',
        encryptionKeys: []
      };
    }

    const accessLevel = EMERGENCY_ACCESS_LEVELS[context.emergencyContext.accessType];
    const accessibleCategories = this.getAccessibleCategories(
      context.requesterRole,
      context.dataCategories,
      accessLevel
    );

    return {
      granted: true,
      accessLevel,
      accessibleCategories,
      encryptionKeys: [`emergency_key_${emergencyAccess.id}`],
      expiresAt: emergencyAccess.endTime || new Date(Date.now() + context.emergencyContext.durationHours * 60 * 60 * 1000)
    };
  }

  /**
   * Evaluate caregiver access based on assignments
   */
  private async evaluateCaregiverAccess(context: EncryptionContext): Promise<AccessControlResult> {
    if (!['professional_caregiver', 'family_caregiver'].includes(context.requesterRole)) {
      return { granted: false, accessibleCategories: [], encryptionKeys: [] };
    }

    // Check for active caregiver assignment
    const assignment = await prisma.caregiverAssignment.findFirst({
      where: {
        patientId: context.patientId,
        caregiverId: context.requesterId,
        status: 'active',
        consentGiven: true,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } }
        ]
      }
    });

    if (!assignment) {
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'No active caregiver assignment found',
        encryptionKeys: []
      };
    }

    // Determine access level based on caregiver type
    const baseAccessLevel = assignment.caregiverType === 'professional' 
      ? AccessLevel.CAREGIVER_PROFESSIONAL 
      : AccessLevel.CAREGIVER_FAMILY;

    const accessibleCategories = this.getAccessibleCategories(
      context.requesterRole,
      context.dataCategories,
      baseAccessLevel
    );

    return {
      granted: true,
      accessLevel: baseAccessLevel,
      accessibleCategories,
      encryptionKeys: [`caregiver_key_${assignment.id}`],
      expiresAt: assignment.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
    };
  }

  /**
   * Evaluate organizational access for admins
   */
  private async evaluateOrganizationalAccess(context: EncryptionContext): Promise<AccessControlResult> {
    if (!['clinic_admin', 'super_admin'].includes(context.requesterRole)) {
      return { granted: false, accessibleCategories: [], encryptionKeys: [] };
    }

    // Verify user belongs to the same organization as the patient
    const patient = await prisma.patient.findUnique({
      where: { id: context.patientId },
      include: { user: true }
    });

    const requester = await prisma.user.findUnique({
      where: { id: context.requesterId }
    });

    if (!patient || !requester) {
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'Patient or requester not found',
        encryptionKeys: []
      };
    }

    // Super admins have cross-organizational access
    if (context.requesterRole === 'super_admin') {
      const accessibleCategories = this.getAccessibleCategories(
        context.requesterRole,
        context.dataCategories,
        AccessLevel.CAREGIVER_PROFESSIONAL
      );

      return {
        granted: true,
        accessLevel: AccessLevel.CAREGIVER_PROFESSIONAL,
        accessibleCategories,
        encryptionKeys: [`admin_key_${requester.organizationId}`],
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
      };
    }

    // Clinic admins need same organization
    if (requester.organizationId !== patient.organizationId) {
      return {
        granted: false,
        accessibleCategories: [],
        denialReason: 'Cross-organizational access not permitted',
        encryptionKeys: []
      };
    }

    const accessibleCategories = this.getAccessibleCategories(
      context.requesterRole,
      context.dataCategories,
      AccessLevel.CAREGIVER_PROFESSIONAL
    );

    return {
      granted: true,
      accessLevel: AccessLevel.CAREGIVER_PROFESSIONAL,
      accessibleCategories,
      encryptionKeys: [`org_admin_key_${requester.organizationId}`],
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
    };
  }

  /**
   * Determine accessible data categories based on role and access level
   */
  private getAccessibleCategories(
    userRole: string,
    requestedCategories: DataCategory[],
    grantedAccessLevel: AccessLevel
  ): DataCategory[] {
    const rolePermissions = ACCESS_CONTROL_MATRIX[userRole];
    if (!rolePermissions) {
      return [];
    }

    return requestedCategories.filter(category => {
      const allowedLevels = rolePermissions[category];
      return allowedLevels && allowedLevels.includes(grantedAccessLevel);
    });
  }

  /**
   * Check if user has proxy re-encryption delegation
   */
  public async hasProxyDelegation(
    patientUserId: string,
    caregiverUserId: string,
    dataCategories: DataCategory[]
  ): Promise<boolean> {
    const delegation = await prisma.proxyReEncryptionKey.findFirst({
      where: {
        delegatorId: patientUserId,
        delegateeId: caregiverUserId,
        isRevoked: false,
        validUntil: { gt: new Date() }
      }
    });

    if (!delegation) {
      return false;
    }

    const delegatedCategories: DataCategory[] = JSON.parse(delegation.dataCategories);
    return dataCategories.every(category => delegatedCategories.includes(category));
  }

  /**
   * Get encryption keys for a user
   */
  public async getEncryptionKeys(
    userId: string,
    organizationId: string,
    _accessLevel: AccessLevel
  ): Promise<string[]> {
    const keys = await prisma.encryptionKey.findMany({
      where: {
        userId,
        organizationId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    return keys.map(key => key.id);
  }

  /**
   * Create audit entry for access control decision
   */
  public async auditAccessDecision(
    context: EncryptionContext,
    result: AccessControlResult,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await prisma.cryptoAuditEntry.create({
      data: {
        operation: 'access_control_evaluation',
        userId: context.requesterId,
        patientId: context.patientId,
        organizationId: context.organizationId,
        dataCategories: JSON.stringify(context.dataCategories),
        accessLevel: result.accessLevel || 'denied',
        encryptionContext: JSON.stringify({
          requesterRole: context.requesterRole,
          accessLevel: context.accessLevel,
          granted: result.granted,
          denialReason: result.denialReason
        }),
        success: result.granted,
        errorMessage: result.denialReason,
        ipAddress,
        userAgent,
        cryptographicProof: this.generateAccessProof(context, result)
      }
    });
  }

  /**
   * Generate cryptographic proof for access control decision
   */
  private generateAccessProof(context: EncryptionContext, result: AccessControlResult): string {
    const proofData = {
      patientId: context.patientId,
      requesterId: context.requesterId,
      timestamp: context.timestamp,
      granted: result.granted,
      accessLevel: result.accessLevel
    };

    // In a real implementation, this would be a proper cryptographic signature
    return Buffer.from(JSON.stringify(proofData)).toString('base64');
  }
}

// Export singleton instance
export const accessControlEngine = new AccessControlEngine();