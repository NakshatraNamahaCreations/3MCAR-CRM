import { Router } from 'express';

import { protect } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';
import { requireBranchForCreate } from '../middlewares/branchMiddleware.js';
import authRoutes from './authRoutes.js';
import branchRoutes from './branchRoutes.js';
import termsRoutes from './termsRoutes.js';
import enquiryRoutes from './enquiryRoutes.js';
import enquiryFollowupRoutes from './enquiryFollowupRoutes.js';
import quoteRoutes from './quoteRoutes.js';
import quoteFollowupRoutes from './quoteFollowupRoutes.js';
import customerRoutes from './customerRoutes.js';
import vehicleRoutes from './vehicleRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import jobCardRoutes from './jobCardRoutes.js';
import serviceRoutes from './serviceRoutes.js';
import productRoutes from './productRoutes.js';
import stockMovementRoutes from './stockMovementRoutes.js';
import ppfUsageRoutes from './ppfUsageRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import deliveryRoutes from './deliveryRoutes.js';
import expenseRoutes from './expenseRoutes.js';
import pettyCashRoutes from './pettyCashRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import salaryRoutes from './salaryRoutes.js';
import salaryAdvanceRoutes from './salaryAdvanceRoutes.js';
import leaveRoutes from './leaveRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import reportRoutes from './reportRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = Router();

router.get('/', (req, res) =>
  res.json({ success: true, message: 'Car Workshop CRM API', data: { version: '1.0.0' } })
);

router.use('/auth', authRoutes);
router.use('/branches', branchRoutes);
// Branch-scoped data routers: block create when no active branch is resolved.
router.use('/enquiries', protect, permit('enquiries'), requireBranchForCreate, enquiryRoutes);
router.use('/enquiry-followups', protect, permit('followups'), requireBranchForCreate, enquiryFollowupRoutes);
router.use('/quotes', protect, permit('quotes'), requireBranchForCreate, quoteRoutes);
router.use('/quote-followups', protect, permit('quotefollowups'), requireBranchForCreate, quoteFollowupRoutes);
router.use('/customers', protect, permit('customers'), requireBranchForCreate, customerRoutes);
router.use('/vehicles', protect, permit('vehicles'), requireBranchForCreate, vehicleRoutes);
router.use('/appointments', protect, permit('appointments'), requireBranchForCreate, appointmentRoutes);
router.use('/job-cards', protect, permit('jobcards'), requireBranchForCreate, jobCardRoutes);
router.use('/services', protect, permit('services'), requireBranchForCreate, serviceRoutes);
router.use('/products', protect, permit('products'), requireBranchForCreate, productRoutes);
router.use('/stock-movements', protect, permit('stockhistory'), stockMovementRoutes);
router.use('/ppf-usage', protect, permit('ppf'), requireBranchForCreate, ppfUsageRoutes);
router.use('/invoices', protect, permit('invoices'), requireBranchForCreate, invoiceRoutes);
router.use('/payments', protect, permit('payments'), requireBranchForCreate, paymentRoutes);
router.use('/deliveries', protect, requireBranchForCreate, deliveryRoutes);
router.use('/expenses', protect, permit('expenses'), requireBranchForCreate, expenseRoutes);
router.use('/petty-cash', protect, permit('pettycash'), requireBranchForCreate, pettyCashRoutes);
router.use('/employees', protect, permit('employees'), requireBranchForCreate, employeeRoutes);
router.use('/attendance', protect, permit('attendance'), requireBranchForCreate, attendanceRoutes);
router.use('/salaries', protect, permit('salary'), requireBranchForCreate, salaryRoutes);
router.use('/salary-advances', protect, permit('salaryadvance'), requireBranchForCreate, salaryAdvanceRoutes);
router.use('/leaves', protect, permit('leave'), requireBranchForCreate, leaveRoutes);
router.use('/terms', protect, requireBranchForCreate, termsRoutes);
router.use('/dashboard', protect, permit('dashboard'), dashboardRoutes);
router.use('/reports', protect, permit('reports'), reportRoutes);
router.use('/settings', settingsRoutes);

export default router;
