import React, { useMemo, useState } from "react";
import type { Incident, IncidentSeverity, IncidentStatus, IncidentType } from "../types/incident";


interface IncidentFormProps {
  initial?: Partial<Incident>;
  onSave: (payload: Partial<Incident>, files: File[]) => Promise<void>;
  onCancel: () => void;
}

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: "customer_issue", label: "Customer Issue" },
  { value: "safety_concern", label: "Safety Concern" },
  { value: "property_damage", label: "Property Damage" },
  { value: "ups_dispute", label: "UPS Dispute" },
  { value: "staff_incident", label: "Staff Incident" },
  { value: "other", label: "Other" },
];

const SEVERITIES: { value: IncidentSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const STATUSES: { value: IncidentStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

export function IncidentForm({ initial, onSave, onCancel }: IncidentFormProps) {
  const nowLocal = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }, []);

  const [incidentType, setIncidentType] = useState<IncidentType>(initial?.incident_type || "customer_issue");
  const [occurredAt, setOccurredAt] = useState(initial?.occurred_at ? initial.occurred_at.slice(0, 16) : nowLocal);
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [severity, setSeverity] = useState<IncidentSeverity>(initial?.severity || "low");
  const [actionTaken, setActionTaken] = useState(initial?.action_taken || "");
  const [followUpNeeded, setFollowUpNeeded] = useState(Boolean(initial?.follow_up_needed));
  const [followUpOwner, setFollowUpOwner] = useState(initial?.follow_up_owner || "");
  const [followUpDueDate, setFollowUpDueDate] = useState(
    initial?.follow_up_due_date ? initial.follow_up_due_date.slice(0, 10) : ""
  );
  const [followUpNotes, setFollowUpNotes] = useState(initial?.follow_up_notes || "");
  const [status, setStatus] = useState<IncidentStatus>(initial?.status || "open");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!incidentType) nextErrors.incident_type = "Incident type is required";
    if (!title.trim()) nextErrors.title = "Title is required";
    if (!occurredAt) nextErrors.occurred_at = "Date/time is required";
    if (!description.trim()) nextErrors.description = "Description is required";
    if (!actionTaken.trim()) nextErrors.action_taken = "Action taken is required";
    if (!severity) nextErrors.severity = "Severity is required";
    if (followUpNeeded) {
      if (!followUpOwner.trim()) nextErrors.follow_up_owner = "Follow-up owner is required";
      if (!followUpDueDate) nextErrors.follow_up_due_date = "Follow-up due date is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Partial<Incident> = {
      title: title.trim(),
      incident_type: incidentType,
      occurred_at: new Date(occurredAt).toISOString(),
      description: description.trim(),
      severity,
      action_taken: actionTaken.trim(),
      follow_up_needed: followUpNeeded,
      follow_up_owner: followUpNeeded ? followUpOwner.trim() : null,
      follow_up_due_date: followUpNeeded ? followUpDueDate : null,
      follow_up_notes: followUpNeeded ? (followUpNotes.trim() || null) : null,
      status,
    };

    try {
      setSaving(true);
      await onSave(payload, attachments);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2>{initial ? "Edit Incident" : "Log New Incident"}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg" type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="mb-3">Incident Basics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Short incident title"
                />
                {errors.title && <p className="text-red-500 mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="block mb-2">Incident Type *</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {INCIDENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.incident_type && <p className="text-red-500 mt-1">{errors.incident_type}</p>}
              </div>
              <div>
                <label className="block mb-2">Date & Time *</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {errors.occurred_at && <p className="text-red-500 mt-1">{errors.occurred_at}</p>}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3">What Happened *</h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Describe what happened"
            />
            {errors.description && <p className="text-red-500 mt-1">{errors.description}</p>}
          </div>

          <div>
            <h3 className="mb-3">Severity *</h3>
            <div className="flex gap-4">
              {SEVERITIES.map((level) => (
                <label key={level.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="severity"
                    checked={severity === level.value}
                    onChange={() => setSeverity(level.value)}
                  />
                  {level.label}
                </label>
              ))}
            </div>
            {errors.severity && <p className="text-red-500 mt-1">{errors.severity}</p>}
          </div>

          <div>
            <h3 className="mb-3">Action Taken *</h3>
            <textarea
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="What was done"
            />
            {errors.action_taken && <p className="text-red-500 mt-1">{errors.action_taken}</p>}
          </div>

          <div>
            <h3 className="mb-3">Follow-Up</h3>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={followUpNeeded}
                onChange={(e) => setFollowUpNeeded(e.target.checked)}
              />
              Follow-up needed?
            </label>

            {followUpNeeded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">Follow-up Owner *</label>
                  <input
                    type="text"
                    value={followUpOwner}
                    onChange={(e) => setFollowUpOwner(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  {errors.follow_up_owner && <p className="text-red-500 mt-1">{errors.follow_up_owner}</p>}
                </div>
                <div>
                  <label className="block mb-2">Follow-up Due Date *</label>
                  <input
                    type="date"
                    value={followUpDueDate}
                    onChange={(e) => setFollowUpDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  {errors.follow_up_due_date && <p className="text-red-500 mt-1">{errors.follow_up_due_date}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-2">Follow-up Notes</label>
                  <textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3">Status</h3>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IncidentStatus)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="mb-3">Attachments (Optional)</h3>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
              onChange={(e) => setAttachments(Array.from(e.target.files || []))}
            />
            <p className="text-sm text-gray-500 mt-2">
              Damage photos, emails, screenshots, vendor correspondence.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Incident"}
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
