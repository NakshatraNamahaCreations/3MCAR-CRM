import { sendError } from '../utils/apiResponse.js';

/**
 * Role definitions and the module groups each role may access.
 * Admin implicitly has access to everything.
 */
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
  SERVICE_ADVISOR: 'service_advisor',
  ACCOUNTANT: 'accountant',
  HR: 'hr',
};

/**
 * Default module access matrix per role (used for menu visibility / coarse checks).
 * Fine-grained route protection should use restrictTo() with explicit roles.
 */
export const ROLE_ACCESS = {
  admin: ['*'],
  manager: ['enquiries', 'followups', 'quotes', 'customers', 'vehicles', 'appointments', 'jobcards', 'reports', 'inventory', 'products', 'services', 'ppf', 'dashboard'],
  technician: ['jobcards', 'product_usage', 'ppf', 'dashboard'],
  service_advisor: ['enquiries', 'followups', 'quotes', 'appointments', 'customers', 'vehicles', 'dashboard'],
  accountant: ['invoices', 'payments', 'expenses', 'pettycash', 'reports', 'dashboard'],
  hr: ['employees', 'attendance', 'salary', 'salaryadvance', 'leave', 'payroll', 'reports', 'dashboard'],
};

/**
 * Restricts a route to the given roles. Admin always passes.
 * Usage: router.post('/', protect, restrictTo('admin', 'manager'), handler)
 */
export const restrictTo = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, { message: 'Not authenticated.', statusCode: 401 });
  }
  if (req.user.role === ROLES.ADMIN) return next();
  if (!allowedRoles.includes(req.user.role)) {
    return sendError(res, {
      message: 'You do not have permission to perform this action.',
      statusCode: 403,
    });
  }
  next();
};

/**
 * Per-user module permission gate.
 *
 * - Admin always passes (full access).
 * - If the user has an explicit `permissions` list, they may only access modules
 *   in that list (a whitelist). Modules outside the list are denied (403).
 * - If the user has NO explicit permissions, access defers to the route's
 *   existing role guards (no behavior change for legacy users).
 *
 * Usage (at the mount): router.use('/invoices', protect, permit('invoices'), invoiceRoutes)
 */
export const permit = (moduleKey) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, { message: 'Not authenticated.', statusCode: 401 });
  }
  if (req.user.role === 'admin') return next();
  const perms = req.user.permissions || [];
  if (perms.length && !perms.includes(moduleKey)) {
    return sendError(res, {
      message: 'You do not have permission to access this module.',
      statusCode: 403,
    });
  }
  next();
};

/**
 * Checks access by module key against ROLE_ACCESS (coarse-grained).
 * Usage: router.use(canAccess('invoices'))
 */
export const canAccess = (moduleKey) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, { message: 'Not authenticated.', statusCode: 401 });
  }
  const allowed = ROLE_ACCESS[req.user.role] || [];
  if (allowed.includes('*') || allowed.includes(moduleKey)) return next();
  return sendError(res, { message: 'Access denied for this module.', statusCode: 403 });
};

export default restrictTo;
