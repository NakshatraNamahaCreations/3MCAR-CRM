import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const leaveApi = {
  ...createCrudApi('/leaves'),
  approve: (id) => api.patch(`/leaves/${id}/approve`).then((r) => r.data),
  reject: (id) => api.patch(`/leaves/${id}/reject`).then((r) => r.data),
  byEmployeeId: (employeeId) => api.get(`/leaves/employee/${employeeId}`).then((r) => r.data),
};

export { leaveApi };
export default leaveApi;
