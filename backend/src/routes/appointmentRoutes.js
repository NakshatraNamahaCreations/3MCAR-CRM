import { Router } from 'express';
import {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  getAppointmentsByCustomerId,
  getAppointmentsByVehicleId,
  updateAppointment,
  changeStatus,
  deleteAppointment,
  createJobCardFromAppointment,
} from '../controllers/appointmentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAllAppointments);
router.get('/customer/:customerId', getAppointmentsByCustomerId);
router.get('/vehicle/:vehicleId', getAppointmentsByVehicleId);
router.get('/:id', getAppointmentById);

router.post('/', restrictTo('manager', 'service_advisor'), createAppointment);
router.put('/:id', restrictTo('manager', 'service_advisor'), updateAppointment);
router.patch('/:id/status', restrictTo('manager', 'service_advisor'), changeStatus);
router.post('/:id/jobcard', restrictTo('manager', 'service_advisor'), createJobCardFromAppointment);
router.delete('/:id', restrictTo('manager', 'service_advisor'), deleteAppointment);

export default router;
