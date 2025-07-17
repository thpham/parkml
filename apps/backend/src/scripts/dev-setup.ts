#!/usr/bin/env node

/**
 * Development setup script
 * Automatically initializes database with schema, migrations, and seed data
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const dbPath = join(__dirname, '../../parkml.db');
const migrationsPath = join(__dirname, '../../prisma/migrations');

function runCommand(command: string, description: string) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error);
    process.exit(1);
  }
}

async function setupDatabase() {
  console.log('🚀 Setting up development database...\n');

  const dbExists = existsSync(dbPath);
  const migrationsExist = existsSync(migrationsPath);

  if (!dbExists) {
    console.log('📊 Database does not exist, creating fresh database...');
    
    // Generate Prisma client
    runCommand('npx prisma generate', 'Generating Prisma client');
    
    // Create database and apply migrations
    runCommand('npx prisma migrate dev --name init', 'Creating database and applying migrations');
    
    // Seed the database
    runCommand('npm run db:seed', 'Seeding database with initial data');
    
  } else if (migrationsExist) {
    console.log('📊 Database exists, checking for schema changes...');
    
    // Generate Prisma client
    runCommand('npx prisma generate', 'Generating Prisma client');
    
    // Check if migrations need to be applied
    try {
      execSync('npx prisma migrate status', { stdio: 'pipe' });
      console.log('✅ Database is up to date with migrations\n');
    } catch (error) {
      console.log('🔄 Database schema drift detected, resetting...');
      runCommand('npx prisma migrate reset --force', 'Resetting database to sync with migrations');
    }
    
    // Check if we need to seed (if no users exist)
    try {
      const { prisma } = await import('../database/prisma-client');
      const userCount = await prisma.user.count();
      
      if (userCount === 0) {
        console.log('🌱 No users found, seeding database...');
        runCommand('npm run db:seed', 'Seeding database with initial data');
      } else {
        console.log(`✅ Database already has ${userCount} users, skipping seed\n`);
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.log('🌱 Seeding database to ensure data is present...');
      runCommand('npm run db:seed', 'Seeding database with initial data');
    }
    
  } else {
    console.log('📊 Database exists but no migrations found, resetting...');
    
    // Generate Prisma client
    runCommand('npx prisma generate', 'Generating Prisma client');
    
    // Reset and migrate
    runCommand('npx prisma migrate reset --force', 'Resetting database');
    runCommand('npx prisma migrate dev --name init', 'Creating initial migration');
    
    // Seed the database
    runCommand('npm run db:seed', 'Seeding database with initial data');
  }

  console.log('🎉 Development database setup complete!\n');
  console.log('📋 Available test accounts:');
  console.log('   👨‍⚕️ Healthcare Provider: admin@parkml.org / admin123');
  console.log('   🤒 Patient: patient@parkml.org / patient123');
  console.log('   👨‍👩‍👧‍👦 Caregiver: caregiver@parkml.org / caregiver123\n');
}

if (require.main === module) {
  setupDatabase().catch(console.error);
}

export { setupDatabase };