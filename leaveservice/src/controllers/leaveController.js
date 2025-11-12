import * as leaveService from '../services/leaveService.js';
import userClient from '../utils/userClient.js';

export async function getLeaveBalance(req, res) {
  try {
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const exists = await userClient.userExists(user_id).catch(() => true);
    if (!exists) return res.status(404).json({ error: 'User not found' });

    const balances = await leaveService.getLeaveBalances(user_id);
    return res.json({ user_id, balances });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listLeaveRequests(req, res) {
  try {
    const results = await leaveService.viewLeaveRequests(req.query);
    return res.json(results);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function createLeaveRequest(req, res) {
  try {
    const result = await leaveService.submitLeaveRequest(req.body);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function patchLeaveRequest(req, res) {
  try {
    const id = req.params.id;
    const action = req.body?.action;
    if (!action) return res.status(400).json({ error: 'action is required (approve|reject|cancel)' });

    if (action === 'approve') {
      const result = await leaveService.approveLeaveRequest(id, req.body);
      return res.json(result);
    }
    if (action === 'reject') {
      const result = await leaveService.rejectLeaveRequest(id, req.body);
      return res.json(result);
    }
    if (action === 'cancel') {
      const result = await leaveService.cancelLeaveRequest(id, req.body);
      return res.json(result);
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// Backwards-compatibility wrappers for legacy route imports
export async function submitLeaveRequest(req, res) {
  return createLeaveRequest(req, res);
}

export async function approveLeaveRequest(req, res) {
  // legacy callers pass (req, res) where id is req.params.id
  const id = req.params.id;
  const result = await leaveService.approveLeaveRequest(id, req.body);
  return res.json(result);
}

export async function rejectLeaveRequest(req, res) {
  const id = req.params.id;
  const result = await leaveService.rejectLeaveRequest(id, req.body);
  return res.json(result);
}

export async function viewLeaveRequests(req, res) {
  return listLeaveRequests(req, res);
}
