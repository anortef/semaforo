import { Link, NavLink, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useApps } from "../context/AppsContext.js";

export function Sidebar() {
  const { apps } = useApps();
  const { appId } = useParams<{ appId: string }>();
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link to="/">
          <h1>Semaforo</h1>
          <p>Feature Toggle Management</p>
        </Link>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Navigation</div>
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            <span className="sidebar-link-icon">&#9776;</span>
            All Applications
          </NavLink>
        </nav>
      </div>

      {apps.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Applications</div>
          <nav className="sidebar-nav">
            {apps.map((app) => {
              const isSelected = appId === app.id.value;
              return (
                <div key={app.id.value}>
                  <NavLink
                    to={`/apps/${app.id.value}/toggles`}
                    className={() =>
                      `sidebar-app-item${isSelected ? " active" : ""}`
                    }
                  >
                    <span className="sidebar-app-dot" />
                    {app.name}
                  </NavLink>

                  {isSelected && (
                    <div className="sidebar-subnav">
                      <NavLink
                        to={`/apps/${app.id.value}/toggles`}
                        end
                        className={({ isActive }) =>
                          `sidebar-link${isActive ? " active" : ""}`
                        }
                      >
                        <span className="sidebar-link-icon">&#9881;</span>
                        Toggles
                      </NavLink>
                      <NavLink
                        to={`/apps/${app.id.value}/environments`}
                        className={({ isActive }) =>
                          `sidebar-link${isActive ? " active" : ""}`
                        }
                      >
                        <span className="sidebar-link-icon">&#9729;</span>
                        Environments
                      </NavLink>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <span className="sidebar-user-email">{user.email}</span>
            <button className="btn btn-logout" onClick={logout}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
