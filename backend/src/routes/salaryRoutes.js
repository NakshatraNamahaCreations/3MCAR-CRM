import { Router } from 'express';
import {
  generateForEmployee,
  generateForAll,
  updateSalary,
  deleteSalary,
  getByEmployeeId,
  getByMonth,
  markAsPaid,
  summaryReport,
  getAll,
  downloadSlip,
} from '../controllers/salaryController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);
router.use(restrictTo('hr', 'manager'));

router.post('/generate', generateForEmployee);
router.post('/generate-all', generateForAll);

router.get('/', getAll);
router.get('/summary', summaryReport);
router.get('/month', getByMonth);
router.get('/employee/:employeeId', getByEmployeeId);
router.get('/:id/slip', downloadSlip);

router.patch('/:id/pay', markAsPaid);
router.patch('/:id', updateSalary);
router.delete('/:id', deleteSalary);

export default router;
