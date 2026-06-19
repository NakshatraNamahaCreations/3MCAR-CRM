import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const termsApi = { ...createCrudApi('/terms') };

export { termsApi };
export default termsApi;
