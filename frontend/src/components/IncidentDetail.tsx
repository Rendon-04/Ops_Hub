import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { toast } from "sonner";
import type { Incident, IncidentAttachment, IncidentStatus } from "../types/incident";


interface IncidentDetailProps {
  incidentId: string;
  onNavigateBack: () => void;
}

export function IncidentDetail({ incidentId, onNavigateBack }: IncidentDetailProps) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [attachments, setAttachments] = useState<IncidentAttachment[]>([]);
  const [status, setStatus] = useState<IncidentStatus>("open");
  const [openPreviews, setOpenPreviews] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchIncident = async () => {
    setLoading(true);
    try {
      const [incidentRes, attachmentsRes] = await Promise.all([
        api.get(`/api/incidents/${incidentId}`),
        api.get(`/api/incidents/${incidentId}/attachments`),
      ]);
      const data: Incident = incidentRes.data;
      setIncident(data);
      setStatus(data.status);
      setAttachments(attachmentsRes.data || []);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || "Failed to load incident";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [incidentId]);

  const handleStatusUpdate = async () => {
    try {
      await api.patch(`/api/incidents/${incidentId}`, { status });
      toast.success("Incident updated");
      fetchIncident();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || "Failed to update incident";
      toast.error(msg);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/api/incidents/${incidentId}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      toast.success("Attachments uploaded");
      fetchIncident();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || "Failed to upload attachments";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const togglePreview = (id: number) => {
    setOpenPreviews((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Incident not found</p>
        <button onClick={onNavigateBack} className="text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onNavigateBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        Back to Incidents
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="mb-2">{incident.title}</h1>
            <p className="text-gray-600">
              Occurred: {new Date(incident.occurred_at).toLocaleString()}
            </p>
            <p className="text-gray-600 capitalize">
              {incident.incident_type.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IncidentStatus)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <button
              onClick={handleStatusUpdate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Update Status
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2">Severity</h3>
            <p className="text-gray-600 capitalize">{incident.severity}</p>
          </div>
          <div>
            <h3 className="mb-2">Reported By</h3>
            <p className="text-gray-600">{incident.reported_by_user_id}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-2">Description</h3>
          <p className="text-gray-600 whitespace-pre-line">{incident.description}</p>
        </div>

        <div className="mt-6">
          <h3 className="mb-2">Action Taken</h3>
          <p className="text-gray-600 whitespace-pre-line">{incident.action_taken}</p>
        </div>

        <div className="mt-6">
          <h3 className="mb-2">Follow-up</h3>
          <p className="text-gray-600">
            {incident.follow_up_needed
              ? `Yes • ${incident.follow_up_owner || "Unassigned"} • ${incident.follow_up_due_date || "No due date"}`
              : "No"}
          </p>
          {incident.follow_up_notes && (
            <p className="text-gray-600 mt-2 whitespace-pre-line">{incident.follow_up_notes}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2>Attachments</h2>
          <label className="text-blue-600 cursor-pointer">
            {uploading ? "Uploading..." : "Upload Files"}
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {attachments.length === 0 ? (
          <p className="text-gray-600">No attachments yet.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((attachment) => {
              const viewUrl = attachment.view_url || "";
              const downloadUrl = attachment.download_url || viewUrl;
              const isImage = attachment.mime_type.startsWith("image/");
              const isPdf = attachment.mime_type === "application/pdf";
              const canPreview = Boolean(viewUrl) && (isImage || isPdf);
              const isOpen = openPreviews[attachment.id];

              return (
                <li key={attachment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-gray-800">{attachment.file_name}</p>
                      <p className="text-sm text-gray-500">
                        {attachment.created_at
                          ? new Date(attachment.created_at).toLocaleString()
                          : "Uploaded"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {canPreview && (
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => togglePreview(attachment.id)}
                        >
                          {isOpen ? "Hide Preview" : "Preview"}
                        </button>
                      )}
                      <a
                        className="text-blue-600 hover:underline"
                        href={downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="mt-4">
                      {isImage && (
                        <img
                          src={viewUrl}
                          alt={attachment.file_name}
                          className="max-w-full rounded-lg border border-gray-200"
                        />
                      )}
                      {isPdf && (
                        <iframe
                          src={viewUrl}
                          title={attachment.file_name}
                          style={{ width: "100%", height: 600, border: 0 }}
                        />
                      )}
                    </div>
                  )}
                  {!canPreview && (
                    <p className="text-sm text-gray-500 mt-3">Preview not available for this file type.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
