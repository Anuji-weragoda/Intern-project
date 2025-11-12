#!/usr/bin/env node
// Run a single SQL migration file passed as argument
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const file = process.argv[2];
if (!file) {
  console.error('Usage: node run-specific-migration.js <path-to-sql-file>');
  process.exit(1);
}

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'leave_service_db',
  });
  try {
    await client.connect();
    const sql = fs.readFileSync(path.resolve(file), 'utf8');
    await client.query(sql);
    console.log('Applied migration', file);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to apply migration', err.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

run();
