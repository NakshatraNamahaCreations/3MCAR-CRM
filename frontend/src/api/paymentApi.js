import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const paymentApi = {
  ...createCrudApi('/payments'),
  byInvoice: (invoiceId) =>
    api.get('/payments', { params: { invoiceId } }).then((r) => r.data),
};

export { paymentApi };
export default paymentApi;
