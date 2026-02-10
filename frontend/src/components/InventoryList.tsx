import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { api } from '../api/client';
import { InventoryForm } from './InventoryForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';
import type { InventoryItem } from '../types/inventory';
import type { Vendor } from "../types/vendor";
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';


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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black">Inventory</h1>
          <p className="text-sm text-gray-600">Track supplies, equipment, and thresholds.</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="bg-[#e90786] text-white px-4 py-2 rounded-lg hover:bg-[#d10677] flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Inventory
        </button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Inventory Items</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Filter by vendor or item name.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by item name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
              />
            </div>

            <select
              value={vendorFilter === '' ? '' : String(vendorFilter)}
              onChange={(e) => {
                const val = e.target.value;
                setVendorFilter(val === '' ? '' : Number(val));
              }}
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

          {filteredInventory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <h3 className="mb-2 text-lg font-semibold text-slate-900">No inventory items found</h3>
              <p className="text-sm text-gray-600 mb-6">
                {searchQuery || vendorFilter ? 'Try adjusting your filters.' : 'Get started by adding your first inventory item.'}
              </p>
              {!searchQuery && !vendorFilter && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-[#e90786] text-white px-6 py-2 rounded-lg hover:bg-[#d10677] inline-flex items-center gap-2 transition-colors"
                >
                  <Plus size={18} />
                  Add Inventory
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
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
                        <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.category || "—"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{getVendorName(item.vendor_id)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.quantity}</td>
                        <td className="px-6 py-4">
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
                              className="p-2 text-[#06cdfe] hover:bg-[#06cdfe]/10 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => setDeletingItem(item)}
                              className="p-2 text-[#e90786] hover:bg-[#e90786]/10 rounded-lg"
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
        </CardContent>
      </Card>

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
