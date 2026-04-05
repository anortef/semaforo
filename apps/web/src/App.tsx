import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { AppsProvider } from "./context/AppsContext.js";
import { Layout } from "./components/Layout.js";
import { AdminGuard } from "./components/AdminGuard.js";
import { AppsPage } from "./pages/AppsPage.js";
import { TogglesPage } from "./pages/TogglesPage.js";
import { EnvironmentsPage } from "./pages/EnvironmentsPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { AppSettingsPage } from "./pages/AppSettingsPage.js";
import { AppMetricsPage } from "./pages/AppMetricsPage.js";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage.js";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage.js";
import { AdminAuditLogPage } from "./pages/admin/AdminAuditLogPage.js";
import { AdminHealthPage } from "./pages/admin/AdminHealthPage.js";

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="login-page"><p>Loading...</p></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<AppsPage />} />
        <Route path="/apps/:appId/toggles" element={<TogglesPage />} />
        <Route path="/apps/:appId/environments" element={<EnvironmentsPage />} />
        <Route path="/apps/:appId/settings" element={<AppSettingsPage />} />
        <Route path="/apps/:appId/metrics" element={<AppMetricsPage />} />
        <Route path="/apps/:appId" element={<Navigate to="toggles" replace />} />
        <Route path="/admin" element={<AdminGuard />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="audit-log" element={<AdminAuditLogPage />} />
          <Route path="health" element={<AdminHealthPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="login-page"><p>Loading...</p></div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppsProvider>
        <AppRoutes />
      </AppsProvider>
    </AuthProvider>
  );
}
