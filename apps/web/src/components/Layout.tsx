import { Outlet, Link } from "react-router-dom";

export function Layout() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1rem" }}>
      <header
        style={{
          borderBottom: "1px solid #ddd",
          marginBottom: "1.5rem",
          paddingBottom: "0.5rem",
        }}
      >
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <h1 style={{ margin: 0 }}>Semaforo</h1>
        </Link>
        <p style={{ margin: 0, color: "#666" }}>Feature Toggle Management</p>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
