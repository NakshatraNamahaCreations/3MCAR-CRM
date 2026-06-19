import { Router } from 'express';
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployeeById,
  activateEmployee,
  deactivateEmployee,
} from '../controllers/employeeController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);

router.post('/', restrictTo('hr', 'manager'), createEmployee);
router.put('/:id', restrictTo('hr', 'manager'), updateEmployee);
router.delete('/:id', restrictTo('hr', 'manager'), deleteEmployee);
router.patch('/:id/activate', restrictTo('hr', 'manager'), activateEmployee);
router.patch('/:id/deactivate', restrictTo('hr', 'manager'), deactivateEmployee);

export default router;
