import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { InventoryProvider } from "@/context/InventoryContext";
import { WalletProvider } from "@/context/WalletContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Orders from "@/pages/Orders";
import Alerts from "@/pages/Alerts";
import AIAssistant from "@/pages/AIAssistant";
import Suppliers from "@/pages/Suppliers";
import Categories from "@/pages/Categories";
import StockHistory from "@/pages/StockHistory";
import Pricing from "@/pages/Pricing";
import Warehouses from "@/pages/Warehouses";
import Reports from "@/pages/Reports";
import AIAgents from "@/pages/AIAgents";
import DigitalTwin from "@/pages/DigitalTwin";
import StressTest from "@/pages/StressTest";
import Sustainability from "@/pages/Sustainability";
import IoTSensors from "@/pages/IoTSensors";
import Provenance from "@/pages/Provenance";
import DemandIntelligence from "@/pages/DemandIntelligence";
import AdvancedAnalytics from "@/pages/AdvancedAnalytics";
import WarehouseTransfers from "@/pages/WarehouseTransfers";
import DeadStockAnalysis from "@/pages/DeadStockAnalysis";
import InventoryHealth from "@/pages/InventoryHealth";
import SupplierMetrics from "@/pages/SupplierMetrics";
import SafetyStockOptimizer from "@/pages/SafetyStockOptimizer";
import InventoryAgingAnalysis from "@/pages/InventoryAgingAnalysis";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10_000,
    },
  },
});

// ── Auth Guards ────────────────────────────────────────

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Redirect to login if not authenticated.
 * Redirect to onboarding if not completed.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isOnboardingComplete } = useAuth();

  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOnboardingComplete) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

/**
 * Redirect away from auth pages if already logged in
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isOnboardingComplete } = useAuth();

  if (isLoading) return <AuthLoading />;
  if (isAuthenticated && isOnboardingComplete) return <Navigate to="/" replace />;
  if (isAuthenticated && !isOnboardingComplete) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

/**
 * Onboarding route - requires auth but NOT completed onboarding
 */
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isOnboardingComplete } = useAuth();

  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isOnboardingComplete) return <Navigate to="/" replace />;

  return <>{children}</>;
}

// ── App ────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/assistant" element={<AIAssistant />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/stock-history" element={<StockHistory />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
        <Route path="/warehouse-transfers" element={<WarehouseTransfers />} />
        <Route path="/dead-stock" element={<DeadStockAnalysis />} />
        <Route path="/inventory-health" element={<InventoryHealth />} />
        <Route path="/supplier-metrics" element={<SupplierMetrics />} />
        <Route path="/safety-stock" element={<SafetyStockOptimizer />} />
        <Route path="/inventory-aging" element={<InventoryAgingAnalysis />} />
        <Route path="/ai-agents" element={<AIAgents />} />
        <Route path="/digital-twin" element={<DigitalTwin />} />
        <Route path="/stress-test" element={<StressTest />} />
        <Route path="/sustainability" element={<Sustainability />} />
        <Route path="/iot-sensors" element={<IoTSensors />} />
        <Route path="/provenance" element={<Provenance />} />
        <Route path="/demand-intelligence" element={<DemandIntelligence />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <WalletProvider>
          <InventoryProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </InventoryProvider>
        </WalletProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
