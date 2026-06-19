import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const pettyCashApi = {
  ...createCrudApi('/petty-cash'),
  balance: () => api.get('/petty-cash/current-balance').then((r) => r.data),
  approve: (id) => api.patch(`/petty-cash/${id}/approve`).then((r) => r.data),
};

export { pettyCashApi };
export default pettyCashApi;
