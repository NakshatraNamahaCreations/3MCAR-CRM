import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import ppfUsageApi from '../api/ppfUsageApi.js';
import jobCardApi from '../api/jobCardApi.js';
import productApi from '../api/productApi.js';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import { VEHICLE_TYPES } from '../constants/vehicleTypes.js';

const PAGE_SIZE = 12;
import {
  Button,
  PageHeader,
  Input,
  Select,
  Textarea,
  StatusBadge,
  Loading,
  Modal,
  ConfirmDialog,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';

const emptyForm = {
  jobCardId: '',
  ppfProductId: '',
  ppfRollName: '',
  rollNumber: '',
  totalRollSqft: '',
  usedSqft: '',
  wastageSqft: '',
  usageArea: '',
  usageDate: '',
  vehicleNumber: '',
  carBrand: '',
  carModel: '',
  vehicleType: '',
  remarks: '',
};

const usageAreaOptions = [
  { value: 'full_body', label: 'Full Body' },
  { value: 'front', label: 'Front' },
  { value: 'rear', label: 'Rear' },
  { value: 'hood', label: 'Hood' },
  { value: 'roof', label: 'Roof' },
  { value: 'bumper', label: 'Bumper' },
  { value: 'doors', label: 'Doors' },
  { value: 'partial', label: 'Partial' },
];

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const money = (value) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`;
const sqft = (value) => `${Number(value ?? 0).toLocaleString('en-IN')} sqft`;

export default function PPFUsage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [jobCards, setJobCards] = useState([]);
  const [ppfProducts, setPpfProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (productFilter && (r.ppfProductId?._id || r.ppfProductId) !== productFilter) return false;
      if (!t) return true;
      return [r.vehicleNumber, r.carBrand, r.carModel, r.usageArea, r.ppfRollName]
        .filter(Boolean).join(' ').toLowerCase().includes(t);
    });
  }, [rows, search, productFilter]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(filteredRows, () => setPage(1));

  useEffect(() => { setPage(1); }, [search, productFilter]);
  const pagedRows = useMemo(() => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [_buFiltered, page]);

  const loadList = async () => {
    setLoading(true);
    try {
      const data = await ppfUsageApi.list();
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    jobCardApi.list().then((d) => setJobCards(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
    productApi.list({ isPPF: true, status: 'active' }).then((d) => setPpfProducts(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
  }, []);

  // When a job card is picked, prefill the vehicle/customer details.
  const onJobCardChange = (jobCardId) => {
    const jc = jobCards.find((j) => j._id === jobCardId);
    setForm((f) => ({
      ...f,
      jobCardId,
      customerId: jc?.customerId?._id || jc?.customerId || f.customerId,
      vehicleId: jc?.vehicleId?._id || jc?.vehicleId || f.vehicleId,
      vehicleNumber: jc?.vehicleId?.vehicleNumber || f.vehicleNumber,
      carBrand: jc?.vehicleId?.brand || f.carBrand,
      carModel: jc?.vehicleId?.model || f.carModel,
      vehicleType: jc?.vehicleId?.vehicleType || f.vehicleType,
    }));
  };

  // When a PPF product is picked, prefill the roll name.
  const onPpfProductChange = (ppfProductId) => {
    const p = ppfProducts.find((x) => x._id === ppfProductId);
    setForm((f) => ({ ...f, ppfProductId, ppfRollName: p?.productName || f.ppfRollName }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      jobCardId: row.jobCardId?._id ?? row.jobCardId ?? '',
      ppfProductId: row.ppfProductId?._id ?? row.ppfProductId ?? '',
      ppfRollName: row.ppfRollName ?? '',
      rollNumber: row.rollNumber ?? '',
      totalRollSqft: row.totalRollSqft ?? '',
      usedSqft: row.usedSqft ?? '',
      wastageSqft: row.wastageSqft ?? '',
      usageArea: row.usageArea ?? '',
      usageDate: toDateInput(row.usageDate),
      vehicleNumber: row.vehicleNumber ?? '',
      carBrand: row.carBrand ?? '',
      carModel: row.carModel ?? '',
      vehicleType: row.vehicleType ?? '',
      remarks: row.remarks ?? '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        totalRollSqft:
          form.totalRollSqft === '' ? 0 : Number(form.totalRollSqft),
        usedSqft: form.usedSqft === '' ? 0 : Number(form.usedSqft),
        wastageSqft: form.wastageSqft === '' ? 0 : Number(form.wastageSqft),
      };
      if (editingId) {
        await ppfUsageApi.update(editingId, payload);
        toast.success('PPF usage updated');
      } else {
        await ppfUsageApi.create(payload);
        toast.success('PPF usage created');
      }
      closeModal();
      await loadList();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = confirmId;
    setConfirmId(null);
    if (!id) return;
    await ppfUsageApi.remove(id);
    toast.success('PPF usage deleted');
    await loadList();
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'vehicleNumber', label: 'Vehicle Number' },
    {
      key: 'usageArea',
      label: 'Usage Area',
      render: (row) =>
        row.usageArea ? <StatusBadge status={row.usageArea} /> : '-',
    },
    {
      key: 'usedSqft',
      label: 'Used Sqft',
      render: (row) => sqft(row.usedSqft),
    },
    {
      key: 'wastageSqft',
      label: 'Wastage Sqft',
      render: (row) => sqft(row.wastageSqft),
    },
    {
      key: 'remainingSqft',
      label: 'Remaining Sqft',
      render: (row) => {
        const remaining =
          row.remainingSqft != null
            ? row.remainingSqft
            : Number(row.totalRollSqft ?? 0) -
              Number(row.usedSqft ?? 0) -
              Number(row.wastageSqft ?? 0);
        return sqft(remaining);
      },
    },
    {
      key: 'usageDate',
      label: 'Usage Date',
      render: (row) =>
        row.usageDate
          ? new Date(row.usageDate).toLocaleDateString('en-IN')
          : '-',
    },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmId(row._id);
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
        title="PPF Usage"
        actions={<Button onClick={openCreate}>Add PPF Usage</Button>}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Input
            label="Search"
            placeholder="Vehicle / brand / area"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {_buControls}
          <Select label="PPF Product" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="">All products</option>
            {ppfProducts.map((p) => <option key={p._id} value={p._id}>{p.productName}</option>)}
          </Select>
          {(search || productFilter) && (
            <div><Button variant="ghost" size="sm" onClick={() => { setSearch(''); setProductFilter(''); }}>Clear filters</Button></div>
          )}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={pagedRows}
            loading={loading}
            emptyMessage="No PPF usage records found"
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={_buFiltered.length} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit PPF Usage' : 'Add PPF Usage'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Job Card"
              value={form.jobCardId}
              onChange={(e) => onJobCardChange(e.target.value)}
            >
              <option value="">Select job card…</option>
              {jobCards.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.jobCardNumber} — {j.customerId?.name || ''}{j.vehicleId?.vehicleNumber ? ` (${j.vehicleId.vehicleNumber})` : ''}
                </option>
              ))}
            </Select>
            <Select
              label="PPF Product"
              value={form.ppfProductId}
              onChange={(e) => onPpfProductChange(e.target.value)}
            >
              <option value="">Select PPF film…</option>
              {ppfProducts.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.productName} — ₹{p.sellingPrice}/sqft (stock {p.currentStock})
                </option>
              ))}
            </Select>
            <Input
              label="PPF Roll Name"
              value={form.ppfRollName}
              onChange={setField('ppfRollName')}
            />
            <Input
              label="Roll Number"
              value={form.rollNumber}
              onChange={setField('rollNumber')}
            />
            <Input
              label="Total Roll Sqft"
              type="number"
              min="0"
              step="0.01"
              value={form.totalRollSqft}
              onChange={setField('totalRollSqft')}
            />
            <Input
              label="Used Sqft"
              type="number"
              min="0"
              step="0.01"
              value={form.usedSqft}
              onChange={setField('usedSqft')}
            />
            <Input
              label="Wastage Sqft"
              type="number"
              min="0"
              step="0.01"
              value={form.wastageSqft}
              onChange={setField('wastageSqft')}
            />
            <Select
              label="Usage Area"
              value={form.usageArea}
              onChange={setField('usageArea')}
            >
              <option value="">Select area</option>
              {usageAreaOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Input
              label="Usage Date"
              type="date"
              value={form.usageDate}
              onChange={setField('usageDate')}
            />
            <Input
              label="Vehicle Number"
              value={form.vehicleNumber}
              onChange={setField('vehicleNumber')}
            />
            <Input
              label="Car Brand"
              value={form.carBrand}
              onChange={setField('carBrand')}
            />
            <Input
              label="Car Model"
              value={form.carModel}
              onChange={setField('carModel')}
            />
            <Select
              label="Vehicle Type"
              value={form.vehicleType}
              onChange={setField('vehicleType')}
            >
              <option value="">Select type…</option>
              {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <Textarea
            label="Remarks"
            value={form.remarks}
            onChange={setField('remarks')}
            rows={3}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete PPF Usage"
        message="Are you sure you want to delete this PPF usage record? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
