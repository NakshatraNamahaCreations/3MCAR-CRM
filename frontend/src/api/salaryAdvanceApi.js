import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const salaryAdvanceApi = {
  ...createCrudApi('/salary-advances'),
  approve: (id) => api.patch(`/salary-advances/${id}/approve`).then((r) => r.data),
  reject: (id) => api.patch(`/salary-advances/${id}/reject`).then((r) => r.data),
  byEmployeeId: (employeeId) => api.get(`/salary-advances/employee/${employeeId}`).then((r) => r.data),
};

export { salaryAdvanceApi };
export default salaryAdvanceApi;
