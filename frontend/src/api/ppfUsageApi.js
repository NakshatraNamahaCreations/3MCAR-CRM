import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const ppfUsageApi = { ...createCrudApi('/ppf-usage') };

export { ppfUsageApi };
export default ppfUsageApi;
