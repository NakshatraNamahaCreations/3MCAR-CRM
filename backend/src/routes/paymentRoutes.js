import { Router } from 'express';
import {
  getAll,
  addPayment,
  updatePayment,
  deletePayment,
  getByInvoiceId,
  getByCustomerId,
  getSummary,
  validateBeforeDelivery,
} from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAll);
router.get('/summary', restrictTo('accountant', 'manager'), getSummary);
router.get('/validate-delivery/:invoiceId', validateBeforeDelivery);
router.get('/invoice/:invoiceId', getByInvoiceId);
router.get('/customer/:customerId', getByCustomerId);

router.post('/', restrictTo('accountant', 'manager', 'service_advisor'), addPayment);
router.put('/:id', restrictTo('accountant', 'manager'), updatePayment);
router.delete('/:id', restrictTo('accountant', 'manager'), deletePayment);

export default router;
