import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";

export function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
