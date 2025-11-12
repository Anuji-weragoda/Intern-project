#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();
import { LeavePolicy, LeaveBalance } from '../src/models/index.js';

async function main() {
  const userId = process.env.USER_ID || process.argv[2];
  const policyId = process.env.POLICY_ID || process.argv[3] || 1;
  const year = process.env.YEAR || new Date().getFullYear();
  if (!userId) {
    console.error('Usage: USER_ID=<id> node scripts/create-balance.js [userId] [policyId]');
    process.exit(1);
  }

  const pol = await LeavePolicy.findByPk(policyId);
  const alloc = pol ? (pol.max_days_per_year || 0) : 0;
  const [bal, created] = await LeaveBalance.findOrCreate({
    where: { user_id: userId, policy_id: policyId, year },
    defaults: { user_id: userId, policy_id: policyId, total_allocated: alloc, total_used: 0, year }
  });
  if (created) console.log('Created balance for', userId, 'policy', policyId, 'alloc', alloc);
  else console.log('Balance already exists for', userId, 'policy', policyId);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
