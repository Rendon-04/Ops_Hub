import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../api/client";
import type { Document, DocumentCategory, DocumentUpdate } from "../types/document";
import { ConfirmModal } from "./ConfirmModal";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";


const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "opening", label: "Opening" },
  { value: "closing", label: "Closing" },
  { value: "ups", label: "UPS" },
  { value: "events", label: "Events" },
  { value: "business", label: "Business" },
];

interface DocumentsProps {
  userEmail: string;
}

interface DocumentModalProps {
  mode: "create" | "edit";
  initial?: Document;
  onSave: (payload: DocumentUpdate, file?: File) => Promise<void>;
  onCancel: () => void;
}

function DocumentModal({ mode, initial, onSave, onCancel }: DocumentModalProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState<DocumentCategory>(initial?.category || "opening");
  const [description, setDescription] = useState(initial?.description || "");
  const [isPinned, setIsPinned] = useState(Boolean(initial?.is_pinned));
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "Title is required";
    if (!category) nextErrors.category = "Category is required";
    if (mode === "create" && !file) nextErrors.file = "File is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      await onSave(
        {
          title: title.trim(),
          category,
          description: description.trim() || null,
          is_pinned: isPinned,
        },
        file || undefined
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2>{mode === "create" ? "Upload Document" : "Edit Document"}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg" type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Document title"
            />
            {errors.title && <p className="text-[#e90786] mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block mb-2">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-[#e90786] mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="block mb-2">Description</label>
            <textarea
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Optional summary"
            />
          </div>

          {mode === "create" && (
            <div>
              <label className="block mb-2">File *</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
                className="w-full"
              />
              {errors.file && <p className="text-[#e90786] mt-1">{errors.file}</p>}
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            Pin document
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#e90786] text-white px-4 py-2 rounded-lg hover:bg-[#d10677] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Documents({ userEmail }: DocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);

  const adminEmails = useMemo(() => {
    return (import.meta.env.VITE_ADMIN_EMAILS || "")
      .split(",")
      .map((email: string) => email.trim().toLowerCase())
      .filter(Boolean);
  }, []);
  const isAdmin = adminEmails.length === 0 || adminEmails.includes(userEmail.toLowerCase());

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | boolean> = {};
      if (categoryFilter) params.category = categoryFilter;
      if (search.trim()) params.search = search.trim();
      if (pinnedOnly) params.pinned_only = true;
      const res = await api.get("/api/documents", { params });
      setDocuments(res.data || []);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter, search, pinnedOnly]);

  const formatCategory = (value: string) =>
    value[0].toUpperCase() + value.slice(1);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (payload: DocumentUpdate, file?: File) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("title", payload.title || "");
      formData.append("category", payload.category || "opening");
      if (payload.description) formData.append("description", payload.description);
      formData.append("is_pinned", String(Boolean(payload.is_pinned)));
      formData.append("file", file);

      await api.post("/api/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded");
      setShowUpload(false);
      fetchDocuments();
    } catch (error: any) {
      console.error("Upload document error:", error);
      const msg = error?.response?.data?.detail || "Failed to upload document";
      toast.error(msg);
    }
  };

  const handleUpdate = async (payload: DocumentUpdate) => {
    if (!editDoc) return;
    try {
      await api.put(`/api/documents/${editDoc.id}`, payload);
      toast.success("Document updated");
      setEditDoc(null);
      fetchDocuments();
    } catch (error: any) {
      console.error("Update document error:", error);
      const msg = error?.response?.data?.detail || "Failed to update document";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    try {
      await api.delete(`/api/documents/${deleteDoc.id}`);
      toast.success("Document deleted");
      setDeleteDoc(null);
      fetchDocuments();
    } catch (error: any) {
      console.error("Delete document error:", error);
      const msg = error?.response?.data?.detail || "Failed to delete document";
      toast.error(msg);
    }
  };

  const handlePinToggle = async (doc: Document) => {
    try {
      await api.put(`/api/documents/${doc.id}`, { is_pinned: !doc.is_pinned });
      fetchDocuments();
    } catch (error: any) {
      console.error("Pin update error:", error);
      const msg = error?.response?.data?.detail || "Failed to update pin";
      toast.error(msg);
    }
  };

  const fetchBlob = async (doc: Document) => {
    const res = await api.get(`/api/documents/${doc.id}/download`, { responseType: "blob" });
    const contentType = res.headers["content-type"] || doc.mime_type || "application/octet-stream";
    return new Blob([res.data], { type: contentType });
  };

  const handleView = async (doc: Document) => {
    try {
      const blob = await fetchBlob(doc);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("View document error:", error);
      toast.error("Failed to open document");
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await fetchBlob(doc);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.original_filename || "document";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Download document error:", error);
      toast.error("Failed to download document");
    }
  };

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
          <h1 className="text-2xl font-semibold tracking-tight text-black">Documents &amp; SOPs</h1>
          <p className="text-sm text-gray-600">Centralized operating documents for staff.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="bg-[#e90786] text-white px-4 py-2 rounded-lg hover:bg-[#d10677] transition-colors"
          >
            Upload Document
          </button>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Document Library</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Filter by category, search, or pin status.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or filename"
              className="px-4 py-2.5 border border-gray-300 rounded-lg"
            />

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={pinnedOnly}
                onChange={(e) => setPinnedOnly(e.target.checked)}
              />
              Pinned only
            </label>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <h3 className="mb-2 text-lg font-semibold text-slate-900">No documents found</h3>
              <p className="text-sm text-gray-600 mb-6">Try adjusting filters or upload a document.</p>
              {isAdmin && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="bg-[#e90786] text-white px-6 py-2 rounded-lg hover:bg-[#d10677] transition-colors"
                >
                  Upload Document
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-6 py-3">Title</th>
                    <th className="text-left px-6 py-3">Category</th>
                    <th className="text-left px-6 py-3">Filename</th>
                    <th className="text-left px-6 py-3">Size</th>
                    <th className="text-left px-6 py-3">Uploaded</th>
                    <th className="text-left px-6 py-3">Pinned</th>
                    <th className="text-right px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{doc.title}</div>
                        {doc.description && <div className="text-sm text-gray-500">{doc.description}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm">{formatCategory(doc.category)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{doc.original_filename}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatFileSize(doc.file_size)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{doc.uploaded_by_user_id ? `User ${doc.uploaded_by_user_id}` : "System"}</div>
                        <div className="text-xs">{new Date(doc.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        {doc.is_pinned ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-[#dfff35]/70 text-black">
                            Pinned
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleView(doc)}
                            className="text-[#06cdfe] hover:underline text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            className="text-[#06cdfe] hover:underline text-sm"
                          >
                            Download
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setEditDoc(doc)}
                                className="text-[#06cdfe] hover:underline text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handlePinToggle(doc)}
                                className="text-[#06cdfe] hover:underline text-sm"
                              >
                                {doc.is_pinned ? "Unpin" : "Pin"}
                              </button>
                              <button
                                onClick={() => setDeleteDoc(doc)}
                                className="text-[#e90786] hover:underline text-sm"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showUpload && (
        <DocumentModal
          mode="create"
          onSave={handleUpload}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {editDoc && (
        <DocumentModal
          mode="edit"
          initial={editDoc}
          onSave={handleUpdate}
          onCancel={() => setEditDoc(null)}
        />
      )}

      {deleteDoc && (
        <ConfirmModal
          title="Delete document?"
          message="This will permanently remove the document and its file."
          onConfirm={handleDelete}
          onCancel={() => setDeleteDoc(null)}
        />
      )}
    </div>
  );
}
