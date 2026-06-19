import { Router } from 'express';
import {
  getAll,
  createPPFUsage,
  updatePPFUsage,
  deletePPFUsage,
  getByJobCardId,
  getByVehicleId,
  getByCustomerId,
  getByProductId,
  getTotalUsedReport,
  getRemainingStockReport,
  deductOnCompletion,
} from '../controllers/ppfUsageController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

// List all (branch-scoped)
router.get('/', getAll);

// Reports
router.get('/reports/total-used', getTotalUsedReport);
router.get('/reports/remaining-stock', getRemainingStockReport);

// Lookups
router.get('/job-card/:jobCardId', getByJobCardId);
router.get('/vehicle/:vehicleId', getByVehicleId);
router.get('/customer/:customerId', getByCustomerId);
router.get('/product/:productId', getByProductId);

// Stock deduction on job completion
router.post('/deduct-on-completion/:jobCardId', restrictTo('technician', 'manager'), deductOnCompletion);

// CRUD
router.post('/', restrictTo('technician', 'manager'), createPPFUsage);
router.put('/:id', updatePPFUsage);
router.delete('/:id', deletePPFUsage);

export default router;
