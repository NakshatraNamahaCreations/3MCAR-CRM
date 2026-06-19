import { Router } from 'express';
import {
  create,
  update,
  remove,
  getByEnquiryId,
  getToday,
  getOverdue,
  getCalendar,
} from '../controllers/enquiryFollowupController.js';
import protect from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/today', getToday);
router.get('/overdue', getOverdue);
router.get('/calendar', getCalendar);
router.get('/enquiry/:enquiryId', getByEnquiryId);

router.post('/', restrictTo('manager', 'service_advisor', 'technician'), create);
router.put('/:id', restrictTo('manager', 'service_advisor', 'technician'), update);
router.delete('/:id', restrictTo('manager'), remove);

export default router;
