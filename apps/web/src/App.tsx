import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { AppsProvider } from "./context/AppsContext.js";
import { Layout } from "./components/Layout.js";
import { AppsPage } from "./pages/AppsPage.js";
import { TogglesPage } from "./pages/TogglesPage.js";
import { EnvironmentsPage } from "./pages/EnvironmentsPage.js";
import { LoginPage } from "./pages/LoginPage.js";

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
        <Route path="/apps/:appId" element={<Navigate to="toggles" replace />} />
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
