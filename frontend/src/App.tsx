import React, { useState, useEffect } from 'react';
import { api, setAuthToken } from "./api/client";
import { getToken, saveToken, clearToken } from "./auth/token";
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { VendorsList } from './components/VendorsList';
import { VendorDetail } from './components/VendorDetail';
import { InventoryList } from './components/InventoryList';
import { InventoryDetail } from './components/InventoryDetail';
import { TasksList } from './components/TasksList';
import { TaskDetail } from './components/TaskDetail';
import { IncidentReports } from './components/IncidentReports';
import { IncidentDetail } from './components/IncidentDetail';
import { AppShell } from './components/AppShell';
import { Toaster } from "sonner";


type Route = 
  | { page: 'login' }
  | { page: 'register' }
  | { page: 'dashboard' }
  | { page: 'vendors' }
  | { page: 'vendor-detail'; id: string }
  | { page: 'inventory' }
  | { page: 'inventory-detail'; id: string }
  | { page: 'tasks' }
  | { page: 'task-detail'; id: string }
  | { page: 'incidents' }
  | { page: 'incident-detail'; id: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ page: 'login' });
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string>('');

  useEffect(() => {
    const token = getToken();
    if (token) {
      setAuthToken(token);
      setAccessToken(token);
      // minimal "user" state for UI
      setUser({ email: "user" });
      setRoute({ page: "dashboard" });
    }
    setLoading(false);
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const token = res.data.access_token;
  
      saveToken(token);
      setAuthToken(token);
  
      setAccessToken(token);
      setUser({ email });
      setRoute({ page: "dashboard" });
    } catch (err: any) {
      throw new Error(err?.response?.data?.detail || "Failed to login");
    }
  };
  

  const handleRegister = async (_name: string, email: string, password: string) => {
    try {
      await api.post("/auth/signup", { email, password });
      await handleLogin(email, password);
    } catch (err: any) {
      throw new Error(err?.response?.data?.detail || "Failed to register");
    }
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
        {route.page === 'login' ? (
          <Login
            onLogin={handleLogin}
            onNavigateToRegister={() => setRoute({ page: 'register' })}
          />
        ) : (
          <Register
            onRegister={handleRegister}
            onNavigateToLogin={() => setRoute({ page: 'login' })}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <AppShell
        userName={user.email}
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
      </AppShell>
    </>
  );
}
