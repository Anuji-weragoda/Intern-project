#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { getLeaveBalances } from '../src/services/leaveService.js';

async function main() {
  const userId = process.argv[2] || process.env.USER_ID;
  if (!userId) {
    console.error('Usage: node scripts/show-balances.js <userId>');
    process.exit(1);
  }
  try {
    const balances = await getLeaveBalances(userId);
    console.log('Balances for', userId, JSON.stringify(balances, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error fetching balances:', err.message);
    process.exit(1);
  }
}

main();
