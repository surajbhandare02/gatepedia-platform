import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { PageSkeleton } from "./components/ui/PageSkeleton";
import "./styles/dashboard.css";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage }))
);
const AnalyticsPage = lazy(() =>
  import("./pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage }))
);
const SubjectsPage = lazy(() =>
  import("./pages/SubjectsPage").then((module) => ({ default: module.SubjectsPage }))
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((module) => ({ default: module.RegisterPage }))
);
const PlannerPage = lazy(() =>
  import("./pages/PlannerPage").then((module) => ({ default: module.PlannerPage }))
);
const RevisionPage = lazy(() =>
  import("./pages/RevisionPage").then((module) => ({ default: module.RevisionPage }))
);
const ProductivityPage = lazy(() =>
  import("./pages/ProductivityPage").then((module) => ({ default: module.ProductivityPage }))
);
const AssistantPage = lazy(() =>
  import("./pages/AssistantPage").then((module) => ({ default: module.AssistantPage }))
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage }))
);
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((module) => ({ default: module.AdminPage }))
);

function lazyPage(Page) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Page />
    </Suspense>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Root app: routing + global providers (theme, toast).
 * Pages stay thin; data fetching lives next to the UI that needs it.
 */
export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <RealtimeProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3200,
                  style: { borderRadius: 12 },
                }}
              />
              <Routes>
                <Route path="/login" element={lazyPage(LoginPage)} />
                <Route path="/register" element={lazyPage(RegisterPage)} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={lazyPage(DashboardPage)} />
                    <Route path="/planner" element={lazyPage(PlannerPage)} />
                    <Route path="/subjects" element={lazyPage(SubjectsPage)} />
                    <Route path="/revision" element={lazyPage(RevisionPage)} />
                    <Route path="/productivity" element={lazyPage(ProductivityPage)} />
                    <Route path="/analytics" element={lazyPage(AnalyticsPage)} />
                    <Route path="/assistant" element={lazyPage(AssistantPage)} />
                    <Route path="/profile" element={lazyPage(ProfilePage)} />
                    <Route path="/admin" element={lazyPage(AdminPage)} />
                  </Route>
                </Route>
              </Routes>
            </RealtimeProvider>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
