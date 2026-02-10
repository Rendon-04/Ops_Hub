import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { IncidentForm } from "./IncidentForm";
import { toast } from "sonner";
import type { Incident, IncidentSeverity, IncidentStatus, IncidentType } from "../types/incident";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";


interface IncidentReportsProps {
  onNavigate: (id: string) => void;
}

export function IncidentReports({ onNavigate }: IncidentReportsProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;
      if (followUpFilter) params.follow_up_needed = "true";

      const res = await api.get("/api/incidents/", { params });
      setIncidents(res.data || []);
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
      toast.error("Failed to load incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [typeFilter, severityFilter, statusFilter, followUpFilter]);

  const handleCreate = async (payload: Partial<Incident>, files: File[]) => {
    try {
      const res = await api.post("/api/incidents/", payload);
      const incident = res.data as Incident;

      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          await api.post(`/api/incidents/${incident.id}/attachments`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      toast.success("Incident logged");
      setShowForm(false);
      onNavigate(String(incident.id));
    } catch (error: any) {
      console.error("Save incident error:", error);
      const msg = error?.response?.data?.detail || "Failed to save incident";
      toast.error(msg);
    }
  };

  const formatType = (value: IncidentType) =>
    value
      .split("_")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black">Incident &amp; Issue Reporting</h1>
          <p className="text-sm text-gray-600">Log and track operational incidents.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#e90786] text-white px-4 py-2 rounded-lg hover:bg-[#d10677] transition-colors"
        >
          Log New Incident
        </button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Incident Log</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Filter and review recent incidents.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg"
            >
              <option value="">All Types</option>
              {["customer_issue", "safety_concern", "property_damage", "ups_dispute", "staff_incident", "other"].map(
                (type) => (
                  <option key={type} value={type}>
                    {formatType(type as IncidentType)}
                  </option>
                )
              )}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg"
            >
              <option value="">All Severities</option>
              {["low", "medium", "high"].map((severity) => (
                <option key={severity} value={severity}>
                  {severity[0].toUpperCase() + severity.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg"
            >
              <option value="">All Statuses</option>
              {["open", "in_progress", "resolved"].map((status) => (
                <option key={status} value={status}>
                  {status === "in_progress" ? "In Progress" : status[0].toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={followUpFilter}
                onChange={(e) => setFollowUpFilter(e.target.checked)}
              />
              Follow-up needed
            </label>
          </div>

          {incidents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <h3 className="mb-2 text-lg font-semibold text-slate-900">No incidents found</h3>
              <p className="text-sm text-gray-600 mb-6">
                Try adjusting filters or log a new incident.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#e90786] text-white px-6 py-2 rounded-lg hover:bg-[#d10677] transition-colors"
              >
                Log New Incident
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-6 py-3">Date/Time</th>
                    <th className="text-left px-6 py-3">Title</th>
                    <th className="text-left px-6 py-3">Type</th>
                    <th className="text-left px-6 py-3">Severity</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Follow-up</th>
                    <th className="text-left px-6 py-3">Reported By</th>
                    <th className="text-right px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(incident.occurred_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{incident.title}</td>
                      <td className="px-6 py-4 text-sm">{formatType(incident.incident_type)}</td>
                      <td className="px-6 py-4 text-sm capitalize">{incident.severity}</td>
                      <td className="px-6 py-4 text-sm capitalize">
                        {incident.status === "in_progress" ? "In Progress" : incident.status}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {incident.follow_up_needed
                          ? `Yes${incident.follow_up_due_date ? ` • ${incident.follow_up_due_date}` : ""}`
                          : "No"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{incident.reported_by_user_id}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onNavigate(String(incident.id))}
                          className="text-[#06cdfe] hover:underline text-sm"
                        >
                          View / Edit
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

      {showForm && (
        <IncidentForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
