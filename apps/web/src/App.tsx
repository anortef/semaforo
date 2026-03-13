import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { AppsPage } from "./pages/AppsPage.js";
import { TogglesPage } from "./pages/TogglesPage.js";
import { EnvironmentsPage } from "./pages/EnvironmentsPage.js";

export function App() {
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
