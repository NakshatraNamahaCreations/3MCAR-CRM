import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import salaryApi from '../api/salaryApi.js';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import EmployeeSelect from '../components/common/EmployeeSelect.jsx';
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

const PAGE_SIZE = 12;

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const PAYMENT_MODE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
];

const EMPTY_FORM = {
  employeeId: '',
  salaryMonth: '',
  salaryYear: '',
  bonus: '',
  otherDeductions: '',
  remarks: '',
};

const EMPTY_GENERATE = {
  employeeId: '',
  month: '',
  year: '',
  bonus: '',
};

const idOf = (value) =>
  typeof value === 'object' && value ? value._id || '' : value || '';

const money = (value) => (value != null && value !== '' ? `₹${value}` : '-');

export default function Salary() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState(EMPTY_GENERATE);
  const [generating, setGenerating] = useState(false);

  const [payRow, setPayRow] = useState(null);
  const [payMode, setPayMode] = useState('cash');
  const [paying, setPaying] = useState(false);

  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await salaryApi.list();
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
    () => setPage(1),
  );

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      employeeId: idOf(row.employeeId),
      salaryMonth: row.salaryMonth != null ? String(row.salaryMonth) : '',
      salaryYear: row.salaryYear != null ? String(row.salaryYear) : '',
      bonus: row.bonus ?? '',
      otherDeductions: row.otherDeductions ?? '',
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setGenField = (key) => (e) =>
    setGenForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        salaryMonth: form.salaryMonth === '' ? undefined : Number(form.salaryMonth),
        salaryYear: form.salaryYear === '' ? undefined : Number(form.salaryYear),
        bonus: form.bonus === '' ? undefined : Number(form.bonus),
        otherDeductions:
          form.otherDeductions === '' ? undefined : Number(form.otherDeductions),
      };
      if (editingId) {
        await salaryApi.update(editingId, payload);
        toast.success('Salary updated');
      } else {
        await salaryApi.create(payload);
        toast.success('Salary added');
      }
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const payload = {
        employeeId: genForm.employeeId,
        salaryMonth: genForm.month === '' ? undefined : Number(genForm.month),
        salaryYear: genForm.year === '' ? undefined : Number(genForm.year),
        bonus: genForm.bonus === '' ? undefined : Number(genForm.bonus),
      };
      await salaryApi.generate(payload);
      toast.success('Salary generated');
      setGenOpen(false);
      await load();
    } finally {
      setGenerating(false);
    }
  };

  const openPay = (row) => {
    setPayRow(row);
    setPayMode('cash');
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    if (!payRow) return;
    setPaying(true);
    try {
      await salaryApi.markPaid(payRow._id, { paymentMode: payMode });
      toast.success('Salary marked as paid');
      setPayRow(null);
      await load();
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = async () => {
    const id = confirmId;
    setConfirmId(null);
    if (!id) return;
    await salaryApi.remove(id);
    toast.success('Salary deleted');
    await load();
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'employee', label: 'Employee', render: (row) => (
      <div>
        <p className="font-medium text-slate-700">{row.employeeId?.name || '—'}</p>
        {row.employeeId?.employeeCode && <p className="text-xs text-slate-400">{row.employeeId.employeeCode}</p>}
      </div>
    ) },
    { key: 'salaryMonth', label: 'Month' },
    { key: 'salaryYear', label: 'Year' },
    {
      key: 'grossSalary',
      label: 'Gross Salary',
      render: (row) => money(row.grossSalary),
    },
    {
      key: 'netSalary',
      label: 'Net Salary',
      render: (row) => money(row.netSalary),
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      render: (row) => <StatusBadge status={row.paymentStatus} />,
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
            variant="success"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openPay(row);
            }}
          >
            Mark Paid
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
        title="Salary"
        subtitle="Manage employee salaries and payments"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setGenForm(EMPTY_GENERATE);
                setGenOpen(true);
              }}
            >
              Generate Salary
            </Button>
            <Button onClick={openCreate}>Add Salary</Button>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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

      <Card padded={false}>
        {loading ? (
          <Loading label="Loading salaries…" />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={_paged}
              loading={loading}
              emptyMessage="No salary records found"
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
        title={editingId ? 'Edit Salary' : 'Add Salary'}
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
          <Select
            label="Salary Month"
            value={form.salaryMonth}
            onChange={setField('salaryMonth')}
          >
            <option value="">Select month</option>
            {MONTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Salary Year"
            type="number"
            min="2000"
            value={form.salaryYear}
            onChange={setField('salaryYear')}
          />
          <Input
            label="Bonus"
            type="number"
            min="0"
            value={form.bonus}
            onChange={setField('bonus')}
          />
          <Input
            label="Other Deductions"
            type="number"
            min="0"
            value={form.otherDeductions}
            onChange={setField('otherDeductions')}
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
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title="Generate Salary"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EmployeeSelect
            value={genForm.employeeId}
            onChange={setGenField('employeeId')}
            required
          />
          <Select label="Month" value={genForm.month} onChange={setGenField('month')}>
            <option value="">Select month</option>
            {MONTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Year"
            type="number"
            min="2000"
            value={genForm.year}
            onChange={setGenField('year')}
          />
          <Input
            label="Bonus"
            type="number"
            min="0"
            value={genForm.bonus}
            onChange={setGenField('bonus')}
          />
        </form>
      </Modal>

      <Modal
        open={!!payRow}
        onClose={() => setPayRow(null)}
        title="Mark Salary Paid"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayRow(null)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleMarkPaid} disabled={paying}>
              {paying ? 'Saving…' : 'Mark Paid'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleMarkPaid} className="grid grid-cols-1 gap-4">
          <Select
            label="Payment Mode"
            value={payMode}
            onChange={(e) => setPayMode(e.target.value)}
          >
            {PAYMENT_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Delete Salary"
        message="Are you sure you want to delete this salary record?"
      />
    </div>
  );
}
