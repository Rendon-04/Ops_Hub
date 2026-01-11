import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Task, InventoryItem } from "../types/task.ts";



interface TaskFormProps {
  task: Task | null;
  inventory: InventoryItem[];
  onSave: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ task, inventory, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Task["status"]>('PENDING');
  const [dueDate, setDueDate] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
      setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
      setInventoryId(task.inventory_item_id ? String(task.inventory_item_id) : "");
    } else {
      setTitle("");
      setStatus("PENDING");
      setDueDate("");
      setInventoryId("");
    }
  }, [task]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!inventoryId) {
      newErrors.inventory = "Inventory item is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Partial<Task> = {
      title: title.trim(),
      status,
    };

    if (dueDate) payload.due_date = dueDate;
    payload.inventory_item_id = Number(inventoryId);

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2>{task ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && <p className="text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="status" className="block mb-2">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Task["status"])}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PENDING">Open</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <label htmlFor="dueDate" className="block mb-2">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="inventory" className="block mb-2">
              Inventory Item <span className="text-red-500">*</span>
            </label>
            <select
              id="inventory"
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.inventory ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select an item</option>
              {inventory.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                </option>
              ))}
            </select>
            {errors.inventory && <p className="text-red-500 mt-1">{errors.inventory}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Save
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
