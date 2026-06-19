import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import employeeApi from '../api/employeeApi.js';
import {
  Button,
  PageHeader,
  Input,
  Select,
  Textarea,
  Modal,
  ConfirmDialog,
  StatusBadge,
  Loading,
} from '../components/common/ui.jsx';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import DataTable from '../components/tables/DataTable.jsx';

const PAGE_SIZE = 12;

const ROLE_OPTIONS = [
  'admin',
  'manager',
  'technician',
  'service_advisor',
  'accountant',
  'hr',
  'cleaner',
  'helper',
  'driver',
];

const SALARY_TYPE_OPTIONS = ['monthly', 'daily', 'hourly'];

const STATUS_OPTIONS = ['active', 'inactive', 'resigned', 'terminated'];

const emptyForm = {
  name: '',
  phone: '',
  alternatePhone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  role: 'technician',
  designation: '',
  department: '',
  joiningDate: '',
  salaryType: 'monthly',
  basicSalary: '',
  dailyWage: '',
  hourlyRate: '',
  hra: '',
  conveyanceAllowance: '',
  medicalAllowance: '',
  specialAllowance: '',
  pfDeduction: '',
  esiDeduction: '',
  professionalTax: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  status: 'active',
};

// Defensive: accept either an array or an object-wrapped list shape.
const asArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val && Array.isArray(val.items)) return val.items;
  return [];
};

// Convert an ISO/date value into a yyyy-mm-dd string for <input type="date">.
const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const money = (v) =>
  v === null || v === undefined || v === ''
    ? '—'
    : `₹${Number(v).toLocaleString('en-IN')}`;

