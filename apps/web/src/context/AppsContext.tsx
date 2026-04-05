import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, type AppDTO } from "../api/client.js";
import { useAuth } from "./AuthContext.js";

interface AppsContextValue {
  apps: AppDTO[];
  refresh: () => Promise<void>;
}

const AppsContext = createContext<AppsContextValue | null>(null);

export function AppsProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<AppDTO[]>([]);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    try {
      const list = await api.apps.list();
      setApps(list);
    } catch {
      // ignore — user may not be logged in yet
    }
  }, []);

  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [user, refresh]);

  return (
    <AppsContext.Provider value={{ apps, refresh }}>
      {children}
    </AppsContext.Provider>
  );
}

export function useApps(): AppsContextValue {
  const ctx = useContext(AppsContext);
  if (!ctx) throw new Error("useApps must be used within AppsProvider");
  return ctx;
}
