export type InventoryItem = {
    id: number;
    name: string;
    sku: string | null;         
    quantity: number;
    reorder_threshold: number;
    vendor_id: number | null;
    is_low_stock: boolean;
  };
  