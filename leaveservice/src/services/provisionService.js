import { sequelize, LeavePolicy } from '../models/index.js';

// Idempotent provisioning: ensure leave balances exist for a single user across all policies
export async function ensureBalancesForUser(userId) {
  if (!userId) throw new Error('userId is required');
  const year = new Date().getFullYear();
  const policies = await LeavePolicy.findAll();
  if (!policies || policies.length === 0) return 0;

  let created = 0;
  // Use a transaction and raw INSERT ... ON CONFLICT DO NOTHING for speed and idempotency
  await sequelize.transaction(async (t) => {
    for (const p of policies) {
      const alloc = p.max_days_per_year || 0;
      const sql = `INSERT INTO leave_balances (user_id, policy_id, total_allocated, total_used, year)
        VALUES (:user_id, :policy_id, :alloc, 0, :year)
        ON CONFLICT (user_id, policy_id, year) DO NOTHING`;
      const [res] = await sequelize.query(sql, { replacements: { user_id: userId, policy_id: p.id, alloc, year }, transaction: t });
      // Note: sequelize returns varying results depending on dialect; we conservatively increment when no error
      // We can't reliably detect whether the insert created a row without selecting again; keep created as best-effort count
      created += 1; // best-effort increment (informational)
    }
  });

  return created;
}

export default { ensureBalancesForUser };
