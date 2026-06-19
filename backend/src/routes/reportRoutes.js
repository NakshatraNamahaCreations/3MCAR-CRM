import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import protect from '../middlewares/authMiddleware.js';
import { restrictTo } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(protect);
// Reports are restricted to management / finance / HR roles. Admin always passes.
router.use(restrictTo('manager', 'accountant', 'hr'));

// Sales / CRM
router.get('/enquiry', reportController.enquiryReport);
router.get('/followup', reportController.followupReport);
router.get('/quote', reportController.quoteReport);
router.get('/customer', reportController.customerReport);
router.get('/appointment', reportController.appointmentReport);
router.get('/job-card', reportController.jobCardReport);

// Billing
router.get('/invoice', reportController.invoiceReport);
router.get('/payment', reportController.paymentReport);

// Inventory
router.get('/product-inventory', reportController.productInventoryReport);
router.get('/stock-movement', reportController.stockMovementReport);
router.get('/ppf-usage', reportController.ppfUsageReport);

// Finance
router.get('/expense', reportController.expenseReport);
router.get('/petty-cash', reportController.pettyCashReport);
router.get('/daily-cash', reportController.dailyCashReport);

// HR / Payroll
router.get('/employee', reportController.employeeReport);
router.get('/attendance', reportController.attendanceReport);
router.get('/monthly-attendance', reportController.monthlyAttendanceReport);
router.get('/salary', reportController.salaryReport);
router.get('/salary-advance', reportController.salaryAdvanceReport);
router.get('/leave', reportController.leaveReport);
router.get('/payroll', reportController.payrollReport);

// Financial summary
router.get('/profit-and-loss', reportController.profitAndLossReport);

export default router;
