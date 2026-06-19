import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const vehicleApi = {
  ...createCrudApi('/vehicles'),
  byCustomer: (customerId) =>
    api.get('/vehicles', { params: { customerId } }).then((r) => r.data),
};

export { vehicleApi };
export default vehicleApi;
