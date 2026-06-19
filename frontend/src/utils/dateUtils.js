/** Lightweight date helpers for calendar/list views (no external lib). */

export const pad2 = (n) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
export const toYMD = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const startOfMonth = (year, month) => new Date(year, month, 1);
export const endOfMonth = (year, month) => new Date(year, month + 1, 0);

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Build a 6-row (42 cell) month grid. Each cell: { date, ymd, inMonth, isToday }.
 */
export const buildMonthGrid = (year, month) => {
  const first = startOfMonth(year, month);
  const startWeekday = first.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startWeekday);
  const todayYMD = toYMD(new Date());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const ymd = toYMD(date);
    cells.push({
      date,
      ymd,
      inMonth: date.getMonth() === month,
      isToday: ymd === todayYMD,
    });
  }
  return cells;
};

export const prettyDate = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
