import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { branchApi } from '../api/branchApi.js';
import {
  Button, Card, PageHeader, Input, Select, StatusBadge, Modal, ConfirmDialog,
} from '../components/common/ui.jsx';
import { PremiumTable, NameCell } from '../components/common/DataViews.jsx';

const emptyForm = () => ({
  name: '', code: '', address: '', city: '', state: '', pincode: '',
  phone: '', email: '', gstin: '', isHeadOffice: false, status: 'active',
});

export default function Branches() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await branchApi.list();
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name: b.name || '', code: b.code || '', address: b.address || '', city: b.city || '',
      state: b.state || '', pincode: b.pincode || '', phone: b.phone || '', email: b.email || '',
      gstin: b.gstin || '', isHeadOffice: !!b.isHeadOffice, status: b.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Branch name is required'); return; }
    setSaving(true);
    try {
      if (editing) { await branchApi.update(editing._id, form); toast.success('Branch updated'); }
      else { await branchApi.create(form); toast.success('Branch created'); }
      setModalOpen(false); setEditing(null); await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await branchApi.remove(deleteTarget._id);
      toast.success('Branch deleted');
      setDeleteTarget(null); await load();
    } catch { setDeleteTarget(null); }
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', width: '64px', render: (_r, i) => <span className="font-medium text-slate-400">{i + 1}</span> },
    { key: 'name', label: 'Branch', render: (b) => <NameCell name={b.name} sub={b.code || b.city} /> },
    { key: 'city', label: 'City', render: (b) => [b.city, b.state].filter(Boolean).join(', ') || '—' },
    { key: 'phone', label: 'Phone', render: (b) => b.phone || '—' },
    {
      key: 'isHeadOffice', label: 'Type',
      render: (b) => b.isHeadOffice
        ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Head Office</span>
        : <span className="text-slate-400">Branch</span>,
    },
    { key: 'status', label: 'Status', render: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(b); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(b); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Branches"
        subtitle="Manage your workshop locations."
        actions={<Button variant="primary" onClick={openCreate}>+ Add Branch</Button>}
      />

      <PremiumTable columns={columns} rows={rows} loading={loading} emptyMessage="No branches found." rowKey="_id" />

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit Branch' : 'Add Branch'}
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
            <Input label="Branch Name" required value={form.name} onChange={(e) => setField('name', e.target.value)} />
            <Input label="Code" value={form.code} onChange={(e) => setField('code', e.target.value)} placeholder="e.g. NGS" />
            <Input label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            <Input label="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
            <Input label="State" value={form.state} onChange={(e) => setField('state', e.target.value)} />
            <Input label="Pincode" value={form.pincode} onChange={(e) => setField('pincode', e.target.value)} />
            <Input label="GSTIN" value={form.gstin} onChange={(e) => setField('gstin', e.target.value)} />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => setField('address', e.target.value)} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.isHeadOffice} onChange={(e) => setField('isHeadOffice', e.target.checked)} />
              This is the Head Office
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Branch"
        message={`Delete branch "${deleteTarget?.name || ''}"? Data assigned to it may become inaccessible. This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
