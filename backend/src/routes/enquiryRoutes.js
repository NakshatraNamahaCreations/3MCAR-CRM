import { Router } from 'express';
import {
  createEnquiry,
  getAllEnquiries,
  getEnquiryById,
  updateEnquiry,
  deleteEnquiry,
} from '../controllers/enquiryController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAllEnquiries);
router.get('/:id', getEnquiryById);

router.post('/', restrictTo('manager', 'service_advisor'), createEnquiry);
router.put('/:id', restrictTo('manager', 'service_advisor'), updateEnquiry);
router.delete('/:id', restrictTo('manager', 'service_advisor'), deleteEnquiry);

export default router;
