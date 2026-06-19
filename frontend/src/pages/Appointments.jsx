import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import appointmentApi from '../api/appointmentApi.js';
import jobCardApi from '../api/jobCardApi.js';
import {
  Button, Card, PageHeader, Input, Select, Textarea, StatusBadge, Modal, ConfirmDialog,
} from '../components/common/ui.jsx';
import { PremiumTable, NameCell, CalendarView, ViewToggle, Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import { prettyDate, toYMD } from '../utils/dateUtils.js';

const PAGE_SIZE = 12;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const emptyForm = { appointmentDate: '', appointmentTime: '', serviceType: '', status: 'draft', notes: '' };

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

export default function Appointments() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [jobCardByAppt, setJobCardByAppt] = useState({}); // appointmentId -> jobCard
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [view, setView] = useState('calendar'); // default to calendar
  const [dateFilter, setDateFilter] = useState(''); // YMD picked from the calendar

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadList = async () => {
    setLoading(true);
    try {
      const [appts, jcs] = await Promise.all([
        appointmentApi.list(statusFilter ? { status: statusFilter } : undefined),
        jobCardApi.list().catch(() => []),
      ]);
      setRows(Array.isArray(appts) ? appts : appts?.items || []);
      const map = {};
      (Array.isArray(jcs) ? jcs : []).forEach((jc) => {
        const aid = jc.appointmentId?._id || jc.appointmentId;
        if (aid) map[aid] = jc;
      });
      setJobCardByAppt(map);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadList(); }, [statusFilter]);

  // List view rows narrowed to a clicked calendar day (if any).
  const listRows = useMemo(
    () => (dateFilter ? rows.filter((r) => toYMD(r.appointmentDate) === dateFilter) : rows),
    [rows, dateFilter]
  );

  const _searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return listRows;
    return listRows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [listRows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(_searched, () => setPage(1));

  useEffect(() => { setPage(1); }, [search, statusFilter, dateFilter]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      appointmentDate: toDateInput(row.appointmentDate),
      appointmentTime: row.appointmentTime || '',
      serviceType: row.serviceType || '',
      status: row.status || 'draft',
      notes: row.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(emptyForm); };
  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) { await appointmentApi.update(editingId, form); toast.success('Appointment updated'); }
      else { await appointmentApi.create(form); toast.success('Appointment created'); }
      closeModal();
      await loadList();
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await appointmentApi.remove(deleteTarget._id);
      toast.success('Appointment deleted');
      await loadList();
    } finally { setConfirmOpen(false); setDeleteTarget(null); }
  };

  const handleCreateJobCard = async (row) => {
    if (['cancelled', 'no_show'].includes(row.status)) {
      toast.error('Cannot create a job card for a cancelled / no-show appointment');
      return;
    }
    setBusyId(row._id);
    try {
      const jc = await appointmentApi.createJobCard(row._id);
      toast.success(`Job card ${jc?.jobCardNumber || ''} created`);
      navigate('/job-cards');
    } finally { setBusyId(null); }
  };

  const customerSub = (row) =>
    [row.customerId?.phone, row.appointmentTime].filter(Boolean).join(' · ');

  const columns = useMemo(() => [
    { key: 'sl', label: 'Sl. No.', width: '64px', render: (_r, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'appointmentNumber', label: 'Number', render: (r) => <span className="font-semibold text-slate-700">{r.appointmentNumber || '—'}</span> },
    {
      key: 'customer', label: 'Customer',
      render: (r) => <NameCell name={r.customerId?.name || 'Walk-in'} sub={customerSub(r)} />,
    },
    {
      key: 'vehicle', label: 'Vehicle',
      render: (r) => r.vehicleId?.vehicleNumber || r.serviceType || '—',
    },
    {
      key: 'quote', label: 'Quotation',
      render: (r) => {
        const qid = r.quoteId?._id || r.quoteId;
        if (!qid) return <span className="text-slate-400">—</span>;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${qid}`); }}
            className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
            title="View confirmed quotation"
          >
            {r.quoteId?.quoteNumber || 'View quote'}
          </button>
        );
      },
    },
    {
      key: 'appointmentDate', label: 'Date & Time',
      render: (r) => (
        <div className="leading-tight">
          <div className="text-slate-700">{prettyDate(r.appointmentDate)}</div>
          {r.appointmentTime && <div className="text-xs text-slate-400">{r.appointmentTime}</div>}
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (row) => {
        const existingJC = jobCardByAppt[row._id];
        const blocked = ['cancelled', 'no_show'].includes(row.status);
        return (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
            {existingJC ? (
              <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); navigate('/job-cards'); }}>
                View Job Card
              </Button>
            ) : (
              <Button
                size="sm"
                variant="success"
                disabled={blocked || busyId === row._id}
                title={blocked ? 'Appointment is cancelled / no-show' : 'Create job card from this appointment'}
                onClick={(e) => { e.stopPropagation(); handleCreateJobCard(row); }}
              >
                {busyId === row._id ? 'Creating…' : 'Create Job Card'}
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); setConfirmOpen(true); }}>Delete</Button>
          </div>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [jobCardByAppt, busyId, page]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Appointments"
        subtitle="Schedule visits and turn them into job cards."
        actions={
          <div className="flex items-center gap-3">
            <ViewToggle view={view} onChange={setView} />
            <Button onClick={openCreate}>+ Add Appointment</Button>
          </div>
        }
      />

      {view === 'list' && (
        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Input label="Search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {_buControls}
          </div>
        </Card>
      )}

      {view === 'list' && dateFilter && (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-700">
            Showing appointments on <b>{prettyDate(dateFilter)}</b> ({listRows.length})
          </span>
          <Button size="sm" variant="secondary" onClick={() => setDateFilter('')}>Clear date</Button>
        </div>
      )}

      {view === 'list' ? (
        <>
          <PremiumTable
            columns={columns}
            rows={_paged}
            loading={loading}
            emptyMessage="No appointments found."
            rowKey="_id"
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={_buFiltered.length} onPageChange={setPage} />
        </>
      ) : (
        <CalendarView
          records={rows}
          getDate={(r) => r.appointmentDate}
          mode="count"
          countNoun="appointment"
          onDayClick={(ymd) => { setDateFilter(ymd); setView('list'); }}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Appointment' : 'New Appointment'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button form="appointment-form" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        }
      >
        <form id="appointment-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Appointment Date" type="date" value={form.appointmentDate} onChange={(e) => handleChange('appointmentDate', e.target.value)} />
            <Input label="Appointment Time" type="time" value={form.appointmentTime} onChange={(e) => handleChange('appointmentTime', e.target.value)} />
          </div>
          <Input label="Service Type" value={form.serviceType} onChange={(e) => handleChange('serviceType', e.target.value)} />
          <Select label="Status" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
            {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
          <Textarea label="Notes" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3} />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Appointment"
        message={`Are you sure you want to delete appointment ${deleteTarget?.appointmentNumber || ''}? This cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
      />
    </div>
  );
}
