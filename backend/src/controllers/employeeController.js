import {
  createEmployee as createEmployeeService,
  updateEmployee as updateEmployeeService,
  deleteEmployee as deleteEmployeeService,
  getAllEmployees as getAllEmployeesService,
  getEmployeeById as getEmployeeByIdService,
  toggleEmployeeStatus as toggleEmployeeStatusService,
} from '../services/employeeService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await createEmployeeService({ ...req.body, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Employee created successfully',
    data: employee,
    statusCode: 201,
  });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await updateEmployeeService(req.params.id, req.body);
  return sendSuccess(res, {
    message: 'Employee updated successfully',
    data: employee,
  });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  await deleteEmployeeService(req.params.id);
  return sendSuccess(res, { message: 'Employee deleted successfully' });
});

export const getAllEmployees = asyncHandler(async (req, res) => {
  const employees = await getAllEmployeesService({ ...req.query, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Employees fetched successfully',
    data: employees,
  });
});

export const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await getEmployeeByIdService(req.params.id);
  return sendSuccess(res, {
    message: 'Employee fetched successfully',
    data: employee,
  });
});

export const activateEmployee = asyncHandler(async (req, res) => {
  const employee = await toggleEmployeeStatusService(req.params.id, true);
  return sendSuccess(res, {
    message: 'Employee activated successfully',
    data: employee,
  });
});

export const deactivateEmployee = asyncHandler(async (req, res) => {
  const employee = await toggleEmployeeStatusService(req.params.id, false);
  return sendSuccess(res, {
    message: 'Employee deactivated successfully',
    data: employee,
  });
});
