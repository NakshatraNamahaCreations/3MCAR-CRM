import { Router } from 'express';
import protect from '../middlewares/authMiddleware.js';
import restrictTo from '../middlewares/roleMiddleware.js';
import {
  createAdvance,
  updateAdvance,
  approveAdvance,
  rejectAdvance,
  getAdvances,
  getAdvanceById,
  getByEmployeeId,
  getPending,
  getMonthlyDeductions,
} from '../controllers/salaryAdvanceController.js';

const router = Router();
router.use(protect);
router.use(restrictTo('hr', 'manager'));

router.get('/', getAdvances);
router.post('/', createAdvance);
router.get('/pending', getPending);
router.get('/monthly-deductions', getMonthlyDeductions);
router.get('/employee/:employeeId', getByEmployeeId);
router.get('/:id', getAdvanceById);
router.put('/:id', updateAdvance);
router.patch('/:id/approve', approveAdvance);
router.patch('/:id/reject', rejectAdvance);

export default router;
