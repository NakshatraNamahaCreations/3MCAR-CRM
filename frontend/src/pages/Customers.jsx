import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import customerApi from '../api/customerApi.js';
import {
  Button,
  PageHeader,
  Input,
  Textarea,
  Modal,
  ConfirmDialog,
  StatusBadge,
  Spinner,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';

const PAGE_SIZE = 12;

const emptyForm = {
  name: '',
  phone: '',
  alternatePhone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  source: '',
  notes: '',
};

// Defensive: accept either an array or an object-wrapped list shape.
const asArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val && Array.isArray(val.items)) return val.items;
  return [];
};

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
};

const money = (v) =>
  v === null || v === undefined || v === ''
    ? '—'
    : `₹${Number(v).toLocaleString('en-IN')}`;

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Create / Edit modal state.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirm state.
  const [toDelete, setToDelete] = useState(null);

  // View profile modal state.
  const [viewOpen, setViewOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await customerApi.list();
      setRows(asArray(data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.name, r.phone, r.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(
    filtered,
    () => setPage(1)
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      phone: row.phone || '',
      alternatePhone: row.alternatePhone || '',
      email: row.email || '',
      address: row.address || '',
      city: row.city || '',
      state: row.state || '',
      pincode: row.pincode || '',
      source: row.source || '',
      notes: row.notes || '',
    });
    setFormOpen(true);
  };

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await customerApi.update(editing._id, form);
        toast.success('Customer updated');
      } else {
        await customerApi.create(form);
        toast.success('Customer created');
      }
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await customerApi.remove(toDelete._id);
      toast.success('Customer deleted');
      setToDelete(null);
      await load();
    } catch {
      setToDelete(null);
    }
  };

  const openView = async (row) => {
    setViewOpen(true);
    setProfile(null);
    setProfileLoading(true);
    try {
      const data = await customerApi.profile(row._id);
      setProfile(data || {});
    } finally {
      setProfileLoading(false);
    }
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'customerCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email', render: (r) => r.email || '—' },
    { key: 'city', label: 'City', render: (r) => r.city || '—' },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openView(r);
            }}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setToDelete(r);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        subtitle="Manage customer records and view their full history."
        actions={<Button onClick={openCreate}>Add Customer</Button>}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Input
            placeholder="Search name, phone or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {_buControls}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={_paged}
        loading={loading}
        emptyMessage="No customers found."
        rowKey="_id"
        onRowClick={openView}
      />

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={_buFiltered.length}
        onPageChange={setPage}
      />

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Name" value={form.name} onChange={setField('name')} required />
          <Input label="Phone" value={form.phone} onChange={setField('phone')} />
          <Input
            label="Alternate Phone"
            value={form.alternatePhone}
            onChange={setField('alternatePhone')}
          />
          <Input label="Email" type="email" value={form.email} onChange={setField('email')} />
          <div className="sm:col-span-2">
            <Textarea
              label="Address"
              rows={2}
              value={form.address}
              onChange={setField('address')}
            />
          </div>
          <Input label="City" value={form.city} onChange={setField('city')} />
          <Input label="State" value={form.state} onChange={setField('state')} />
          <Input label="Pincode" value={form.pincode} onChange={setField('pincode')} />
          <Input label="Source" value={form.source} onChange={setField('source')} />
          <div className="sm:col-span-2">
            <Textarea
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={setField('notes')}
            />
          </div>
          {/* Hidden submit so Enter submits the form. */}
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>

      {/* View Profile Modal */}
      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Customer Profile"
        size="xl"
        footer={
          <Button variant="ghost" onClick={() => setViewOpen(false)}>
            Close
          </Button>
        }
      >
        {profileLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <ProfileView profile={profile} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        title="Delete customer?"
        message={`This will permanently remove ${toDelete?.name || 'this customer'}.`}
      />
    </div>
  );
}

// ---- Profile sub-view -------------------------------------------------------

