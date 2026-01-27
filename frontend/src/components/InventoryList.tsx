import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { api } from '../api/client';
import { InventoryForm } from './InventoryForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';
import type { InventoryItem } from '../types/inventory';
import type { Vendor } from "../types/vendor";


interface InventoryListProps {
  accessToken: string;
  onNavigate: (id: string) => void;
}

export function InventoryList({ onNavigate }: InventoryListProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = inventory;

    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (vendorFilter) {
      filtered = filtered.filter((item) => item.vendor_id === vendorFilter);
    }

    setFilteredInventory(filtered);
  }, [searchQuery, vendorFilter, inventory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, vendorsRes] = await Promise.all([
        api.get("/inventory"),
        api.get("/vendors"),
      ]);
  
      setInventory(inventoryRes.data || []);
      setVendors(vendorsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };
  

  const handleCreateOrUpdate = async (data: Partial<InventoryItem>) => {
    try {
      if (editingItem) {
        await api.put(`/inventory/${editingItem.id}`, data);
        toast.success("Inventory updated successfully");
      } else {
        await api.post("/inventory", data);
        toast.success("Inventory created successfully");
      }

      setShowForm(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      console.error("Save inventory error:", error);
      const msg = error?.response?.data?.detail || "Failed to save inventory item";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      await api.delete(`/inventory/${deletingItem.id}`);
      toast.success("Inventory item deleted successfully");
      setDeletingItem(null);
      fetchData();
    } catch (error: any) {
      console.error("Delete inventory error:", error);
      const msg = error?.response?.data?.detail || "Failed to delete inventory item";
      toast.error(msg);
    }
  };

  const getVendorName = (vendorId: number | null) => {
    if (!vendorId) return "—";
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor?.name || "Unknown";
  };

  const getStatus = (item: InventoryItem) => {
    if (item.status) return item.status;
    if (item.quantity === 0) return "Out";
    if (item.quantity <= item.reorder_threshold) return "Low";
    return "In Stock";
  };

  const getStatusColor = (status: string) => {
    if (status === "In Stock") return "green";
    if (status === "Low") return "orange";
    return "red";
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
          <h1 className="mb-2">Inventory</h1>
          <p className="text-gray-600">Manage your inventory items</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Add Inventory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by item name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={vendorFilter === '' ? '' : String(vendorFilter)}
          onChange={(e) => {
            const val = e.target.value;
            setVendorFilter(val === '' ? '' : Number(val));
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Vendors</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={String(vendor.id)}>
              {vendor.name}
            </option>
          ))}
        </select>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="mb-2">No inventory items found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || vendorFilter ? 'Try adjusting your filters.' : 'Get started by adding your first inventory item.'}
          </p>
          {!searchQuery && !vendorFilter && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Add Inventory
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3">Item Name</th>
                <th className="text-left px-6 py-3">Category</th>
                <th className="text-left px-6 py-3">Vendor</th>
                <th className="text-left px-6 py-3">Quantity</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInventory.map((item) => {
                const status = getStatus(item);
                const statusColor = getStatusColor(status);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{item.name}</td>
                    <td className="px-6 py-4 text-gray-600">{item.category || "—"}</td>
                    <td className="px-6 py-4 text-gray-600">{getVendorName(item.vendor_id)}</td>
                    <td className="px-6 py-4 text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full inline-block ${
                          statusColor === 'green'
                            ? 'bg-green-100 text-green-800'
                            : statusColor === 'orange'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onNavigate(String(item.id))}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setShowForm(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeletingItem(item)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <InventoryForm
          item={editingItem}
          vendors={vendors}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {deletingItem && (
        <ConfirmModal
          title="Delete Inventory Item"
          message={`Are you sure you want to delete "${deletingItem.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingItem(null)}
        />
      )}
    </div>
  );
}
