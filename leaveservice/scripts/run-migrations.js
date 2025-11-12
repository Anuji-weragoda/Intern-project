#!/usr/bin/env node
// Simple migration runner: executes SQL files in migrations/ against the configured Postgres DB
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

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
    console.log('Connected to DB');

    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      console.log('Running migration:', file);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log('Applied', file);
    }

    console.log('All migrations applied');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

run();
