import { Router } from 'express';
import {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getAllVehicles,
  getVehiclesByCustomerId,
  getVehicleById,
  searchVehiclesByNumber,
} from '../controllers/vehicleController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAllVehicles);
router.get('/search', searchVehiclesByNumber);
router.get('/customer/:customerId', getVehiclesByCustomerId);
router.get('/:id', getVehicleById);

router.post('/', restrictTo('manager', 'service_advisor'), createVehicle);
router.put('/:id', restrictTo('manager', 'service_advisor'), updateVehicle);
router.delete('/:id', restrictTo('manager', 'service_advisor'), deleteVehicle);

export default router;
