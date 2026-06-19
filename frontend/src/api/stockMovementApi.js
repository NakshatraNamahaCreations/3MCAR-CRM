import api from './axiosInstance.js';

const stockMovementApi = {
  list: (params) => api.get('/stock-movements', { params }).then((r) => r.data),
  byProduct: (productId) => api.get(`/stock-movements/product/${productId}`).then((r) => r.data),
};

export { stockMovementApi };
export default stockMovementApi;
