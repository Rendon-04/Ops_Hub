import React, { useState, useEffect } from 'react';
import { Users, Package, ClipboardList, Plus, Sparkles, NotebookPen } from 'lucide-react';
import { api } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface DashboardProps {
  accessToken: string;
  onNavigate: (page: string, id?: string) => void;
}

interface ShiftNoteEntry {
  content: string;
  updated_at: string;
  updated_by: { id: number; email: string } | null;
}

interface ShiftNotesToday {
  note_date: string;
  date_label: string;
  opening: ShiftNoteEntry | null;
  closing: ShiftNoteEntry | null;
}

export function Dashboard({ accessToken, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    total_items: 0,
    low_stock_count: 0,
    open_tasks_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [shiftNotes, setShiftNotes] = useState<ShiftNotesToday | null>(null);
  const [editingShiftType, setEditingShiftType] = useState<"opening" | "closing" | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  useEffect(() => {
    fetchStats();
    fetchShiftNotes();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/summary', {
    
      });

      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShiftNotes = async () => {
    setNotesLoading(true);
    try {
      const res = await api.get('/api/shift-notes/today');
      setShiftNotes(res.data);
    } catch (error) {
      console.error('Failed to fetch shift notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const openEditor = (shiftType: "opening" | "closing") => {
    setEditingShiftType(shiftType);
    const current = shiftType === "opening" ? shiftNotes?.opening : shiftNotes?.closing;
    setNoteContent(current?.content || "");
    setNoteError("");
  };

  const handleSaveNote = async () => {
    if (!editingShiftType || !shiftNotes) return;
    const content = noteContent.trim();
    if (!content) {
      setNoteError("Content cannot be empty");
      return;
    }

    try {
      setSavingNote(true);
      await api.put('/api/shift-notes', {
        note_date: shiftNotes.note_date,
        shift_type: editingShiftType,
        content,
      });
      setEditingShiftType(null);
      setNoteContent("");
      await fetchShiftNotes();
    } catch (error) {
      console.error('Failed to save shift note:', error);
      setNoteError("Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const cards = [
    {
      title: 'Total Inventory Items',
      count: stats.total_items,
      icon: Package,
      color: 'green',
      page: 'inventory',
    },
    {
      title: 'Low Stock Items',
      count: stats.low_stock_count,
      icon: Package,
      color: 'orange',
      page: 'inventory',
    },
    {
      title: 'Open Tasks',
      count: stats.open_tasks_count,
      icon: ClipboardList,
      color: 'blue',
      page: 'tasks',
    },
  ];

  const quickActions = [
    { label: 'Add Vendor', page: 'vendors', icon: Users },
    { label: 'Add Inventory', page: 'inventory', icon: Package },
    { label: 'Create Task', page: 'tasks', icon: ClipboardList },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black">Dashboard</h1>
        <p className="text-sm text-gray-600">Overview of today’s operations and handoffs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={() => onNavigate(card.page)}
              className="text-left group"
            >
              <Card className="transition-all duration-150 group-hover:border-[#e90786]/30 group-hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        card.color === 'blue'
                          ? 'bg-[#e90786]/10 text-[#e90786]'
                          : card.color === 'green'
                          ? 'bg-[#06cdfe]/15 text-[#06cdfe]'
                          : 'bg-[#dfff35]/70 text-black'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="text-xs text-gray-400">View</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="text-3xl font-semibold text-slate-900">{card.count}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#06cdfe]/15 text-[#06cdfe]">
            <NotebookPen size={18} />
          </div>
            <CardTitle className="text-lg">Shift Notes &amp; Handoffs</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {shiftNotes?.date_label || "Today"}
            </p>
          </div>
        
        </CardHeader>

        {notesLoading ? (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {["one", "two"].map((key) => (
                <div key={key} className="rounded-xl border border-gray-200 p-4">
                  <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
                    <div className="h-3 w-4/5 rounded bg-gray-100 animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(["opening", "closing"] as const).map((shiftType) => {
                const note = shiftType === "opening" ? shiftNotes?.opening : shiftNotes?.closing;
                return (
                  <div key={shiftType} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="capitalize text-sm font-semibold text-slate-800">{shiftType} Shift Note</h3>
                      <button
                        onClick={() => openEditor(shiftType)}
                        className="text-sm text-[#06cdfe] hover:text-[#03b6e2] transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    {note ? (
                      <>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-3">
                          Updated {new Date(note.updated_at).toLocaleString()}
                          {note.updated_by?.email ? ` by ${note.updated_by.email}` : ""}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="h-2 w-2 rounded-full bg-gray-300" />
                        No {shiftType} note yet.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#dfff35]/60 text-black">
            <Sparkles size={18} />
          </div>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Jump into common workflows.</p>
          </div>
          
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => onNavigate(action.page)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#06cdfe]/40 hover:bg-[#06cdfe]/10 transition-all duration-150"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#06cdfe]/15 text-[#06cdfe]">
                    <Icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-800">{action.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {stats.total_items === 0 && stats.low_stock_count === 0 && stats.open_tasks_count === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#dfff35]/70 text-black">
              <Plus size={20} />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Welcome to Ops Hub</h3>
            <p className="text-sm text-gray-600 mb-6">
              Get started by adding your first vendor, inventory item, or task.
            </p>
            <button
              onClick={() => onNavigate('vendors')}
              className="bg-[#e90786] text-white px-6 py-2 rounded-lg hover:bg-[#d10677] inline-flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Add Your First Vendor
            </button>
          </CardContent>
        </Card>
      )}

      {editingShiftType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="capitalize text-lg font-semibold">{editingShiftType} Shift Note</h2>
              <button
                onClick={() => setEditingShiftType(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06cdfe]"
                placeholder="Write your handoff note"
              />
              {noteError && <p className="text-[#e90786]">{noteError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="flex-1 bg-[#e90786] text-white py-2 px-4 rounded-lg hover:bg-[#d10677] disabled:opacity-60"
                >
                  {savingNote ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingShiftType(null)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
