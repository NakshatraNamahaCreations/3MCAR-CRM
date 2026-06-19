import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quoteFollowupApi } from '../api/quoteFollowupApi.js';
import { quoteApi } from '../api/quoteApi.js';
import {
  Button, Card, PageHeader, Input, Select, Textarea, StatusBadge, Modal, ConfirmDialog,
} from '../components/common/ui.jsx';
import { ViewToggle, PremiumTable, NameCell, CalendarView, Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import { prettyDate, toYMD, startOfMonth, endOfMonth } from '../utils/dateUtils.js';

const PAGE_SIZE = 12;
const STATUS_OPTIONS = ['pending', 'call_later', 'confirmed', 'not_interested'];
const labelize = (v) =>
  String(v || '').split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

const EMPTY_FORM = { quoteId: '', followupDate: '', followupTime: '', status: 'pending', remarks: '' };

const today = new Date();
const DEFAULT_FROM = toYMD(new Date(today.getFullYear(), today.getMonth() - 2, 1));
const DEFAULT_TO = toYMD(new Date(today.getFullYear(), today.getMonth() + 3, 0));

const quoteLabel = (q) => {
  if (!q) return '—';
  if (typeof q === 'string') return q;
  return q.quoteNumber || q.customerName || '—';
};

export default function QuoteFollowups() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [quickFilter, setQuickFilter] = useState('all'); // all | today | pending
  const [range, setRange] = useState({ from: DEFAULT_FROM, to: DEFAULT_TO });
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      let data;
      if (quickFilter === 'today') data = await quoteFollowupApi.today();
      else if (quickFilter === 'pending') data = await quoteFollowupApi.pending();
      else data = await quoteFollowupApi.list({ from: range.from, to: range.to });
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally { setLoading(false); }
  };

  const loadQuotes = async () => {
    try {
      const data = await quoteApi.list();
      setQuotes(Array.isArray(data) ? data : data?.items || []);
    } catch { /* non-fatal */ }
  };

  useEffect(() => { loadQuotes(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFollowups(); }, [quickFilter, range.from, range.to]);

  // Day-filter from calendar
  const [dateFilter, setDateFilter] = useState('');
  const filteredRows = useMemo(
    () => (dateFilter ? rows.filter((r) => toYMD(r.followupDate) === dateFilter) : rows),
    [rows, dateFilter]
  );
  useEffect(() => { setPage(1); }, [dateFilter, quickFilter, range.from, range.to, view, rows.length]);
  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(filteredRows, () => setPage(1));
  const pagedRows = useMemo(() => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [_buFiltered, page]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      quoteId: row.quoteId?._id || row.quoteId || '',
      followupDate: row.followupDate ? String(row.followupDate).slice(0, 10) : '',
      followupTime: row.followupTime || '',
      status: row.status || 'pending',
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quoteId) { toast.error('Please select a quote'); return; }
    if (!form.followupDate) { toast.error('Followup date is required'); return; }
    setSaving(true);
    try {
      if (editing) { await quoteFollowupApi.update(editing._id, form); toast.success('Followup updated'); }
      else { await quoteFollowupApi.create(form); toast.success('Followup created'); }
      setModalOpen(false); setEditing(null); await loadFollowups();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await quoteFollowupApi.remove(deleteTarget._id); toast.success('Followup deleted'); setDeleteTarget(null); await loadFollowups(); }
    catch { setDeleteTarget(null); }
  };

  const isOverdue = (row) => {
    if (!row.followupDate) return false;
    if (['confirmed', 'not_interested'].includes(row.status)) return false;
    return new Date(row.followupDate) < new Date(toYMD(new Date()));
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', width: '64px', render: (_r, i) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</span> },
    {
      key: 'quote', label: 'Quote',
      render: (r) => {
        const qid = r.quoteId?._id || r.quoteId;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (qid) navigate(`/quotes/${qid}`); }}
            className="text-left transition hover:opacity-80"
            title="Open quote details"
          >
            <NameCell name={quoteLabel(r.quoteId)} sub={r.quoteId?.customerName || r.quoteId?.phone} />
          </button>
        );
      },
    },
    {
      key: 'followupDate', label: 'Date & Time',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-700">{prettyDate(r.followupDate)}</p>
          <p className="text-xs text-slate-400">{r.followupTime || 'Any time'}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => (r.status ? <StatusBadge status={r.status} /> : '—') },
    { key: 'flag', label: '', render: (r) => (isOverdue(r) ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Overdue</span> : null) },
    { key: 'remarks', label: 'Remarks', render: (r) => <span className="text-slate-500">{r.remarks || '—'}</span> },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (r) => {
        const qid = r.quoteId?._id || r.quoteId;
        return (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); if (qid) navigate(`/quotes/${qid}`); }}>View Quote</Button>
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Edit</Button>
            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}>Delete</Button>
          </div>
        );
      },
    },
  ];

  const onCalendarMonthChange = ({ year, month }) => {
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
        title="Quote Followups"
        subtitle="Track follow-ups on sent quotations until they convert."
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
              <QuickPill id="pending" label="Pending" />
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
          <PremiumTable columns={columns} rows={pagedRows} loading={loading} emptyMessage="No quote followups in this range." rowKey="_id" onRowClick={openEdit} />
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
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit Quote Followup' : 'Add Quote Followup'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Select label="Quote" value={form.quoteId} onChange={(e) => setField('quoteId', e.target.value)}>
            <option value="">Select a quote…</option>
            {quotes.map((q) => (
              <option key={q._id} value={q._id}>
                {q.quoteNumber} — {q.customerName}{q.phone ? ` (${q.phone})` : ''}
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
        title="Delete Quote Followup"
        message="Are you sure you want to delete this followup? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
