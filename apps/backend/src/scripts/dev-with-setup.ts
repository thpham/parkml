#!/usr/bin/env node

/**
 * Development script with automatic database setup
 * Runs database setup and then starts the development server
 */

import { spawn } from 'child_process';
import { setupDatabase } from './dev-setup';

async function startDevelopment() {
  try {
    // Setup database first
    await setupDatabase();

    // Start the development server
    console.log('🚀 Starting development server...\n');

    const devProcess = spawn('tsx', ['watch', 'src/index.ts'], {
      stdio: 'inherit',
      env: process.env,
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down development server...');
      devProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down development server...');
      devProcess.kill('SIGTERM');
      process.exit(0);
    });

    devProcess.on('exit', code => {
      console.log(`\n📴 Development server exited with code ${code}`);
      process.exit(code || 0);
    });
  } catch (error) {
    console.error('❌ Development setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startDevelopment();
}
