import React, { useState, useEffect } from 'react';
import { Users, Package, ClipboardList, Plus } from 'lucide-react';
import { api } from '../api/client';

interface DashboardProps {
  accessToken: string;
  onNavigate: (page: string, id?: string) => void;
}

export function Dashboard({ accessToken, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    total_items: 0,
    low_stock_count: 0,
    open_tasks_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/summary', {
    
      });

      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Inventory Items',
      count: stats.total_items,
      icon: Package,
      color: 'green',
      page: 'inventory',
    },
    {
      title: 'Low Stock Items',
      count: stats.low_stock_count,
      icon: Package,
      color: 'orange',
      page: 'inventory',
    },
    {
      title: 'Open Tasks',
      count: stats.open_tasks_count,
      icon: ClipboardList,
      color: 'blue',
      page: 'tasks',
    },
  ];

  const quickActions = [
    { label: 'Add Vendor', page: 'vendors', icon: Users },
    { label: 'Add Inventory', page: 'inventory', icon: Package },
    { label: 'Create Task', page: 'tasks', icon: ClipboardList },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={() => onNavigate(card.page)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-lg ${
                    card.color === 'blue'
                      ? 'bg-blue-100 text-blue-600'
                      : card.color === 'green'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  <Icon size={24} />
                </div>
              </div>
              <p className="text-gray-600 mb-1">{card.title}</p>
              <p className="text-3xl">{card.count}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => onNavigate(action.page)}
                className="flex items-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Icon size={20} />
                </div>
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {stats.total_items === 0 && stats.low_stock_count === 0 && stats.open_tasks_count === 0 && (
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
          <h3 className="mb-2">Welcome to Ops Hub!</h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first vendor, inventory item, or task.
          </p>
          <button
            onClick={() => onNavigate('vendors')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Add Your First Vendor
          </button>
        </div>
      )}
    </div>
  );
}
