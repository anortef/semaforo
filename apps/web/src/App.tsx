import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { AppsPage } from "./pages/AppsPage.js";
import { AppDetailPage } from "./pages/AppDetailPage.js";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<AppsPage />} />
        <Route path="/apps/:appId" element={<AppDetailPage />} />
      </Route>
    </Routes>
  );
}
