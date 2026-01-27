import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Task, TaskType } from "../types/task.ts";
import type { InventoryItem } from "../types/inventory";
import type { Vendor } from "../types/vendor";



interface TaskFormProps {
  task: Task | null;
  inventory: InventoryItem[];
  vendors: Vendor[];
  onSave: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ task, inventory, vendors, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Task["status"]>('OPEN');
  const [taskType, setTaskType] = useState<TaskType>('OTHER');
  const [dueDate, setDueDate] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [eventName, setEventName] = useState('');
  const [otherText, setOtherText] = useState('');
  const [notes, setNotes] = useState('');
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
      setTaskType(task.task_type || "OTHER");
      setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
      setInventoryId(task.inventory_item_id ? String(task.inventory_item_id) : "");
      setVendorId(task.vendor_id ? String(task.vendor_id) : "");
      setEventName(task.event_name || "");
      setOtherText(task.task_type === "OTHER" ? task.event_name || "" : "");
      setNotes(task.notes || "");
      setIsHighPriority(Boolean(task.is_high_priority));
    } else {
      setTitle("");
      setStatus("OPEN");
      setTaskType("OTHER");
      setDueDate("");
      setInventoryId("");
      setVendorId("");
      setEventName("");
      setOtherText("");
      setNotes("");
      setIsHighPriority(false);
    }
  }, [task]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (taskType === "INVENTORY" && !inventoryId) {
      newErrors.inventory = "Inventory item is required";
    }

    if (taskType === "VENDOR" && !vendorId) {
      newErrors.vendor = "Vendor is required";
    }

    if ((taskType === "EVENT" && !eventName.trim()) || (taskType === "OTHER" && !otherText.trim())) {
      newErrors.event = "Please add details for this type";
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
      task_type: taskType,
      is_high_priority: isHighPriority,
    };

    if (dueDate) payload.due_date = dueDate;
    payload.inventory_item_id = taskType === "INVENTORY" && inventoryId ? Number(inventoryId) : null;
    payload.vendor_id = taskType === "VENDOR" && vendorId ? Number(vendorId) : null;
    if (taskType === "EVENT") {
      payload.event_name = eventName.trim() ? eventName.trim() : null;
    } else if (taskType === "OTHER") {
      payload.event_name = otherText.trim() ? otherText.trim() : null;
    } else {
      payload.event_name = null;
    }
    payload.notes = notes.trim() ? notes.trim() : null;

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
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="priority"
              type="checkbox"
              checked={isHighPriority}
              onChange={(e) => setIsHighPriority(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="priority" className="block">
              High priority
            </label>
          </div>

          <div>
            <label htmlFor="taskType" className="block mb-2">
              Category
            </label>
            <select
              id="taskType"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EVENT">Event</option>
              <option value="INVENTORY">Inventory</option>
              <option value="VENDOR">Vendor</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {taskType === "EVENT" && (
            <div>
              <label htmlFor="eventName" className="block mb-2">
                Event
              </label>
              <input
                id="eventName"
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.event ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Event name"
              />
              {errors.event && <p className="text-red-500 mt-1">{errors.event}</p>}
            </div>
          )}

          {taskType === "INVENTORY" && (
            <div>
              <label htmlFor="inventory" className="block mb-2">
                Inventory Item
              </label>
              <select
                id="inventory"
                value={inventoryId}
                onChange={(e) => setInventoryId(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.inventory ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select a Category</option>
                {inventory.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
              </select>
              {errors.inventory && <p className="text-red-500 mt-1">{errors.inventory}</p>}
            </div>
          )}

          {taskType === "VENDOR" && (
            <div>
              <label htmlFor="vendor" className="block mb-2">
                Vendor
              </label>
              <select
                id="vendor"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.vendor ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select a vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={String(vendor.id)}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              {errors.vendor && <p className="text-red-500 mt-1">{errors.vendor}</p>}
            </div>
          )}

          {taskType === "OTHER" && (
            <div>
              <label htmlFor="otherText" className="block mb-2">
                Other
              </label>
              <input
                id="otherText"
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.event ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Describe what this task is linked to"
              />
              {errors.event && <p className="text-red-500 mt-1">{errors.event}</p>}
            </div>
          )}

          

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
            <label htmlFor="notes" className="block mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes"
            />
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