function SubTable({ title, columns, rows }) {
  const data = asArray(rows);
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">
        {title} <span className="text-gray-400">({data.length})</span>
      </h4>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">None.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="px-3 py-2 text-left font-medium text-gray-500"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, i) => (
                <tr key={row._id || i}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-gray-700">
                      {c.render ? c.render(row) : row[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProfileView({ profile }) {
  if (!profile) {
    return <p className="text-sm text-gray-500">No profile data available.</p>;
  }

  // Be defensive about the profile shape: the customer object may be the
  // profile itself or nested under `customer`.
  const customer = profile.customer || profile;
  const vehicles = profile.vehicles ?? customer.vehicles;
  const appointments = profile.appointments ?? customer.appointments;
  const jobCards = profile.jobCards ?? profile.jobcards ?? customer.jobCards;
  const invoices = profile.invoices ?? customer.invoices;
  const payments = profile.payments ?? customer.payments;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        <Field label="Code" value={customer.customerCode} />
        <Field label="Name" value={customer.name} />
        <Field label="Phone" value={customer.phone} />
        <Field label="Alternate Phone" value={customer.alternatePhone} />
        <Field label="Email" value={customer.email} />
        <Field label="City" value={customer.city} />
        <Field label="State" value={customer.state} />
        <Field label="Pincode" value={customer.pincode} />
        <Field label="Source" value={customer.source} />
        <Field label="Address" value={customer.address} className="sm:col-span-2" />
        {customer.notes ? (
          <Field label="Notes" value={customer.notes} className="sm:col-span-2" />
        ) : null}
      </div>

      <SubTable
        title="Vehicles"
        rows={vehicles}
        columns={[
          { key: 'registrationNumber', label: 'Reg. No' },
          {
            key: 'makeModel',
            label: 'Make / Model',
            render: (r) =>
              [r.make, r.model].filter(Boolean).join(' ') || r.makeModel || '—',
          },
          { key: 'variant', label: 'Variant', render: (r) => r.variant || '—' },
          { key: 'color', label: 'Color', render: (r) => r.color || '—' },
        ]}
      />

      <SubTable
        title="Appointments"
        rows={appointments}
        columns={[
          { key: 'date', label: 'Date', render: (r) => fmtDate(r.date || r.scheduledAt) },
          { key: 'service', label: 'Service', render: (r) => r.service || r.title || '—' },
          {
            key: 'status',
            label: 'Status',
            render: (r) => (r.status ? <StatusBadge status={r.status} /> : '—'),
          },
        ]}
      />

      <SubTable
        title="Job Cards"
        rows={jobCards}
        columns={[
          { key: 'jobCardNumber', label: 'Job Card', render: (r) => r.jobCardNumber || r.code || '—' },
          { key: 'createdAt', label: 'Date', render: (r) => fmtDate(r.createdAt || r.date) },
          {
            key: 'status',
            label: 'Status',
            render: (r) => (r.status ? <StatusBadge status={r.status} /> : '—'),
          },
        ]}
      />

      <SubTable
        title="Invoices"
        rows={invoices}
        columns={[
          { key: 'invoiceNumber', label: 'Invoice', render: (r) => r.invoiceNumber || r.code || '—' },
          { key: 'date', label: 'Date', render: (r) => fmtDate(r.date || r.createdAt) },
          { key: 'total', label: 'Total', render: (r) => money(r.total ?? r.grandTotal ?? r.amount) },
          {
            key: 'status',
            label: 'Status',
            render: (r) => (r.status ? <StatusBadge status={r.status} /> : '—'),
          },
        ]}
      />

      <SubTable
        title="Payments"
        rows={payments}
        columns={[
          { key: 'date', label: 'Date', render: (r) => fmtDate(r.date || r.createdAt) },
          { key: 'amount', label: 'Amount', render: (r) => money(r.amount) },
          { key: 'mode', label: 'Mode', render: (r) => r.mode || r.method || '—' },
          { key: 'reference', label: 'Reference', render: (r) => r.reference || r.txnId || '—' },
        ]}
      />
    </div>
  );
}

function Field({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  );
}
