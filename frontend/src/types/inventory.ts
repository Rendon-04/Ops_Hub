export type InventoryStatus = "In Stock" | "Low" | "Out";

export type InventoryItem = {
  id: number;
  name: string;
  category?: string | null;
  quantity: number;
  reorder_threshold: number;
  reorder_url?: string | null;
  notes?: string | null;
  last_checked_at?: string | null;
  vendor_id: number | null;
  is_low_stock: boolean;
  status?: InventoryStatus;
};
  
