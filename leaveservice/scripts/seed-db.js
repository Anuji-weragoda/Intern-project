#!/usr/bin/env node
/**
 * Idempotent DB seeding script for leave_service_db.
 * Inserts minimal data into leave_policies, leave_balances, leave_requests, attendance_logs
 * Only inserts rows if matching keys do not already exist.
 */
import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 } from 'uuid';
import { sequelize, LeavePolicy, LeaveBalance, LeaveRequest, LeaveAudit, AttendanceLog } from '../src/models/index.js';

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // Seed leave policies
    const policies = [
      { policy_name: 'Annual Leave', leave_type: 'annual', max_days_per_year: 21, carry_forward: true, description: 'Standard annual leave' },
      { policy_name: 'Sick Leave', leave_type: 'sick', max_days_per_year: 14, carry_forward: false, description: 'Sick leave' },
      { policy_name: 'Casual Leave', leave_type: 'casual', max_days_per_year: 7, carry_forward: false, description: 'Short-term casual leave' },
      { policy_name: 'No Pay Leave', leave_type: 'no_pay', max_days_per_year: 0, carry_forward: false, description: 'Unpaid leave (no allocation)' },
    ];

    for (const p of policies) {
      const [row, created] = await LeavePolicy.findOrCreate({ where: { policy_name: p.policy_name }, defaults: p });
      console.log(`Policy ${row.policy_name} ${created ? 'created' : 'exists'}`);
    }

    // Seed a sample user balances (for current year)
    const sampleUserId = process.env.SEED_USER_ID || uuidv4();
    const year = new Date().getFullYear();

    const allPolicies = await LeavePolicy.findAll();
    for (const pol of allPolicies) {
      const [bal, created] = await LeaveBalance.findOrCreate({
        where: { user_id: sampleUserId, policy_id: pol.id, year },
        defaults: { user_id: sampleUserId, policy_id: pol.id, total_allocated: pol.max_days_per_year, total_used: 0, year }
      });
      console.log(`Balance for user ${sampleUserId} policy ${pol.policy_name} ${created ? 'created' : 'exists'}`);
    }

    // Seed a pending leave request sample (if not exists)
    const [existingReq] = await LeaveRequest.findAll({ where: { user_id: sampleUserId }, limit: 1 });
    if (!existingReq) {
      const samplePolicy = allPolicies[0];
      const req = await LeaveRequest.create({
        user_id: sampleUserId,
        policy_id: samplePolicy.id,
        start_date: new Date().toISOString().slice(0,10),
        end_date: new Date(Date.now() + 3*24*3600*1000).toISOString().slice(0,10),
        reason: 'Seeded request',
        status: 'pending'
      });
      console.log(`Seeded leave request id=${req.id}`);
    } else {
      console.log('Leave request already exists for sample user');
    }

    // Seed an attendance log for sample user if none exists
    const attExists = await AttendanceLog.findOne({ where: { user_id: sampleUserId } });
    if (!attExists) {
      const now = new Date();
      const clockOut = new Date(now.getTime() + 8*3600*1000);
      const att = await AttendanceLog.create({ user_id: sampleUserId, clock_in: now, clock_out: clockOut, method: 'seed' });
      console.log(`Seeded attendance id=${att.id}`);
    } else {
      console.log('Attendance exists for sample user');
    }

    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  }
}

seed();
