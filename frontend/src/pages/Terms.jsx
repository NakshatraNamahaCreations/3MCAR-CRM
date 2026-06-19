import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { termsApi } from '../api/termsApi.js';
import {
  Button, PageHeader, Input, Select, Textarea, StatusBadge, Modal, ConfirmDialog,
} from '../components/common/ui.jsx';
import { PremiumTable } from '../components/common/DataViews.jsx';

const emptyForm = () => ({ title: '', content: '', appliesTo: 'quote', isDefault: false, status: 'active' });

export default function Terms() {
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
      const data = await termsApi.list();
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ title: t.title || '', content: t.content || '', appliesTo: t.appliesTo || 'quote', isDefault: !!t.isDefault, status: t.status || 'active' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return; }
    setSaving(true);
    try {
      if (editing) { await termsApi.update(editing._id, form); toast.success('Template updated'); }
      else { await termsApi.create(form); toast.success('Template created'); }
      setModalOpen(false); setEditing(null); await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await termsApi.remove(deleteTarget._id); toast.success('Template deleted'); setDeleteTarget(null); await load(); }
    catch { setDeleteTarget(null); }
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', width: '64px', render: (_r, i) => <span className="font-medium text-slate-400">{i + 1}</span> },
    {
      key: 'title', label: 'Template',
      render: (t) => (
        <div>
          <p className="font-medium text-slate-800">{t.title} {t.isDefault && <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">Default</span>}</p>
          <p className="max-w-md truncate text-xs text-slate-400">{t.content}</p>
        </div>
      ),
    },
    { key: 'appliesTo', label: 'Applies To', render: (t) => <span className="capitalize text-slate-600">{t.appliesTo}</span> },
    { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (t) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(t); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Terms & Conditions"
        subtitle="Reusable terms templates that can be applied to quotes and invoices."
        actions={<Button variant="primary" onClick={openCreate}>+ Add Template</Button>}
      />

      <PremiumTable columns={columns} rows={rows} loading={loading} emptyMessage="No templates yet. Add your first one." rowKey="_id" onRowClick={openEdit} />

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit Template' : 'Add Template'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Title" required value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Standard Quote Terms" />
          <Textarea label="Content" rows={6} required value={form.content} onChange={(e) => setField('content', e.target.value)} placeholder={'1. This quotation is valid for 15 days.\n2. 50% advance required to confirm.\n3. Prices inclusive of GST.'} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Applies To" value={form.appliesTo} onChange={(e) => setField('appliesTo', e.target.value)}>
              <option value="quote">Quote</option>
              <option value="invoice">Invoice</option>
              <option value="both">Both</option>
            </Select>
            <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.isDefault} onChange={(e) => setField('isDefault', e.target.checked)} />
              Use as default (auto-selected on new quotes)
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Template"
        message={`Delete "${deleteTarget?.title || ''}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
