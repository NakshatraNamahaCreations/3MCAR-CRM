import { Router } from 'express';
import {
  create,
  update,
  remove,
  getAll,
  getByQuoteId,
  getPending,
  getToday,
} from '../controllers/quoteFollowupController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAll);
router.get('/pending', getPending);
router.get('/today', getToday);
router.get('/quote/:quoteId', getByQuoteId);

router.post('/', restrictTo('manager', 'service_advisor'), create);
router.put('/:id', restrictTo('manager', 'service_advisor'), update);
router.delete('/:id', restrictTo('manager', 'service_advisor'), remove);

export default router;
