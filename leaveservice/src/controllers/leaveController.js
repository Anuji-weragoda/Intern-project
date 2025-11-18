import * as leaveService from '../services/leaveService.js';
import userClient from '../utils/userClient.js';
import { trimStringsDeep } from '../utils/trim.js';

// ✅ Log helper (only prints in Lambda, avoids noise in tests)
const log = (...args) => {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) console.log('[LeaveController]', ...args);
  else console.log(...args);
};

export async function getLeaveBalance(req, res) {
  try {
    // Prefer authenticated user id when available; otherwise read from query and trim whitespace/newlines
    let user_id = (req.user && req.user.sub) ? req.user.sub : (req.query && req.query.user_id ? String(req.query.user_id).trim() : undefined);
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    log('Fetching leave balance for user_id:', user_id);

    const exists = await userClient.userExists(user_id).catch(() => true);
    if (!exists) {
      log('User not found:', user_id);
      return res.status(404).json({ error: 'User not found' });
    }

    const balances = await leaveService.getLeaveBalances(user_id);
    log('Leave balances fetched:', balances);

    return res.json({ user_id, balances });
  } catch (err) {
    log('❌ Error in getLeaveBalance:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function listLeaveRequests(req, res) {
  try {
    log('Listing leave requests with query:', req.query);
    const query = trimStringsDeep(req.query || {});
    const results = await leaveService.viewLeaveRequests(query);
    log('Leave requests fetched:', results?.length || 0);
    return res.json(results);
  } catch (err) {
    log('❌ Error in listLeaveRequests:', err);
    return res.status(400).json({ error: err.message });
  }
}

export async function createLeaveRequest(req, res) {
  try {
    // IMPORTANT: Don't deep-copy req.body immediately, log it first
    log('createLeaveRequest: RAW req.body type:', typeof req.body);
    log('createLeaveRequest: RAW req.body:', req.body);
    
    // Create a shallow copy to avoid mutating Express's req.body
    const payload = { ...req.body };
    
    // Set user_id from authenticated token
    if (req.user && req.user.sub) {
      payload.user_id = req.user.sub;
    }

    log('Creating leave request for user:', payload.user_id);
    log('Payload keys:', Object.keys(payload));
    log('start_date value:', payload.start_date, 'type:', typeof payload.start_date);
    log('end_date value:', payload.end_date, 'type:', typeof payload.end_date);
    log('policy_id value:', payload.policy_id, 'type:', typeof payload.policy_id);
    log('reason value:', payload.reason);

    // Validate required fields are present
    if (!payload.start_date || !payload.end_date) {
      log('❌ Missing date fields in payload');
      return res.status(400).json({ 
        error: 'start_date and end_date are required',
        received: { start_date: payload.start_date, end_date: payload.end_date }
      });
    }

    // Server-side validation: do not allow creating leave requests with a start_date in the past.
    try {
      const sd = payload.start_date || payload.startDate || null;
      if (sd) {
        const start = new Date(String(sd));
        // compute server-local start-of-day for today
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        const todayLocalStr = new Date(Date.now() - tzOffset).toISOString().slice(0,10);
        const todayStart = new Date(todayLocalStr + 'T00:00:00');
        if (start < todayStart) {
          return res.status(400).json({ error: 'start_date cannot be in the past' });
        }
      }
    } catch (e) {
      log('Warning: could not validate start_date for past check:', e.message);
    }

    const result = await leaveService.submitLeaveRequest(payload);
    log('✅ Leave request created successfully:', result.id);

    return res.status(201).json(result);
  } catch (err) {
    log('❌ Error in createLeaveRequest:', err);
    log('❌ Error stack:', err.stack);
    return res.status(400).json({ error: err.message });
  }
}

export async function patchLeaveRequest(req, res) {
  try {
    const id = req.params.id;
    const action = req.body?.action;
    log('Patch leave request:', { id, action });

    if (!action) return res.status(400).json({ error: 'action is required (approve|reject|cancel)' });

    if (action === 'approve') return await approveLeaveRequest(req, res);
    if (action === 'reject') return await rejectLeaveRequest(req, res);

    if (action === 'cancel') {
      const result = await leaveService.cancelLeaveRequest(id, req.body);
      log('Leave request cancelled:', id);
      return res.json(result);
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (err) {
    log('❌ Error in patchLeaveRequest:', err);
    return res.status(400).json({ error: err.message });
  }
}

// Backwards compatibility wrappers
export async function submitLeaveRequest(req, res) {
  return createLeaveRequest(req, res);
}

export async function approveLeaveRequest(req, res) {
  const id = req.params.id;
  try {
    const approver = req.user && req.user.sub;
    if (!approver) return res.status(401).json({ error: 'Unauthorized' });

    log('Approve leave request called by approver:', approver, 'for leave_id:', id);

    // Determine HR/admin privileges from ID token groups or token roles only.
    const tokenGroups = req.user['cognito:groups'] || req.user.groups || [];
    const normalizedGroups = Array.isArray(tokenGroups) ? tokenGroups.map(g => String(g).toLowerCase()) : [String(tokenGroups).toLowerCase()];
    const tokenRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    const normalizedRoles = Array.isArray(tokenRoles) ? tokenRoles.map(r => String(r).toLowerCase()) : [String(tokenRoles).toLowerCase()];

    const hasHr = normalizedGroups.includes('hr') || normalizedGroups.includes('admin') || normalizedRoles.includes('hr') || normalizedRoles.includes('admin');
    if (!hasHr) return res.status(403).json({ error: 'Forbidden: HR or ADMIN role required to approve leave' });

    const payload = Object.assign({}, req.body, { approver_id: approver });
    const result = await leaveService.approveLeaveRequest(id, payload);
    log('Leave approved successfully:', result);
    return res.json(result);
  } catch (err) {
    log('❌ Error in approveLeaveRequest:', err);
    if (err.message?.toLowerCase().startsWith('forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
}

export async function rejectLeaveRequest(req, res) {
  const id = req.params.id;
  try {
    const approver = req.user && req.user.sub;
    if (!approver) return res.status(401).json({ error: 'Unauthorized' });

    log('Reject leave request called by approver:', approver, 'for leave_id:', id);

    // Determine HR/admin privileges from ID token groups or token roles only.
    const tokenGroups = req.user['cognito:groups'] || req.user.groups || [];
    const normalizedGroups = Array.isArray(tokenGroups) ? tokenGroups.map(g => String(g).toLowerCase()) : [String(tokenGroups).toLowerCase()];
    const tokenRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    const normalizedRoles = Array.isArray(tokenRoles) ? tokenRoles.map(r => String(r).toLowerCase()) : [String(tokenRoles).toLowerCase()];

    const hasHr = normalizedGroups.includes('hr') || normalizedGroups.includes('admin') || normalizedRoles.includes('hr') || normalizedRoles.includes('admin');
    if (!hasHr) return res.status(403).json({ error: 'Forbidden: HR or ADMIN role required to reject leave' });

    const payload = Object.assign({}, req.body, { approver_id: approver });
    const result = await leaveService.rejectLeaveRequest(id, payload);
    log('Leave rejected successfully:', result);
    return res.json(result);
  } catch (err) {
    log('❌ Error in rejectLeaveRequest:', err);
    if (err.message?.toLowerCase().startsWith('forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
}

export async function viewLeaveRequests(req, res) {
  return listLeaveRequests(req, res);
}
