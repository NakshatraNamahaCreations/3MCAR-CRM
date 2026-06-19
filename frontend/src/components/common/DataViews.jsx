/**
 * Reusable "premium" data presentation components:
 *  - ViewToggle: List / Calendar segmented control
 *  - PremiumTable: polished table with sticky header, zebra, hover, empty/loading states
 *  - CalendarView: month grid that buckets records by date and renders event chips
 */
import { useMemo, useState } from 'react';
import { Loading, EmptyState } from './ui.jsx';
import {
  buildMonthGrid,
  MONTH_NAMES,
  WEEKDAYS,
  toYMD,
} from '../../utils/dateUtils.js';

/* ----------------------------- View toggle ----------------------------- */
export const ViewToggle = ({ view, onChange, views = ['list', 'calendar'] }) => {
  const ICONS = {
    list: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
    calendar: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  };
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
      {views.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition ${
            view === v ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {ICONS[v]}
          {v}
        </button>
      ))}
    </div>
  );
};

/* ----------------------------- Premium table ----------------------------- */
/**
 * columns: [{ key, label, render?(row), align?: 'left'|'right'|'center', width? }]
 */
export const PremiumTable = ({ columns, rows, loading, emptyMessage = 'No records found', rowKey = '_id', onRowClick }) => {
  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white"><Loading /></div>;
  if (!rows?.length)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState message={emptyMessage} />
      </div>
    );

  const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/80">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={`whitespace-nowrap border-b border-slate-200 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ${alignCls[c.align] || 'text-left'}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr
                key={row[rowKey]}
                onClick={() => onRowClick?.(row)}
                className={`group transition-colors hover:bg-brand-50/40 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-5 py-3.5 text-sm text-slate-700 ${alignCls[c.align] || 'text-left'}`}
                  >
                    {c.render ? c.render(row, index) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ----------------------------- Pagination ----------------------------- */
/**
 * Simple page controls. page is 1-based.
 */
export const Pagination = ({ page, pageSize, total, onPageChange }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = 'grid h-8 min-w-8 place-items-center rounded-lg border border-slate-200 px-2 text-sm font-medium transition disabled:opacity-40';
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-3 text-sm text-slate-500">
      <span>Showing <b className="text-slate-700">{from}-{to}</b> of <b className="text-slate-700">{total}</b></span>
      <div className="flex items-center gap-1.5">
        <button className={btn} disabled={page <= 1} onClick={() => onPageChange(1)}>«</button>
        <button className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
        <span className="px-2 text-slate-600">Page {page} / {pages}</span>
        <button className={btn} disabled={page >= pages} onClick={() => onPageChange(page + 1)}>›</button>
        <button className={btn} disabled={page >= pages} onClick={() => onPageChange(pages)}>»</button>
      </div>
    </div>
  );
};

/* ----------------------------- Avatar cell ----------------------------- */
// Red-theme-aligned avatar tints (warm/red family) for visual variety.
const AVATAR_COLORS = [
  'bg-red-100 text-red-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700',
  'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-red-100 text-red-600',
  'bg-rose-100 text-rose-600',
];
export const NameCell = ({ name, sub }) => {
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?';
  let hash = 0;
  for (const ch of name || '') hash = (hash + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${AVATAR_COLORS[hash]}`}>
        {initial}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800">{name || '—'}</p>
        {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
};

/* ----------------------------- Calendar view ----------------------------- */
/**
 * records: array of objects
 * getDate(record) -> a date value (string/Date) used to bucket into days
 * renderChip(record) -> small node shown inside the day cell
 * onDayClick(ymd, recordsForDay), onRecordClick(record)
 */
export const CalendarView = ({
  records = [],
  getDate,
  renderChip,
  onMonthChange,
  onRecordClick,
  onDayClick,
  initialMonth,
  mode = 'chips', // 'chips' = show individual record chips; 'count' = show a count badge per day
  countNoun = 'item',
}) => {
  const today = new Date();
  const [cursor, setCursor] = useState(
    initialMonth || { year: today.getFullYear(), month: today.getMonth() }
  );

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);

  const byDay = useMemo(() => {
    const map = {};
    for (const r of records) {
      const ymd = toYMD(getDate(r));
      if (!ymd) continue;
      (map[ymd] = map[ymd] || []).push(r);
    }
    return map;
  }, [records, getDate]);

  const move = (delta) => {
    let m = cursor.month + delta;
    let y = cursor.year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    const next = { year: y, month: m };
    setCursor(next);
    onMonthChange?.(next);
  };

  const goToday = () => {
    const next = { year: today.getFullYear(), month: today.getMonth() };
    setCursor(next);
    onMonthChange?.(next);
  };

  const NavBtn = ({ children, onClick }) => (
    <button onClick={onClick} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <h3 className="text-base font-semibold text-slate-800">
          {MONTH_NAMES[cursor.month]} {cursor.year}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Today
          </button>
          <NavBtn onClick={() => move(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </NavBtn>
          <NavBtn onClick={() => move(1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </NavBtn>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/60">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.map((cell, i) => {
          const dayRecords = byDay[cell.ymd] || [];
          const count = dayRecords.length;
          const countMode = mode === 'count';
          const clickableDay = countMode && count > 0;
          return (
            <div
              key={cell.ymd + i}
              onClick={clickableDay ? () => onDayClick?.(cell.ymd, dayRecords) : undefined}
              className={`min-h-[112px] border-b border-r border-slate-100 p-1.5 ${
                cell.inMonth ? 'bg-white' : 'bg-slate-50/40'
              } ${(i + 1) % 7 === 0 ? 'border-r-0' : ''} ${
                clickableDay ? 'cursor-pointer transition hover:bg-brand-50/40' : ''
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs font-medium ${
                    cell.isToday
                      ? 'bg-brand-600 text-white'
                      : cell.inMonth
                      ? 'text-slate-600'
                      : 'text-slate-300'
                  }`}
                >
                  {cell.date.getDate()}
                </span>
              </div>

              {countMode ? (
                count > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDayClick?.(cell.ymd, dayRecords); }}
                    className="mt-1 flex w-full flex-col items-center justify-center gap-0.5 rounded-lg bg-brand-50 py-2 text-brand-700 transition hover:bg-brand-100"
                  >
                    <span className="text-lg font-bold leading-none">{count}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide">
                      {countNoun}{count > 1 ? 's' : ''}
                    </span>
                  </button>
                )
              ) : (
                <div className="space-y-1">
                  {dayRecords.slice(0, 3).map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => onRecordClick?.(r)}
                      className="block w-full truncate rounded-md text-left text-xs transition hover:opacity-80"
                    >
                      {renderChip(r)}
                    </button>
                  ))}
                  {dayRecords.length > 3 && (
                    <p className="pl-1 text-[11px] font-medium text-slate-400">+{dayRecords.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
