import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const salaryApi = {
  ...createCrudApi('/salaries'),
  generate: (payload) => api.post('/salaries/generate', payload).then((r) => r.data),
  markPaid: (id, payload) => api.patch(`/salaries/${id}/pay`, payload).then((r) => r.data),
  byEmployeeId: (employeeId) => api.get(`/salaries/employee/${employeeId}`).then((r) => r.data),
  /** Download the salary-slip PDF and trigger a browser download. */
  downloadSlip: async (id, filename) => {
    const blob = await api.get(`/salaries/${id}/slip`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `Salary-Slip-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export { salaryApi };
export default salaryApi;
