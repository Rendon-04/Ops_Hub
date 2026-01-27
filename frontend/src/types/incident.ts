export type IncidentType =
  | "customer_issue"
  | "safety_concern"
  | "property_damage"
  | "ups_dispute"
  | "staff_incident"
  | "other";

export type IncidentSeverity = "low" | "medium" | "high";

export type IncidentStatus = "open" | "in_progress" | "resolved";

export type Incident = {
  id: number;
  title: string;
  incident_type: IncidentType;
  occurred_at: string;
  description: string;
  severity: IncidentSeverity;
  action_taken: string;
  follow_up_needed: boolean;
  follow_up_owner: string | null;
  follow_up_due_date: string | null;
  follow_up_notes: string | null;
  status: IncidentStatus;
  reported_by_user_id: number;
  created_at: string;
  updated_at: string;
};

export type IncidentAttachment = {
  id: number;
  incident_id: number;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  storage_key: string;
  public_url: string | null;
  uploaded_by_user_id: number;
  created_at: string;
  view_url?: string | null;
  download_url?: string | null;
};
