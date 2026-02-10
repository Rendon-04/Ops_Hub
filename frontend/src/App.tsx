import React, { useState, useEffect } from 'react';
import { api, setAuthToken } from "./api/client";
import { getToken, saveToken, clearToken } from "./auth/token";
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { VendorsList } from './components/VendorsList';
import { VendorDetail } from './components/VendorDetail';
import { InventoryList } from './components/InventoryList';
import { InventoryDetail } from './components/InventoryDetail';
import { TasksList } from './components/TasksList';
import { TaskDetail } from './components/TaskDetail';
import { IncidentReports } from './components/IncidentReports';
import { IncidentDetail } from './components/IncidentDetail';
import { Documents } from './components/Documents';
import { AppShell } from './components/AppShell';
import { Toaster } from "sonner";


type Route = 
  | { page: 'login' }
  | { page: 'dashboard' }
  | { page: 'vendors' }
  | { page: 'vendor-detail'; id: string }
  | { page: 'inventory' }
  | { page: 'inventory-detail'; id: string }
  | { page: 'tasks' }
  | { page: 'task-detail'; id: string }
  | { page: 'incidents' }
  | { page: 'incident-detail'; id: string }
  | { page: 'documents' };

export default function App() {
  const [route, setRoute] = useState<Route>({ page: 'login' });
  const [user, setUser] = useState<{ email: string; name?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get("token");
      const token = tokenFromUrl || getToken();

      if (tokenFromUrl) {
        saveToken(tokenFromUrl);
        setAuthToken(tokenFromUrl);
        window.history.replaceState({}, "", "/");
      }

      if (token) {
        setAuthToken(token);
        setAccessToken(token);
        try {
          const res = await api.get("/auth/me");
          setUser({ email: res.data.email, name: res.data.name });
          setRoute({ page: "dashboard" });
        } catch (err) {
          clearToken();
          setAuthToken(null);
          setUser(null);
          setAccessToken("");
          setRoute({ page: "login" });
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    window.location.href = `${baseUrl}/auth/google/login`;
  };

  const handleLogout = async () => {
    clearToken();
    setAuthToken(null);
    setUser(null);
    setAccessToken("");
    setRoute({ page: "login" });
  };
  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Login onGoogleLogin={handleGoogleLogin} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <AppShell
        userName={user.name || user.email}
        onLogout={handleLogout}
        currentPage={route.page}
        onNavigate={(page) => setRoute({ page: page as any })}
      >
        {route.page === 'dashboard' && (
          <Dashboard
            accessToken={accessToken}
            onNavigate={(page, id) => {
              if (id) {
                setRoute({ page: page as any, id });
              } else {
                setRoute({ page: page as any });
              }
            }}
          />
        )}
        {route.page === 'vendors' && (
          <VendorsList
            accessToken={accessToken}
            onNavigate={(id) => setRoute({ page: 'vendor-detail', id })}
          />
        )}
        {route.page === 'vendor-detail' && (
          <VendorDetail
            accessToken={accessToken}
            vendorId={route.id}
            onNavigateBack={() => setRoute({ page: 'vendors' })}
            onNavigateToInventory={(id) => setRoute({ page: 'inventory-detail', id })}
          />
        )}
        {route.page === 'inventory' && (
          <InventoryList
            accessToken={accessToken}
            onNavigate={(id) => setRoute({ page: 'inventory-detail', id })}
          />
        )}
        {route.page === 'inventory-detail' && (
          <InventoryDetail
            accessToken={accessToken}
            inventoryId={route.id}
            onNavigateBack={() => setRoute({ page: 'inventory' })}
            onNavigateToTask={(id) => setRoute({ page: 'task-detail', id })}
          />
        )}
        {route.page === 'tasks' && (
          <TasksList
            accessToken={accessToken}
            onNavigate={(id) => setRoute({ page: 'task-detail', id })}
          />
        )}
        {route.page === 'task-detail' && (
          <TaskDetail
            accessToken={accessToken}
            taskId={route.id}
            onNavigateBack={() => setRoute({ page: 'tasks' })}
          />
        )}
        {route.page === 'incidents' && (
          <IncidentReports
            onNavigate={(id) => setRoute({ page: 'incident-detail', id })}
          />
        )}
        {route.page === 'incident-detail' && (
          <IncidentDetail
            incidentId={route.id}
            onNavigateBack={() => setRoute({ page: 'incidents' })}
          />
        )}
        {route.page === 'documents' && user && (
          <Documents userEmail={user.email} />
        )}
      </AppShell>
    </>
  );
}
