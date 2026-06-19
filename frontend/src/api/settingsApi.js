import api from './axiosInstance.js';

const settingsApi = {
  get: () => api.get('/settings').then((r) => r.data),
  update: (payload) => api.put('/settings', payload).then((r) => r.data),
};

export { settingsApi };
export default settingsApi;
