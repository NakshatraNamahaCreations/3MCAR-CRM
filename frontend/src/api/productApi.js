import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const productApi = {
  ...createCrudApi('/products'),
  addStock: (id, payload) => api.post(`/products/${id}/add-stock`, payload).then(r => r.data),
  reduceStock: (id, payload) => api.post(`/products/${id}/reduce-stock`, payload).then(r => r.data),
  adjustStock: (id, payload) => api.post(`/products/${id}/adjust-stock`, payload).then(r => r.data),
  lowStock: () => api.get('/products/low-stock').then(r => r.data),
};

export { productApi };
export default productApi;
