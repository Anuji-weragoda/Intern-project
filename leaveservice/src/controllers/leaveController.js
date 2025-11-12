import * as leaveService from '../services/leaveService.js';
import userClient from '../utils/userClient.js';

export async function getLeaveBalance(req, res) {
  try {
    // Prefer authenticated user id (sub) when present
    let user_id = req.query.user_id;
    if (req.user && req.user.sub) user_id = req.user.sub;
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
    // Prefer the token's subject as the user_id when authenticated
    // If authenticated, prefer the token's subject as the user_id
    const payload = Object.assign({}, req.body);
    if (req.user && req.user.sub) payload.user_id = req.user.sub;

    const result = await leaveService.submitLeaveRequest(payload);
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
      // delegate to approve handler to enforce HR checks and approver_id override
      return await approveLeaveRequest(req, res);
    }
    if (action === 'reject') {
      // delegate to reject handler to enforce HR checks and approver_id override
      return await rejectLeaveRequest(req, res);
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
  try {
    const approver = req.user && req.user.sub;
    if (!approver) return res.status(401).json({ error: 'Unauthorized' });

    // First attempt: check token roles (some tokens may include roles directly)
    const tokenRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    let hasHr = Array.isArray(tokenRoles) && tokenRoles.includes('hr');

    // Also check Cognito groups if present (tokens sometimes carry `cognito:groups`).
    // If the token has a top-level admin group, we will consult the local user DB to see
    // whether this admin user also has an 'hr' role assigned locally (useful when groups
    // are generic like ADMIN but fine-grained roles are stored in authservice DB).
    const tokenGroups = req.user['cognito:groups'] || req.user['cognito_groups'] || req.user.groups || [];
    const hasAdminGroup = Array.isArray(tokenGroups) && tokenGroups.some(g => String(g).toLowerCase() === 'admin');

    // If token doesn't include hr directly, and we detected an admin group, fall back to
    // fetching the user from the authservice DB and check the stored roles for 'hr'.
    if (!hasHr && hasAdminGroup) {
      const user = await userClient.getUser(approver).catch(() => null);
      const userRoles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
      hasHr = Array.isArray(userRoles) && userRoles.includes('hr');
    }

    // If token had no admin group either, perform the existing fallback: check local DB when token roles absent
    if (!hasHr && (!Array.isArray(tokenRoles) || tokenRoles.length === 0) && !hasAdminGroup) {
      const user = await userClient.getUser(approver).catch(() => null);
      const userRoles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
      hasHr = Array.isArray(userRoles) && userRoles.includes('hr');
    }

    if (!hasHr) return res.status(403).json({ error: 'Forbidden: HR role required to approve leave' });

    // Force approver_id to the authenticated subject to prevent spoofing
    const payload = Object.assign({}, req.body, { approver_id: approver });
    const result = await leaveService.approveLeaveRequest(id, payload);
    return res.json(result);
  } catch (err) {
    // Map service-level 'Forbidden:' errors to 403 so clients get proper semantics
    if (err && err.message && String(err.message).toLowerCase().startsWith('forbidden')) {
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

    const tokenRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    let hasHr = Array.isArray(tokenRoles) && tokenRoles.includes('hr');

    const tokenGroups = req.user['cognito:groups'] || req.user['cognito_groups'] || req.user.groups || [];
    const hasAdminGroup = Array.isArray(tokenGroups) && tokenGroups.some(g => String(g).toLowerCase() === 'admin');

    if (!hasHr && hasAdminGroup) {
      const user = await userClient.getUser(approver).catch(() => null);
      const userRoles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
      hasHr = Array.isArray(userRoles) && userRoles.includes('hr');
    }

    if (!hasHr && (!Array.isArray(tokenRoles) || tokenRoles.length === 0) && !hasAdminGroup) {
      const user = await userClient.getUser(approver).catch(() => null);
      const userRoles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
      hasHr = Array.isArray(userRoles) && userRoles.includes('hr');
    }

    if (!hasHr) return res.status(403).json({ error: 'Forbidden: HR role required to reject leave' });

    const payload = Object.assign({}, req.body, { approver_id: approver });
    const result = await leaveService.rejectLeaveRequest(id, payload);
    return res.json(result);
  } catch (err) {
    if (err && err.message && String(err.message).toLowerCase().startsWith('forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
}

export async function viewLeaveRequests(req, res) {
  return listLeaveRequests(req, res);
}
