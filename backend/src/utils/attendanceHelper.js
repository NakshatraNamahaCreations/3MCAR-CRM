/**
 * Attendance calculation helpers. Pure functions.
 */

/** Standard working hours per day, from env (default 8). */
export const standardHours = () => Number(process.env.STANDARD_WORKING_HOURS || 8);

/**
 * Compute total working hours and overtime from check-in/out timestamps.
 * @param {Date|string} checkInTime
 * @param {Date|string} checkOutTime
 * @returns {{ totalWorkingHours:number, overtimeHours:number }}
 */
export const computeWorkingHours = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) return { totalWorkingHours: 0, overtimeHours: 0 };
  const inMs = new Date(checkInTime).getTime();
  const outMs = new Date(checkOutTime).getTime();
  if (Number.isNaN(inMs) || Number.isNaN(outMs) || outMs <= inMs) {
    return { totalWorkingHours: 0, overtimeHours: 0 };
  }
  const hours = (outMs - inMs) / (1000 * 60 * 60);
  const totalWorkingHours = Math.round(hours * 100) / 100;
  const overtimeHours = Math.max(0, Math.round((totalWorkingHours - standardHours()) * 100) / 100);
  return { totalWorkingHours, overtimeHours };
};

/**
 * Summarize an array of attendance docs into payroll-relevant counts.
 */
export const summarizeAttendance = (records = []) => {
  const summary = {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
    weeklyOffs: 0,
    holidays: 0,
    overtimeHours: 0,
    totalWorkingHours: 0,
  };
  for (const r of records) {
    switch (r.status) {
      case 'present': summary.presentDays++; break;
      case 'absent': summary.absentDays++; break;
      case 'half_day': summary.halfDays++; break;
      case 'paid_leave': summary.paidLeaves++; break;
      case 'unpaid_leave': summary.unpaidLeaves++; break;
      case 'weekly_off': summary.weeklyOffs++; break;
      case 'holiday': summary.holidays++; break;
      default: break;
    }
    summary.overtimeHours += r.overtimeHours || 0;
    summary.totalWorkingHours += r.totalWorkingHours || 0;
  }
  summary.overtimeHours = Math.round(summary.overtimeHours * 100) / 100;
  summary.totalWorkingHours = Math.round(summary.totalWorkingHours * 100) / 100;
  return summary;
};

/** Days in a given month (1-12). */
export const daysInMonth = (month, year) => new Date(year, month, 0).getDate();

export default computeWorkingHours;
