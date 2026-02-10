import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { TaskForm } from './TaskForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';
import type { Task, TaskStatus, TaskType } from "../types/task.ts";
import type { InventoryItem } from "../types/inventory";
import type { Vendor } from "../types/vendor";
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';



function getApiErrorMessage(error: any, fallback = "Request failed") {
    const detail = error?.response?.data?.detail;
  
    if (Array.isArray(detail)) {
      return detail
        .map((d) => {
          const path = Array.isArray(d.loc) ? d.loc.slice(1).join(".") : "field";
          return `${path}: ${d.msg}`;
        })
        .join(" | ");
    }
  
    if (typeof detail === "string") return detail;
    if (typeof error?.message === "string") return error.message;
  
    return fallback;
  }
  

interface TaskDetailProps {
  accessToken: string; 
  taskId: string;
  onNavigateBack: () => void;
}

export function TaskDetail({ accessToken, taskId, onNavigateBack }: TaskDetailProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [taskId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, inventoryRes, vendorsRes] = await Promise.all([
        api.get(`/maintenance/${taskId}`),
        api.get('/inventory'),
        api.get('/vendors'),
      ]);

      const taskData: Task = taskRes.data;
      setTask(taskData);

      const inventoryData: InventoryItem[] = inventoryRes.data || [];
      setInventory(inventoryData);
      const vendorsData: Vendor[] = vendorsRes.data || [];
      setVendors(vendorsData);

      if (taskData.inventory_item_id) {
        const foundItem = inventoryData.find((i) => i.id === taskData.inventory_item_id) || null;
        setInventoryItem(foundItem);
      } else {
        setInventoryItem(null);
      }

      if (taskData.vendor_id) {
        const foundVendor = vendorsData.find((v) => v.id === taskData.vendor_id) || null;
        setVendor(foundVendor);
      } else {
        setVendor(null);
      }
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 404) {
        toast.error('Task not found');
        onNavigateBack();
        return;
      }

      console.error('Failed to fetch task:', error);
      toast.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: Partial<Task>) => {
    try {
      await api.put(`/maintenance/${taskId}`, data);
      toast.success('Task updated successfully');
      setShowEditForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Update task error:', error);
      toast.error(getApiErrorMessage(error, "Failed to save task"));
    }
  };

  const handleToggleStatus = async () => {
    if (!task) return;

    try {
      const nextStatus: TaskStatus = task.status === 'CLOSED' ? 'OPEN' : 'CLOSED';
      await api.put(`/maintenance/${taskId}`, { status: nextStatus });

      toast.success(nextStatus === 'CLOSED' ? 'Task closed' : 'Task reopened');
      fetchData();
    } catch (error: any) {
      console.error('Update task error:', error);
      const msg = error?.response?.data?.detail || 'Failed to update task';
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/maintenance/${taskId}`);
      toast.success('Task deleted successfully');
      onNavigateBack();
    } catch (error: any) {
      console.error('Delete task error:', error);
      const msg = error?.response?.data?.detail || 'Failed to delete task';
      toast.error(msg);
    }
  };

  const getTypeLabel = (taskType: TaskType) => {
    switch (taskType) {
      case "EVENT":
        return "Event";
      case "INVENTORY":
        return "Inventory";
      case "VENDOR":
        return "Vendor";
      case "OTHER":
      default:
        return "Other";
    }
  };

  const getLinkedValue = () => {
    if (!task) return "—";
    if (task.task_type === "INVENTORY") return inventoryItem?.name || "Not assigned";
    if (task.task_type === "VENDOR") return vendor?.name || "Not assigned";
    if (task.task_type === "EVENT") return task.event_name || "Not assigned";
    if (task.task_type === "OTHER") return task.event_name || "Not specified";
    return "—";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Task not found</p>
        <button onClick={onNavigateBack} className="text-[#06cdfe] hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onNavigateBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={20} />
        Back to Tasks
      </button>

      <Card>
        <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">{task.title}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full inline-block text-xs font-medium ${
                  task.status === 'OPEN'
                    ? 'bg-[#e90786]/10 text-[#e90786]'
                    : task.status === 'IN_PROGRESS'
                    ? 'bg-[#06cdfe]/15 text-[#06cdfe]'
                    : task.status === 'BLOCKED'
                    ? 'bg-[#dfff35]/70 text-black'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {task.status === 'IN_PROGRESS'
                  ? 'In Progress'
                  : task.status === 'BLOCKED'
                  ? 'Blocked'
                  : task.status === 'CLOSED'
                  ? 'Closed'
                  : 'Open'}
              </span>
              {task.is_high_priority && (
                <span className="px-3 py-1 rounded-full inline-block text-xs font-medium bg-[#e90786]/10 text-[#e90786]">
                  High Priority
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleToggleStatus}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
                task.status === 'CLOSED'
                  ? 'text-gray-600 border-gray-300 hover:bg-gray-50'
                  : 'text-[#06cdfe] border-[#06cdfe] hover:bg-[#06cdfe]/10'
              }`}
            >
              <CheckCircle2 size={18} />
              {task.status === 'CLOSED' ? 'Reopen' : 'Close'}
            </button>

            <button
              onClick={() => setShowEditForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-[#06cdfe] border border-[#06cdfe] rounded-lg hover:bg-[#06cdfe]/10"
            >
              <Edit2 size={18} />
              Edit
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-[#e90786] border border-[#e90786] rounded-lg hover:bg-[#e90786]/10"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Due Date</h3>
              <p className="text-sm text-gray-600">
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Type</h3>
              <p className="text-sm text-gray-600">{getTypeLabel(task.task_type)}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Linked To</h3>
              <p className="text-sm text-gray-600">{getLinkedValue()}</p>
            </div>
          </div>

          {task.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{task.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showEditForm && (
        <TaskForm
          task={task}
          inventory={inventory}
          vendors={vendors}
          onSave={handleUpdate}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Task"
          message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
