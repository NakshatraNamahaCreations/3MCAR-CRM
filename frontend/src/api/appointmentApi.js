import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const appointmentApi = {
  ...createCrudApi('/appointments'),
  createJobCard: (id) => api.post(`/appointments/${id}/jobcard`).then((r) => r.data),
  changeStatus: (id, status) =>
    api.patch(`/appointments/${id}/status`, { status }).then((r) => r.data),
};

export { appointmentApi };
export default appointmentApi;
