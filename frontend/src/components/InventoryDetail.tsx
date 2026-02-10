import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { InventoryForm } from './InventoryForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';
import type { Task } from "../types/task.ts";
import type { Vendor } from "../types/vendor";
import type { InventoryItem } from "../types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';



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

  const handleCheck = async () => {
    try {
      const invIdNum = Number(inventoryId);
      const res = await api.post(`/inventory/${invIdNum}/check`);
      setItem(res.data);
      toast.success('Inventory check recorded');
    } catch (error: any) {
      console.error('Inventory check error:', error);
      const msg = error?.response?.data?.detail || 'Failed to record inventory check';
      toast.error(msg);
    }
  };

  const getStatus = (item: InventoryItem) => {
    if (item.status) return item.status;
    if (item.quantity === 0) return 'Out';
    if (item.quantity <= item.reorder_threshold) return 'Low';
    return 'In Stock';
  };

  const getStatusColor = (status: string) => {
    if (status === 'In Stock') return 'green';
    if (status === 'Low') return 'orange';
    return 'red';
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
        <button onClick={onNavigateBack} className="text-[#06cdfe] hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const status = getStatus(item);
  const statusColor = getStatusColor(status);

  return (
    <div className="space-y-6">
      <button
        onClick={onNavigateBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={20} />
        Back to Inventory
      </button>

      <Card>
        <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">{item.name}</CardTitle>
            <div className="mt-2 flex items-center gap-4">
              <span
                className={`px-3 py-1 rounded-full inline-block text-xs font-medium ${
                  statusColor === 'green'
                    ? 'bg-[#06cdfe]/15 text-[#06cdfe]'
                    : statusColor === 'orange'
                    ? 'bg-[#dfff35]/70 text-black'
                    : 'bg-[#e90786]/10 text-[#e90786]'
                }`}
              >
                {status}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCheck}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Mark Checked
            </button>
            <button
              onClick={() => setShowEditForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-[#06cdfe] border border-[#06cdfe] rounded-lg hover:bg-[#06cdfe]/10 transition-colors"
            >
              <Edit2 size={18} />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-[#e90786] border border-[#e90786] rounded-lg hover:bg-[#e90786]/10 transition-colors"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Vendor</h3>
            <p className="text-sm text-gray-600">{vendor?.name || 'Not assigned'}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Quantity</h3>
            <p className="text-sm text-gray-600">{String(item.quantity ?? 0)}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Category</h3>
            <p className="text-sm text-gray-600">{item.category || '—'}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Minimum Threshold</h3>
            <p className="text-sm text-gray-600">{String(item.reorder_threshold ?? 0)}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Reorder Link</h3>
            {item.reorder_url ? (
              <a
                href={item.reorder_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#06cdfe] hover:underline break-all"
              >
                {item.reorder_url}
              </a>
            ) : (
              <p className="text-sm text-gray-600">—</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Last Checked</h3>
            <p className="text-sm text-gray-600">
              {item.last_checked_at
                ? new Date(item.last_checked_at).toLocaleString()
                : 'Not checked yet'}
            </p>
          </div>
        </div>
        {item.notes && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{item.notes}</p>
          </div>
        )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Related Maintenance Tasks</CardTitle>
        </CardHeader>
        <CardContent>

        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600">No related tasks yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
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
                    <td className="px-4 py-3 font-medium text-slate-900">{task.title}</td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onNavigateToTask(String(task.id))}
                        className="text-[#06cdfe] hover:underline text-sm"
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
        </CardContent>
      </Card>

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
