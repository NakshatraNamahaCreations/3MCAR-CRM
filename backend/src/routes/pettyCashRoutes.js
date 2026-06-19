import { Router } from 'express';
import {
  createPettyCash,
  updatePettyCash,
  deletePettyCash,
  getAllPettyCash,
  getPettyCashById,
  getTodaySummary,
  getMonthlySummary,
  getCurrentBalance,
  approvePettyCash,
} from '../controllers/pettyCashController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);
router.use(restrictTo('accountant', 'manager'));

router.get('/today-summary', getTodaySummary);
router.get('/monthly-summary', getMonthlySummary);
router.get('/current-balance', getCurrentBalance);
router.get('/', getAllPettyCash);
router.get('/:id', getPettyCashById);

router.post('/', createPettyCash);
router.patch('/:id/approve', approvePettyCash);
router.put('/:id', updatePettyCash);
router.delete('/:id', deletePettyCash);

export default router;
