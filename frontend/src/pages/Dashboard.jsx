import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dashboardApi from '../api/dashboardApi.js';
import { useBranch } from '../context/BranchContext.jsx';
import { Loading } from '../components/common/ui.jsx';
import { prettyDate } from '../utils/dateUtils.js';

const inr = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');
const labelize = (v) => String(v || '').split(/[-_]/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

/* ---------- tiny inline icons ---------- */
function Icon({ name, className = 'h-5 w-5' }) {
  const p = {
    inbox: 'M3 7l1.5 9A2 2 0 006.49 18h11.02a2 2 0 001.99-2L21 7M3 7l9-4 9 4M3 7h18',
    fire: 'M12 2c1 3-1 4-2 6s0 4 2 4 3-2 2-4c2 1 4 3 4 6a6 6 0 11-12 0c0-4 4-6 6-12z',
    clock: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',
    check: 'M5 13l4 4L19 7',
    users: 'M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z',
    calendar: 'M8 3v4M16 3v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
    wrench: 'M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z',
    box: 'M21 8l-9-5-9 5m18 0l-9 5m9-5v8l-9 5m0-13L3 8m9 5v8M3 8v8l9 5',
    truck: 'M3 7h11v8H3zM14 10h4l3 3v2h-7M5.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm12 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    invoice: 'M9 12h6M9 16h6M7 3h10a2 2 0 012 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 012-2z',
    rupee: 'M6 4h12M6 8h12M9 4c3 0 5 2 5 4s-2 4-5 4H6l7 8',
    up: 'M5 12l7-7 7 7M12 5v14',
    down: 'M19 12l-7 7-7-7M12 19V5',
    id: 'M3 5h18v14H3zM7 9h.01M7 13h4M14 9h4M14 13h4',
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={p[name] || p.box} />
    </svg>
  );
}

/* ---------- KPI card ---------- */
const TINT = {
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-500',
};
function Kpi({ icon, label, value, tint = 'slate', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TINT[tint]}`}>
        <Icon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-slate-400">{label}</span>
        <span className="block text-xl font-bold text-slate-800">{value}</span>
      </span>
    </button>
  );
}

/* ---------- hero card ---------- */
function Hero({ label, value, sub, gradient }) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-md ${gradient}`}>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-80">{sub}</p>}
    </div>
  );
}

/* ---------- revenue bar chart ---------- */
function RevenueBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-48 items-end justify-between gap-2 pt-4">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-slate-500">{d.value ? '₹' + Math.round(d.value / 1000) + 'k' : ''}</span>
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-400 transition-all"
            style={{ height: `${Math.max(4, (d.value / max) * 150)}px` }}
            title={inr(d.value)}
          />
          <span className="text-[11px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- donut chart ---------- */
const DONUT_COLORS = ['#dc2626', '#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#64748b', '#ec4899'];
function Donut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 54, C = 2 * Math.PI * R;
  let offset = 0;
  if (!total) return <div className="flex h-40 items-center justify-center text-sm text-slate-400">No data</div>;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90">
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const seg = (
            <circle
              key={i}
              cx="70" cy="70" r={R}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="16"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return seg;
        })}
        <circle cx="70" cy="70" r="38" fill="white" />
      </svg>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-slate-600">{labelize(d.label)}</span>
            <span className="ml-auto font-semibold text-slate-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const Panel = ({ title, action, children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

