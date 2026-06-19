import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const employeeApi = { ...createCrudApi('/employees') };

export { employeeApi };
export default employeeApi;
