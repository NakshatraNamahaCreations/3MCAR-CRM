import { Router } from 'express';
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomerById,
  getCustomerProfile,
} from '../controllers/customerController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAllCustomers);
router.get('/:id/profile', getCustomerProfile);
router.get('/:id', getCustomerById);

router.post('/', restrictTo('manager', 'service_advisor'), createCustomer);
router.put('/:id', restrictTo('manager', 'service_advisor'), updateCustomer);
router.delete('/:id', restrictTo('manager', 'service_advisor'), deleteCustomer);

export default router;
