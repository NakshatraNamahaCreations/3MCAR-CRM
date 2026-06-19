import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import attendanceApi from '../api/attendanceApi.js';
import employeeApi from '../api/employeeApi.js';
import {
  Button,
  Card,
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
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';

const PAGE_SIZE = 12;

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'paid_leave', label: 'Paid Leave' },
  { value: 'unpaid_leave', label: 'Unpaid Leave' },
  { value: 'weekly_off', label: 'Weekly Off' },
  { value: 'holiday', label: 'Holiday' },
];

const EMPTY_FORM = {
  employeeId: '',
  attendanceDate: '',
  checkInTime: '',
  checkOutTime: '',
  status: 'present',
  overtimeHours: '',
  remarks: '',
};

const formatDate = (value) => (value ? String(value).slice(0, 10) : '');
const todayYMD = () => new Date().toISOString().slice(0, 10);
const empName = (row) => row.employeeId?.name || '—';
const empCode = (row) => row.employeeId?.employeeCode || '';

export default function Attendance() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [confirmId, setConfirmId] = useState(null);

  // Bulk daily register
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(todayYMD());
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = async (date) => {
    setLoading(true);
    try {
      const data = date ? await attendanceApi.byDate(date) : await attendanceApi.list();
      setRows(Array.isArray(data) ? data : data?.items || data?.records || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const data = await employeeApi.list({ status: 'active' });
        const list = Array.isArray(data) ? data : data?.items || [];
        setEmployees(list);
      } catch { /* non-fatal */ }
    })();
  }, []);

  // Open the bulk register: pre-fill every active employee as Present.
  const openBulk = async () => {
    let list = employees;
    if (!list.length) {
      try {
        const data = await employeeApi.list({ status: 'active' });
        list = Array.isArray(data) ? data : data?.items || [];
        setEmployees(list);
      } catch { /* non-fatal */ }
    }
    setBulkDate(todayYMD());
    setBulkSearch('');
    setBulkRows(
      list.map((e) => ({
        employeeId: e._id,
        name: e.name,
        code: e.employeeCode,
        status: 'present',
        overtimeHours: '',
      }))
    );
    setBulkOpen(true);
  };

  const setBulkAll = (status) =>
    setBulkRows((rs) => rs.map((r) => ({ ...r, status })));

  const setBulkField = (employeeId, key, value) =>
    setBulkRows((rs) => rs.map((r) => (r.employeeId === employeeId ? { ...r, [key]: value } : r)));

  const filteredBulk = useMemo(() => {
    const t = bulkSearch.trim().toLowerCase();
    if (!t) return bulkRows;
    return bulkRows.filter((r) => `${r.name} ${r.code}`.toLowerCase().includes(t));
  }, [bulkRows, bulkSearch]);

  const bulkCounts = useMemo(() => {
    const c = {};
    bulkRows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [bulkRows]);

  const handleBulkSave = async () => {
    if (!bulkDate) { toast.error('Pick a date'); return; }
    if (!bulkRows.length) { toast.error('No employees to mark'); return; }
    setBulkSaving(true);
    try {
      const res = await attendanceApi.bulkMark({
        attendanceDate: bulkDate,
        records: bulkRows.map((r) => ({
          employeeId: r.employeeId,
          status: r.status,
          overtimeHours: r.overtimeHours === '' ? undefined : Number(r.overtimeHours),
        })),
      });
      toast.success(`Attendance saved for ${res?.count ?? bulkRows.length} employees`);
      setBulkOpen(false);
      setFilterDate(bulkDate);
      await load(bulkDate);
    } finally {
      setBulkSaving(false);
    }
  };

  const _searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(_searched, () => setPage(1));

  useEffect(() => {
    setPage(1);
  }, [search, filterDate]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page],
  );

  const handleFilterChange = (e) => {
    const date = e.target.value;
    setFilterDate(date);
    load(date);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      employeeId:
        typeof row.employeeId === 'object' && row.employeeId
          ? row.employeeId._id || ''
          : row.employeeId || '',
      attendanceDate: formatDate(row.attendanceDate),
      checkInTime: row.checkInTime || '',
      checkOutTime: row.checkOutTime || '',
      status: row.status || 'present',
      overtimeHours: row.overtimeHours ?? '',
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        overtimeHours: form.overtimeHours === '' ? undefined : Number(form.overtimeHours),
      };
      if (editingId) {
        await attendanceApi.update(editingId, payload);
        toast.success('Attendance updated');
      } else {
        await attendanceApi.create(payload);
        toast.success('Attendance added');
      }
      setModalOpen(false);
      await load(filterDate);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = confirmId;
    setConfirmId(null);
    if (!id) return;
    await attendanceApi.remove(id);
    toast.success('Attendance deleted');
    await load(filterDate);
  };

  const columns = [
    {
      key: 'sl',
      label: 'Sl. No.',
      className: 'w-16',
      render: (_row, index) => (
        <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span>
      ),
    },
    {
      key: 'employee',
      label: 'Employee',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-700">{empName(row)}</p>
          {empCode(row) && <p className="text-xs text-slate-400">{empCode(row)}</p>}
        </div>
      ),
    },
    {
      key: 'attendanceDate',
      label: 'Date',
      render: (row) => formatDate(row.attendanceDate),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'totalWorkingHours',
      label: 'Working Hours',
      render: (row) => row.totalWorkingHours ?? '-',
    },
    {
      key: 'overtimeHours',
      label: 'Overtime (₹)',
      render: (row) => (row.overtimeHours != null ? `₹${row.overtimeHours}` : '-'),
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span>,
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
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
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Track daily attendance and overtime"
        actions={
          <div className="flex gap-2">
            <Button variant="primary" onClick={openBulk}>Daily Register</Button>
            <Button variant="secondary" onClick={openCreate}>Add Single</Button>
          </div>
        }
      />

      <Card padded={false} className="p-4 mb-4">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Input
            label="Filter by date"
            type="date"
            value={filterDate}
            onChange={handleFilterChange}
          />
          <Input
            label="Search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {_buControls}
        </div>
      </Card>

      <Card padded={false}>
        {loading ? (
          <Loading label="Loading attendance…" />
        ) : (
          <DataTable
            columns={columns}
            rows={_paged}
            loading={loading}
            emptyMessage="No attendance records found"
            rowKey="_id"
          />
        )}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={_buFiltered.length}
          onPageChange={setPage}
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Attendance' : 'Add Attendance'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Employee"
            value={form.employeeId}
            onChange={setField('employeeId')}
            required
          >
            <option value="">Select employee…</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}{e.employeeCode ? ` (${e.employeeCode})` : ''}
              </option>
            ))}
          </Select>
          <Input
            label="Attendance Date"
            type="date"
            value={form.attendanceDate}
            onChange={setField('attendanceDate')}
            required
          />
          <Input
            label="Check In Time"
            value={form.checkInTime}
            onChange={setField('checkInTime')}
            placeholder="09:00"
          />
          <Input
            label="Check Out Time"
            value={form.checkOutTime}
            onChange={setField('checkOutTime')}
            placeholder="18:00"
          />
          <Select label="Status" value={form.status} onChange={setField('status')}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Overtime Hours"
            type="number"
            step="0.5"
            min="0"
            value={form.overtimeHours}
            onChange={setField('overtimeHours')}
          />
          <div className="md:col-span-2">
            <Textarea
              label="Remarks"
              rows={3}
              value={form.remarks}
              onChange={setField('remarks')}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={bulkOpen}
        onClose={() => !bulkSaving && setBulkOpen(false)}
        title="Daily Attendance Register"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>
              Cancel
            </Button>
            <Button onClick={handleBulkSave} disabled={bulkSaving}>
              {bulkSaving ? 'Saving…' : `Save (${bulkRows.length})`}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Date" type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} />
            <Input label="Search employee" placeholder="Name or code…" value={bulkSearch} onChange={(e) => setBulkSearch(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs font-medium text-slate-500">Mark all:</span>
            <Button size="sm" variant="secondary" onClick={() => setBulkAll('present')}>Present</Button>
            <Button size="sm" variant="secondary" onClick={() => setBulkAll('absent')}>Absent</Button>
            <Button size="sm" variant="secondary" onClick={() => setBulkAll('weekly_off')}>Weekly Off</Button>
            <Button size="sm" variant="secondary" onClick={() => setBulkAll('holiday')}>Holiday</Button>
            <span className="ml-auto text-xs text-slate-500">
              P: {bulkCounts.present || 0} · A: {bulkCounts.absent || 0} · Total: {bulkRows.length}
            </span>
          </div>

          {bulkRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No active employees found.</p>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2 w-40">Status</th>
                    <th className="px-3 py-2 w-28">OT (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBulk.map((r) => (
                    <tr key={r.employeeId} className="border-b border-slate-50">
                      <td className="px-3 py-1.5">
                        <span className="font-medium text-slate-700">{r.name}</span>
                        {r.code && <span className="ml-1 text-xs text-slate-400">({r.code})</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        <Select value={r.status} onChange={(e) => setBulkField(r.employeeId, 'status', e.target.value)}>
                          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                      </td>
                      <td className="px-3 py-1.5">
                        <Input type="number" step="0.5" min="0" value={r.overtimeHours} onChange={(e) => setBulkField(r.employeeId, 'overtimeHours', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-slate-400">Re-saving the same date updates existing records (no duplicates).</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Delete Attendance"
        message="Are you sure you want to delete this attendance record?"
      />
    </div>
  );
}
