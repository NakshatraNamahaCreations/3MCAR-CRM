import api from './axiosInstance.js';

const BASE = '/auth/users';

const userApi = {
  list: (params) => api.get(BASE, { params }).then((r) => r.data),
  get: (id) => api.get(`${BASE}/${id}`).then((r) => r.data),
  create: (payload) => api.post(BASE, payload).then((r) => r.data),
  update: (id, payload) => api.put(`${BASE}/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then((r) => r.data),
  toggleStatus: (id) => api.patch(`${BASE}/${id}/toggle-status`).then((r) => r.data),
  resetPassword: (id, newPassword) => api.patch(`${BASE}/${id}/reset-password`, { newPassword }).then((r) => r.data),
};

export { userApi };
export default userApi;
