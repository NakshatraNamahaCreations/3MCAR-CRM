import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const jobCardApi = {
  ...createCrudApi('/job-cards'),
  assignTechnician: (id, payload) =>
    api.patch(`/job-cards/${id}/assign`, payload).then((r) => r.data),
  startWork: (id) => api.patch(`/job-cards/${id}/start`).then((r) => r.data),
  addProductUsage: (id, payload) =>
    api.post(`/job-cards/${id}/product-usage`, payload).then((r) => r.data),
  addPPFUsage: (id, payload) =>
    api.post(`/job-cards/${id}/ppf-usage`, payload).then((r) => r.data),
  complete: (id) => api.patch(`/job-cards/${id}/complete`).then((r) => r.data),
  generateInvoice: (id) =>
    api.post(`/job-cards/${id}/generate-invoice`).then((r) => r.data),
  markDelivered: (id) =>
    api.patch(`/job-cards/${id}/deliver`).then((r) => r.data),
};

export { jobCardApi };
export default jobCardApi;
