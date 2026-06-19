import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { enquiryFollowupApi } from '../api/enquiryFollowupApi.js';
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
import { prettyDate, toYMD, startOfMonth, endOfMonth } from '../utils/dateUtils.js';

const PAGE_SIZE = 12;

const STATUS_OPTIONS = ['call_later', 'confirmed', 'pending', 'not_interested'];

const EMPTY_FORM = {
  enquiryId: '', followupDate: '', followupTime: '', status: 'pending', remarks: '',
};

const labelize = (v) =>
  String(v || '')
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');


// Wide default window so the list view shows everything relevant.
const today = new Date();
const DEFAULT_FROM = toYMD(new Date(today.getFullYear(), today.getMonth() - 2, 1));
const DEFAULT_TO = toYMD(new Date(today.getFullYear(), today.getMonth() + 3, 0));

const enquiryLabel = (enq) => {
  if (!enq) return '—';
  if (typeof enq === 'string') return enq;
  return enq.name || enq.phone || '—';
};

export default function Followups() {
  const [rows, setRows] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [quickFilter, setQuickFilter] = useState('all'); // all | today | overdue
  const [range, setRange] = useState({ from: DEFAULT_FROM, to: DEFAULT_TO });
  const [dateFilter, setDateFilter] = useState(''); // YMD set by clicking a calendar day
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      let data;
      if (quickFilter === 'today') data = await enquiryFollowupApi.today();
      else if (quickFilter === 'overdue') data = await enquiryFollowupApi.overdue();
      else data = await enquiryFollowupApi.calendar(range.from, range.to);
      setRows(Array.isArray(data) ? data : data?.items || data?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  const loadEnquiries = async () => {
    try {
      const data = await enquiryApi.list();
      setEnquiries(Array.isArray(data) ? data : data?.items || data?.rows || []);
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => { loadEnquiries(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFollowups(); }, [quickFilter, range.from, range.to]);

  // When a calendar day is clicked, narrow the list to that day.
  const filteredRows = useMemo(
    () => (dateFilter ? rows.filter((r) => toYMD(r.followupDate) === dateFilter) : rows),
    [rows, dateFilter]
  );
  useEffect(() => { setPage(1); }, [dateFilter, quickFilter, range.from, range.to, view, rows.length]);
  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(filteredRows, () => setPage(1));
  const pagedRows = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      enquiryId: row.enquiryId?._id || row.enquiryId || '',
      followupDate: row.followupDate ? String(row.followupDate).slice(0, 10) : '',
      followupTime: row.followupTime || '',
      status: row.status || 'pending',
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => { if (saving) return; setModalOpen(false); setEditing(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.enquiryId) { toast.error('Please select an enquiry'); return; }
    if (!form.followupDate) { toast.error('Followup date is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) { await enquiryFollowupApi.update(editing._id, payload); toast.success('Followup updated'); }
      else { await enquiryFollowupApi.create(payload); toast.success('Followup created'); }
      setModalOpen(false); setEditing(null); await loadFollowups();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await enquiryFollowupApi.remove(deleteTarget._id);
      toast.success('Followup deleted');
      setDeleteTarget(null);
      await loadFollowups();
    } finally { setDeleting(false); }
  };

  const isOverdue = (row) => {
    if (!row.followupDate) return false;
    if (['confirmed', 'not_interested'].includes(row.status)) return false;
    return new Date(row.followupDate) < new Date(toYMD(new Date()));
  };

  const columns = [
    {
      key: 'sl', label: 'Sl. No.', width: '64px',
      render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span>,
    },
    {
      key: 'enquiry', label: 'Enquiry',
      render: (row) => <NameCell name={enquiryLabel(row.enquiryId)} sub={row.enquiryId?.phone || row.enquiryId?.vehicleNumber} />,
    },
    {
      key: 'followupDate', label: 'Date & Time',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-700">{prettyDate(row.followupDate)}</p>
          <p className="text-xs text-slate-400">{row.followupTime || 'Any time'}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (row) => (row.status ? <StatusBadge status={row.status} /> : '—') },
    {
      key: 'flag', label: '',
      render: (row) => (isOverdue(row) ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Overdue</span> : null),
    },
    { key: 'remarks', label: 'Remarks', render: (row) => <span className="text-slate-500">{row.remarks || '—'}</span> },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}>Delete</Button>
        </div>
      ),
    },
  ];


  const onCalendarMonthChange = ({ year, month }) => {
    // When browsing the calendar, widen the fetched range to that month.
    if (quickFilter !== 'all') setQuickFilter('all');
    setRange({ from: toYMD(startOfMonth(year, month)), to: toYMD(endOfMonth(year, month)) });
  };

  const QuickPill = ({ id, label }) => (
    <button
      onClick={() => { setQuickFilter(id); setDateFilter(''); }}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        quickFilter === id ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enquiry Followups"
        subtitle="Stay on top of every callback, scheduled in a calendar or list."
        actions={
          <div className="flex items-center gap-3">
            <ViewToggle view={view} onChange={setView} />
            <Button variant="primary" onClick={openCreate}>+ Add Followup</Button>
          </div>
        }
      />

      {view === 'list' && (
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <QuickPill id="all" label="All" />
              <QuickPill id="today" label="Today" />
              <QuickPill id="overdue" label="Overdue" />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {quickFilter === 'all' && (
                <>
                  <Input label="From" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
                  <Input label="To" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
                </>
              )}
              {_buControls}
            </div>
          </div>
        </Card>
      )}

      {view === 'list' && dateFilter && (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-700">
            Showing followups on <b>{prettyDate(dateFilter)}</b> ({filteredRows.length})
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
            emptyMessage="No followups in this range."
            rowKey="_id"
            onRowClick={openEdit}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={_buFiltered.length} onPageChange={setPage} />
        </>
      ) : (
        <CalendarView
          records={rows}
          getDate={(r) => r.followupDate}
          mode="count"
          countNoun="followup"
          onDayClick={(ymd) => { setDateFilter(ymd); setView('list'); }}
          onMonthChange={onCalendarMonthChange}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Followup' : 'Add Followup'}
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
          <Select label="Enquiry" value={form.enquiryId} onChange={(e) => setField('enquiryId', e.target.value)}>
            <option value="">Select an enquiry…</option>
            {enquiries.map((enq) => (
              <option key={enq._id} value={enq._id}>
                {enq.name} — {enq.phone}{enq.vehicleNumber ? ` (${enq.vehicleNumber})` : ''}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Followup Date" type="date" value={form.followupDate} onChange={(e) => setField('followupDate', e.target.value)} required />
            <Input label="Followup Time" type="time" value={form.followupTime} onChange={(e) => setField('followupTime', e.target.value)} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
          </Select>
          <Textarea label="Remarks" rows={3} value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Followup"
        message="Are you sure you want to delete this followup? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => (deleting ? null : setDeleteTarget(null))}
      />
    </div>
  );
}
