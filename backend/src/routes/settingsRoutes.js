import { Router } from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

// Any authenticated user can read settings (needed for PDFs / display).
router.get('/', settingsController.getSettings);

// Only admin / manager can change company settings.
router.put('/', restrictTo('admin', 'manager'), settingsController.updateSettings);

export default router;
