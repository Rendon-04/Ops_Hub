import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { api } from "../api/client"
import { VendorForm } from './VendorForm';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black">Vendors</h1>
          <p className="text-sm text-gray-600">Manage your vendors and contacts.</p>
        </div>
        <button
          onClick={() => {
            setEditingVendor(null);
            setShowForm(true);
          }}
          className="bg-[#e90786] text-white px-4 py-2 rounded-lg hover:bg-[#d10677] flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Vendor
        </button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Vendor Directory</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Search and manage vendor relationships.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by vendor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
            />
          </div>

          {filteredVendors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <h3 className="mb-2 text-lg font-semibold text-slate-900">No vendors found</h3>
              <p className="text-sm text-gray-600 mb-6">
                {searchQuery ? 'Try adjusting your search query.' : 'Get started by adding your first vendor.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-[#e90786] text-white px-6 py-2 rounded-lg hover:bg-[#d10677] inline-flex items-center gap-2 transition-colors"
                >
                  <Plus size={18} />
                  Add Vendor
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
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
                      <td className="px-6 py-4 font-medium text-slate-900">{vendor.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vendor.email || vendor.phone || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{getInventoryCount(vendor.id)}</td>
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
                            className="p-2 text-[#06cdfe] hover:bg-[#06cdfe]/10 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => setDeletingVendor(vendor)}
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
