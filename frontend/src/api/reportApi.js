import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const reportApi = {
  ...createCrudApi('/reports'),
  get: (type, params) =>
    api.get(`/reports/${type}`, { params }).then((r) => r.data),
};

export { reportApi };
export default reportApi;
