#!/usr/bin/env node
// One-off script to initialize leave balances for all users using policies defaults.
// Requires AUTH_SERVICE_URL + AUTH_CLIENT_ID + AUTH_CLIENT_SECRET set in env to fetch users.

import dotenv from 'dotenv';
dotenv.config();

import { sequelize, LeavePolicy, LeaveBalance } from '../src/models/index.js';
import userClient from '../src/utils/userClient.js';

async function main() {
  console.log('Initializing leave balances for all users...');
  const users = await userClient.listUsersFromService();
  if (!users || users.length === 0) {
    console.error('No users returned from authservice. Check AUTH_SERVICE_URL and client credentials.');
    process.exit(1);
  }

  const policies = await LeavePolicy.findAll();
  if (!policies || policies.length === 0) {
    console.error('No leave policies found. Ensure leave_policies table is populated.');
    process.exit(1);
  }

  const year = new Date().getFullYear();
  let created = 0;
  await sequelize.transaction(async (t) => {
    for (const u of users) {
      const userId = u.id || u.user_id || u.sub || u.username;
      if (!userId) continue;
      for (const p of policies) {
        const [bal, wasCreated] = await LeaveBalance.findOrCreate({
          where: { user_id: userId, policy_id: p.id, year },
          defaults: { user_id: userId, policy_id: p.id, total_allocated: p.max_days_per_year || 0, total_used: 0, year },
          transaction: t
        });
        if (wasCreated) created += 1;
      }
    }
  });

  console.log(`Initialization complete. Created ${created} new leave balances.`);
  process.exit(0);
}

main().catch(err => { console.error('Error initializing balances:', err); process.exit(1); });
