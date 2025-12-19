import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = process.env.DATABASE_NAME || 'taskmanager.db';

export const db = SQLite.openDatabaseSync(DATABASE_NAME);

export function initializeDatabase(): void {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        lastUpdatedAt INTEGER NOT NULL,
        serverLastUpdatedAt INTEGER,
        syncStatus TEXT DEFAULT 'synced',
        locallyCreated INTEGER DEFAULT 0,
        locallyModified INTEGER DEFAULT 0,
        locallyDeleted INTEGER DEFAULT 0
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function destroyDatabase(): void {
  try {
    db.execSync(`DROP TABLE IF EXISTS tasks`);
    console.log('Local database destroyed on signout');
  } catch (error) {
    console.error('Error destroying database:', error);
    throw error;
  }
}
