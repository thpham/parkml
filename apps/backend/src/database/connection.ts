import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseResult {
  rows: any[];
  rowCount: number;
}

export interface DatabaseConnection {
  query(text: string, params?: any[]): Promise<DatabaseResult>;
  close(): Promise<void>;
}

class PostgreSQLConnection implements DatabaseConnection {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'parkml',
      user: process.env.DB_USER || 'parkml_user',
      password: process.env.DB_PASSWORD || 'parkml_password',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query(text: string, params?: any[]): Promise<DatabaseResult> {
    const result = await this.pool.query(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class SQLiteConnection implements DatabaseConnection {
  private db: Database.Database;

  constructor() {
    const dbPath = process.env.SQLITE_PATH || join(process.cwd(), 'parkml.db');
    this.db = new Database(dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Initialize schema
    this.initializeSchema();
  }

  private initializeSchema(): void {
    try {
      const schemaPath = join(__dirname, 'sqlite-schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
    } catch (error) {
      console.error('Error initializing SQLite schema:', error);
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      try {
        // Convert PostgreSQL-style parameterized queries ($1, $2) to SQLite-style (?, ?)
        let sqliteQuery = text.replace(/\$(\d+)/g, '?');
        
        // Process parameters to handle JSON stringification
        const processedParams = params?.map(param => {
          if (typeof param === 'object' && param !== null && !(param instanceof Date)) {
            return JSON.stringify(param);
          }
          return param;
        }) || [];
        
        if (text.trim().toLowerCase().startsWith('select')) {
          // For SELECT queries
          const stmt = this.db.prepare(sqliteQuery);
          const rows = stmt.all(processedParams);
          
          // Parse JSON fields back to objects
          const processedRows = rows.map((row: any) => {
            const processedRow: any = { ...row };
            
            // Parse JSON fields
            const jsonFields = [
              'motor_symptoms', 'non_motor_symptoms', 'autonomic_symptoms',
              'daily_activities', 'environmental_factors', 'safety_incidents',
              'functional_changes', 'medication_effectiveness', 'caregiver_concerns'
            ];
            
            jsonFields.forEach(field => {
              if (processedRow[field] && typeof processedRow[field] === 'string') {
                try {
                  processedRow[field] = JSON.parse(processedRow[field]);
                } catch (e) {
                  // Keep as string if not valid JSON
                }
              }
            });
            
            return processedRow;
          });
          
          resolve({
            rows: processedRows,
            rowCount: processedRows.length,
          });
        } else {
          // For INSERT, UPDATE, DELETE queries
          const stmt = this.db.prepare(sqliteQuery);
          const result = stmt.run(processedParams);
          
          // Handle INSERT with RETURNING clause (convert to SQLite format)
          if (text.toLowerCase().includes('returning')) {
            // Extract the table name and get the inserted row by ID
            const tableMatch = text.match(/(?:insert into|update)\s+(\w+)/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              // Get the ID from the original params (first param is usually the ID)
              const insertedId = processedParams[0];
              const selectStmt = this.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
              const insertedRow = selectStmt.get(insertedId);
              
              if (insertedRow) {
                // Parse JSON fields in the returned row
                const jsonFields = [
                  'motor_symptoms', 'non_motor_symptoms', 'autonomic_symptoms',
                  'daily_activities', 'environmental_factors', 'safety_incidents',
                  'functional_changes', 'medication_effectiveness', 'caregiver_concerns'
                ];
                
                jsonFields.forEach(field => {
                  if ((insertedRow as any)[field] && typeof (insertedRow as any)[field] === 'string') {
                    try {
                      (insertedRow as any)[field] = JSON.parse((insertedRow as any)[field]);
                    } catch (e) {
                      // Keep as string if not valid JSON
                    }
                  }
                });
              }
              
              resolve({
                rows: insertedRow ? [insertedRow] : [],
                rowCount: result.changes,
              });
            } else {
              resolve({
                rows: [],
                rowCount: result.changes,
              });
            }
          } else {
            resolve({
              rows: [],
              rowCount: result.changes,
            });
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

// Database factory
export function createDatabaseConnection(): DatabaseConnection {
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  if (dbType === 'postgresql') {
    return new PostgreSQLConnection();
  } else {
    return new SQLiteConnection();
  }
}

// Export a singleton instance
export const db = createDatabaseConnection();