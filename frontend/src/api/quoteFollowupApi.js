import api from './axiosInstance.js';

const BASE = '/quote-followups';

const quoteFollowupApi = {
  list: (params) => api.get(BASE, { params }).then((r) => r.data),
  create: (payload) => api.post(BASE, payload).then((r) => r.data),
  update: (id, payload) => api.put(`${BASE}/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then((r) => r.data),
  byQuote: (quoteId) => api.get(`${BASE}/quote/${quoteId}`).then((r) => r.data),
  today: (params) => api.get(`${BASE}/today`, { params }).then((r) => r.data),
  pending: (params) => api.get(`${BASE}/pending`, { params }).then((r) => r.data),
};

export { quoteFollowupApi };
export default quoteFollowupApi;
