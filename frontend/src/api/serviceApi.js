import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const serviceApi = { ...createCrudApi('/services') };

export { serviceApi };
export default serviceApi;
