import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

// ✅ adjust these paths to match your folder structure
import type { InventoryItem } from "../types/inventory";
import type { Vendor } from "../types/vendor";

interface InventoryFormProps {
  item: InventoryItem | null;
  vendors: Vendor[];
  onSave: (data: Partial<InventoryItem>) => Promise<void>;
  onCancel: () => void;
}

export function InventoryForm({ item, vendors, onSave, onCancel }: InventoryFormProps) {
  // ✅ keep inputs as strings (easier with form controls)
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [reorderUrl, setReorderUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [vendorId, setVendorId] = useState(""); // string form value
  const [quantity, setQuantity] = useState("0");
  const [reorderThreshold, setReorderThreshold] = useState("0");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name ?? "");
      setCategory(item.category ?? "");
      setReorderUrl(item.reorder_url ?? "");
      setNotes(item.notes ?? "");
      setVendorId(item.vendor_id !== null ? String(item.vendor_id) : "");
      setQuantity(String(item.quantity ?? 0));
      setReorderThreshold(String(item.reorder_threshold ?? 0));
    } else {
      setName("");
      setCategory("");
      setReorderUrl("");
      setNotes("");
      setVendorId("");
      setQuantity("0");
      setReorderThreshold("0");
    }
    setErrors({});
  }, [item]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = "Item name is required";
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      nextErrors.quantity = "Quantity must be a positive number";
    }

    const rt = Number(reorderThreshold);
    if (!Number.isFinite(rt) || rt < 0) {
      nextErrors.reorder_threshold = "Reorder threshold must be a positive number";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // ✅ async because onSave returns Promise<void>
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Partial<InventoryItem> = {
      name: name.trim(),

      category: category.trim() === "" ? null : category.trim(),
      reorder_url: reorderUrl.trim() === "" ? null : reorderUrl.trim(),
      notes: notes.trim() === "" ? null : notes.trim(),
      vendor_id: vendorId === "" ? null : Number(vendorId),
      quantity: Number(quantity),
      reorder_threshold: Number(reorderThreshold),
    };

    try {
      setIsSaving(true);
      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2>{item ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block mb-2">
              Item Name <span className="text-[#e90786]">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe] ${
                errors.name ? "border-[#e90786]" : "border-gray-300"
              }`}
            />
            {errors.name && <p className="text-[#e90786] mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="category" className="block mb-2">
              Category
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
              placeholder="Coffee, snacks, cleaning supplies"
            />
          </div>

          <div>
            <label htmlFor="vendor" className="block mb-2">
              Vendor
            </label>
            <select
              id="vendor"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
            >
              <option value="">Select a vendor (optional)</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={String(vendor.id)}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="block mb-2">
              Quantity Needed <span className="text-[#e90786]">*</span>
            </label>
            <input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe] ${
                errors.quantity ? "border-[#e90786]" : "border-gray-300"
              }`}
            />
            {errors.quantity && <p className="text-[#e90786] mt-1">{errors.quantity}</p>}
          </div>

          <div>
            <label htmlFor="reorderThreshold" className="block mb-2">
              Reorder Threshold <span className="text-[#e90786]">*</span>
            </label>
            <input
              id="reorderThreshold"
              type="number"
              min="0"
              value={reorderThreshold}
              onChange={(e) => setReorderThreshold(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe] ${
                errors.reorder_threshold ? "border-[#e90786]" : "border-gray-300"
              }`}
            />
            {errors.reorder_threshold && (
              <p className="text-[#e90786] mt-1">{errors.reorder_threshold}</p>
            )}
          </div>

          <div>
            <label htmlFor="reorderUrl" className="block mb-2">
              Reorder Link
            </label>
            <input
              id="reorderUrl"
              type="url"
              value={reorderUrl}
              onChange={(e) => setReorderUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
              placeholder="https://vendor.example.com/reorder"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
              placeholder="Optional notes"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-[#e90786] text-white py-2 px-4 rounded-lg hover:bg-[#d10677] disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
