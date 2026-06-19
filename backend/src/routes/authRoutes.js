import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

// Public
router.post('/login', authController.login);

// Authenticated
router.post('/logout', protect, authController.logout);
router.get('/profile', protect, authController.getProfile);
router.put('/change-password', protect, authController.changePassword);

// User management (admin only)
router.post('/users', protect, restrictTo('admin'), authController.createUser);
router.get('/users', protect, restrictTo('admin'), authController.getUsers);
router.get('/users/:id', protect, restrictTo('admin'), authController.getUserById);
router.put('/users/:id', protect, restrictTo('admin'), authController.updateUser);
router.delete('/users/:id', protect, restrictTo('admin'), authController.deleteUser);
router.patch('/users/:id/toggle-status', protect, restrictTo('admin'), authController.toggleStatus);
router.patch('/users/:id/reset-password', protect, restrictTo('admin'), authController.resetPassword);

export default router;
