import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/auth-context";
import { ProtectedRoute } from "./components/app/ProtectedRoute";
import { AppLayout } from "./components/app/AppLayout";
import { TrackingScriptsProvider } from "./components/analytics/TrackingScriptsProvider";
import { PageSkeleton } from "./components/app/PageSkeleton";

// Lazy-loaded pages
const BudgetPage = lazy(() => import("./pages/Budget"));
const PerformancePage = lazy(() => import("./pages/Performance"));
const CreativesPage = lazy(() => import("./pages/Creatives"));
const LoginPage = lazy(() => import("./pages/Login"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const CampaignClassifierPage = lazy(() => import("./pages/CampaignClassifier"));
const RegistriesPage = lazy(() => import("./pages/Registries"));
const SystemStatusPage = lazy(() => import("./pages/SystemStatus"));
const TrackingTagsPage = lazy(() => import("./pages/cadastros/TrackingTagsPage"));
const UsersManagementPage = lazy(() => import("./pages/cadastros/UsersManagementPage"));
const NotFound = lazy(() => import("./pages/NotFound"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <TrackingScriptsProvider>
          <BrowserRouter>
            <Suspense fallback={<PageSkeleton />}>
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
                      <ProtectedRoute>
                        <CampaignClassifierPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cadastros"
                    element={
                      <ProtectedRoute>
                        <RegistriesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cadastros/tags"
                    element={
                      <ProtectedRoute>
                        <TrackingTagsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cadastros/usuarios"
                    element={
                      <ProtectedRoute>
                        <UsersManagementPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TrackingScriptsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


