import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const branchApi = {
  ...createCrudApi('/branches'),
  /** Branches the current user can work in + their active branch. */
  mine: () => api.get('/branches/mine').then((r) => r.data),
  /** Switch the current user's active branch (persists server-side). */
  switch: (branchId) => api.post('/branches/switch', { branchId }).then((r) => r.data),
};

export { branchApi };
export default branchApi;
