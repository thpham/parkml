import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  
  // Check if database is already seeded
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`ℹ️  Database already has ${existingUsers} users. Skipping seed.`);
    console.log('💡 Use `npm run db:reset` to reset the database and re-seed.\n');
    return;
  }

  // Create default admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@parkml.org';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        name: adminName,
        role: 'clinic_admin',
        organizationId: 'default_org',
      },
    });

    console.log(`✅ Created admin user: ${admin.email}`);
  } else {
    console.log('👤 Admin user already exists');
  }

  // Create sample patient user for development
  if (process.env.NODE_ENV === 'development') {
    const patientEmail = 'patient@parkml.org';
    const patientPassword = 'patient123';
    
    const existingPatient = await prisma.user.findUnique({
      where: { email: patientEmail },
    });

    if (!existingPatient) {
      const hashedPassword = await bcrypt.hash(patientPassword, 12);
      
      const patientUser = await prisma.user.create({
        data: {
          email: patientEmail,
          passwordHash: hashedPassword,
          name: 'Test Patient',
          role: 'patient',
          organizationId: 'default_org',
        },
      });

      // Create patient record
      await prisma.patient.create({
        data: {
          userId: patientUser.id,
          organizationId: 'default_org',
          name: 'Test Patient',
          dateOfBirth: new Date('1960-01-01'),
          diagnosisDate: new Date('2020-01-01'),
        },
      });

      console.log(`✅ Created sample patient: ${patientUser.email}`);
    } else {
      console.log('👤 Sample patient already exists');
    }

    // Create sample caregiver
    const caregiverEmail = 'caregiver@parkml.org';
    const caregiverPassword = 'caregiver123';
    
    const existingCaregiver = await prisma.user.findUnique({
      where: { email: caregiverEmail },
    });

    if (!existingCaregiver) {
      const hashedPassword = await bcrypt.hash(caregiverPassword, 12);
      
      const caregiver = await prisma.user.create({
        data: {
          email: caregiverEmail,
          passwordHash: hashedPassword,
          name: 'Test Caregiver',
          role: 'family_caregiver',
          organizationId: 'default_org',
        },
      });

      console.log(`✅ Created sample caregiver: ${caregiver.email}`);
    } else {
      console.log('👤 Sample caregiver already exists');
    }
  }

  console.log('🎉 Database seed completed!\n');
  
  // Show test credentials
  console.log('📋 Test accounts created:');
  console.log('   👨‍⚕️ Clinic Admin: admin@parkml.org / admin123');
  console.log('   🤒 Patient: patient@parkml.org / patient123');
  console.log('   👨‍👩‍👧‍👦 Family Caregiver: caregiver@parkml.org / caregiver123\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });