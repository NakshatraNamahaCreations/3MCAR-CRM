import mongoose from 'mongoose';
import Salary from '../models/Salary.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import SalaryAdvance from '../models/SalaryAdvance.js';
import { AppError } from '../utils/apiResponse.js';
import calculateSalary from '../utils/salaryCalculator.js';
import { summarizeAttendance, daysInMonth } from '../utils/attendanceHelper.js';
import { createLinkedCashOut } from '../utils/pettyCashHelper.js';

const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Generate (or regenerate) a salary record for one employee for a month/year.
 */
export const generateForEmployee = async (
  employeeId,
  month,
  year,
  { bonus = 0, otherDeductions = 0, branchId } = {},
  userId
) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new AppError('Employee not found.', 404);

  month = Number(month);
  year = Number(year);

  // Pull attendance for the month (attendanceDate within month).
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const records = await Attendance.find({
    employeeId,
    attendanceDate: { $gte: start, $lt: end },
  });
  const summary = summarizeAttendance(records);

  const totalWorkingDays =
    daysInMonth(month, year) - summary.weeklyOffs - summary.holidays;

  const hourlyRate =
    employee.hourlyRate ||
    (employee.basicSalary / ((totalWorkingDays * 8) || 1));
  const overtimeAmount = round(summary.overtimeHours * hourlyRate);

  // Advance deductions due this month/year.
  const advances = await SalaryAdvance.find({
    employeeId,
    status: 'approved',
    deductionMonth: month,
    deductionYear: year,
  });
  const advanceDeduction = round(
    advances.reduce((sum, a) => sum + (a.amount || 0), 0)
  );

  const calc = calculateSalary({
    salaryType: employee.salaryType,
    basicSalary: employee.basicSalary,
    dailyWage: employee.dailyWage,
    hourlyRate,
    totalWorkingDays,
    presentDays: summary.presentDays,
    absentDays: summary.absentDays,
    halfDays: summary.halfDays,
    unpaidLeaves: summary.unpaidLeaves,
    totalWorkingHours: summary.totalWorkingHours,
    overtimeAmount,
    bonus,
    advanceDeduction,
    otherDeductions,
  });

  // Salary structure from the employee (fixed monthly earnings + statutory deductions).
  const hra = employee.hra || 0;
  const conveyanceAllowance = employee.conveyanceAllowance || 0;
  const medicalAllowance = employee.medicalAllowance || 0;
  const specialAllowance = employee.specialAllowance || 0;
  const allowances = round(hra + conveyanceAllowance + medicalAllowance + specialAllowance);

  const pfDeduction = employee.pfDeduction || 0;
  const esiDeduction = employee.esiDeduction || 0;
  const professionalTax = employee.professionalTax || 0;
  const statutory = round(pfDeduction + esiDeduction + professionalTax);

  // gross = basic + overtime + bonus (from calc) + fixed allowances
  const grossSalary = round(calc.grossSalary + allowances);
  // net = gross - attendance cut - statutory - advance - other deductions
  const netSalary = round(
    grossSalary - calc.deduction - statutory - calc.advanceDeduction - calc.otherDeductions
  );

  const update = {
    employeeId,
    branchId,
    salaryMonth: month,
    salaryYear: year,
    salaryType: employee.salaryType,
    basicSalary: employee.basicSalary,
    hra,
    conveyanceAllowance,
    medicalAllowance,
    specialAllowance,
    pfDeduction,
    esiDeduction,
    professionalTax,
    attendanceDeduction: calc.deduction,
    totalWorkingDays,
    presentDays: summary.presentDays,
    absentDays: summary.absentDays,
    halfDays: summary.halfDays,
    paidLeaves: summary.paidLeaves,
    unpaidLeaves: summary.unpaidLeaves,
    overtimeHours: summary.overtimeHours,
    overtimeAmount: calc.overtimeAmount,
    grossSalary,
    advanceDeduction: calc.advanceDeduction,
    otherDeductions: calc.otherDeductions,
    bonus: calc.bonus,
    netSalary,
    paymentStatus: 'pending',
    generatedBy: userId,
  };

  const salary = await Salary.findOneAndUpdate(
    { employeeId, salaryMonth: month, salaryYear: year },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Mark deducted advances.
  if (advances.length) {
    await SalaryAdvance.updateMany(
      { _id: { $in: advances.map((a) => a._id) } },
      { $set: { status: 'deducted' } }
    );
  }

  return salary;
};

/**
 * Generate salary for all active employees for a month/year.
 */
