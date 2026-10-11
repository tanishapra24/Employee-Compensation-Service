import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * SQLite Database Manager
 * Wraps sqlite3 callback API with standard async/await Promises.
 * Adheres to Part C: connection string and DB configuration are read from environment variables.
 */
export class DatabaseManager {
  private db: sqlite3.Database;
  private isInitialized = false;

  constructor(dbPath?: string) {
    // Read from environment variable first, fallback to standard default or in-memory
    const targetPath =
      dbPath ||
      process.env.DATABASE_PATH ||
      process.env.SQL_CONNECTION_STRING ||
      path.resolve(process.cwd(), 'employee_service.db');

    this.db = new sqlite3.Database(targetPath, (err) => {
      if (err) {
        console.error(`Failed to connect to database at ${targetPath}:`, err.message);
      }
    });

    // Ensure SQLite enforces Foreign Key constraints
    this.db.run('PRAGMA foreign_keys = ON;');
  }

  /**
   * Initializes tables and seeds initial data if tables do not exist
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Check if Department table exists
    const tableExists = await this.get<{ count: number }>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='Department'"
    );

    if (!tableExists || tableExists.count === 0) {
      console.log('Initializing schema and seed data...');
      const possibleSchemaPaths = [
        path.resolve(process.cwd(), 'sql/schema.sql'),
        path.resolve(__dirname, '../../../sql/schema.sql'),
        path.resolve(__dirname, '../../sql/schema.sql'),
      ];
      const possibleSeedPaths = [
        path.resolve(process.cwd(), 'sql/seed.sql'),
        path.resolve(__dirname, '../../../sql/seed.sql'),
        path.resolve(__dirname, '../../sql/seed.sql'),
      ];

      const schemaPath = possibleSchemaPaths.find((p) => fs.existsSync(p));
      const seedPath = possibleSeedPaths.find((p) => fs.existsSync(p));

      if (schemaPath) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await this.exec(schemaSql);
      } else {
        throw new Error('Could not find sql/schema.sql file.');
      }

      if (seedPath) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await this.exec(seedSql);
      }
    }

    this.isInitialized = true;
  }

  public run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  public get<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: Error | null, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? (row as T) : null);
        }
      });
    });
  }

  public all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve((rows || []) as T[]);
        }
      });
    });
  }

  public exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Singleton database instance for functions runtime
let defaultDbInstance: DatabaseManager | null = null;

export function getDatabase(): DatabaseManager {
  if (!defaultDbInstance) {
    defaultDbInstance = new DatabaseManager();
  }
  return defaultDbInstance;
}
