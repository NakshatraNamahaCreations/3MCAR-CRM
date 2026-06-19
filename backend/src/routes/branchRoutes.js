import { Router } from 'express';
import * as branchController from '../controllers/branchController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

// Available to any authenticated user (branch switcher).
router.get('/mine', branchController.myBranches);
router.post('/switch', branchController.switchActive);

// Branch management — admin only.
router.get('/', branchController.getAll);
router.get('/:id', branchController.getById);
router.post('/', restrictTo('admin'), branchController.create);
router.put('/:id', restrictTo('admin'), branchController.update);
router.delete('/:id', restrictTo('admin'), branchController.remove);

export default router;
