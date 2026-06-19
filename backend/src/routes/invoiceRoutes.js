import { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', invoiceController.getAll);
router.get('/customer/:customerId', invoiceController.getByCustomerId);
router.get('/jobcard/:jobCardId', invoiceController.getByJobCardId);
router.get('/:id/pdf', invoiceController.downloadPdf);
router.get('/:id', invoiceController.getById);

router.post(
  '/from-jobcard',
  restrictTo('accountant', 'manager'),
  invoiceController.createFromJobCard
);
router.put('/:id', restrictTo('accountant', 'manager'), invoiceController.update);
router.patch(
  '/:id/cancel',
  restrictTo('accountant', 'manager'),
  invoiceController.cancel
);

export default router;
