export type DocumentCategory = "opening" | "closing" | "ups" | "events" | "business";

export interface Document {
  id: number;
  title: string;
  category: DocumentCategory;
  description?: string | null;
  original_filename: string;
  mime_type: string;
  file_size: number;
  is_pinned: boolean;
  uploaded_by_user_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentUpdate {
  title?: string;
  category?: DocumentCategory;
  description?: string | null;
  is_pinned?: boolean;
}