export const generateForAll = async (month, year, userId) => {
  const employees = await Employee.find({ status: 'active' });
  const results = [];
  for (const emp of employees) {
    const salary = await generateForEmployee(emp._id, month, year, {}, userId);
    results.push(salary);
  }
  return results;
};

export const updateSalary = async (salaryId, data) => {
  const allowed = [
    'bonus',
    'otherDeductions',
    'advanceDeduction',
    'overtimeAmount',
    'remarks',
    'paymentMode',
    'transactionId',
  ];
  const salary = await Salary.findById(salaryId);
  if (!salary) throw new AppError('Salary record not found.', 404);

  for (const key of allowed) {
    if (data[key] !== undefined) salary[key] = data[key];
  }

  // Recompute net if financial fields changed.
  salary.netSalary = round(
    (salary.grossSalary || 0) -
      0 -
      (salary.advanceDeduction || 0) -
      (salary.otherDeductions || 0)
  );

  await salary.save();
  return salary;
};

export const deleteSalary = async (salaryId) => {
  const salary = await Salary.findByIdAndDelete(salaryId);
  if (!salary) throw new AppError('Salary record not found.', 404);
  return salary;
};

export const getByEmployeeId = async (employeeId, filters = {}) => {
  const query = { employeeId };
  if (filters.salaryYear) query.salaryYear = Number(filters.salaryYear);
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  return Salary.find(query)
    .populate('employeeId', 'name employeeCode role')
    .sort({ salaryYear: -1, salaryMonth: -1 });
};

export const getByMonth = async (month, year, filters = {}) => {
  const query = { salaryMonth: Number(month), salaryYear: Number(year) };
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  return Salary.find(query)
    .populate('employeeId', 'name employeeCode role')
    .sort({ createdAt: -1 });
};

export const markAsPaid = async (
  salaryId,
  { paymentMode, transactionId } = {},
  userId
) => {
  const salary = await Salary.findById(salaryId);
  if (!salary) throw new AppError('Salary record not found.', 404);
  if (salary.paymentStatus === 'paid')
    throw new AppError('Salary is already marked as paid.', 400);
  if (salary.paymentStatus === 'cancelled')
    throw new AppError('Cannot pay a cancelled salary record.', 400);

  salary.paymentStatus = 'paid';
  salary.paymentDate = new Date();
  salary.paidBy = userId;
  if (paymentMode) salary.paymentMode = paymentMode;
  if (transactionId) salary.transactionId = transactionId;

  await salary.save();

  if (salary.paymentMode === 'cash') {
    const employee = await Employee.findById(salary.employeeId);
    await createLinkedCashOut({
      amount: salary.netSalary,
      category: 'salary',
      paymentPurpose: `Salary ${salary.salaryMonth}/${salary.salaryYear}`,
      paidTo: employee ? employee.name : 'Employee',
      referenceType: 'salary_payment',
      referenceId: salary._id,
      createdBy: userId,
    });
  }

  return salary;
};

export const summaryReport = async (month, year) => {
  const match = { salaryMonth: Number(month), salaryYear: Number(year) };
  const [agg] = await Salary.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalGross: { $sum: '$grossSalary' },
        totalNet: { $sum: '$netSalary' },
        totalBonus: { $sum: '$bonus' },
        totalAdvanceDeduction: { $sum: '$advanceDeduction' },
        totalOtherDeductions: { $sum: '$otherDeductions' },
        totalOvertimeAmount: { $sum: '$overtimeAmount' },
        paidCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] },
        },
        paidAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$netSalary', 0],
          },
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$netSalary', 0],
          },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);

  return (
    agg || {
      totalRecords: 0,
      totalGross: 0,
      totalNet: 0,
      totalBonus: 0,
      totalAdvanceDeduction: 0,
      totalOtherDeductions: 0,
      totalOvertimeAmount: 0,
      paidCount: 0,
      pendingCount: 0,
      paidAmount: 0,
      pendingAmount: 0,
    }
  );
};

export const getAll = async (query = {}) => {
  const filter = {};
  if (query.branchId) filter.branchId = query.branchId;
  if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.salaryMonth) filter.salaryMonth = Number(query.salaryMonth);
  if (query.salaryYear) filter.salaryYear = Number(query.salaryYear);
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  return Salary.find(filter)
    .populate('employeeId', 'name employeeCode')
    .sort({ salaryYear: -1, salaryMonth: -1 });
};

export default {
  generateForEmployee,
  generateForAll,
  updateSalary,
  deleteSalary,
  getByEmployeeId,
  getByMonth,
  markAsPaid,
  summaryReport,
  getAll,
};
