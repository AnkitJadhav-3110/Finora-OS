import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import CreateInvoice from "@/pages/CreateInvoice";
import InvoiceHistory from "@/pages/InvoiceHistory";
import Clients from "@/pages/Clients";
import Products from "@/pages/Products";
import Business from "@/pages/Business";
import TemplateEditor from "@/pages/TemplateEditor";
import BusinessTools from "@/pages/BusinessTools";
import RecurringInvoices from "@/pages/RecurringInvoices";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import DocumentCenter from "@/pages/DocumentCenter";
import Settings from "@/pages/Settings";
import EnterpriseHub from "@/pages/EnterpriseHub";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import ClientPortal from "@/pages/ClientPortal";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/portal/:token" element={<ClientPortal />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/invoices/create" element={<CreateInvoice />} />
                <Route path="/invoices/history" element={<InvoiceHistory />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/documents" element={<DocumentCenter />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/products" element={<Products />} />
                <Route path="/business" element={<Business />} />
                <Route path="/templates" element={<TemplateEditor />} />
                <Route path="/tools" element={<BusinessTools />} />
                <Route path="/recurring" element={<RecurringInvoices />} />
                <Route path="/enterprise" element={<EnterpriseHub />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/saas-billing" element={<Navigate to="/settings?tab=subscription" replace />} />
                <Route path="/billing" element={<Navigate to="/settings?tab=subscription" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
