import { sendError } from '../utils/apiResponse.js';

/**
 * Guard for branch-scoped data routes.
 *
 * On create requests (POST), a branch MUST be resolved, otherwise the new
 * record would be saved with branchId = null and become invisible to every
 * branch-scoped list (the "it saved but vanished" bug). We block it with a
 * clear, actionable error instead.
 *
 * Applies to POST only — reads/updates/deletes operate on existing records
 * that already carry a branch.
 *
 * Admins with no active branch selected are also required to choose one before
 * creating, since a null-branch record is ambiguous in a multi-branch system.
 */
export const requireBranchForCreate = (req, res, next) => {
  if (req.method !== 'POST') return next();

  if (!req.activeBranchId) {
    return sendError(res, {
      message:
        'No active branch selected. Please choose a branch (top-right switcher) before creating records.',
      statusCode: 400,
    });
  }
  next();
};

export default requireBranchForCreate;
