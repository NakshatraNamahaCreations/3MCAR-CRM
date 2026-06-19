import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const enquiryApi = { ...createCrudApi('/enquiries') };

export { enquiryApi };
export default enquiryApi;
