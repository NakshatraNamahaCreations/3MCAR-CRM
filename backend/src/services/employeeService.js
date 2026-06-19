import Employee from '../models/Employee.js';
import { AppError } from '../utils/apiResponse.js';
import generateNumber from '../utils/generateNumber.js';

const ALLOWED_FIELDS = [
  'branchId',
  'name',
  'phone',
  'alternatePhone',
  'email',
  'address',
  'city',
  'state',
  'pincode',
  'role',
  'designation',
  'department',
  'joiningDate',
  'salaryType',
  'basicSalary',
  'dailyWage',
  'hourlyRate',
  'hra',
  'conveyanceAllowance',
  'medicalAllowance',
  'specialAllowance',
  'pfDeduction',
  'esiDeduction',
  'professionalTax',
  'documents',
  'emergencyContactName',
  'emergencyContactPhone',
  'userId',
  'status',
];

export const createEmployee = async (payload) => {
  const { name } = payload;

  if (!name) {
    throw new AppError('Employee name is required', 400);
  }

  const employeeCode = await generateNumber('EMP');

  const data = { employeeCode };
  for (const key of ALLOWED_FIELDS) {
    if (payload[key] !== undefined) data[key] = payload[key];
  }

  const employee = await Employee.create(data);
  return employee;
};

export const updateEmployee = async (id, payload) => {
  const update = {};
  for (const key of ALLOWED_FIELDS) {
    if (payload[key] !== undefined) update[key] = payload[key];
  }

  const employee = await Employee.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  return employee;
};

export const deleteEmployee = async (id) => {
  const employee = await Employee.findByIdAndDelete(id);
  if (!employee) {
    throw new AppError('Employee not found', 404);
  }
  return employee;
};

export const getAllEmployees = async (query = {}) => {
  const { role, department, status, search } = query;
  const filter = {};

  if (query.branchId) filter.branchId = query.branchId;
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (status) filter.status = status;

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { name: regex },
      { phone: regex },
      { employeeCode: regex },
    ];
  }

  const employees = await Employee.find(filter)
    .populate('userId', '-password')
    .sort({ createdAt: -1 });

  return employees;
};

export const getEmployeeById = async (id) => {
  const employee = await Employee.findById(id).populate('userId', '-password');
  if (!employee) {
    throw new AppError('Employee not found', 404);
  }
  return employee;
};

export const toggleEmployeeStatus = async (id, activate) => {
  const employee = await Employee.findById(id);
  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  employee.status = activate ? 'active' : 'inactive';
  await employee.save();

  return employee;
};
