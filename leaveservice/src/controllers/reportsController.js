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
