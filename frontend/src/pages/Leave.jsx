import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import leaveApi from '../api/leaveApi.js';
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
import EmployeeSelect from '../components/common/EmployeeSelect.jsx';

const PAGE_SIZE = 12;

const LEAVE_TYPE_OPTIONS = [
  { value: 'paid_leave', label: 'Paid Leave' },
  { value: 'unpaid_leave', label: 'Unpaid Leave' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'emergency_leave', label: 'Emergency Leave' },
];

const EMPTY_FORM = {
  employeeId: '',
  leaveType: 'paid_leave',
  fromDate: '',
  toDate: '',
  reason: '',
};

const formatDate = (value) => (value ? String(value).slice(0, 10) : '');

export default function Leave() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await leaveApi.list();
      setRows(Array.isArray(data) ? data : data?.items || data?.records || []);
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
    () => setPage(1)
  );

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

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
      leaveType: row.leaveType || 'paid_leave',
      fromDate: formatDate(row.fromDate),
      toDate: formatDate(row.toDate),
      reason: row.reason || '',
    });
    setModalOpen(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editingId) {
        await leaveApi.update(editingId, payload);
        toast.success('Leave updated');
      } else {
        await leaveApi.create(payload);
        toast.success('Leave created');
      }
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = confirmId;
    setConfirmId(null);
    if (!id) return;
    await leaveApi.remove(id);
    toast.success('Leave deleted');
    await load();
  };

  const handleApprove = async (id) => {
    await leaveApi.approve(id);
    toast.success('Leave approved');
    await load();
  };

  const handleReject = async (id) => {
    await leaveApi.reject(id);
    toast.success('Leave rejected');
    await load();
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
          <p className="font-medium text-slate-700">{row.employeeId?.name || '—'}</p>
          {row.employeeId?.employeeCode && <p className="text-xs text-slate-400">{row.employeeId.employeeCode}</p>}
        </div>
      ),
    },
    {
      key: 'leaveType',
      label: 'Leave Type',
      render: (row) =>
        LEAVE_TYPE_OPTIONS.find((o) => o.value === row.leaveType)?.label || row.leaveType || '-',
    },
    {
      key: 'fromDate',
      label: 'From',
      render: (row) => formatDate(row.fromDate) || '-',
    },
    {
      key: 'toDate',
      label: 'To',
      render: (row) => formatDate(row.toDate) || '-',
    },
    {
      key: 'totalDays',
      label: 'Total Days',
      render: (row) => row.totalDays ?? '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
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
            variant="success"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleApprove(row._id);
            }}
          >
            Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleReject(row._id);
            }}
          >
            Reject
          </Button>
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
        title="Leave"
        subtitle="Manage employee leave requests"
        actions={<Button onClick={openCreate}>Add Leave</Button>}
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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

      <Card padded={false}>
        {loading ? (
          <Loading label="Loading leaves…" />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={_paged}
              loading={loading}
              emptyMessage="No leave records found"
              rowKey="_id"
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={_buFiltered.length}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Leave' : 'Add Leave'}
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
          <EmployeeSelect
            value={form.employeeId}
            onChange={setField('employeeId')}
            required
          />
          <Select label="Leave Type" value={form.leaveType} onChange={setField('leaveType')}>
            {LEAVE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="From Date"
            type="date"
            value={form.fromDate}
            onChange={setField('fromDate')}
            required
          />
          <Input
            label="To Date"
            type="date"
            value={form.toDate}
            onChange={setField('toDate')}
            required
          />
          <div className="md:col-span-2">
            <Textarea
              label="Reason"
              rows={3}
              value={form.reason}
              onChange={setField('reason')}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Delete Leave"
        message="Are you sure you want to delete this leave record?"
      />
    </div>
  );
}
