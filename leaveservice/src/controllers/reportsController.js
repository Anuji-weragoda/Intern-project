import { LeaveRequest } from '../models/index.js';
import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

// Generate a simple HR summary: counts of leaves by status and total days in range
export async function leaveSummary(req, res) {
  try {
    const { range, team_id } = req.query;
    // range could be '2025-01-01,2025-12-31' or similar
    let whereSql = '';
    const replacements = {};
    if (range) {
      const [start, end] = range.split(',');
      if (start && end) {
        whereSql += " AND start_date >= :start AND end_date <= :end";
        replacements.start = start;
        replacements.end = end;
      }
    }
    if (team_id) {
      // This project doesn't have teams; placeholder filter if user->team relationship exists in auth DB
      whereSql += ' AND user_id IN (SELECT id FROM users WHERE team_id = :team_id)';
      replacements.team_id = team_id;
    }

    const sql = `SELECT status, COUNT(*) as count, SUM(EXTRACT(DAY FROM (end_date::timestamp - start_date::timestamp)) + 1) as total_days FROM leave_requests WHERE 1=1 ${whereSql} GROUP BY status`;
    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements });

    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Return per-user leave balances grouped by user
export async function userBalances(req, res) {
  try {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 500;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    // Pull balances joined with policy names
    const sql = `SELECT lb.user_id, lb.policy_id, lp.policy_name, lb.total_allocated, lb.total_used, lb.balance_days, lb.year
      FROM leave_balances lb
      LEFT JOIN leave_policies lp ON lp.id = lb.policy_id
      WHERE lb.year = :year
      ORDER BY lb.user_id, lb.policy_id
      LIMIT :limit OFFSET :offset`;

    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { year, limit, offset } });

    // Group by user_id
    const map = {};
    for (const r of rows) {
      const uid = String(r.user_id || '');
      if (!map[uid]) map[uid] = { user_id: uid, balances: [] };
      map[uid].balances.push({ policy_id: r.policy_id, policy_name: r.policy_name, total_allocated: r.total_allocated, total_used: r.total_used, balance_days: r.balance_days, year: r.year });
    }

    const result = Object.values(map);
    return res.json({ data: result, count: result.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Return raw rows from leave_balances table (no grouping) - useful for simple UI dumps
export async function rawLeaveBalances(req, res) {
  try {
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 2000) : 1000;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    // Note: the leave_balances table defines `updated_at` (no `created_at`),
    // so expose it as `created_at` for the UI to consume the timestamp column.
    const sql = `SELECT id, user_id, policy_id, total_allocated, total_used, balance_days, year, updated_at AS created_at FROM leave_balances ORDER BY id LIMIT :limit OFFSET :offset`;
    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { limit, offset } });
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
