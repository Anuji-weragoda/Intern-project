#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import http from 'http';

const projectPath = 'c:\\Users\\AnujiWeragoda\\git\\staff-management-system\\Intern-project\\admin_frontend';

async function waitForServer(timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:5180/', (res) => {
          res.resume();
          resolve(res.statusCode < 500);
        });
        req.on('error', reject);
        req.setTimeout(1000);
      });
      console.log('✅ Server is ready!');
      return true;
    } catch (e) {
      await delay(500);
    }
  }
  return false;
}

async function run() {
  console.log('🚀 Starting server...');
  const server = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--port', '5180', '--strictPort', '--host', '0.0.0.0'], {
    cwd: projectPath,
    stdio: 'inherit',
  });

  console.log('⏳ Waiting for server to be ready...');
  const ready = await waitForServer();

  if (!ready) {
    console.error('❌ Server did not start in time');
    server.kill();
    process.exit(1);
  }

  console.log('🌐 Starting test...');
  const test = spawn('node', ['e2e/selenium_tests/loginTest.js'], {
    cwd: projectPath,
    stdio: 'inherit',
    env: {
      ...process.env,
      LOGIN_EMAIL: 'anujinishaweragoda1234@gmail.com',
      LOGIN_PASSWORD: 'iHuyntj9P4ZTYR2@@@@',
      BASE_URL: 'http://localhost:5180',
      HEADLESS: 'false',
      KEEP_BROWSER_OPEN: 'true',
    },
  });

  test.on('exit', (code) => {
    console.log(`✅ Test completed with code ${code}`);
    server.kill();
    process.exit(code || 0);
  });
}

run().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
