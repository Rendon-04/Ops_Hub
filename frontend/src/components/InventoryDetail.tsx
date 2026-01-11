import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { InventoryForm } from './InventoryForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';
import type { Task } from "../types/task.ts";
import type { Vendor } from "../types/vendor";
import type { InventoryItem } from "../types/inventory";



interface InventoryDetailProps {
  accessToken: string; 
  inventoryId: string;
  onNavigateBack: () => void;
  onNavigateToTask: (id: string) => void;
}

export function InventoryDetail({
  inventoryId,
  onNavigateBack,
  onNavigateToTask,
}: InventoryDetailProps) {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [inventoryId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const invIdNum = Number(inventoryId);

      const [itemRes, vendorsRes, tasksRes] = await Promise.all([
        api.get(`/inventory/${invIdNum}`),
        api.get('/vendors'),
        api.get('/maintenance'),
      ]);

      const inventoryItem: InventoryItem = itemRes.data;
      setItem(inventoryItem);

      const vendorsList: Vendor[] = vendorsRes.data || [];
      setVendors(vendorsList);

      if (inventoryItem.vendor_id) {
        const itemVendor = vendorsList.find((v) => v.id === inventoryItem.vendor_id) || null;
        setVendor(itemVendor);
      } else {
        setVendor(null);
      }

      const allTasks: Task[] = tasksRes.data || [];
      const relatedTasks = allTasks.filter((t) => t.inventory_item_id === invIdNum);
      setTasks(relatedTasks);
    } catch (error: any) {
   
      if (error?.response?.status === 404) {
        toast.error('Inventory item not found');
        onNavigateBack();
        return;
      }

      console.error('Failed to fetch inventory:', error);
      toast.error('Failed to load inventory details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: Partial<InventoryItem>) => {
    try {
      const invIdNum = Number(inventoryId);

      await api.put(`/inventory/${invIdNum}`, data);

      toast.success('Inventory updated successfully');
      setShowEditForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Update inventory error:', error);
      const msg = error?.response?.data?.detail || 'Failed to update inventory item';
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    try {
      const invIdNum = Number(inventoryId);

      await api.delete(`/inventory/${invIdNum}`);

      toast.success('Inventory item deleted successfully');
      onNavigateBack();
    } catch (error: any) {
      console.error('Delete inventory error:', error);
      const msg = error?.response?.data?.detail || 'Failed to delete inventory item';
      toast.error(msg);
    }
  };

  const getStatus = (quantity: number, reorderThreshold: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'red' };
    if (quantity <= reorderThreshold) return { label: 'Low Stock', color: 'orange' };
    return { label: 'In Stock', color: 'green' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Inventory item not found</p>
        <button onClick={onNavigateBack} className="text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const status = getStatus(item.quantity, item.reorder_threshold);

  return (
    <div>
      <button
        onClick={onNavigateBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Inventory
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="mb-2">{item.name}</h1>
            <div className="flex items-center gap-4">
              <span
                className={`px-3 py-1 rounded-full inline-block ${
                  status.color === 'green'
                    ? 'bg-green-100 text-green-800'
                    : status.color === 'orange'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {status.label}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
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
            <h3 className="mb-2">Vendor</h3>
            <p className="text-gray-600">{vendor?.name || 'Not assigned'}</p>
          </div>

          <div>
            <h3 className="mb-2">Quantity</h3>
            <p className="text-gray-600">{String(item.quantity ?? 0)}</p>
          </div>
        </div>

      
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="mb-4">Related Maintenance Tasks</h2>

        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No related tasks yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Due Date</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{task.title}</td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-gray-600">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onNavigateToTask(String(task.id))}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEditForm && (
        <InventoryForm
          item={item}
          vendors={vendors}
          onSave={handleUpdate}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Inventory Item"
          message={`Are you sure you want to delete "${item.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
