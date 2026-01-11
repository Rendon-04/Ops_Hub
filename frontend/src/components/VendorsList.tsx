import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { api } from "../api/client"
import { VendorForm } from './VendorForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';

interface Vendor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface VendorsListProps {
  accessToken: string;
  onNavigate: (id: number) => void;
}

export function VendorsList({ onNavigate }: VendorsListProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = vendors.filter((vendor) =>
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
       
    );
    setFilteredVendors(filtered);
  }, [searchQuery, vendors]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vendorsRes, inventoryRes] = await Promise.all([
        api.get("/vendors/"),
        api.get("/inventory"),
      ]);
  
      setVendors(vendorsRes.data || []);
      setInventory(inventoryRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };
  

  const handleCreateOrUpdate = async (data: Partial<Vendor>) => {
    try {
      if (editingVendor) {
        await api.put(`/vendors/${editingVendor.id}`, data);
        toast.success("Vendor updated successfully");
      } else {
        await api.post("/vendors", data);
        toast.success("Vendor created successfully");
      }
  
      setShowForm(false);
      setEditingVendor(null);
      fetchData();
    } catch (error) {
      console.error("Save vendor error:", error);
      toast.error("Failed to save vendor");
    }
  };
  

  const handleDelete = async () => {
    if (!deletingVendor) return;
  
    try {
      await api.delete(`/vendors/${deletingVendor.id}`);
      toast.success("Vendor deleted successfully");
      setDeletingVendor(null);
      fetchData();
    } catch (error) {
      console.error("Delete vendor error:", error);
      toast.error("Failed to delete vendor");
    }
  };
  

  const getInventoryCount = (vendorId: number) => {
    return inventory.filter((item) => item.vendor_id === vendorId).length;
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
          <h1 className="mb-2">Vendors</h1>
          <p className="text-gray-600">Manage your vendors</p>
        </div>
        <button
          onClick={() => {
            setEditingVendor(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by vendor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Vendors Table */}
      {filteredVendors.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="mb-2">No vendors found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery ? 'Try adjusting your search query.' : 'Get started by adding your first vendor.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Add Vendor
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Contact</th>
                <th className="text-left px-6 py-3">Inventory Count</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{vendor.name}</td>
                  <td className="px-6 py-4 text-gray-600">{vendor.email || vendor.phone || "—"}</td>
                  <td className="px-6 py-4 text-gray-600">{getInventoryCount(vendor.id)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onNavigate(vendor.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingVendor(vendor);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => setDeletingVendor(vendor)}
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
        <VendorForm
          vendor={editingVendor}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setShowForm(false);
            setEditingVendor(null);
          }}
        />
      )}

    
      {deletingVendor && (
        <ConfirmModal
          title="Delete Vendor"
          message={`Are you sure you want to delete "${deletingVendor.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingVendor(null)}
        />
      )}
    </div>
  );
}
