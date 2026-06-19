import { Router } from 'express';
import protect from '../middlewares/authMiddleware.js';
import restrictTo from '../middlewares/roleMiddleware.js';
import {
  getAll,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  deleteAttendance,
  getByEmployeeId,
  getByDate,
  getMonthlyReport,
  getTodaySummary,
  checkIn,
  checkOut,
} from '../controllers/attendanceController.js';

const router = Router();

router.use(protect);
router.use(restrictTo('hr', 'manager'));

router.get('/', getAll);

router.get('/today-summary', getTodaySummary);
router.get('/monthly-report', getMonthlyReport);
router.get('/by-date', getByDate);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

router.post('/bulk', bulkMarkAttendance);
router.post('/', markAttendance);

router.get('/employee/:employeeId', getByEmployeeId);

router.patch('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
