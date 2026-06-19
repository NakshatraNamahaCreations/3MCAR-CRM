import { Router } from 'express';
import {
  createFromAppointment,
  create,
  update,
  remove,
  getAll,
  getById,
  assignTechnician,
  startWork,
  addProductUsage,
  addPPFUsage,
  completeJobCard,
  markDelivered,
  generateInvoiceFromJobCard,
} from '../controllers/jobCardController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();
router.use(protect);

// List & detail
router.get('/', getAll);
router.get('/:id', getById);

// Creation
router.post('/from-appointment', createFromAppointment);
router.post('/', create);

// Assignment (managers / service advisors)
router.patch('/:id/assign', restrictTo('manager', 'service_advisor'), assignTechnician);

// Work execution (technicians / managers / service advisors)
router.patch('/:id/start', restrictTo('technician', 'manager', 'service_advisor'), startWork);
router.post('/:id/product-usage', restrictTo('technician', 'manager', 'service_advisor'), addProductUsage);
router.post('/:id/ppf-usage', restrictTo('technician', 'manager', 'service_advisor'), addPPFUsage);
router.patch('/:id/complete', restrictTo('technician', 'manager', 'service_advisor'), completeJobCard);

// Invoicing & delivery
router.post('/:id/generate-invoice', generateInvoiceFromJobCard);
router.patch('/:id/deliver', markDelivered);

// Update & delete
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
