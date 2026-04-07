import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { InventoryProvider } from "@/context/InventoryContext";
import { WalletProvider } from "@/context/WalletContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WalletProvider>
      <InventoryProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
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
        </BrowserRouter>
      </InventoryProvider>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
