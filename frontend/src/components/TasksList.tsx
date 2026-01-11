import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { TaskForm } from './TaskForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';
import type { Task } from "../types/task.ts";
import type { InventoryItem } from "../types/inventory";


interface TasksListProps {
  accessToken: string;
  onNavigate: (id: string) => void;
}

export function TasksList({ onNavigate }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = tasks;

    if (statusFilter) {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    if (inventoryFilter) {
      filtered = filtered.filter((task) => String(task.inventory_item_id) === inventoryFilter);
    }

    setFilteredTasks(filtered);
  }, [statusFilter, inventoryFilter, tasks]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, inventoryRes] = await Promise.all([
        api.get("/maintenance"),
        api.get("/inventory"),
      ]);

      setTasks(tasksRes.data || []);
      setInventory(inventoryRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (data: Partial<Task>) => {
    try {
      if (editingTask) {
        await api.put(`/maintenance/${editingTask.id}`, data);
        toast.success("Task updated successfully");
      } else {
        await api.post("/maintenance", data);
        toast.success("Task created successfully");
      }

      setShowForm(false);
      setEditingTask(null);
      fetchData();
    } catch (error: any) {
      console.error("Save task error:", error);
      const msg = error?.response?.data?.detail || "Failed to save task";
      toast.error(msg);
    }
  };

  const handleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === "PENDING" ? "COMPLETED" : "PENDING";
      await api.put(`/maintenance/${task.id}`, { status: newStatus });

      toast.success(newStatus === "COMPLETED" ? "Task marked as completed" : "Task reopened");
      fetchData();
    } catch (error: any) {
      console.error("Update task error:", error);
      const msg = error?.response?.data?.detail || "Failed to update task";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deletingTask) return;

    try {
      await api.delete(`/maintenance/${deletingTask.id}`);
      toast.success("Task deleted successfully");
      setDeletingTask(null);
      fetchData();
    } catch (error: any) {
      console.error("Delete task error:", error);
      const msg = error?.response?.data?.detail || "Failed to delete task";
      toast.error(msg);
    }
  };

  const getInventoryName = (inventoryItemId: number | null) => {
    if (inventoryItemId === null) return "—"; 
    const item = inventory.find((i) => i.id === inventoryItemId);
    return item ? item.name : "Unknown";
  };
  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="mb-2">Maintenance Tasks</h1>
          <p className="text-gray-600">Track your operational work</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Create Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Open</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <select
          value={inventoryFilter}
          onChange={(e) => setInventoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Inventory</option>
          {inventory.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="mb-2">No tasks found</h3>
          <p className="text-gray-600 mb-6">
            {statusFilter || inventoryFilter
              ? 'Try adjusting your filters.'
              : 'Get started by creating your first task.'}
          </p>
          {!statusFilter && !inventoryFilter && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Create Task
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3">Title</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Due Date</th>
                <th className="text-left px-6 py-3">Inventory</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{task.title}</td>
                  <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full inline-block ${
                          task.status === 'PENDING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {task.status === 'PENDING' ? 'Open' : 'Completed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{getInventoryName(task.inventory_item_id)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleComplete(task)}
                          className={`p-2 rounded-lg ${
                            task.status === 'PENDING'
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title={task.status === 'PENDING' ? 'Mark as completed' : 'Reopen'}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      <button
                        onClick={() => onNavigate(String(task.id))}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => setDeletingTask(task)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <TaskForm
          task={editingTask}
          inventory={inventory}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
        />
      )}

      {deletingTask && (
        <ConfirmModal
          title="Delete Task"
          message={`Are you sure you want to delete "${deletingTask.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTask(null)}
        />
      )}
    </div>
  );
}
