import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import { NAV_GROUPS, canSee } from '../../routes/navConfig.js';
import NavIcon from './NavIcon.jsx';

const BranchSwitcher = () => {
  const { branches, activeBranchId, switchBranch } = useBranch();
  if (!branches.length) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
      <svg className="h-4 w-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01" />
      </svg>
      <select
        value={activeBranchId}
        onChange={(e) => switchBranch(e.target.value)}
        className="cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none"
        title="Switch branch"
      >
        {branches.length > 1 && <option value="all">All Branches</option>}
        {branches.map((b) => (
          <option key={b._id} value={b._id}>{b.name}</option>
        ))}
      </select>
    </div>
  );
};

const Sidebar = ({ open, role, user }) => {
  // Keep only groups that have at least one visible item for this role / permissions.
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => canSee(item, role, user?.permissions)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col border-r border-slate-200/70 bg-white shadow-sm transition-transform lg:static lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-600/20 ring-1 ring-white/30">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17H3v-5l2-5h11l3 5v5h-2" /><path d="M5 12h14" /><circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold tracking-tight text-slate-800">Workshop CRM</p>
          <p className="truncate text-xs text-slate-400">3M Car Care</p>
        </div>
      </div>

      {/* Grouped navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar]:w-1.5 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
        {groups.map((group) => (
          <div key={group.title} className="mb-5 last:mb-2">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400/90">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-50 font-semibold text-brand-700 shadow-[0_1px_2px_rgba(220,38,38,0.06)]'
                        : 'font-medium text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600" />
                      )}
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        <NavIcon name={item.icon} className="h-[17px] w-[17px]" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-semibold text-white shadow-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-700">{user?.name || 'User'}</p>
            <p className="truncate text-xs capitalize text-slate-400">{String(user?.role || '').replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Topbar = ({ onMenu, user, onLogout }) => (
  <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
    <button onClick={onMenu} className="text-slate-500 lg:hidden" aria-label="Open menu">
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
    </button>
    <BranchSwitcher />
    <div className="flex-1" />
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-semibold text-slate-700">{user?.name}</div>
        <div className="text-xs capitalize text-slate-400">{String(user?.role || '').replace('_', ' ')}</div>
      </div>
      <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-semibold text-white">
        {user?.name?.[0]?.toUpperCase() || 'U'}
      </div>
      <button onClick={onLogout} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
        Logout
      </button>
    </div>
  </header>
);

const Layout = ({ children }) => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  useNavigate();
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar open={open} role={user?.role} user={user} />
      {open && <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setOpen(true)} user={user} onLogout={logout} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
