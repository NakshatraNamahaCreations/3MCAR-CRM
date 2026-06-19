import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import salaryAdvanceApi from '../api/salaryAdvanceApi.js';
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
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import EmployeeSelect from '../components/common/EmployeeSelect.jsx';
import DataTable from '../components/tables/DataTable.jsx';

const PAGE_SIZE = 12;

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const REPAYMENT_MODES = [
  { value: 'salary_deduction', label: 'Salary Deduction' },
  { value: 'manual', label: 'Manual' },
];

const emptyForm = {
  employeeId: '',
  advanceDate: '',
  amount: '',
  reason: '',
  paymentMode: 'cash',
  repaymentMode: 'salary_deduction',
  deductionMonth: '',
  deductionYear: '',
  remarks: '',
};

const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');
const fmtMoney = (v) =>
  v === null || v === undefined || v === '' ? '-' : `₹${Number(v).toLocaleString('en-IN')}`;

export default function SalaryAdvance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const _searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(
    _searched,
    () => setPage(1)
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await salaryAdvanceApi.list();
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      employeeId: row.employeeId?._id || row.employeeId || '',
      advanceDate: fmtDate(row.advanceDate),
      amount: row.amount ?? '',
      reason: row.reason || '',
      paymentMode: row.paymentMode || 'cash',
      repaymentMode: row.repaymentMode || 'salary_deduction',
      deductionMonth: row.deductionMonth ?? '',
      deductionYear: row.deductionYear ?? '',
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
        amount: form.amount === '' ? undefined : Number(form.amount),
        deductionMonth: form.deductionMonth === '' ? undefined : Number(form.deductionMonth),
        deductionYear: form.deductionYear === '' ? undefined : Number(form.deductionYear),
      };
      if (editingId) {
        await salaryAdvanceApi.update(editingId, payload);
        toast.success('Salary advance updated');
      } else {
        await salaryAdvanceApi.create(payload);
        toast.success('Salary advance created');
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
    await salaryAdvanceApi.remove(id);
    toast.success('Salary advance deleted');
    await load();
  };

  const handleApprove = async (row) => {
    await salaryAdvanceApi.approve(row._id);
    toast.success('Salary advance approved');
    await load();
  };

  const handleReject = async (row) => {
    await salaryAdvanceApi.reject(row._id);
    toast.success('Salary advance rejected');
    await load();
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'employee', label: 'Employee', render: (r) => (
      <div>
        <p className="font-medium text-slate-700">{r.employeeId?.name || '—'}</p>
        {r.employeeId?.employeeCode && <p className="text-xs text-slate-400">{r.employeeId.employeeCode}</p>}
      </div>
    ) },
    { key: 'advanceDate', label: 'Advance Date', render: (r) => fmtDate(r.advanceDate) || '-' },
    { key: 'amount', label: 'Amount', render: (r) => fmtMoney(r.amount) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'deductionMonth', label: 'Deduction Month', render: (r) => r.deductionMonth ?? '-' },
    { key: 'deductionYear', label: 'Deduction Year', render: (r) => r.deductionYear ?? '-' },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-2">
          {r.status === 'pending' && (
            <>
              <Button size="sm" variant="success" onClick={() => handleApprove(r)}>
                Approve
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleReject(r)}>
                Reject
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmId(r._id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Salary Advances"
        actions={
          <Button variant="primary" onClick={openCreate}>
            Add Advance
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            label="Search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {_buControls}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={_paged}
            loading={loading}
            emptyMessage="No salary advances found."
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={_buFiltered.length}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Salary Advance' : 'Add Salary Advance'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EmployeeSelect
            value={form.employeeId}
            onChange={setField('employeeId')}
            required
          />
          <Input
            label="Advance Date"
            type="date"
            value={form.advanceDate}
            onChange={setField('advanceDate')}
            required
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={setField('amount')}
            required
          />
          <Select label="Payment Mode" value={form.paymentMode} onChange={setField('paymentMode')}>
            {PAYMENT_MODES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Repayment Mode"
            value={form.repaymentMode}
            onChange={setField('repaymentMode')}
          >
            {REPAYMENT_MODES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Deduction Month"
            type="number"
            min="1"
            max="12"
            value={form.deductionMonth}
            onChange={setField('deductionMonth')}
          />
          <Input
            label="Deduction Year"
            type="number"
            value={form.deductionYear}
            onChange={setField('deductionYear')}
          />
          <Textarea
            label="Reason"
            value={form.reason}
            onChange={setField('reason')}
            className="sm:col-span-2"
          />
          <Textarea
            label="Remarks"
            value={form.remarks}
            onChange={setField('remarks')}
            className="sm:col-span-2"
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Salary Advance"
        message="Are you sure you want to delete this salary advance? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
