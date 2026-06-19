import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const customerApi = {
  ...createCrudApi('/customers'),
  profile: (id) => api.get(`/customers/${id}/profile`).then((r) => r.data),
};

export { customerApi };
export default customerApi;
