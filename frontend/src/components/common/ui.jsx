/**
 * Shared, dependency-light UI primitives used across all pages.
 */
import { useEffect } from 'react';

export const Button = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white',
    secondary: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'hover:bg-slate-100 text-slate-600',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  };
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
};

export const Card = ({ children, className = '', padded = true }) => (
  <div
    className={`bg-white rounded-xl border border-slate-200 shadow-sm ${padded ? 'p-5' : ''} ${className}`}
  >
    {children}
  </div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
    <div>
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const Input = ({ label, error, className = '', ...props }) => (
  <label className="block">
    {label && <span className="block text-sm font-medium text-slate-600 mb-1">{label}</span>}
    <input
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none ${error ? 'border-red-400' : ''} ${className}`}
      {...props}
    />
    {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
  </label>
);

export const Select = ({ label, children, className = '', ...props }) => (
  <label className="block">
    {label && <span className="block text-sm font-medium text-slate-600 mb-1">{label}</span>}
    <select
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  </label>
);

export const Textarea = ({ label, className = '', ...props }) => (
  <label className="block">
    {label && <span className="block text-sm font-medium text-slate-600 mb-1">{label}</span>}
    <textarea
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none ${className}`}
      {...props}
    />
  </label>
);

// Semantic colors: success=emerald, warning=amber, danger=red. Neutral/info states
// use red-theme-aligned tones (rose/red-tint/slate) instead of blue/indigo/purple.
const BADGE_COLORS = {
  hot: 'bg-red-100 text-red-700', warm: 'bg-amber-100 text-amber-700', cold: 'bg-slate-200 text-slate-600',
  converted: 'bg-emerald-100 text-emerald-700', lost: 'bg-slate-200 text-slate-600',
  draft: 'bg-slate-200 text-slate-600', sent: 'bg-rose-100 text-rose-700',
  accepted: 'bg-emerald-100 text-emerald-700', confirmed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700', expired: 'bg-slate-200 text-slate-500',
  scheduled: 'bg-rose-100 text-rose-700', completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700', no_show: 'bg-slate-200 text-slate-600',
  created: 'bg-slate-200 text-slate-600', assigned: 'bg-rose-100 text-rose-700', work_started: 'bg-amber-100 text-amber-700',
  work_completed: 'bg-emerald-100 text-emerald-700', invoice_generated: 'bg-rose-100 text-rose-700',
  paid: 'bg-emerald-100 text-emerald-700', delivered: 'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700', partial: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-slate-200 text-slate-500',
  pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700',
  present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-700',
  // role badges (Users page)
  admin: 'bg-red-100 text-red-700', manager: 'bg-rose-100 text-rose-700', technician: 'bg-amber-100 text-amber-700',
  service_advisor: 'bg-emerald-100 text-emerald-700', accountant: 'bg-slate-200 text-slate-600', hr: 'bg-rose-100 text-rose-700',
};

export const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${BADGE_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
    {String(status || '').replace(/_/g, ' ')}
  </span>
);

export const Spinner = ({ className = '' }) => (
  <div className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 ${className}`} />
);

export const Loading = ({ label = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
    <Spinner className="h-8 w-8 mb-3" />
    <span className="text-sm">{label}</span>
  </div>
);

export const EmptyState = ({ message = 'No records found' }) => (
  <div className="py-16 text-center text-slate-400 text-sm">{message}</div>
);

export const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className={`w-full ${widths[size]} bg-white rounded-xl shadow-xl mt-10`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ open, onConfirm, onCancel, title = 'Are you sure?', message = 'This action cannot be undone.' }) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Confirm</Button>
      </>
    }
  >
    <p className="text-sm text-slate-600">{message}</p>
  </Modal>
);
