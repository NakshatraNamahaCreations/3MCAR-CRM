import { Router } from 'express';
import {
  createFromEnquiry,
  getAll,
  getById,
  getByEnquiryId,
  update,
  changeStatus,
  acceptQuote,
  remove,
  downloadPdf,
} from '../controllers/quoteController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

const mutate = restrictTo('manager', 'service_advisor');

// Reads
router.get('/', getAll);
router.get('/enquiry/:enquiryId', getByEnquiryId);
router.get('/:id/pdf', downloadPdf);
router.get('/:id', getById);

// Mutations
router.post('/', mutate, createFromEnquiry);
router.put('/:id', mutate, update);
router.patch('/:id/status', mutate, changeStatus);
router.patch('/:id/accept', mutate, acceptQuote);
router.delete('/:id', mutate, remove);

export default router;
