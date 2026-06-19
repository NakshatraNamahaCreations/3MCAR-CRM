import { Router } from 'express';
import {
  createService,
  updateService,
  deleteService,
  getAllServices,
  getServiceById,
  toggleServiceStatus,
} from '../controllers/serviceController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAllServices);
router.get('/:id', getServiceById);

router.post('/', restrictTo('manager'), createService);
router.put('/:id', restrictTo('manager'), updateService);
router.delete('/:id', restrictTo('manager'), deleteService);
router.patch('/:id/toggle-status', restrictTo('manager'), toggleServiceStatus);

export default router;
