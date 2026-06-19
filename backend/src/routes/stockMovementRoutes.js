import { Router } from 'express';
import {
  getAllStockMovements,
  getMovementsByProduct,
} from '../controllers/stockMovementController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAllStockMovements);
router.get('/product/:productId', getMovementsByProduct);

export default router;
