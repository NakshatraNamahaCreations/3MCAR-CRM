import { Router } from 'express';
import {
  getOverview,
  getSummary,
  getEnquiryStats,
  getJobCardStats,
  getRevenueStats,
  getInventoryStats,
  getPPFStats,
  getPettyCashStats,
  getHRStats,
  getSalaryStats,
  getAttendanceStats,
} from '../controllers/dashboardController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/overview', getOverview);
router.get('/summary', getSummary);
router.get('/enquiry-stats', getEnquiryStats);
router.get('/jobcard-stats', getJobCardStats);
router.get('/revenue-stats', getRevenueStats);
router.get('/inventory-stats', getInventoryStats);
router.get('/ppf-stats', getPPFStats);
router.get('/pettycash-stats', getPettyCashStats);
router.get('/hr-stats', getHRStats);
router.get('/salary-stats', getSalaryStats);
router.get('/attendance-stats', getAttendanceStats);

export default router;
