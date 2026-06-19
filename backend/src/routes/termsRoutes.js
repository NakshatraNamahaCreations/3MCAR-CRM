import { Router } from 'express';
import * as termsController from '../controllers/termsController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', termsController.getAll);
router.get('/:id', termsController.getById);

// Manage templates — admin/manager.
router.post('/', restrictTo('admin', 'manager'), termsController.create);
router.put('/:id', restrictTo('admin', 'manager'), termsController.update);
router.delete('/:id', restrictTo('admin', 'manager'), termsController.remove);

export default router;
