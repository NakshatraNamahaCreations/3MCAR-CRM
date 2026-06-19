import { Router } from 'express';
import {
  deliverVehicle,
  getDeliveryDetails,
  getDelivered,
} from '../controllers/deliveryController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);
router.use(restrictTo('accountant', 'manager', 'service_advisor'));

router.post('/', deliverVehicle);
router.get('/', getDelivered);
router.get('/:jobCardId', getDeliveryDetails);

export default router;
