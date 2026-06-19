import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';
import { setContext } from '../utils/requestContext.js';

/**
 * Verifies the JWT from the Authorization header and attaches the user to req.user.
 * Expected header: Authorization: Bearer <token>
 */
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      return sendError(res, { message: 'Not authenticated. Token missing.', statusCode: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return sendError(res, { message: 'Invalid or expired token.', statusCode: 401 });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return sendError(res, { message: 'User no longer exists.', statusCode: 401 });
    }
    if (user.status !== 'active') {
      return sendError(res, { message: 'Account is inactive. Contact admin.', statusCode: 403 });
    }

    req.user = user;

    // Resolve the active branch for this request.
    // Priority: X-Branch-Id header (branch switcher) -> user's activeBranchId -> first assigned branch.
    // Special value 'all' = view data across branches (no single active branch).
    const headerBranch = req.headers['x-branch-id'];
    const assigned = (user.branches || []).map((b) => String(b));

    let active = null;
    let branchScope; // when set (array), list queries are limited to these branches

    if (headerBranch === 'all') {
      // "All Branches" mode: no single active branch (creates are blocked).
      // Admins see every branch; other users are limited to their assigned branches.
      active = null;
      if (user.role !== 'admin' && assigned.length) branchScope = assigned;
    } else {
      if (headerBranch) {
        // Admins may select any branch; others must have it assigned.
        if (user.role === 'admin' || assigned.includes(String(headerBranch))) {
          active = String(headerBranch);
        }
      }
      if (!active && user.activeBranchId) active = String(user.activeBranchId);
      // Fall back to the first assigned branch (admins included) so creates always
      // have a branch to stamp. Admin with NO assigned branches stays null (sees all).
      if (!active && assigned.length) active = assigned[0];
    }

    req.activeBranchId = active; // null in "all" mode (or admin with no branches)
    req.branchScope = branchScope;

    // Populate the audit context so every model write records who & which branch,
    // and so list queries can be limited to the user's branches in "all" mode.
    setContext({ userId: user._id, branchId: active || undefined, branchScope });
    next();
  } catch (err) {
    return sendError(res, { message: 'Authentication failed.', error: { detail: err.message }, statusCode: 401 });
  }
};

export default protect;
