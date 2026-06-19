import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Enquiries from './pages/Enquiries.jsx';
import EnquiryDetail from './pages/EnquiryDetail.jsx';
import Quotes from './pages/Quotes.jsx';
import QuoteDetail from './pages/QuoteDetail.jsx';
import Customers from './pages/Customers.jsx';
import JobCards from './pages/JobCards.jsx';
import JobCardDetail from './pages/JobCardDetail.jsx';
import Invoices from './pages/Invoices.jsx';

import Followups from './pages/Followups.jsx';
import QuoteFollowups from './pages/QuoteFollowups.jsx';
import Vehicles from './pages/Vehicles.jsx';
import Appointments from './pages/Appointments.jsx';
import Services from './pages/Services.jsx';
import Products from './pages/Products.jsx';
import StockHistory from './pages/StockHistory.jsx';
import PPFUsage from './pages/PPFUsage.jsx';
import Payments from './pages/Payments.jsx';
import Expenses from './pages/Expenses.jsx';
import PettyCash from './pages/PettyCash.jsx';
import Employees from './pages/Employees.jsx';
import EmployeeDetail from './pages/EmployeeDetail.jsx';
import Settings from './pages/Settings.jsx';
import Attendance from './pages/Attendance.jsx';
import Salary from './pages/Salary.jsx';
import SalaryAdvance from './pages/SalaryAdvance.jsx';
import Leave from './pages/Leave.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Branches from './pages/Branches.jsx';
import Terms from './pages/Terms.jsx';

const Page = ({ children, roles }) => (
  <ProtectedRoute roles={roles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Page><Dashboard /></Page>} />
      <Route path="/enquiries" element={<Page roles={['manager', 'service_advisor']}><Enquiries /></Page>} />
      <Route path="/enquiries/:id" element={<Page roles={['manager', 'service_advisor']}><EnquiryDetail /></Page>} />
      <Route path="/followups" element={<Page roles={['manager', 'service_advisor']}><Followups /></Page>} />
      <Route path="/quote-followups" element={<Page roles={['manager', 'service_advisor']}><QuoteFollowups /></Page>} />
      <Route path="/quotes" element={<Page roles={['manager', 'service_advisor']}><Quotes /></Page>} />
      <Route path="/quotes/:id" element={<Page roles={['manager', 'service_advisor']}><QuoteDetail /></Page>} />
      <Route path="/customers" element={<Page roles={['manager', 'service_advisor']}><Customers /></Page>} />
      <Route path="/vehicles" element={<Page roles={['manager', 'service_advisor']}><Vehicles /></Page>} />
      <Route path="/appointments" element={<Page roles={['manager', 'service_advisor']}><Appointments /></Page>} />
      <Route path="/job-cards" element={<Page roles={['manager', 'service_advisor', 'technician']}><JobCards /></Page>} />
      <Route path="/job-cards/:id" element={<Page roles={['manager', 'service_advisor', 'technician']}><JobCardDetail /></Page>} />
      <Route path="/services" element={<Page roles={['manager']}><Services /></Page>} />
      <Route path="/products" element={<Page roles={['manager']}><Products /></Page>} />
      <Route path="/stock-history" element={<Page roles={['manager']}><StockHistory /></Page>} />
      <Route path="/ppf-usage" element={<Page roles={['manager', 'technician']}><PPFUsage /></Page>} />
      <Route path="/invoices" element={<Page roles={['accountant', 'manager']}><Invoices /></Page>} />
      <Route path="/payments" element={<Page roles={['accountant', 'manager']}><Payments /></Page>} />
      <Route path="/expenses" element={<Page roles={['accountant', 'manager']}><Expenses /></Page>} />
      <Route path="/petty-cash" element={<Page roles={['accountant', 'manager']}><PettyCash /></Page>} />
      <Route path="/employees" element={<Page roles={['hr', 'manager']}><Employees /></Page>} />
      <Route path="/employees/:id" element={<Page roles={['hr', 'manager']}><EmployeeDetail /></Page>} />
      <Route path="/attendance" element={<Page roles={['hr', 'manager']}><Attendance /></Page>} />
      <Route path="/salary" element={<Page roles={['hr', 'manager']}><Salary /></Page>} />
      <Route path="/salary-advance" element={<Page roles={['hr', 'manager']}><SalaryAdvance /></Page>} />
      <Route path="/leave" element={<Page roles={['hr', 'manager']}><Leave /></Page>} />
      <Route path="/reports" element={<Page roles={['manager', 'accountant', 'hr']}><Reports /></Page>} />
      <Route path="/users" element={<Page roles={[]}><Users /></Page>} />
      <Route path="/branches" element={<Page roles={[]}><Branches /></Page>} />
      <Route path="/terms" element={<Page roles={['manager']}><Terms /></Page>} />
      <Route path="/settings" element={<Page roles={[]}><Settings /></Page>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
