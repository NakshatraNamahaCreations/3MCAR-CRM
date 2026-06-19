import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import vehicleApi from '../api/vehicleApi.js';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import { VEHICLE_TYPES, vehicleTypeLabel } from '../constants/vehicleTypes.js';
import {
  Button,
  PageHeader,
  Input,
  Select,
  Textarea,
  Modal,
  ConfirmDialog,
  Loading,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';
import CustomerSelect from '../components/common/CustomerSelect.jsx';

const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'electric', 'hybrid', 'other'];

const PAGE_SIZE = 12;

const emptyForm = {
  customerId: '',
  vehicleNumber: '',
  brand: '',
  model: '',
  variant: '',
  year: '',
  vehicleType: '',
  fuelType: 'petrol',
  color: '',
  chassisNumber: '',
  engineNumber: '',
  notes: '',
};

// Defensive: accept either an array or an object-wrapped list shape.
const asArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val && Array.isArray(val.items)) return val.items;
  return [];
};

export default function Vehicles() {
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

  const load = async () => {
    setLoading(true);
    try {
      const data = await vehicleApi.list();
      setRows(asArray(data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const _searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(
    _searched,
    () => setPage(1),
  );

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      customerId: row.customerId?._id || row.customerId || row.customer?._id || '',
      vehicleNumber: row.vehicleNumber || '',
      brand: row.brand || '',
      model: row.model || '',
      variant: row.variant || '',
      year: row.year ?? '',
      vehicleType: row.vehicleType || '',
      fuelType: row.fuelType || 'petrol',
      color: row.color || '',
      chassisNumber: row.chassisNumber || '',
      engineNumber: row.engineNumber || '',
      notes: row.notes || '',
    });
    setFormOpen(true);
  };

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!form.vehicleNumber.trim()) {
      toast.error('Vehicle number is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, year: form.year === '' ? undefined : Number(form.year) };
      if (editing) {
        await vehicleApi.update(editing._id, payload);
        toast.success('Vehicle updated');
      } else {
        await vehicleApi.create(payload);
        toast.success('Vehicle created');
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
      await vehicleApi.remove(toDelete._id);
      toast.success('Vehicle deleted');
      setToDelete(null);
      await load();
    } catch {
      setToDelete(null);
    }
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'vehicleNumber', label: 'Vehicle Number', render: (r) => r.vehicleNumber || '—' },
    { key: 'brand', label: 'Brand', render: (r) => r.brand || '—' },
    { key: 'model', label: 'Model', render: (r) => r.model || '—' },
    { key: 'year', label: 'Year', render: (r) => r.year ?? '—' },
    { key: 'vehicleType', label: 'Type', render: (r) => vehicleTypeLabel(r.vehicleType) || '—' },
    { key: 'fuelType', label: 'Fuel Type', render: (r) => r.fuelType || '—' },
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

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Vehicles"
          subtitle="Manage vehicle records."
          actions={<Button onClick={openCreate}>Add Vehicle</Button>}
        />
        <Loading label="Loading vehicles…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vehicles"
        subtitle="Manage vehicle records."
        actions={<Button onClick={openCreate}>Add Vehicle</Button>}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Input
            label="Search"
            placeholder="Search…"
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
        emptyMessage="No vehicles found."
        rowKey="_id"
        onRowClick={openEdit}
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
        title={editing ? 'Edit Vehicle' : 'Add Vehicle'}
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
          <CustomerSelect
            label="Customer"
            required
            value={form.customerId}
            onChange={(id) => setForm((f) => ({ ...f, customerId: id }))}
          />
          <Input
            label="Vehicle Number"
            value={form.vehicleNumber}
            onChange={setField('vehicleNumber')}
            required
          />
          <Input label="Brand" value={form.brand} onChange={setField('brand')} />
          <Input label="Model" value={form.model} onChange={setField('model')} />
          <Input label="Variant" value={form.variant} onChange={setField('variant')} />
          <Input
            label="Year"
            type="number"
            value={form.year}
            onChange={setField('year')}
          />
          <Select label="Vehicle Type" value={form.vehicleType} onChange={setField('vehicleType')}>
            <option value="">Select type…</option>
            {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Select label="Fuel Type" value={form.fuelType} onChange={setField('fuelType')}>
            {FUEL_TYPES.map((ft) => (
              <option key={ft} value={ft}>
                {ft.charAt(0).toUpperCase() + ft.slice(1)}
              </option>
            ))}
          </Select>
          <Input label="Color" value={form.color} onChange={setField('color')} />
          <Input
            label="Chassis Number"
            value={form.chassisNumber}
            onChange={setField('chassisNumber')}
          />
          <Input
            label="Engine Number"
            value={form.engineNumber}
            onChange={setField('engineNumber')}
          />
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

      <ConfirmDialog
        open={!!toDelete}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        title="Delete vehicle?"
        message={`This will permanently remove ${toDelete?.vehicleNumber || 'this vehicle'}.`}
      />
    </div>
  );
}
