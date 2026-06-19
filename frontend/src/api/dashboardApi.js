import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const xApi = { ...createCrudApi('/dashboard') };

export const dashboardApi = {
  ...xApi,
  summary: () => api.get('/dashboard/summary').then((r) => r.data),
  overview: (period) => api.get('/dashboard/overview', { params: { period } }).then((r) => r.data),
};

export default dashboardApi;
