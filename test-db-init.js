#!/usr/bin/env node

const { initializeDatabase } = require('./lib/db.js');

try {
  console.log('Testing database initialization...');
  initializeDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}
