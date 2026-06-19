import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

const Feature = ({ icon, title, desc }) => (
  <div className="flex items-start gap-4">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 text-xl backdrop-blur-sm ring-1 ring-white/20">
      {icon}
    </div>
    <div>
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-rose-100/80">{desc}</p>
    </div>
  </div>
);

const EyeIcon = ({ off }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {off ? (
      <>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </>
    ) : (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@workshop.com');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      if (!err?.message) toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ---------- Left: brand panel ---------- */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-rose-900 lg:flex">
        {/* animated blobs */}
        <div className="auth-blob absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="auth-blob absolute bottom-[-6rem] right-[-4rem] h-96 w-96 rounded-full bg-rose-400/20 blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="auth-blob absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" style={{ animationDelay: '4s' }} />

        {/* subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-2xl shadow-lg">🚗</div>
            <span className="text-lg font-bold tracking-tight text-white">Car Workshop CRM</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-extrabold leading-tight text-white xl:text-[2.75rem]">
              Run your workshop,<br />end&nbsp;to&nbsp;end.
            </h1>
            <p className="mt-4 text-rose-100/85">
              From enquiry to delivery — leads, quotes, job cards, inventory, invoicing,
              payments and payroll in one place.
            </p>

            <div className="mt-10 space-y-6">
              <Feature icon="📋" title="CRM to Job Card" desc="Enquiries, quotes & appointments that convert automatically." />
              <Feature icon="🧾" title="Invoicing & Payments" desc="GST invoices, split payments, payment-gated delivery." />
              <Feature icon="📊" title="Inventory & Payroll" desc="Stock, PPF usage, petty cash, attendance & salary." />
            </div>
          </div>

          <p className="text-xs text-rose-100/60">© {new Date().getFullYear()} Car Workshop CRM. All rights reserved.</p>
        </div>
      </div>

      {/* ---------- Right: form panel ---------- */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="animate-auth-rise w-full max-w-sm">
          {/* mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-2xl shadow">🚗</div>
            <span className="text-lg font-bold text-slate-800">Car Workshop CRM</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to your account to continue.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@workshop.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button type="button" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon off={showPw} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:from-brand-700 hover:to-rose-700 focus:ring-4 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <svg className="transition group-hover:translate-x-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Protected by JWT authentication · Role-based access
          </p>
        </div>
      </div>
    </div>
  );
}
