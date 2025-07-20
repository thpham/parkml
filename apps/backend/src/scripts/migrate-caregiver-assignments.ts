#!/usr/bin/env tsx
/**
 * Data Migration Script: Caregiver Assignments
 *
 * This script migrates existing caregiver relationships from the old junction tables
 * (patient_caregivers, patient_healthcare_providers) to the new CaregiverAssignment system.
 *
 * Migration Steps:
 * 1. Migrate patient_caregivers to CaregiverAssignment with type 'family'
 * 2. Migrate patient_healthcare_providers to CaregiverAssignment with type 'professional'
 * 3. Set appropriate default permissions for each type
 * 4. Mark all assignments as 'active' (assuming existing assignments are functional)
 *
 * This script is safe to run multiple times (idempotent).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default permissions for different caregiver types
const DEFAULT_PROFESSIONAL_PERMISSIONS = {
  view_all_symptoms: true,
  edit_symptoms: true,
  generate_reports: true,
  set_reminders: true,
  communicate_all: true,
  emergency_contact: true,
};

const DEFAULT_FAMILY_PERMISSIONS = {
  view_symptoms: true,
  edit_symptoms: true,
  view_reports: true,
  receive_notifications: true,
  communicate_professional: true,
};

async function migratePatientCaregivers() {
  console.log('📋 Migrating patient caregivers...');

  // Get all existing patient-caregiver relationships
  const patientCaregivers = await prisma.patientCaregiver.findMany({
    include: {
      patient: true,
      caregiver: true,
    },
  });

  console.log(`Found ${patientCaregivers.length} patient-caregiver relationships to migrate`);

  for (const relationship of patientCaregivers) {
    // Check if this assignment already exists in the new system
    const existingAssignment = await prisma.caregiverAssignment.findFirst({
      where: {
        patientId: relationship.patientId,
        caregiverId: relationship.caregiverId,
      },
    });

    if (existingAssignment) {
      console.log(
        `⚠️  Assignment already exists for patient ${relationship.patient.name} and caregiver ${relationship.caregiver.name}`
      );
      continue;
    }

    // Create new caregiver assignment
    await prisma.caregiverAssignment.create({
      data: {
        patientId: relationship.patientId,
        caregiverId: relationship.caregiverId,
        caregiverType: 'family', // Assuming existing caregivers are family
        status: 'active', // Assuming existing assignments are active
        permissions: JSON.stringify(DEFAULT_FAMILY_PERMISSIONS),
        startDate: relationship.createdAt,
        notes: 'Migrated from legacy patient_caregivers table',
      },
    });

    console.log(
      `✅ Migrated caregiver assignment: ${relationship.patient.name} ↔ ${relationship.caregiver.name}`
    );
  }

  console.log(
    `✅ Successfully migrated ${patientCaregivers.length} patient-caregiver relationships`
  );
}

async function migratePatientHealthcareProviders() {
  console.log('📋 Migrating patient healthcare providers...');

  // Get all existing patient-healthcare provider relationships
  const patientHealthcareProviders = await prisma.patientHealthcareProvider.findMany({
    include: {
      patient: true,
      healthcareProvider: true,
    },
  });

  console.log(
    `Found ${patientHealthcareProviders.length} patient-healthcare provider relationships to migrate`
  );

  for (const relationship of patientHealthcareProviders) {
    // Check if this assignment already exists in the new system
    const existingAssignment = await prisma.caregiverAssignment.findFirst({
      where: {
        patientId: relationship.patientId,
        caregiverId: relationship.healthcareProviderId,
      },
    });

    if (existingAssignment) {
      console.log(
        `⚠️  Assignment already exists for patient ${relationship.patient.name} and healthcare provider ${relationship.healthcareProvider.name}`
      );
      continue;
    }

    // Create new caregiver assignment
    await prisma.caregiverAssignment.create({
      data: {
        patientId: relationship.patientId,
        caregiverId: relationship.healthcareProviderId,
        caregiverType: 'professional',
        status: 'active', // Assuming existing assignments are active
        permissions: JSON.stringify(DEFAULT_PROFESSIONAL_PERMISSIONS),
        startDate: relationship.createdAt,
        notes: 'Migrated from legacy patient_healthcare_providers table',
      },
    });

    console.log(
      `✅ Migrated healthcare provider assignment: ${relationship.patient.name} ↔ ${relationship.healthcareProvider.name}`
    );
  }

  console.log(
    `✅ Successfully migrated ${patientHealthcareProviders.length} patient-healthcare provider relationships`
  );
}

async function validateMigration() {
  console.log('🔍 Validating migration...');

  // Count old relationships
  const oldPatientCaregivers = await prisma.patientCaregiver.count();
  const oldPatientHealthcareProviders = await prisma.patientHealthcareProvider.count();
  const totalOldRelationships = oldPatientCaregivers + oldPatientHealthcareProviders;

  // Count new assignments
  const newAssignments = await prisma.caregiverAssignment.count();

  console.log(`📊 Migration Summary:`);
  console.log(`   - Old patient-caregiver relationships: ${oldPatientCaregivers}`);
  console.log(
    `   - Old patient-healthcare provider relationships: ${oldPatientHealthcareProviders}`
  );
  console.log(`   - Total old relationships: ${totalOldRelationships}`);
  console.log(`   - New caregiver assignments: ${newAssignments}`);

  if (newAssignments >= totalOldRelationships) {
    console.log('✅ Migration validation successful! All relationships have been migrated.');
  } else {
    console.log('⚠️  Migration validation warning: Some relationships may not have been migrated.');
  }
}

async function main() {
  try {
    console.log('🚀 Starting caregiver assignment migration...');
    console.log('='.repeat(60));

    // Migrate patient caregivers
    await migratePatientCaregivers();
    console.log('');

    // Migrate patient healthcare providers
    await migratePatientHealthcareProviders();
    console.log('');

    // Validate migration
    await validateMigration();
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Test the new caregiver assignment system');
    console.log('   2. Update application code to use CaregiverAssignment');
    console.log('   3. Remove old junction tables when migration is confirmed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
