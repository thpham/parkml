import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if database is already seeded
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`ℹ️  Database already has ${existingUsers} users. Skipping seed.`);
    console.log('💡 Use `npm run db:reset` to reset the database and re-seed.\n');
    return;
  }

  // Create organizations first
  console.log('🏢 Creating organizations...');

  await prisma.organization.upsert({
    where: { id: 'default_org' },
    update: {},
    create: {
      id: 'default_org',
      name: 'ParkML Health System',
      description: 'Main healthcare organization for ParkML platform',
      address: '123 Healthcare Ave, Medical City, HC 12345',
      phone: '+1-555-HEALTH',
      email: 'admin@parkml.org',
      isActive: true,
    },
  });

  await prisma.organization.upsert({
    where: { id: 'neurology_clinic' },
    update: {},
    create: {
      id: 'neurology_clinic',
      name: 'Neurology Specialists Clinic',
      description: "Specialized clinic for neurological conditions including Parkinson's disease",
      address: '456 Neurology Blvd, Medical City, HC 12346',
      phone: '+1-555-NEURO',
      email: 'contact@neuroclinic.org',
      isActive: true,
    },
  });

  await prisma.organization.upsert({
    where: { id: 'home_health_care' },
    update: {},
    create: {
      id: 'home_health_care',
      name: 'Home Health Care Services',
      description: 'Comprehensive home healthcare services for chronic conditions',
      address: '789 Care Street, Medical City, HC 12347',
      phone: '+1-555-HOMECARE',
      email: 'info@homehealth.org',
      isActive: true,
    },
  });

  console.log('✅ Created/verified 3 organizations');

  // Create users with comprehensive roles
  console.log('👥 Creating users with comprehensive roles...');

  // Create Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@parkml.org',
      passwordHash: await bcrypt.hash('superadmin123', 12),
      name: 'Super Administrator',
      role: 'super_admin',
      organizationId: 'default_org',
      isActive: true,
    },
  });

  // Create Clinic Admin for default organization
  const clinicAdmin = await prisma.user.create({
    data: {
      email: 'admin@parkml.org',
      passwordHash: await bcrypt.hash('admin123', 12),
      name: 'Clinic Administrator',
      role: 'clinic_admin',
      organizationId: 'default_org',
      isActive: true,
    },
  });

  // Create Clinic Admin for neurology clinic
  const neurologyAdmin = await prisma.user.create({
    data: {
      email: 'admin@neuroclinic.org',
      passwordHash: await bcrypt.hash('neuro123', 12),
      name: 'Neurology Clinic Admin',
      role: 'clinic_admin',
      organizationId: 'neurology_clinic',
      isActive: true,
    },
  });

  // Create Professional Caregivers
  const professionalCaregiver1 = await prisma.user.create({
    data: {
      email: 'doctor@parkml.org',
      passwordHash: await bcrypt.hash('doctor123', 12),
      name: 'Dr. Sarah Johnson',
      role: 'professional_caregiver',
      organizationId: 'default_org',
      isActive: true,
    },
  });

  const professionalCaregiver2 = await prisma.user.create({
    data: {
      email: 'nurse@neuroclinic.org',
      passwordHash: await bcrypt.hash('nurse123', 12),
      name: 'Nurse Emily Rodriguez',
      role: 'professional_caregiver',
      organizationId: 'neurology_clinic',
      isActive: true,
    },
  });

  const professionalCaregiver3 = await prisma.user.create({
    data: {
      email: 'therapist@homehealth.org',
      passwordHash: await bcrypt.hash('therapist123', 12),
      name: 'Physical Therapist Mike Chen',
      role: 'professional_caregiver',
      organizationId: 'home_health_care',
      isActive: true,
    },
  });

  console.log('✅ Created professional caregivers');

  // Create Family Caregivers
  const familyCaregiver1 = await prisma.user.create({
    data: {
      email: 'spouse@parkml.org',
      passwordHash: await bcrypt.hash('spouse123', 12),
      name: 'Mary Johnson (Spouse)',
      role: 'family_caregiver',
      organizationId: 'default_org',
      isActive: true,
    },
  });

  const familyCaregiver2 = await prisma.user.create({
    data: {
      email: 'daughter@parkml.org',
      passwordHash: await bcrypt.hash('daughter123', 12),
      name: 'Lisa Miller (Daughter)',
      role: 'family_caregiver',
      organizationId: 'default_org',
      isActive: true,
    },
  });

  const familyCaregiver3 = await prisma.user.create({
    data: {
      email: 'son@neuroclinic.org',
      passwordHash: await bcrypt.hash('son123', 12),
      name: 'David Wilson (Son)',
      role: 'family_caregiver',
      organizationId: 'neurology_clinic',
      isActive: true,
    },
  });

  console.log('✅ Created family caregivers');

  // Create Patient Users
  const patientUser1 = await prisma.user.create({
    data: {
      email: 'patient1@parkml.org',
      passwordHash: await bcrypt.hash('patient123', 12),
      name: 'John Thompson',
      role: 'patient',
      organizationId: 'default_org',
      isActive: true,
    },
  });

  const patientUser2 = await prisma.user.create({
    data: {
      email: 'patient2@neuroclinic.org',
      passwordHash: await bcrypt.hash('patient123', 12),
      name: 'Robert Wilson',
      role: 'patient',
      organizationId: 'neurology_clinic',
      isActive: true,
    },
  });

  const patientUser3 = await prisma.user.create({
    data: {
      email: 'patient3@homehealth.org',
      passwordHash: await bcrypt.hash('patient123', 12),
      name: 'Patricia Davis',
      role: 'patient',
      organizationId: 'home_health_care',
      isActive: true,
    },
  });

  console.log('✅ Created patient users');

  // Create Patient Records
  const patient1 = await prisma.patient.create({
    data: {
      userId: patientUser1.id,
      organizationId: 'default_org',
      name: 'John Thompson',
      dateOfBirth: new Date('1955-03-15'),
      diagnosisDate: new Date('2018-08-20'),
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      userId: patientUser2.id,
      organizationId: 'neurology_clinic',
      name: 'Robert Wilson',
      dateOfBirth: new Date('1962-11-08'),
      diagnosisDate: new Date('2020-02-12'),
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      userId: patientUser3.id,
      organizationId: 'home_health_care',
      name: 'Patricia Davis',
      dateOfBirth: new Date('1958-07-22'),
      diagnosisDate: new Date('2019-05-10'),
    },
  });

  console.log('✅ Created patient records');

  // Create Caregiver Assignments
  console.log('🔗 Creating caregiver assignments...');

  // Patient 1 assignments
  await prisma.caregiverAssignment.create({
    data: {
      patientId: patient1.id,
      caregiverId: familyCaregiver1.id,
      assignedBy: clinicAdmin.id,
      caregiverType: 'family',
      status: 'active',
      permissions: JSON.stringify(DEFAULT_FAMILY_PERMISSIONS),
      startDate: new Date('2023-01-15'),
      consentGiven: true,
      consentDate: new Date('2023-01-15'),
      notes: 'Primary family caregiver - spouse',
    },
  });

  await prisma.caregiverAssignment.create({
    data: {
      patientId: patient1.id,
      caregiverId: professionalCaregiver1.id,
      assignedBy: clinicAdmin.id,
      caregiverType: 'professional',
      status: 'active',
      permissions: JSON.stringify(DEFAULT_PROFESSIONAL_PERMISSIONS),
      startDate: new Date('2023-01-10'),
      consentGiven: true,
      consentDate: new Date('2023-01-10'),
      notes: 'Primary care physician',
    },
  });

  // Patient 2 assignments
  await prisma.caregiverAssignment.create({
    data: {
      patientId: patient2.id,
      caregiverId: familyCaregiver3.id,
      assignedBy: neurologyAdmin.id,
      caregiverType: 'family',
      status: 'active',
      permissions: JSON.stringify(DEFAULT_FAMILY_PERMISSIONS),
      startDate: new Date('2023-02-01'),
      consentGiven: true,
      consentDate: new Date('2023-02-01'),
      notes: 'Adult child caregiver',
    },
  });

  await prisma.caregiverAssignment.create({
    data: {
      patientId: patient2.id,
      caregiverId: professionalCaregiver2.id,
      assignedBy: neurologyAdmin.id,
      caregiverType: 'professional',
      status: 'active',
      permissions: JSON.stringify(DEFAULT_PROFESSIONAL_PERMISSIONS),
      startDate: new Date('2023-02-01'),
      consentGiven: true,
      consentDate: new Date('2023-02-01'),
      notes: 'Neurology specialist nurse',
    },
  });

  // Patient 3 assignments
  await prisma.caregiverAssignment.create({
    data: {
      patientId: patient3.id,
      caregiverId: familyCaregiver2.id,
      assignedBy: superAdmin.id,
      caregiverType: 'family',
      status: 'pending',
      permissions: JSON.stringify(DEFAULT_FAMILY_PERMISSIONS),
      startDate: new Date('2023-03-01'),
      consentGiven: false,
      notes: 'Pending family caregiver assignment',
    },
  });

  await prisma.caregiverAssignment.create({
    data: {
      patientId: patient3.id,
      caregiverId: professionalCaregiver3.id,
      assignedBy: superAdmin.id,
      caregiverType: 'professional',
      status: 'active',
      permissions: JSON.stringify(DEFAULT_PROFESSIONAL_PERMISSIONS),
      startDate: new Date('2023-03-01'),
      consentGiven: true,
      consentDate: new Date('2023-03-01'),
      notes: 'Home health physical therapist',
    },
  });

  console.log('✅ Created caregiver assignments');

  // Create Emergency Access Records
  console.log('🚨 Creating emergency access records...');

  // Active emergency access
  await prisma.emergencyAccess.create({
    data: {
      patientId: patient1.id,
      userId: professionalCaregiver1.id,
      accessType: 'medical_emergency',
      reason:
        'Patient experienced severe symptoms and required immediate data access for treatment',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      isActive: true,
    },
  });

  // Expired emergency access
  await prisma.emergencyAccess.create({
    data: {
      patientId: patient2.id,
      userId: professionalCaregiver2.id,
      accessType: 'technical_support',
      reason: 'System malfunction requiring data recovery for patient care continuity',
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      endTime: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20 hours ago
      isActive: false,
    },
  });

  // Future emergency access
  await prisma.emergencyAccess.create({
    data: {
      patientId: patient3.id,
      userId: superAdmin.id,
      accessType: 'audit_investigation',
      reason: 'Scheduled audit investigation for compliance verification',
      startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      endTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      isActive: true,
    },
  });

  console.log('✅ Created emergency access records');

  console.log('🎉 Database seed completed!\n');

  // Show test credentials
  console.log('📋 Test accounts created:');
  console.log('');
  console.log('🔐 ADMINISTRATIVE ACCOUNTS:');
  console.log('   🌟 Super Admin: superadmin@parkml.org / superadmin123');
  console.log('   👨‍⚕️ Clinic Admin (Default): admin@parkml.org / admin123');
  console.log('   🧠 Clinic Admin (Neurology): admin@neuroclinic.org / neuro123');
  console.log('');
  console.log('👩‍⚕️ PROFESSIONAL CAREGIVERS:');
  console.log('   👨‍⚕️ Doctor: doctor@parkml.org / doctor123');
  console.log('   👩‍⚕️ Nurse: nurse@neuroclinic.org / nurse123');
  console.log('   🏃‍♂️ Therapist: therapist@homehealth.org / therapist123');
  console.log('');
  console.log('👨‍👩‍👧‍👦 FAMILY CAREGIVERS:');
  console.log('   👫 Spouse: spouse@parkml.org / spouse123');
  console.log('   👧 Daughter: daughter@parkml.org / daughter123');
  console.log('   👨 Son: son@neuroclinic.org / son123');
  console.log('');
  console.log('🤒 PATIENTS:');
  console.log('   🤒 Patient 1: patient1@parkml.org / patient123');
  console.log('   🤒 Patient 2: patient2@neuroclinic.org / patient123');
  console.log('   🤒 Patient 3: patient3@homehealth.org / patient123');
  console.log('');
  console.log('🏢 ORGANIZATIONS:');
  console.log('   🏥 ParkML Health System (default_org)');
  console.log('   🧠 Neurology Specialists Clinic (neurology_clinic)');
  console.log('   🏠 Home Health Care Services (home_health_care)');
  console.log('');
  console.log('📊 DATABASE STATISTICS:');
  console.log(
    '   👥 Users: 12 (1 super admin, 2 clinic admins, 3 professionals, 3 family, 3 patients)'
  );
  console.log('   🏢 Organizations: 3');
  console.log('   🤒 Patients: 3');
  console.log('   🔗 Caregiver Assignments: 6 (5 active, 1 pending)');
  console.log('   🚨 Emergency Access Records: 3 (2 active, 1 expired)');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
