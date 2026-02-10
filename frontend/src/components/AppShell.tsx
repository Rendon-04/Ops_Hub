import React, { useState } from 'react';
import { Menu, X, ChevronDown, LayoutDashboard, Users, Package, ClipboardList, AlertTriangle, FileText } from 'lucide-react';

interface AppShellProps {
  userName: string;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export function AppShell({ userName, onLogout, currentPage, onNavigate, children }: AppShellProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const navigation = [
    { name: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
    { name: 'Vendors', page: 'vendors', icon: Users },
    { name: 'Inventory', page: 'inventory', icon: Package },
    { name: 'Tasks', page: 'tasks', icon: ClipboardList },
    { name: 'Incident Reports', page: 'incidents', icon: AlertTriangle },
    { name: 'Documents', page: 'documents', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06cdfe]"
            >
              {showMobileSidebar ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#e90786]" />
              <h1 className="text-slate-900 font-semibold tracking-tight">
                <img
                  src="/NEON_logo.png"
                  alt="Neon Spaces"
                  className="h-14 w-auto"
                />
              </h1>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06cdfe]"
            >
              <span className="text-sm text-gray-700">{userName}</span>
              <ChevronDown size={16} />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-64 bg-white border-r border-gray-200 z-30
            transform transition-transform duration-200 ease-in-out
            ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page || 
                               (item.page === 'vendors' && currentPage === 'vendor-detail') ||
                               (item.page === 'inventory' && currentPage === 'inventory-detail') ||
                               (item.page === 'tasks' && currentPage === 'task-detail') ||
                               (item.page === 'incidents' && currentPage === 'incident-detail');
              
              return (
                <button
                  key={item.page}
                  data-testid={`nav-${item.page}`}
                  onClick={() => {
                    onNavigate(item.page);
                    setShowMobileSidebar(false);
                  }}
                  className={`
                    w-full relative flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06cdfe]
                    ${isActive
                      ? 'bg-[#e90786]/10 text-[#e90786] font-semibold shadow-[0_1px_0_rgba(15,23,42,0.04)]'
                      : 'text-gray-700 hover:bg-[#06cdfe]/10'
                    }
                  `}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#e90786]" />
                  )}
                  <Icon size={18} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile overlay */}
        {showMobileSidebar && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
