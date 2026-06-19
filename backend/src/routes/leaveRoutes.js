import { Router } from 'express';
import protect from '../middlewares/authMiddleware.js';
import restrictTo from '../middlewares/roleMiddleware.js';
import {
  applyLeave,
  updateLeave,
  approveLeave,
  rejectLeave,
  getLeaves,
  getLeaveById,
  getByEmployeeId,
  getPending,
  getCalendar,
  getMonthlyReport,
} from '../controllers/leaveController.js';

const router = Router();
router.use(protect);
router.use(restrictTo('hr', 'manager'));

router.get('/', getLeaves);
router.post('/', applyLeave);
router.get('/pending', getPending);
router.get('/calendar', getCalendar);
router.get('/monthly-report', getMonthlyReport);
router.get('/employee/:employeeId', getByEmployeeId);
router.get('/:id', getLeaveById);
router.put('/:id', updateLeave);
router.patch('/:id/approve', approveLeave);
router.patch('/:id/reject', rejectLeave);

export default router;
