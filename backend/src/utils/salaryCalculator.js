/**
 * Salary calculation per the workshop's payroll rules. Pure functions.
 *
 * Monthly:
 *   perDaySalary = basicSalary / totalWorkingDays
 *   deduction    = (absentDays + unpaidLeaves) * perDaySalary + halfDays * perDaySalary * 0.5
 *   grossSalary  = basicSalary + overtimeAmount + bonus
 *   netSalary    = grossSalary - deduction - advanceDeduction - otherDeductions
 *
 * Daily:
 *   grossSalary  = presentDays * dailyWage + halfDays * dailyWage * 0.5 + overtimeAmount + bonus
 *   netSalary    = grossSalary - advanceDeduction - otherDeductions
 *
 * Hourly:
 *   grossSalary  = totalWorkingHours * hourlyRate + overtimeAmount + bonus
 *   netSalary    = grossSalary - advanceDeduction - otherDeductions
 */

const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const calculateSalary = ({
  salaryType = 'monthly',
  basicSalary = 0,
  dailyWage = 0,
  hourlyRate = 0,
  totalWorkingDays = 0,
  presentDays = 0,
  absentDays = 0,
  halfDays = 0,
  unpaidLeaves = 0,
  totalWorkingHours = 0,
  overtimeAmount = 0,
  bonus = 0,
  advanceDeduction = 0,
  otherDeductions = 0,
}) => {
  let grossSalary = 0;
  let deduction = 0;

  if (salaryType === 'monthly') {
    const perDay = totalWorkingDays > 0 ? basicSalary / totalWorkingDays : 0;
    deduction = round(
      (absentDays + unpaidLeaves) * perDay + halfDays * perDay * 0.5
    );
    grossSalary = round(basicSalary + overtimeAmount + bonus);
  } else if (salaryType === 'daily') {
    grossSalary = round(presentDays * dailyWage + halfDays * dailyWage * 0.5 + overtimeAmount + bonus);
  } else if (salaryType === 'hourly') {
    grossSalary = round(totalWorkingHours * hourlyRate + overtimeAmount + bonus);
  }

  const netSalary = round(grossSalary - deduction - advanceDeduction - otherDeductions);

  return {
    grossSalary,
    deduction,
    advanceDeduction: round(advanceDeduction),
    otherDeductions: round(otherDeductions),
    overtimeAmount: round(overtimeAmount),
    bonus: round(bonus),
    netSalary,
  };
};

export default calculateSalary;
