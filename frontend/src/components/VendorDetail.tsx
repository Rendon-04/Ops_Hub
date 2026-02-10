import React, { useState, useEffect } from "react";
import { ArrowLeft, Edit2, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { VendorForm } from "./VendorForm";
import { ConfirmModal } from "./ConfirmModal";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface Vendor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  vendor_id: number | null;
}

interface VendorDetailProps {
  accessToken: string; 
  vendorId: string;
  onNavigateBack: () => void;
  onNavigateToInventory: (id: string) => void;
}

export function VendorDetail({
  accessToken,
  vendorId,
  onNavigateBack,
  onNavigateToInventory,
}: VendorDetailProps) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [vendorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const vid = Number(vendorId);

      const [vendorRes, inventoryRes] = await Promise.all([
        api.get(`/vendors/${vid}`),
        api.get(`/inventory`),
      ]);

      const vendorData = vendorRes.data?.vendor ?? vendorRes.data;
      if (!vendorData) {
        toast.error("Vendor not found");
        onNavigateBack();
        return;
      }
      setVendor(vendorData);

      const inventoryData: InventoryItem[] = inventoryRes.data ?? [];
      const vendorInventory = inventoryData.filter((item) => item.vendor_id === vid);
      setInventory(vendorInventory);
    } catch (error: any) {
      console.error("Failed to fetch vendor:", error);
      const msg = error?.response?.data?.detail || "Failed to load vendor details";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: Partial<Vendor>) => {
    try {
      const vid = Number(vendorId);
      await api.put(`/vendors/${vid}`, data);

      toast.success("Vendor updated successfully");
      setShowEditForm(false);
      fetchData();
    } catch (error: any) {
      console.error("Update vendor error:", error);
      const msg = error?.response?.data?.detail || "Failed to update vendor";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    try {
      const vid = Number(vendorId);
      await api.delete(`/vendors/${vid}`);

      toast.success("Vendor deleted successfully");
      onNavigateBack();
    } catch (error: any) {
      console.error("Delete vendor error:", error);
      const msg = error?.response?.data?.detail || "Failed to delete vendor";
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

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Vendor not found</p>
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
        Back to Vendors
      </button>

      <Card>
        <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">{vendor.name}</CardTitle>
            {(vendor.email || vendor.phone) && (
              <p className="text-sm text-gray-600 mt-1">{vendor.email || vendor.phone}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
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
          {(vendor.email || vendor.phone) && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Contact</h3>
              <p className="text-sm text-gray-600">{vendor.email || "—"} · {vendor.phone || "—"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inventory from this Vendor</CardTitle>
        </CardHeader>
        <CardContent>

        {inventory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600 mb-4">
              No inventory items from this vendor yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Item Name</th>
                  <th className="text-left px-4 py-3">Quantity</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onNavigateToInventory(String(item.id))}
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
        <VendorForm
          vendor={vendor as any}
          onSave={handleUpdate}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Vendor"
          message={`Are you sure you want to delete "${vendor.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
