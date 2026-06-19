/**
 * Branch-scoping helpers.
 *
 * Rules:
 * - Admin with no active branch selected → sees ALL branches (no filter).
 * - Any user with an active branch → scoped to that branch.
 * - Non-admin users are always restricted to branches they are assigned to.
 *
 * Controllers pass `req` into these helpers; services receive the resolved
 * `branchId` (or null = no scoping) and merge it into queries / new documents.
 */

/**
 * Resolve the effective branch filter for a request.
 * @returns {{ branchId: string|null, scopeAll: boolean }}
 *   branchId: the single branch to scope to, or null when scopeAll is true.
 *   scopeAll: true when no branch filter should be applied (admin viewing all).
 */
export const resolveScope = (req) => {
  const user = req.user;
  const active = req.activeBranchId || user?.activeBranchId || null;

  if (user?.role === 'admin') {
    // Admin: scope to active branch if one is chosen, else see everything.
    return active ? { branchId: String(active), scopeAll: false } : { branchId: null, scopeAll: true };
  }

  // Non-admin: must be scoped to a branch.
  return { branchId: active ? String(active) : null, scopeAll: false };
};

/**
 * Merge a branch filter into a Mongo query object.
 * @param {object} filter existing filter
 * @param {object} req
 * @returns {object} filter with branchId applied when appropriate
 */
export const scopedFilter = (filter, req) => {
  const { branchId, scopeAll } = resolveScope(req);
  if (scopeAll) return filter; // admin, all branches
  if (branchId) return { ...filter, branchId };
  return filter;
};

/**
 * The branchId to stamp onto a NEW document created in this request.
 * Falls back to null (e.g. admin acting globally without a selected branch).
 */
export const branchForCreate = (req) => {
  const { branchId } = resolveScope(req);
  return branchId || null;
};

export default scopedFilter;
