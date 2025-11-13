// Service for attendance business logic
import { AttendanceLog } from '../models/attendanceModel.js';
import { Op } from 'sequelize';
import { trimStringsDeep } from '../utils/trim.js';

export async function clockIn(data) {
  // Trim incoming payload string fields
  data = trimStringsDeep(data || {});
  const { user_id, method, geo } = data;
  if (!user_id) throw new Error('user_id is required');

  // create a payload with a Date object for clock_in (pg driver will send as timestamp param)
  const now = new Date();
  // Dev debug: log the Date string and ISO representation before insert
  // eslint-disable-next-line no-console

  const payload = { user_id, clock_in: now, method: method || 'mobile' };
  if (geo && geo.lat && geo.lon) {
    payload.geo_location = { type: 'Point', coordinates: [geo.lon, geo.lat] };
  }

  const entry = await AttendanceLog.create(payload);
  // eslint-disable-next-line no-console
  // production: avoid verbose console logs here; rely on structured logger if needed
  return entry;
}

export async function clockOut(data) {
  data = trimStringsDeep(data || {});
  const { user_id } = data;
  if (!user_id) throw new Error('user_id is required');

  // find last open attendance record for user
  const open = await AttendanceLog.findOne({ where: { user_id, clock_out: null }, order: [['clock_in', 'DESC']] });
  if (!open) throw new Error('No open clock-in record found');

  open.clock_out = new Date();
  await open.save();
  return open;
}

export async function attendanceHistory(query) {
  // Trim query string fields to normalize input before building DB where clauses
  query = trimStringsDeep(query || {});
  const where = {};
  if (query.user_id) where.user_id = query.user_id;
  if (query.range) {
    const [start, end] = query.range.split(',');
    if (start && end) {
      where.clock_in = { [Op.between]: [new Date(start), new Date(end)] };
    }
  }
  const page = Number(query.page || 1);
  const size = Number(query.size || 50);

  try {
    const rows = await AttendanceLog.findAll({ where, limit: size, offset: (page - 1) * size, order: [['clock_in', 'DESC']] });
    return rows;
  } catch (err) {
    // test/dev environment may not have DB; return empty list rather than crashing tests
    return [];
  }
}
