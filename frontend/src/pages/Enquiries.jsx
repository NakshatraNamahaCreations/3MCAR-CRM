import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { enquiryApi } from '../api/enquiryApi.js';
import {
  Button,
  Card,
  PageHeader,
  Input,
  Select,
  Textarea,
  StatusBadge,
  Modal,
  ConfirmDialog,
} from '../components/common/ui.jsx';
import { ViewToggle, PremiumTable, NameCell, CalendarView, Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import { VEHICLE_TYPES } from '../constants/vehicleTypes.js';
import { prettyDate, toYMD } from '../utils/dateUtils.js';

const PAGE_SIZE = 12;

const STATUS_OPTIONS = ['hot', 'warm', 'cold', 'converted', 'lost'];
// Must match the Enquiry model's `source` enum exactly (underscored values).
const SOURCE_OPTIONS = [
  'walk_in', 'phone_call', 'referral', 'website', 'social_media', 'existing_customer', 'other',
];

const EMPTY_FORM = {
  name: '', phone: '', alternatePhone: '', email: '',
  vehicleNumber: '', vehicleBrand: '', vehicleModel: '', vehicleYear: '', vehicleType: '',
  source: 'walk_in', status: 'warm', notes: '',
};

const labelize = (v) =>
  String(v || '')
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

export default function Enquiries() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // YMD set by clicking a calendar day
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      const data = await enquiryApi.list();
      setRows(Array.isArray(data) ? data : data?.items || data?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEnquiries(); }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (sourceFilter && r.source !== sourceFilter) return false;
      if (dateFilter && toYMD(r.createdAt) !== dateFilter) return false;
      if (!term) return true;
      const haystack = [r.name, r.phone, r.alternatePhone, r.vehicleNumber]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, search, statusFilter, sourceFilter, dateFilter]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(filteredRows, () => setPage(1));

  // Reset to first page whenever the result set changes.
  useEffect(() => { setPage(1); }, [search, statusFilter, sourceFilter, dateFilter, view]);

  const pagedRows = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '', phone: row.phone || '', alternatePhone: row.alternatePhone || '',
      email: row.email || '', vehicleNumber: row.vehicleNumber || '', vehicleBrand: row.vehicleBrand || '',
      vehicleModel: row.vehicleModel || '', vehicleYear: row.vehicleYear || '', vehicleType: row.vehicleType || '',
      source: row.source || 'walk_in', status: row.status || 'warm', notes: row.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => { if (saving) return; setModalOpen(false); setEditing(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : undefined };
      if (editing) { await enquiryApi.update(editing._id, payload); toast.success('Enquiry updated'); }
      else { await enquiryApi.create(payload); toast.success('Enquiry created'); }
      setModalOpen(false); setEditing(null); await loadEnquiries();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await enquiryApi.remove(deleteTarget._id);
      toast.success('Enquiry deleted');
      setDeleteTarget(null);
      await loadEnquiries();
    } finally { setDeleting(false); }
  };

  const columns = [
    {
      key: 'sl', label: 'Sl. No.', width: '64px',
      render: (_row, index) => (
        <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span>
      ),
    },
    {
      key: 'name', label: 'Customer',
      render: (row) => <NameCell name={row.name} sub={row.email || labelize(row.source)} />,
    },
    { key: 'phone', label: 'Phone', render: (row) => <span className="font-medium text-slate-700">{row.phone || '—'}</span> },
    {
      key: 'vehicle', label: 'Vehicle',
      render: (row) => {
        const v = [row.vehicleBrand, row.vehicleModel].filter(Boolean).join(' ');
        return (
          <div>
            <p className="font-medium text-slate-700">{row.vehicleNumber || '—'}</p>
            {v && <p className="text-xs text-slate-400">{v}</p>}
          </div>
        );
      },
    },
    { key: 'source', label: 'Source', render: (row) => (row.source ? <StatusBadge status={row.source} /> : '—') },
    { key: 'status', label: 'Status', render: (row) => (row.status ? <StatusBadge status={row.status} /> : '—') },
    { key: 'createdAt', label: 'Created', render: (row) => <span className="text-slate-500">{prettyDate(row.createdAt)}</span> },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); navigate(`/enquiries/${row._id}`); }}>View</Button>
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enquiries"
        subtitle="Capture and track every lead from first contact to conversion."
        actions={
          <div className="flex items-center gap-3">
            <ViewToggle view={view} onChange={setView} />
            <Button variant="primary" onClick={openCreate}>+ Add Enquiry</Button>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Search name / phone / vehicle" value={search} onChange={(e) => setSearch(e.target.value)} />
          {_buControls}
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
          </Select>
          <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All Sources</option>
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
          </Select>
          {(search || statusFilter || sourceFilter) && (
            <Button variant="ghost" onClick={() => { setSearch(''); setStatusFilter(''); setSourceFilter(''); }}>
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Active date filter banner (set by clicking a calendar day) */}
      {dateFilter && (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-700">
            Showing enquiries created on <b>{prettyDate(dateFilter)}</b> ({filteredRows.length})
          </span>
          <Button size="sm" variant="secondary" onClick={() => setDateFilter('')}>Clear date</Button>
        </div>
      )}

      {view === 'list' ? (
        <>
          <PremiumTable
            columns={columns}
            rows={pagedRows}
            loading={loading}
            emptyMessage="No enquiries found."
            rowKey="_id"
            onRowClick={(row) => navigate(`/enquiries/${row._id}`)}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={_buFiltered.length} onPageChange={setPage} />
        </>
      ) : (
        <CalendarView
          records={filteredRows}
          getDate={(r) => r.createdAt}
          mode="count"
          countNoun="enquiry"
          onDayClick={(ymd) => { setDateFilter(ymd); setView('list'); }}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Enquiry' : 'Add Enquiry'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Name" required value={form.name} onChange={(e) => setField('name', e.target.value)} />
            <Input label="Phone" required value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            <Input label="Alternate Phone" value={form.alternatePhone} onChange={(e) => setField('alternatePhone', e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            <Input label="Vehicle Number" value={form.vehicleNumber} onChange={(e) => setField('vehicleNumber', e.target.value)} />
            <Input label="Vehicle Brand" value={form.vehicleBrand} onChange={(e) => setField('vehicleBrand', e.target.value)} />
            <Input label="Vehicle Model" value={form.vehicleModel} onChange={(e) => setField('vehicleModel', e.target.value)} />
            <Input label="Vehicle Year" type="number" value={form.vehicleYear} onChange={(e) => setField('vehicleYear', e.target.value)} />
            <Select label="Vehicle Type" value={form.vehicleType} onChange={(e) => setField('vehicleType', e.target.value)}>
              <option value="">Select type…</option>
              {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Select label="Source" value={form.source} onChange={(e) => setField('source', e.target.value)}>
              {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
            </Select>
          </div>
          <Textarea label="Notes" rows={3} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Enquiry"
        message={`Are you sure you want to delete the enquiry for "${deleteTarget?.name || ''}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => (deleting ? null : setDeleteTarget(null))}
      />
    </div>
  );
}
