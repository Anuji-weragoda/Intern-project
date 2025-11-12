import { LeaveRequest, LeaveAudit } from '../models/index.js';

// Queue calendar block synchronization for approved leave requests.
export async function msgraphSync(req, res) {
  try {
    // For now, accept optional user_id or range in body and enqueue a sync job (placeholder)
    const { user_id } = req.body || {};
    // simple placeholder: find approved requests (optionally for user)
    const where = { status: 'approved' };
    if (user_id) where.user_id = user_id;

    const requests = await LeaveRequest.findAll({ where });

    // create audit entry to indicate a sync was requested
    await LeaveAudit.create({ action: 'msgraph_sync_requested', details: { count: requests.length, user_id } });

    return res.status(202).json({ message: 'Sync queued', count: requests.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
