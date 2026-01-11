export type TaskStatus = "PENDING" | "COMPLETED";

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  inventory_item_id: number | null; 
};

