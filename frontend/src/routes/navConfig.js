/**
 * Single source of truth for navigation: grouped sidebar sections, their routes,
 * and which roles may see each. Admin sees everything.
 * `icon` matches a key in components/layout/NavIcon.jsx.
 */
export const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', path: '/', icon: 'dashboard', roles: ['manager', 'technician', 'service_advisor', 'accountant', 'hr'] },
    ],
  },
  {
    title: 'CRM',
    items: [
      { key: 'enquiries', label: 'Enquiries', path: '/enquiries', icon: 'enquiries', roles: ['manager', 'service_advisor'] },
      { key: 'followups', label: 'Followups', path: '/followups', icon: 'followups', roles: ['manager', 'service_advisor'] },
      { key: 'quotes', label: 'Quotes', path: '/quotes', icon: 'quotes', roles: ['manager', 'service_advisor'] },
      { key: 'quotefollowups', label: 'Quote Followups', path: '/quote-followups', icon: 'followups', roles: ['manager', 'service_advisor'] },
      { key: 'customers', label: 'Customers', path: '/customers', icon: 'customers', roles: ['manager', 'service_advisor'] },
      { key: 'vehicles', label: 'Vehicles', path: '/vehicles', icon: 'vehicles', roles: ['manager', 'service_advisor'] },
    ],
  },
  {
    title: 'Workshop',
    items: [
      { key: 'appointments', label: 'Appointments', path: '/appointments', icon: 'appointments', roles: ['manager', 'service_advisor'] },
      { key: 'jobcards', label: 'Job Cards', path: '/job-cards', icon: 'jobcards', roles: ['manager', 'service_advisor', 'technician'] },
      { key: 'services', label: 'Services', path: '/services', icon: 'services', roles: ['manager'] },
      { key: 'products', label: 'Products / Inventory', path: '/products', icon: 'products', roles: ['manager'] },
      { key: 'stockhistory', label: 'Stock History', path: '/stock-history', icon: 'products', roles: ['manager'] },
      { key: 'ppf', label: 'PPF Usage', path: '/ppf-usage', icon: 'ppf', roles: ['manager', 'technician'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { key: 'invoices', label: 'Invoices', path: '/invoices', icon: 'invoices', roles: ['accountant', 'manager'] },
      { key: 'payments', label: 'Payments', path: '/payments', icon: 'payments', roles: ['accountant', 'manager'] },
      { key: 'expenses', label: 'Expenses', path: '/expenses', icon: 'expenses', roles: ['accountant', 'manager'] },
      { key: 'pettycash', label: 'Petty Cash', path: '/petty-cash', icon: 'pettycash', roles: ['accountant', 'manager'] },
    ],
  },
  {
    title: 'Human Resources',
    items: [
      { key: 'employees', label: 'Employees', path: '/employees', icon: 'employees', roles: ['hr', 'manager'] },
      { key: 'attendance', label: 'Attendance', path: '/attendance', icon: 'attendance', roles: ['hr', 'manager'] },
      { key: 'salary', label: 'Salary', path: '/salary', icon: 'salary', roles: ['hr', 'manager'] },
      { key: 'salaryadvance', label: 'Salary Advance', path: '/salary-advance', icon: 'salaryadvance', roles: ['hr', 'manager'] },
      { key: 'leave', label: 'Leave', path: '/leave', icon: 'leave', roles: ['hr', 'manager'] },
    ],
  },
  {
    title: 'Insights',
    items: [
      { key: 'reports', label: 'Reports', path: '/reports', icon: 'reports', roles: ['manager', 'accountant', 'hr'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      // Admin-only (empty roles array → only admin passes via canSee).
      { key: 'users', label: 'Users', path: '/users', icon: 'customers', roles: [] },
      { key: 'branches', label: 'Branches', path: '/branches', icon: 'pettycash', roles: [] },
      { key: 'terms', label: 'Terms & Conditions', path: '/terms', icon: 'quotes', roles: ['manager'] },
      { key: 'settings', label: 'Settings', path: '/settings', icon: 'settings', roles: [] },
    ],
  },
];

// Flat list kept for any consumer that still wants it (e.g. ProtectedRoute lookups).
export const NAV = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Modules that can be granted per-user in the Users form.
 * Includes the dashboard; excludes admin-only sections
 * (Users / Branches / Settings — empty roles array).
 */
export const PERMISSION_MODULES = NAV.filter(
  (it) => (it.roles || []).length > 0
).map((it) => ({ key: it.key, label: it.label }));

/**
 * Can this user see/enter a nav item?
 * - Admin: everything.
 * - Admin-only items (empty roles): only admin.
 * - User with an explicit permissions list: only modules in that list.
 * - User without explicit permissions: falls back to role-based access.
 */
export const canSee = (item, role, permissions) => {
  if (role === 'admin') return true;
  if ((item.roles || []).length === 0) return false;
  if (Array.isArray(permissions) && permissions.length) return permissions.includes(item.key);
  return (item.roles || []).includes(role);
};

/** First nav path the user is allowed to open (used as a safe landing/redirect). */
export const firstAccessiblePath = (role, permissions) => {
  const item = NAV.find((it) => canSee(it, role, permissions));
  return item ? item.path : null;
};

/** Resolve which nav module a given route path belongs to (longest-prefix match). */
export const moduleForPath = (pathname) => {
  if (pathname === '/') return NAV.find((i) => i.path === '/') || null;
  let best = null;
  for (const it of NAV) {
    if (it.path !== '/' && (pathname === it.path || pathname.startsWith(it.path + '/'))) {
      if (!best || it.path.length > best.path.length) best = it;
    }
  }
  return best;
};
