#!/usr/bin/env node

/**
 * Test script to verify database connection and schema setup
 * Run with: npm run test-db
 */

import { db } from './connection';

async function testDatabase() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    // Test basic connection
    const result = await db.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    console.log('Result:', result);
    
    // Test table creation
    const tables = await db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    console.log('\n📋 Database tables:');
    tables.rows.forEach((row: any) => {
      console.log(`  - ${row.name}`);
    });
    
    // Test user table structure
    const userColumns = await db.query(`PRAGMA table_info(users)`);
    console.log('\n👤 Users table structure:');
    userColumns.rows.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

testDatabase();