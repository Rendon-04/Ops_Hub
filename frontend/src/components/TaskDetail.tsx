import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { TaskForm } from './TaskForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';
import type { Task } from "../types/task.ts";
import type { InventoryItem } from "../types/inventory";



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
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [taskId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, inventoryRes] = await Promise.all([
        api.get(`/maintenance/${taskId}`),
        api.get('/inventory'),
      ]);

      const taskData: Task = taskRes.data;
      setTask(taskData);

      const inventoryData: InventoryItem[] = inventoryRes.data || [];
      setInventory(inventoryData);

      if (taskData.inventory_item_id) {
        const foundItem = inventoryData.find((i) => i.id === taskData.inventory_item_id) || null;
        setInventoryItem(foundItem);
      } else {
        setInventoryItem(null);
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
      const nextStatus: Task['status'] = task.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
      await api.put(`/maintenance/${taskId}`, { status: nextStatus });

      toast.success(nextStatus === 'COMPLETED' ? 'Task marked as completed' : 'Task reopened');
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
        <button onClick={onNavigateBack} className="text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onNavigateBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Tasks
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="mb-2">{task.title}</h1>
            <span
              className={`px-3 py-1 rounded-full inline-block ${
                task.status === 'PENDING'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {task.status === 'PENDING' ? 'Open' : 'Completed'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleToggleStatus}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
                task.status === 'PENDING'
                  ? 'text-green-600 border-green-600 hover:bg-green-50'
                  : 'text-gray-600 border-gray-600 hover:bg-gray-50'
              }`}
            >
              <CheckCircle2 size={18} />
              {task.status === 'PENDING' ? 'Complete' : 'Reopen'}
            </button>

            <button
              onClick={() => setShowEditForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              <Edit2 size={18} />
              Edit
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2">Due Date</h3>
            <p className="text-gray-600">
              {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
            </p>
          </div>

          <div>
            <h3 className="mb-2">Inventory Item</h3>
            <p className="text-gray-600">{inventoryItem?.name || 'Not assigned'}</p>
          </div>
        </div>
      </div>

      {showEditForm && (
        <TaskForm
          task={task}
          inventory={inventory}
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
