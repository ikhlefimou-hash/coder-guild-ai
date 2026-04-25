import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NewService from "./pages/NewService.tsx";
import ServiceDetail from "./pages/ServiceDetail.tsx";
import Services from "./pages/Services.tsx";
import Profile from "./pages/Profile.tsx";
import PublicProfile from "./pages/PublicProfile.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Unified dashboard with sidebar */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route
                path="ai"
                element={
                  <ModulePlaceholder
                    title="المساعد الذكي"
                    description="شات AI مخصص للبرمجة فقط (شرح / تصحيح / توليد الكود)."
                  />
                }
              />
              <Route
                path="groups"
                element={
                  <ModulePlaceholder
                    title="المجموعات"
                    description="مجموعات عامة وخاصة للنقاش ومشاركة الموارد."
                  />
                }
              />
              <Route
                path="lessons"
                element={
                  <ModulePlaceholder
                    title="الدروس"
                    description="مسارات تعليمية في HTML, CSS, JS, Python والباك-إند."
                  />
                }
              />
              <Route path="projects" element={<Services />} />
              <Route path="projects/new" element={<NewService />} />
              <Route path="projects/:id" element={<ServiceDetail />} />
              <Route
                path="programmers"
                element={
                  <ModulePlaceholder
                    title="المبرمجون"
                    description="دليل المبرمجين مع التقييمات والمهارات."
                  />
                }
              />
              <Route
                path="messages"
                element={
                  <ModulePlaceholder
                    title="الرسائل"
                    description="محادثات خاصة لحظية بين الأعضاء."
                  />
                }
              />
              <Route
                path="notifications"
                element={
                  <ModulePlaceholder
                    title="الإشعارات"
                    description="كل إشعارات الرسائل والمجموعات والطلبات."
                  />
                }
              />
              <Route
                path="settings"
                element={
                  <ModulePlaceholder
                    title="الإعدادات"
                    description="اللغة، المظهر، تعديل الملف الشخصي."
                  />
                }
              />
            </Route>

            {/* Legacy / standalone protected pages (kept for compatibility) */}
            <Route
              path="/services/new"
              element={<ProtectedRoute><Navigate to="/dashboard/projects/new" replace /></ProtectedRoute>}
            />
            <Route path="/services/:id" element={<Navigate to="/dashboard/projects" replace />} />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Profile />} />
            </Route>
            <Route
              path="/users/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PublicProfile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
