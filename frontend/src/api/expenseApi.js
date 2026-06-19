import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const expenseApi = { ...createCrudApi('/expenses') };

export { expenseApi };
export default expenseApi;
