import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { TaskForm } from './TaskForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';
import type { Task, TaskStatus } from "../types/task.ts";
import type { InventoryItem } from "../types/inventory";
import type { Vendor } from "../types/vendor";
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';


interface TasksListProps {
  accessToken: string;
  onNavigate: (id: string) => void;
}

export function TasksList({ onNavigate }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
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

    if (vendorFilter) {
      filtered = filtered.filter((task) => String(task.vendor_id ?? "") === vendorFilter);
    }

    setFilteredTasks(filtered);
  }, [statusFilter, inventoryFilter, vendorFilter, tasks]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, inventoryRes, vendorsRes] = await Promise.all([
        api.get("/maintenance"),
        api.get("/inventory"),
        api.get("/vendors"),
      ]);

      setTasks(tasksRes.data || []);
      setInventory(inventoryRes.data || []);
      setVendors(vendorsRes.data || []);
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
      const newStatus: TaskStatus = task.status === "CLOSED" ? "OPEN" : "CLOSED";
      await api.put(`/maintenance/${task.id}`, { status: newStatus });

      toast.success(newStatus === "CLOSED" ? "Task closed" : "Task reopened");
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

  const getVendorName = (vendorId: number | null) => {
    if (vendorId === null) return "—";
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor ? vendor.name : "Unknown";
  };

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case "OPEN":
        return "bg-[#e90786]/10 text-[#e90786]";
      case "IN_PROGRESS":
        return "bg-[#06cdfe]/15 text-[#06cdfe]";
      case "BLOCKED":
        return "bg-[#dfff35]/70 text-black";
      case "CLOSED":
      default:
        return "bg-gray-100 text-gray-700";
    }
  };
  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maintenance Tasks</h1>
          <p className="text-sm text-gray-600">Track repairs, follow-ups, and operational to-dos.</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
          className="bg-[#e90786] text-white px-4 py-2 rounded-lg hover:bg-[#d10677] flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Create Task
        </button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Task List</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Filter tasks by status, inventory, or vendor.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={inventoryFilter}
              onChange={(e) => setInventoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
            >
              <option value="">All Inventory</option>
              {inventory.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
            >
              <option value="">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={String(vendor.id)}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <h3 className="mb-2 text-lg font-semibold text-slate-900">No tasks found</h3>
              <p className="text-sm text-gray-600 mb-6">
                {statusFilter || inventoryFilter || vendorFilter
                  ? 'Try adjusting your filters.'
                  : 'Get started by creating your first task.'}
              </p>
              {!statusFilter && !inventoryFilter && !vendorFilter && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-[#e90786] text-white px-6 py-2 rounded-lg hover:bg-[#d10677] inline-flex items-center gap-2 transition-colors"
                >
                  <Plus size={18} />
                  Create Task
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-6 py-3">Title</th>
                    <th className="text-left px-6 py-3">Priority</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Due Date</th>
                    <th className="text-left px-6 py-3">Category</th>
                    <th className="text-left px-6 py-3">Type</th>
                    <th className="text-right px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{task.title}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full inline-block text-xs font-medium ${
                            task.is_high_priority
                              ? 'bg-[#e90786]/10 text-[#e90786]'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {task.is_high_priority ? 'High' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full inline-block text-xs font-medium ${getStatusStyle(task.status)}`}>
                          {task.status === "IN_PROGRESS"
                            ? "In Progress"
                            : task.status === "CLOSED"
                            ? "Closed"
                            : task.status === "BLOCKED"
                            ? "Blocked"
                            : "Open"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {task.task_type === "INVENTORY"
                          ? "Inventory"
                          : task.task_type === "VENDOR"
                          ? "Vendor"
                          : task.task_type === "EVENT"
                          ? "Event"
                          : "Other"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {task.task_type === "INVENTORY"
                          ? getInventoryName(task.inventory_item_id)
                          : task.task_type === "VENDOR"
                          ? getVendorName(task.vendor_id)
                          : task.task_type === "EVENT"
                          ? task.event_name || "—"
                          : task.event_name || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleComplete(task)}
                            className={`p-2 rounded-lg ${
                              task.status === 'CLOSED'
                                ? 'text-gray-600 hover:bg-gray-100'
                                : 'text-[#06cdfe] hover:bg-[#06cdfe]/10'
                            }`}
                            title={task.status === 'CLOSED' ? 'Reopen' : 'Close'}
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
                            className="p-2 text-[#06cdfe] hover:bg-[#06cdfe]/10 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => setDeletingTask(task)}
                            className="p-2 text-[#e90786] hover:bg-[#e90786]/10 rounded-lg"
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
        </CardContent>
      </Card>

      {showForm && (
        <TaskForm
          task={editingTask}
          inventory={inventory}
          vendors={vendors}
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
