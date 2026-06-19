import { Router } from 'express';
import {
  createExpense,
  updateExpense,
  deleteExpense,
  getAllExpenses,
  getExpenseReport,
} from '../controllers/expenseController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);
router.use(restrictTo('accountant', 'manager'));

router.get('/report', getExpenseReport);
router.get('/', getAllExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
