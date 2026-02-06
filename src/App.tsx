import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import BudgetPage from "./pages/Budget";
import PerformancePage from "./pages/Performance";
import CampaignClassifierPage from "./pages/CampaignClassifier";
import RegistriesPage from "./pages/Registries";
import LoginPage from "./pages/Login";
import ResetPasswordPage from "./pages/ResetPassword";
import { AuthProvider } from "./contexts/auth-context";
import { ProtectedRoute } from "./components/app/ProtectedRoute";
import { AppLayout } from "./components/app/AppLayout";
import SystemStatusPage from "./pages/SystemStatus";
import TrackingTagsPage from "./pages/cadastros/TrackingTagsPage";
import UsersManagementPage from "./pages/cadastros/UsersManagementPage";
import CreativesPage from "./pages/Creatives";
import { TrackingScriptsProvider } from "./components/analytics/TrackingScriptsProvider";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <TrackingScriptsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/budget" replace />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/performance" element={<PerformancePage />} />
                <Route path="/creatives" element={<CreativesPage />} />
                <Route path="/status" element={<SystemStatusPage />} />

                <Route
                  path="/classificador"
                  element={
                    <ProtectedRoute requireAdmin>
                      <CampaignClassifierPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cadastros"
                  element={
                    <ProtectedRoute requireAdmin>
                      <RegistriesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cadastros/tags"
                  element={
                    <ProtectedRoute requireAdmin>
                      <TrackingTagsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cadastros/usuarios"
                  element={
                    <ProtectedRoute requireAdmin>
                      <UsersManagementPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </TrackingScriptsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