function RecentList({ items, render, empty }) {
  if (!items || items.length === 0) return <p className="py-6 text-center text-sm text-slate-400">{empty}</p>;
  return (
    <div className="divide-y divide-slate-50">
      {items.map((it) => {
        const r = render(it);
        return (
          <button
            key={r.key}
            type="button"
            onClick={r.onClick}
            className="flex w-full items-center gap-3 py-2.5 text-left transition hover:bg-slate-50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700">{r.title}</p>
              {r.sub && <p className="truncate text-xs text-slate-400">{r.sub}</p>}
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-500">{r.right}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAllBranches, activeBranch } = useBranch();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    dashboardApi
      .overview(period)
      .then((d) => { if (alive) setData(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  const k = data?.kpis || {};
  const charts = data?.charts || {};
  const lists = data?.lists || {};
  const periodLabel = useMemo(() => PERIODS.find((p) => p.value === period)?.label || '', [period]);
  const scopeLabel = isAllBranches ? 'All Branches' : (activeBranch?.name || '');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400">{scopeLabel}{scopeLabel && ' · '}{periodLabel}</p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${period === p.value ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <Loading label="Loading dashboard…" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Hero label={`Revenue · ${periodLabel}`} value={inr(k.periodRevenue)} sub={`${k.paidInvoices || 0} paid invoices`} gradient="bg-gradient-to-br from-brand-600 to-brand-500" />
            <Hero label="Active Job Cards" value={k.activeJobCards ?? 0} sub={`${k.completedJobCards || 0} completed`} gradient="bg-gradient-to-br from-sky-600 to-sky-500" />
            <Hero label="Confirmed Quotes" value={k.confirmedQuotes ?? 0} sub={`of ${k.totalQuotes || 0} quotes`} gradient="bg-gradient-to-br from-emerald-600 to-emerald-500" />
            <Hero label="Petty Cash Balance" value={inr(k.pettyCashBalance)} sub={`In ${inr(k.cashIn)} · Out ${inr(k.cashOut)}`} gradient="bg-gradient-to-br from-violet-600 to-violet-500" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="Revenue — last 7 days" className="lg:col-span-2">
              <RevenueBars data={charts.revenueSeries || []} />
            </Panel>
            <Panel title="Enquiries by Status">
              <Donut data={charts.enquiryStatus || []} />
            </Panel>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">CRM</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon="inbox" tint="red" label="Total Enquiries" value={k.totalEnquiries ?? 0} onClick={() => navigate('/enquiries')} />
              <Kpi icon="fire" tint="amber" label="Hot Enquiries" value={k.hotEnquiries ?? 0} onClick={() => navigate('/enquiries')} />
              <Kpi icon="clock" tint="sky" label="Pending Follow-ups" value={k.pendingFollowups ?? 0} onClick={() => navigate('/followups')} />
              <Kpi icon="users" tint="emerald" label="Total Customers" value={k.totalCustomers ?? 0} onClick={() => navigate('/customers')} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Workshop</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon="calendar" tint="sky" label={`Appointments · ${periodLabel}`} value={k.periodAppointments ?? 0} onClick={() => navigate('/appointments')} />
              <Kpi icon="wrench" tint="amber" label="Active Job Cards" value={k.activeJobCards ?? 0} onClick={() => navigate('/job-cards')} />
              <Kpi icon="box" tint="red" label="Low Stock Items" value={k.lowStockCount ?? 0} onClick={() => navigate('/products')} />
              <Kpi icon="truck" tint="emerald" label={`Delivered · ${periodLabel}`} value={k.deliveredVehicles ?? 0} onClick={() => navigate('/job-cards')} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Finance</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon="invoice" tint="amber" label="Pending Invoices" value={k.pendingInvoices ?? 0} onClick={() => navigate('/invoices')} />
              <Kpi icon="rupee" tint="red" label="Pending Payments" value={inr(k.pendingPayments)} onClick={() => navigate('/payments')} />
              <Kpi icon="up" tint="emerald" label={`Cash In · ${periodLabel}`} value={inr(k.cashIn)} onClick={() => navigate('/petty-cash')} />
              <Kpi icon="down" tint="red" label={`Cash Out · ${periodLabel}`} value={inr(k.cashOut)} onClick={() => navigate('/petty-cash')} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">HR</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon="users" tint="violet" label="Total Employees" value={k.totalEmployees ?? 0} onClick={() => navigate('/employees')} />
              <Kpi icon="check" tint="emerald" label="Present Today" value={k.presentToday ?? 0} onClick={() => navigate('/attendance')} />
              <Kpi icon="id" tint="red" label="Absent Today" value={k.absentToday ?? 0} onClick={() => navigate('/attendance')} />
              <Kpi icon="clock" tint="amber" label="Pending Leaves" value={k.pendingLeaves ?? 0} onClick={() => navigate('/leave')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="Recent Enquiries" action={<button onClick={() => navigate('/enquiries')} className="text-xs font-medium text-brand-600 hover:underline">View all</button>}>
              <RecentList
                items={lists.recentEnquiries}
                empty="No enquiries yet"
                render={(e) => ({ key: e._id, onClick: () => navigate(`/enquiries/${e._id}`), title: e.name || 'Walk-in', sub: e.vehicleNumber || e.phone || '', right: labelize(e.status) })}
              />
            </Panel>
            <Panel title="Recent Appointments" action={<button onClick={() => navigate('/appointments')} className="text-xs font-medium text-brand-600 hover:underline">View all</button>}>
              <RecentList
                items={lists.recentAppointments}
                empty="No appointments yet"
                render={(a) => ({ key: a._id, onClick: () => navigate('/appointments'), title: a.customerId?.name || a.appointmentNumber || 'Appointment', sub: `${prettyDate(a.appointmentDate)}${a.appointmentTime ? ' · ' + a.appointmentTime : ''}`, right: labelize(a.status) })}
              />
            </Panel>
            <Panel title="Recent Invoices" action={<button onClick={() => navigate('/invoices')} className="text-xs font-medium text-brand-600 hover:underline">View all</button>}>
              <RecentList
                items={lists.recentInvoices}
                empty="No invoices yet"
                render={(inv) => ({ key: inv._id, onClick: () => navigate('/invoices'), title: inv.customerId?.name || inv.customerName || inv.invoiceNumber, sub: inv.invoiceNumber, right: inr(inv.grandTotal) })}
              />
            </Panel>
          </div>

          <Panel title="Job Cards by Status">
            <Donut data={charts.jobCardStatus || []} />
          </Panel>
        </>
      )}
    </div>
  );
}