export default function Employees() {
  const navigate = useNavigate();
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
      const data = await employeeApi.list();
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
      name: row.name || '',
      phone: row.phone || '',
      alternatePhone: row.alternatePhone || '',
      email: row.email || '',
      address: row.address || '',
      city: row.city || '',
      state: row.state || '',
      pincode: row.pincode || '',
      role: row.role || 'technician',
      designation: row.designation || '',
      department: row.department || '',
      joiningDate: toDateInput(row.joiningDate),
      salaryType: row.salaryType || 'monthly',
      basicSalary: row.basicSalary ?? '',
      dailyWage: row.dailyWage ?? '',
      hourlyRate: row.hourlyRate ?? '',
      hra: row.hra ?? '',
      conveyanceAllowance: row.conveyanceAllowance ?? '',
      medicalAllowance: row.medicalAllowance ?? '',
      specialAllowance: row.specialAllowance ?? '',
      pfDeduction: row.pfDeduction ?? '',
      esiDeduction: row.esiDeduction ?? '',
      professionalTax: row.professionalTax ?? '',
      emergencyContactName: row.emergencyContactName || '',
      emergencyContactPhone: row.emergencyContactPhone || '',
      status: row.status || 'active',
    });
    setFormOpen(true);
  };

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await employeeApi.update(editing._id, form);
        toast.success('Employee updated');
      } else {
        await employeeApi.create(form);
        toast.success('Employee created');
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
      await employeeApi.remove(toDelete._id);
      toast.success('Employee deleted');
      setToDelete(null);
      await load();
    } catch {
      setToDelete(null);
    }
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'employeeCode', label: 'Code', render: (r) => r.employeeCode || '—' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'role', label: 'Role', render: (r) => r.role || '—' },
    { key: 'department', label: 'Department', render: (r) => r.department || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (r.status ? <StatusBadge status={r.status} /> : '—'),
    },
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
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/employees/${r._id}`);
            }}
          >
            View
          </Button>
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employees"
        subtitle="Manage staff records, roles and payroll details."
        actions={<Button onClick={openCreate}>Add Employee</Button>}
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
        <Loading label="Loading employees…" />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={_paged}
            loading={false}
            emptyMessage="No employees found."
            rowKey="_id"
            onRowClick={openEdit}
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={_buFiltered.length}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Employee' : 'Add Employee'}
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
        <form
          onSubmit={handleSave}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Input label="Name" value={form.name} onChange={setField('name')} required />
          <Input label="Phone" value={form.phone} onChange={setField('phone')} />
          <Input
            label="Alternate Phone"
            value={form.alternatePhone}
            onChange={setField('alternatePhone')}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={setField('email')}
          />

          <div className="sm:col-span-2">
            <Textarea
              label="Address"
              rows={2}
              value={form.address}
              onChange={setField('address')}
            />
          </div>

          <Input label="City" value={form.city} onChange={setField('city')} />
          <Input label="State" value={form.state} onChange={setField('state')} />
          <Input label="Pincode" value={form.pincode} onChange={setField('pincode')} />

          <Select label="Role" value={form.role} onChange={setField('role')}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>

          <Input
            label="Designation"
            value={form.designation}
            onChange={setField('designation')}
          />
          <Input
            label="Department"
            value={form.department}
            onChange={setField('department')}
          />

          <Input
            label="Joining Date"
            type="date"
            value={form.joiningDate}
            onChange={setField('joiningDate')}
          />

          <Select
            label="Salary Type"
            value={form.salaryType}
            onChange={setField('salaryType')}
          >
            {SALARY_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>

          <Input
            label="Basic Salary (₹)"
            type="number"
            value={form.basicSalary}
            onChange={setField('basicSalary')}
          />
          <Input
            label="Daily Wage (₹)"
            type="number"
            value={form.dailyWage}
            onChange={setField('dailyWage')}
          />
          <Input
            label="Hourly Rate (₹)"
            type="number"
            value={form.hourlyRate}
            onChange={setField('hourlyRate')}
          />

          <div className="sm:col-span-2 mt-1 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Salary Structure — Earnings (monthly)</p>
          </div>
          <Input label="HRA (₹)" type="number" value={form.hra} onChange={setField('hra')} />
          <Input label="Conveyance Allowance (₹)" type="number" value={form.conveyanceAllowance} onChange={setField('conveyanceAllowance')} />
          <Input label="Medical Allowance (₹)" type="number" value={form.medicalAllowance} onChange={setField('medicalAllowance')} />
          <Input label="Special Allowance (₹)" type="number" value={form.specialAllowance} onChange={setField('specialAllowance')} />

          <div className="sm:col-span-2 mt-1 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Salary Structure — Deductions (monthly)</p>
          </div>
          <Input label="PF (₹)" type="number" value={form.pfDeduction} onChange={setField('pfDeduction')} />
          <Input label="ESI (₹)" type="number" value={form.esiDeduction} onChange={setField('esiDeduction')} />
          <Input label="Professional Tax (₹)" type="number" value={form.professionalTax} onChange={setField('professionalTax')} />

          {(() => {
            const n = (v) => Number(v) || 0;
            const gross = n(form.basicSalary) + n(form.hra) + n(form.conveyanceAllowance) + n(form.medicalAllowance) + n(form.specialAllowance);
            const ded = n(form.pfDeduction) + n(form.esiDeduction) + n(form.professionalTax);
            const net = gross - ded;
            const inr = (x) => '₹' + x.toLocaleString('en-IN');
            return (
              <div className="sm:col-span-2 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
                <div><p className="text-xs text-slate-400">Gross (Earnings)</p><p className="text-sm font-semibold text-slate-700">{inr(gross)}</p></div>
                <div><p className="text-xs text-slate-400">Fixed Deductions</p><p className="text-sm font-semibold text-slate-700">{inr(ded)}</p></div>
                <div><p className="text-xs text-slate-400">Net (approx)</p><p className="text-sm font-semibold text-brand-600">{inr(net)}</p></div>
              </div>
            );
          })()}

          <Input
            label="Emergency Contact Name"
            value={form.emergencyContactName}
            onChange={setField('emergencyContactName')}
          />
          <Input
            label="Emergency Contact Phone"
            value={form.emergencyContactPhone}
            onChange={setField('emergencyContactPhone')}
          />

          <Select label="Status" value={form.status} onChange={setField('status')}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>

          {/* Hidden submit so Enter submits the form. */}
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        title="Delete employee?"
        message={`This will permanently remove ${toDelete?.name || 'this employee'}.`}
      />
    </div>
  );
}
