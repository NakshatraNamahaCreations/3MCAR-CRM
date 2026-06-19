import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const attendanceApi = {
  ...createCrudApi('/attendance'),
  byDate: (date) => api.get('/attendance', { params: { date } }).then((r) => r.data),
  mark: (payload) => api.post('/attendance', payload).then((r) => r.data),
  bulkMark: (payload) => api.post('/attendance/bulk', payload).then((r) => r.data),
  byEmployeeId: (employeeId, params) => api.get(`/attendance/employee/${employeeId}`, { params }).then((r) => r.data),
  monthlyReport: (params) => api.get('/attendance/monthly-report', { params }).then((r) => r.data),
};

export { attendanceApi };
export default attendanceApi;
