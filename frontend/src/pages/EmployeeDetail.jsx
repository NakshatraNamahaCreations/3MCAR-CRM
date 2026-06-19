import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import employeeApi from '../api/employeeApi.js';
import attendanceApi from '../api/attendanceApi.js';
import leaveApi from '../api/leaveApi.js';
import salaryApi from '../api/salaryApi.js';
import salaryAdvanceApi from '../api/salaryAdvanceApi.js';
import {
  Button, Card, Input, Select, Textarea, StatusBadge, Loading, Modal,
} from '../components/common/ui.jsx';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const inr = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');
const n = (v) => Number(v) || 0;
const ymd = (d) => {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const pretty = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');
const labelize = (v) => String(v || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const ATT_STATUS = {
  present: { label: 'P', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  absent: { label: 'A', cls: 'bg-red-100 text-red-700 border-red-200' },
  half_day: { label: 'H', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  paid_leave: { label: 'PL', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  unpaid_leave: { label: 'UL', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  weekly_off: { label: 'WO', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  holiday: { label: 'HD', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
};
const ATT_OPTIONS = Object.keys(ATT_STATUS);
const LEAVE_TYPES = ['paid_leave', 'unpaid_leave', 'sick_leave', 'emergency_leave'];

const Stat = ({ label, value, accent }) => (
  <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-center">
    <p className="text-xs text-slate-400">{label}</p>
    <p className={`text-lg font-semibold ${accent || 'text-slate-700'}`}>{value}</p>
  </div>
);

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-400">{label}</p>
    <p className="text-sm font-medium text-slate-700">{value || '—'}</p>
  </div>
);

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const loadEmployee = useCallback(async () => {
    try {
      const data = await employeeApi.get(id);
      setEmp(data);
    } catch {
      toast.error('Could not load employee');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);

  if (loading) return <Loading />;
  if (!emp) return <div className="p-6 text-slate-500">Employee not found.</div>;

  const allowances = n(emp.hra) + n(emp.conveyanceAllowance) + n(emp.medicalAllowance) + n(emp.specialAllowance);
  const gross = n(emp.basicSalary) + allowances;
  const fixedDed = n(emp.pfDeduction) + n(emp.esiDeduction) + n(emp.professionalTax);
  const net = gross - fixedDed;

  const TABS = [
    ['overview', 'Overview'],
    ['attendance', 'Attendance'],
    ['leave', 'Leave'],
    ['salary', 'Salary'],
    ['advances', 'Advances'],
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>← Back</Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-white">
            {(emp.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">{emp.name}</h1>
            <p className="text-sm text-slate-400">
              {emp.employeeCode} · {labelize(emp.designation || emp.role)}{emp.department ? ` · ${emp.department}` : ''}
            </p>
          </div>
        </div>
        <StatusBadge status={emp.status} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              tab === key ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Contact & Personal</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" value={emp.phone} />
              <Field label="Alternate Phone" value={emp.alternatePhone} />
              <Field label="Email" value={emp.email} />
              <Field label="Joining Date" value={pretty(emp.joiningDate)} />
              <Field label="Role" value={labelize(emp.role)} />
              <Field label="Branch" value={emp.branchId?.name} />
              <div className="col-span-2"><Field label="Address" value={[emp.address, emp.city, emp.state, emp.pincode].filter(Boolean).join(', ')} /></div>
              <Field label="Emergency Contact" value={emp.emergencyContactName} />
              <Field label="Emergency Phone" value={emp.emergencyContactPhone} />
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Salary Structure ({labelize(emp.salaryType)})</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Earnings</div>
              <Row label="Basic" value={inr(emp.basicSalary)} />
              <Row label="HRA" value={inr(emp.hra)} />
              <Row label="Conveyance" value={inr(emp.conveyanceAllowance)} />
              <Row label="Medical" value={inr(emp.medicalAllowance)} />
              <Row label="Special Allowance" value={inr(emp.specialAllowance)} />
              <Row label="Gross" value={inr(gross)} bold />
              <div className="col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Deductions</div>
              <Row label="PF" value={inr(emp.pfDeduction)} />
              <Row label="ESI" value={inr(emp.esiDeduction)} />
              <Row label="Professional Tax" value={inr(emp.professionalTax)} />
              <Row label="Total Deductions" value={inr(fixedDed)} bold />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="font-semibold text-slate-700">Net (approx)</span>
              <span className="text-lg font-bold text-brand-600">{inr(net)}</span>
            </div>
            {emp.salaryType !== 'monthly' && (
              <p className="mt-2 text-xs text-slate-400">
                {emp.salaryType === 'daily' ? `Daily wage: ${inr(emp.dailyWage)}` : `Hourly rate: ${inr(emp.hourlyRate)}`} — net pay computed from attendance at generation time.
              </p>
            )}
          </Card>
        </div>
      )}

      {tab === 'attendance' && <AttendanceTab employeeId={id} />}
      {tab === 'leave' && <LeaveTab employeeId={id} />}
      {tab === 'salary' && <SalaryTab employee={emp} />}
      {tab === 'advances' && <AdvancesTab employeeId={id} />}
    </div>
  );
}

const Row = ({ label, value, bold }) => (
  <>
    <span className={`text-slate-500 ${bold ? 'font-semibold text-slate-700' : ''}`}>{label}</span>
    <span className={`text-right ${bold ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>{value}</span>
  </>
);

/* ---------------- Attendance ---------------- */
function AttendanceTab({ employeeId }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [markForm, setMarkForm] = useState({ attendanceDate: ymd(now), status: 'present', overtimeHours: '', remarks: '' });
  const [saving, setSaving] = useState(false);

  const from = ymd(new Date(cursor.y, cursor.m, 1));
  const to = ymd(new Date(cursor.y, cursor.m + 1, 0));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.byEmployeeId(employeeId, { from, to });
      setRecords(Array.isArray(data) ? data : data?.items || []);
    } finally { setLoading(false); }
  }, [employeeId, from, to]);

  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map = {};
    records.forEach((r) => { map[ymd(r.attendanceDate)] = r; });
    return map;
  }, [records]);

  const summary = useMemo(() => {
    const s = { present: 0, absent: 0, half_day: 0, paid_leave: 0, unpaid_leave: 0, weekly_off: 0, holiday: 0 };
    records.forEach((r) => { if (s[r.status] != null) s[r.status] += 1; });
    return s;
  }, [records]);

  const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const move = (delta) => setCursor((c) => {
    const d = new Date(c.y, c.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const submitMark = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await attendanceApi.mark({
        employeeId,
        attendanceDate: markForm.attendanceDate,
        status: markForm.status,
        overtimeHours: n(markForm.overtimeHours),
        remarks: markForm.remarks,
      });
      toast.success('Attendance marked');
      setMarkOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => move(-1)}>←</Button>
          <span className="min-w-[140px] text-center text-sm font-semibold text-slate-700">{MONTHS[cursor.m]} {cursor.y}</span>
          <Button variant="secondary" size="sm" onClick={() => move(1)}>→</Button>
        </div>
        <Button size="sm" onClick={() => { setMarkForm({ attendanceDate: ymd(new Date()), status: 'present', overtimeHours: '', remarks: '' }); setMarkOpen(true); }}>+ Mark Attendance</Button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-7">
        <Stat label="Present" value={summary.present} accent="text-emerald-600" />
        <Stat label="Absent" value={summary.absent} accent="text-red-600" />
        <Stat label="Half Day" value={summary.half_day} accent="text-amber-600" />
        <Stat label="Paid Leave" value={summary.paid_leave} accent="text-sky-600" />
        <Stat label="Unpaid Leave" value={summary.unpaid_leave} accent="text-orange-600" />
        <Stat label="Week Off" value={summary.weekly_off} accent="text-slate-500" />
        <Stat label="Holiday" value={summary.holiday} accent="text-violet-600" />
      </div>

      {loading ? <Loading /> : (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => <div key={w} className="py-1 text-center text-xs font-semibold text-slate-400">{w}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />;
            const key = ymd(new Date(cursor.y, cursor.m, d));
            const rec = byDay[key];
            const st = rec ? ATT_STATUS[rec.status] : null;
            return (
              <div key={key} className={`flex h-16 flex-col rounded-lg border p-1 ${st ? st.cls : 'border-slate-100 bg-slate-50/50'}`}>
                <span className="text-xs font-medium">{d}</span>
                {st && <span className="mt-auto text-[10px] font-semibold">{labelize(rec.status)}</span>}
                {rec?.overtimeHours > 0 && <span className="text-[9px] text-slate-500">OT {rec.overtimeHours}h</span>}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={markOpen} onClose={() => !saving && setMarkOpen(false)} title="Mark Attendance"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setMarkOpen(false)} disabled={saving}>Cancel</Button><Button onClick={submitMark} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>}>
        <form onSubmit={submitMark} className="space-y-3">
          <Input label="Date" type="date" value={markForm.attendanceDate} onChange={(e) => setMarkForm((f) => ({ ...f, attendanceDate: e.target.value }))} required />
          <Select label="Status" value={markForm.status} onChange={(e) => setMarkForm((f) => ({ ...f, status: e.target.value }))}>
            {ATT_OPTIONS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
          </Select>
          <Input label="Overtime Hours" type="number" value={markForm.overtimeHours} onChange={(e) => setMarkForm((f) => ({ ...f, overtimeHours: e.target.value }))} />
          <Textarea label="Remarks" rows={2} value={markForm.remarks} onChange={(e) => setMarkForm((f) => ({ ...f, remarks: e.target.value }))} />
        </form>
      </Modal>
    </Card>
  );
}

/* ---------------- Leave ---------------- */
function LeaveTab({ employeeId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leaveType: 'paid_leave', fromDate: '', toDate: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await leaveApi.byEmployeeId(employeeId);
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally { setLoading(false); }
  }, [employeeId]);
  useEffect(() => { load(); }, [load]);

  const totalDays = useMemo(() => {
    if (!form.fromDate || !form.toDate) return 0;
    const a = new Date(form.fromDate); const b = new Date(form.toDate);
    return Math.max(0, Math.round((b - a) / 86400000) + 1);
  }, [form.fromDate, form.toDate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fromDate || !form.toDate) { toast.error('Select from & to dates'); return; }
    setSaving(true);
    try {
      await leaveApi.create({ employeeId, ...form, totalDays });
      toast.success('Leave applied');
      setOpen(false); setForm({ leaveType: 'paid_leave', fromDate: '', toDate: '', reason: '' });
      await load();
    } finally { setSaving(false); }
  };

  const act = async (fn, id, msg) => { try { await fn(id); toast.success(msg); await load(); } catch { /* toast handled */ } };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Leave History</h3>
        <Button size="sm" onClick={() => setOpen(true)}>+ Apply Leave</Button>
      </div>
      {loading ? <Loading /> : rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No leave records.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
              <th className="py-2">Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-slate-50">
                  <td className="py-2">{labelize(r.leaveType)}</td>
                  <td>{pretty(r.fromDate)}</td>
                  <td>{pretty(r.toDate)}</td>
                  <td>{r.totalDays}</td>
                  <td className="max-w-[180px] truncate text-slate-500">{r.reason || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="success" onClick={() => act(leaveApi.approve, r._id, 'Approved')}>Approve</Button>
                        <Button size="sm" variant="danger" onClick={() => act(leaveApi.reject, r._id, 'Rejected')}>Reject</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => !saving && setOpen(false)} title="Apply Leave"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Apply'}</Button></div>}>
        <form onSubmit={submit} className="space-y-3">
          <Select label="Leave Type" value={form.leaveType} onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}>
            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="date" value={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} required />
            <Input label="To" type="date" value={form.toDate} onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} required />
          </div>
          <p className="text-xs text-slate-500">Total days: <b>{totalDays}</b></p>
          <Textarea label="Reason" rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </form>
      </Modal>
    </Card>
  );
}

/* ---------------- Salary ---------------- */
function SalaryTab({ employee }) {
  const now = new Date();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [genForm, setGenForm] = useState({ salaryMonth: now.getMonth() + 1, salaryYear: now.getFullYear(), bonus: '', otherDeductions: '' });
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ paymentMode: 'bank_transfer', transactionId: '', paymentDate: ymd(now) });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await salaryApi.byEmployeeId(employee._id);
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally { setLoading(false); }
  }, [employee._id]);
  useEffect(() => { load(); }, [load]);

  const generate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await salaryApi.generate({
        employeeId: employee._id,
        salaryMonth: n(genForm.salaryMonth),
        salaryYear: n(genForm.salaryYear),
        bonus: n(genForm.bonus),
        otherDeductions: n(genForm.otherDeductions),
      });
      toast.success('Salary generated');
      setGenOpen(false);
      await load();
    } finally { setBusy(false); }
  };

  const pay = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await salaryApi.markPaid(payTarget._id, payForm);
      toast.success('Marked as paid');
      setPayTarget(null);
      await load();
    } finally { setBusy(false); }
  };

  const slip = (r) => salaryApi.downloadSlip(r._id, `Salary-${employee.employeeCode || employee.name}-${r.salaryMonth}-${r.salaryYear}.pdf`);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Salary Records</h3>
        <Button size="sm" onClick={() => setGenOpen(true)}>+ Generate Salary</Button>
      </div>
      {loading ? <Loading /> : rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No salary records yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
              <th className="py-2">Period</th><th className="text-right">Gross</th><th className="text-right">Deductions</th><th className="text-right">Net</th><th>Status</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const ded = n(r.pfDeduction) + n(r.esiDeduction) + n(r.professionalTax) + n(r.attendanceDeduction) + n(r.advanceDeduction) + n(r.otherDeductions);
                return (
                  <tr key={r._id} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-700">{MONTHS[r.salaryMonth - 1]} {r.salaryYear}</td>
                    <td className="text-right">{inr(r.grossSalary)}</td>
                    <td className="text-right text-slate-500">{inr(ded)}</td>
                    <td className="text-right font-semibold text-slate-800">{inr(r.netSalary)}</td>
                    <td><StatusBadge status={r.paymentStatus} /></td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="secondary" onClick={() => slip(r)}>Slip</Button>
                        {r.paymentStatus === 'pending' && (
                          <Button size="sm" variant="success" onClick={() => { setPayForm({ paymentMode: 'bank_transfer', transactionId: '', paymentDate: ymd(new Date()) }); setPayTarget(r); }}>Pay</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={genOpen} onClose={() => !busy && setGenOpen(false)} title="Generate Salary"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setGenOpen(false)} disabled={busy}>Cancel</Button><Button onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate'}</Button></div>}>
        <form onSubmit={generate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" value={genForm.salaryMonth} onChange={(e) => setGenForm((f) => ({ ...f, salaryMonth: e.target.value }))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
            <Input label="Year" type="number" value={genForm.salaryYear} onChange={(e) => setGenForm((f) => ({ ...f, salaryYear: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bonus (₹)" type="number" value={genForm.bonus} onChange={(e) => setGenForm((f) => ({ ...f, bonus: e.target.value }))} />
            <Input label="Other Deductions (₹)" type="number" value={genForm.otherDeductions} onChange={(e) => setGenForm((f) => ({ ...f, otherDeductions: e.target.value }))} />
          </div>
          <p className="text-xs text-slate-400">Salary is computed from this employee's structure + the month's attendance. Approved advances for the month are auto-deducted.</p>
        </form>
      </Modal>

      <Modal open={!!payTarget} onClose={() => !busy && setPayTarget(null)} title="Mark Salary Paid"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setPayTarget(null)} disabled={busy}>Cancel</Button><Button onClick={pay} disabled={busy}>{busy ? 'Saving…' : 'Confirm'}</Button></div>}>
        <form onSubmit={pay} className="space-y-3">
          {payTarget && <p className="text-sm text-slate-600">Net payable: <b>{inr(payTarget.netSalary)}</b> for {MONTHS[payTarget.salaryMonth - 1]} {payTarget.salaryYear}</p>}
          <Select label="Payment Mode" value={payForm.paymentMode} onChange={(e) => setPayForm((f) => ({ ...f, paymentMode: e.target.value }))}>
            {['bank_transfer', 'cash', 'upi', 'cheque', 'other'].map((m) => <option key={m} value={m}>{labelize(m)}</option>)}
          </Select>
          <Input label="Transaction ID" value={payForm.transactionId} onChange={(e) => setPayForm((f) => ({ ...f, transactionId: e.target.value }))} />
          <Input label="Payment Date" type="date" value={payForm.paymentDate} onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))} />
        </form>
      </Modal>
    </Card>
  );
}

/* ---------------- Advances ---------------- */
function AdvancesTab({ employeeId }) {
  const now = new Date();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: '', advanceDate: ymd(now), reason: '', paymentMode: 'bank_transfer', deductionMonth: now.getMonth() + 1, deductionYear: now.getFullYear() });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await salaryAdvanceApi.byEmployeeId(employeeId);
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally { setLoading(false); }
  }, [employeeId]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (n(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await salaryAdvanceApi.create({
        employeeId,
        amount: n(form.amount),
        advanceDate: form.advanceDate,
        reason: form.reason,
        paymentMode: form.paymentMode,
        deductionMonth: n(form.deductionMonth),
        deductionYear: n(form.deductionYear),
      });
      toast.success('Advance recorded');
      setOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const act = async (fn, id, msg) => { try { await fn(id); toast.success(msg); await load(); } catch { /* toast handled */ } };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Salary Advances</h3>
        <Button size="sm" onClick={() => setOpen(true)}>+ Add Advance</Button>
      </div>
      {loading ? <Loading /> : rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No advances.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
              <th className="py-2">Date</th><th className="text-right">Amount</th><th>Deduct In</th><th>Reason</th><th>Status</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-slate-50">
                  <td className="py-2">{pretty(r.advanceDate)}</td>
                  <td className="text-right font-semibold text-slate-800">{inr(r.amount)}</td>
                  <td>{r.deductionMonth ? `${MONTHS[r.deductionMonth - 1]} ${r.deductionYear || ''}` : '—'}</td>
                  <td className="max-w-[180px] truncate text-slate-500">{r.reason || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="success" onClick={() => act(salaryAdvanceApi.approve, r._id, 'Approved')}>Approve</Button>
                        <Button size="sm" variant="danger" onClick={() => act(salaryAdvanceApi.reject, r._id, 'Rejected')}>Reject</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => !saving && setOpen(false)} title="Add Salary Advance"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            <Input label="Advance Date" type="date" value={form.advanceDate} onChange={(e) => setForm((f) => ({ ...f, advanceDate: e.target.value }))} />
          </div>
          <Select label="Payment Mode" value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))}>
            {['bank_transfer', 'upi', 'cheque', 'other', 'cash'].map((m) => <option key={m} value={m}>{labelize(m)}</option>)}
          </Select>
          <p className="text-[11px] text-slate-400">Cash advances are paid out of petty cash (requires sufficient balance). Bank/UPI do not touch petty cash.</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Deduct In Month" value={form.deductionMonth} onChange={(e) => setForm((f) => ({ ...f, deductionMonth: e.target.value }))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
            <Input label="Deduct In Year" type="number" value={form.deductionYear} onChange={(e) => setForm((f) => ({ ...f, deductionYear: e.target.value }))} />
          </div>
          <Textarea label="Reason" rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </form>
      </Modal>
    </Card>
  );
}
