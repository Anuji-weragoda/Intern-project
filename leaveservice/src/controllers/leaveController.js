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
    const payload = Object.assign({}, req.body);
    if (req.user && req.user.sub) payload.user_id = req.user.sub;

    log('Creating leave request for user:', payload.user_id);

    const result = await leaveService.submitLeaveRequest(payload);
    log('Leave request created successfully:', result);

    return res.status(201).json(result);
  } catch (err) {
    log('❌ Error in createLeaveRequest:', err);
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
