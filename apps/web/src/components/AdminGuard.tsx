import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export function AdminGuard() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
