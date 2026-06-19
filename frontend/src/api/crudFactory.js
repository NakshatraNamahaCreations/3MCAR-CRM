import api from './axiosInstance.js';

/**
 * Builds standard CRUD calls for a resource base path.
 * Every call returns the unwrapped { success, message, data } body's `data`
 * (axios interceptor already unwraps the HTTP layer to the response body).
 */
export const createCrudApi = (base) => ({
  list: (params) => api.get(base, { params }).then((r) => r.data),
  get: (id) => api.get(`${base}/${id}`).then((r) => r.data),
  create: (payload) => api.post(base, payload).then((r) => r.data),
  update: (id, payload) => api.put(`${base}/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`${base}/${id}`).then((r) => r.data),
});

export default createCrudApi;
