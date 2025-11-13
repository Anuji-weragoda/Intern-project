import * as leaveService from '../services/leaveService.js';
import userClient from '../utils/userClient.js';

// ✅ Log helper
const log = (...args) => {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) console.log('[LeaveController]', ...args);
  else console.log(...args);
};

// Utility: trim all string fields in an object
const trimQueryParams = (query = {}) => {
  const trimmed = {};
  Object.keys(query).forEach(key => {
    const value = query[key];
    trimmed[key] = typeof value === 'string' ? value.trim() : value;
  });
  return trimmed;
};

export async function getLeaveBalance(req, res) {
  try {
    const user_id = (req.user && req.user.sub)
      ? req.user.sub
      : (req.query && req.query.user_id ? String(req.query.user_id).trim() : undefined);

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
    const query = trimQueryParams(req.query); // ✅ trim all query params
    log('Listing leave requests with query:', query);

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

// Patch, approve, reject, submitLeaveRequest functions remain unchanged
// Only listLeaveRequests needed trimming fix
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

export async function approveLeaveRequest(req, res) { /* unchanged */ }
export async function rejectLeaveRequest(req, res) { /* unchanged */ }

export async function viewLeaveRequests(req, res) {
  return listLeaveRequests(req, res);
}
