import React, { useState } from 'react';
import { Menu, X, ChevronDown, LayoutDashboard, Users, Package, ClipboardList, AlertTriangle } from 'lucide-react';

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
    { name: 'Maintenance Tasks', page: 'tasks', icon: ClipboardList },
    { name: 'Incident Reports', page: 'incidents', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {showMobileSidebar ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-blue-600">Ops Hub</h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <span>{userName}</span>
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
          <nav className="p-4 space-y-1">
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
                    w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={20} />
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
