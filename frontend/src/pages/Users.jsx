import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { userApi } from '../api/userApi.js';
import { branchApi } from '../api/branchApi.js';
import {
  Button, Card, PageHeader, Input, Select, StatusBadge, Modal, ConfirmDialog,
} from '../components/common/ui.jsx';
import { PremiumTable, NameCell, Pagination } from '../components/common/DataViews.jsx';
import { PERMISSION_MODULES } from '../routes/navConfig.js';
import { prettyDate } from '../utils/dateUtils.js';

const fmtDateTime = (d) => {
  if (!d) return 'Never';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return 'Never';
  return `${prettyDate(d)} ${dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

const ROLES = ['admin', 'manager', 'technician', 'service_advisor', 'accountant', 'hr'];
const PAGE_SIZE = 12;
const labelize = (v) => String(v || '').split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

const emptyForm = () => ({
  name: '', email: '', phone: '', password: '',
  role: 'service_advisor', status: 'active', branches: [], permissions: [],
});

export default function Users() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userApi.list();
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadUsers();
    branchApi.list({ status: 'active' }).then((d) => setBranches(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
  }, []);

  const branchName = (id) => branches.find((b) => b._id === (id?._id || id))?.name || '—';

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!t) return true;
      return [u.name, u.email, u.phone].filter(Boolean).join(' ').toLowerCase().includes(t);
    });
  }, [rows, search, roleFilter]);

  useEffect(() => { setPage(1); }, [search, roleFilter]);
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleBranch = (id) =>
    setForm((f) => ({
      ...f,
      branches: f.branches.includes(id) ? f.branches.filter((b) => b !== id) : [...f.branches, id],
    }));
  const togglePermission = (key) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  const setAllPermissions = (all) =>
    setForm((f) => ({ ...f, permissions: all ? PERMISSION_MODULES.map((m) => m.key) : [] }));

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name || '', email: u.email || '', phone: u.phone || '', password: '',
      role: u.role || 'service_advisor', status: u.status || 'active',
      branches: (u.branches || []).map((b) => b?._id || b),
      permissions: u.permissions || [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email are required'); return; }
    if (!editing && !form.password) { toast.error('Password is required for a new user'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password; // don't overwrite
      if (editing) { await userApi.update(editing._id, payload); toast.success('User updated'); }
      else { await userApi.create(payload); toast.success('User created'); }
      setModalOpen(false); setEditing(null); await loadUsers();
    } finally { setSaving(false); }
  };

  const handleToggle = async (u) => {
    await userApi.toggleStatus(u._id);
    toast.success(`User ${u.status === 'active' ? 'deactivated' : 'activated'}`);
    await loadUsers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await userApi.remove(deleteTarget._id);
      toast.success('User deleted');
      setDeleteTarget(null);
      await loadUsers();
    } catch { setDeleteTarget(null); }
  };

  const openReset = (u) => { setResetTarget(u); setNewPassword(''); };
  const handleReset = async (e) => {
    if (e) e.preventDefault();
    if (!resetTarget) return;
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setResetting(true);
    try {
      await userApi.resetPassword(resetTarget._id, newPassword);
      toast.success(`Password reset for ${resetTarget.name}`);
      setResetTarget(null);
      setNewPassword('');
    } finally { setResetting(false); }
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', width: '64px', render: (_r, i) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</span> },
    { key: 'name', label: 'User', render: (u) => <NameCell name={u.name} sub={u.email} /> },
    { key: 'phone', label: 'Phone', render: (u) => u.phone || '—' },
    { key: 'role', label: 'Role', render: (u) => <StatusBadge status={u.role} /> },
    {
      key: 'branches', label: 'Branches',
      render: (u) => {
        const list = (u.branches || []).map((b) => branchName(b));
        return list.length ? <span className="text-sm text-slate-600">{list.join(', ')}</span> : <span className="text-slate-400">All / none</span>;
      },
    },
    { key: 'lastLoginAt', label: 'Last Login', render: (u) => <span className="text-sm text-slate-500">{fmtDateTime(u.lastLoginAt)}</span> },
    { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (u) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openReset(u); }}>Reset PW</Button>
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleToggle(u); }}>
            {u.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        subtitle="Manage staff login accounts, roles, and branch access."
        actions={<Button variant="primary" onClick={openCreate}>+ Add User</Button>}
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input placeholder="Search name / email / phone" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{labelize(r)}</option>)}
          </Select>
        </div>
      </Card>

      <PremiumTable columns={columns} rows={paged} loading={loading} emptyMessage="No users found." rowKey="_id" />
      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit User' : 'Add User'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Name" required value={form.name} onChange={(e) => setField('name', e.target.value)} />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)} />
            <Input label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            <Input label={editing ? 'New Password (leave blank to keep)' : 'Password'} type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
            <Select label="Role" value={form.role} onChange={(e) => setField('role', e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{labelize(r)}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-600">
              Branch Access {form.role === 'admin' && <span className="text-xs text-slate-400">(admins can access all branches)</span>}
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
              {branches.length === 0 && <p className="text-sm text-slate-400">No branches found.</p>}
              {branches.map((b) => (
                <label key={b._id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={form.branches.includes(b._id)}
                    onChange={() => toggleBranch(b._id)}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Module Permissions</p>
              {form.role === 'admin' ? (
                <span className="text-xs text-slate-400">Super admin has full access to all modules</span>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAllPermissions(true)} className="text-xs font-medium text-brand-600 hover:underline">Select all</button>
                  <span className="text-slate-300">·</span>
                  <button type="button" onClick={() => setAllPermissions(false)} className="text-xs font-medium text-slate-500 hover:underline">Clear</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
              {form.role === 'admin' ? (
                <p className="col-span-full text-sm text-slate-400">Admins can access every module — no need to select.</p>
              ) : (
                PERMISSION_MODULES.map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={form.permissions.includes(m.key)}
                      onChange={() => togglePermission(m.key)}
                    />
                    {m.label}
                  </label>
                ))
              )}
            </div>
            {form.role !== 'admin' && form.permissions.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No modules selected → this user falls back to their role's default access.</p>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={!!resetTarget}
        onClose={() => !resetting && setResetTarget(null)}
        title={resetTarget ? `Reset Password — ${resetTarget.name}` : 'Reset Password'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetTarget(null)} disabled={resetting}>Cancel</Button>
            <Button variant="primary" onClick={handleReset} disabled={resetting}>{resetting ? 'Resetting…' : 'Reset Password'}</Button>
          </div>
        }
      >
        <form onSubmit={handleReset} className="space-y-3">
          <p className="text-sm text-slate-500">
            Set a new password for <b>{resetTarget?.email}</b>. They can change it later from their profile.
          </p>
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoFocus
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message={`Delete user "${deleteTarget?.name || ''}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
