import api from './axiosInstance.js';

const BASE = '/enquiry-followups';

const enquiryFollowupApi = {
  create: (payload) => api.post(BASE, payload).then((r) => r.data),
  update: (id, payload) => api.put(`${BASE}/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then((r) => r.data),
  byEnquiry: (enquiryId) => api.get(`${BASE}/enquiry/${enquiryId}`).then((r) => r.data),
  today: (params) => api.get(`${BASE}/today`, { params }).then((r) => r.data),
  overdue: (params) => api.get(`${BASE}/overdue`, { params }).then((r) => r.data),
  /** Fetch followups within a date range (used for both list and calendar views). */
  calendar: (from, to, params = {}) =>
    api.get(`${BASE}/calendar`, { params: { from, to, ...params } }).then((r) => r.data),
};

export { enquiryFollowupApi };
export default enquiryFollowupApi;
