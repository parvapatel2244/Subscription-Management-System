import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import { AppLayout } from './components/common/AppLayout';

// Auth Pages
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';

// Admin / Staff Features
import { AdminDashboard } from './features/admin/AdminDashboard';
import { CustomerList } from './features/admin/CustomerList';
import { ProductList } from './features/admin/ProductList';
import { PlanList } from './features/admin/PlanList';
import { QuotationList } from './features/admin/QuotationList';
import { SubscriptionList } from './features/admin/SubscriptionList';
import { InvoiceList } from './features/admin/InvoiceList';
import { PaymentList } from './features/admin/PaymentList';
import { DiscountList } from './features/admin/DiscountList';
import { ReportView } from './features/admin/ReportView';
import { StaffList } from './features/admin/StaffList';
import { AuditLogList } from './features/admin/AuditLogList';
import { SettingsView } from './features/admin/SettingsView';

// Customer Portal Features
import { CustomerDashboard } from './features/portal/CustomerDashboard';
import { CustomerSubscriptions } from './features/portal/CustomerSubscriptions';
import { CustomerInvoices } from './features/portal/CustomerInvoices';
import { CustomerPayments } from './features/portal/CustomerPayments';
import { CustomerProfile } from './features/portal/CustomerProfile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard: Must be authenticated
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400 font-medium">Authenticating session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Guard: Admin & Staff only
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isCustomer } = useAuth();
  if (isCustomer) {
    return <Navigate to="/portal/dashboard" replace />;
  }
  return <>{children}</>;
};

// Root index redirect based on role
const RootRedirect: React.FC = () => {
  const { user, loading, isCustomer } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={isCustomer ? '/portal/dashboard' : '/admin/dashboard'} replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Root Dispatcher */}
            <Route path="/" element={<RootRedirect />} />

            {/* Admin / Staff Workspace Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AppLayout />
                  </AdminRoute>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="customers" element={<CustomerList />} />
              <Route path="products" element={<ProductList />} />
              <Route path="plans" element={<PlanList />} />
              <Route path="quotations" element={<QuotationList />} />
              <Route path="subscriptions" element={<SubscriptionList />} />
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="payments" element={<PaymentList />} />
              <Route path="discounts" element={<DiscountList />} />
              <Route path="reports" element={<ReportView />} />
              <Route path="staff" element={<StaffList />} />
              <Route path="audit" element={<AuditLogList />} />
              <Route path="settings" element={<SettingsView />} />
            </Route>

            {/* Customer Self-Service Portal Routes */}
            <Route
              path="/portal"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/portal/dashboard" replace />} />
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="subscriptions" element={<CustomerSubscriptions />} />
              <Route path="quotations" element={<QuotationList />} />
              <Route path="invoices" element={<CustomerInvoices />} />
              <Route path="payments" element={<CustomerPayments />} />
              <Route path="profile" element={<CustomerProfile />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

