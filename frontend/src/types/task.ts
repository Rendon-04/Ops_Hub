export type TaskStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "CLOSED";
export type TaskType = "EVENT" | "INVENTORY" | "VENDOR" | "OTHER";

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
  task_type: TaskType;
  due_date: string | null;
  is_high_priority: boolean;
  inventory_item_id: number | null;
  vendor_id: number | null;
  event_name: string | null;
  notes: string | null;
};
