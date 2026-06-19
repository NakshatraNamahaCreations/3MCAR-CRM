import { Router } from 'express';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getLowStock,
  getProductById,
  addStock,
  reduceStock,
  adjustStock,
} from '../controllers/productController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAllProducts);
router.get('/low-stock', getLowStock);
router.get('/:id', getProductById);

router.post('/', restrictTo('manager'), createProduct);
router.put('/:id', restrictTo('manager'), updateProduct);
router.delete('/:id', restrictTo('manager'), deleteProduct);

router.post('/:id/add-stock', restrictTo('manager'), addStock);
router.post('/:id/reduce-stock', restrictTo('manager'), reduceStock);
router.post('/:id/adjust-stock', restrictTo('manager'), adjustStock);

export default router;
