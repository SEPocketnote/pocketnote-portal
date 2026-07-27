'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'

type Note = {
  id: string
  body: string
  author_email: string
  created_at: string
  updated_at: string
}

export default function EnquiryNotes({
  enquiryId,
  initialNotes,
}: {
  enquiryId: string
  initialNotes: Note[]
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleAdd() {
    const text = input.trim()
    if (!text || saving) return
    setSaving(true)
    const res = await fetch(`/api/admin/enquiries/${enquiryId}/notes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })
    if (res.ok) {
      const { note } = await res.json()
      setNotes(prev => [note, ...prev])
      setInput('')
    }
    setSaving(false)
  }

  async function handleEdit(noteId: string) {
    const text = editBody.trim()
    if (!text) return
    const res = await fetch(`/api/admin/enquiry-notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })
    if (res.ok) {
      const { note } = await res.json()
      setNotes(prev => prev.map(n => n.id === noteId ? note : n))
      setEditingId(null)
    }
  }

  async function handleDelete(noteId: string) {
    const res = await fetch(`/api/admin/enquiry-notes/${noteId}`, { method: 'DELETE' })
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== noteId))
      setConfirmDeleteId(null)
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id)
    setEditBody(note.body)
  }

  const authorInitial = (email: string) => email[0].toUpperCase()
  const authorShort = (email: string) => email.split('@')[0]

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="space-y-2">
        <textarea
          className="input resize-none w-full"
          rows={3}
          placeholder="Add a note…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">⌘↵ to save</p>
          <button
            onClick={handleAdd}
            disabled={!input.trim() || saving}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </div>

      {/* Notes log */}
      {notes.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          {notes.map(note => (
            <div key={note.id} className="flex gap-3">
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                {authorInitial(note.author_email)}
              </div>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium">{authorShort(note.author_email)}</span>
                  <span
                    className="text-xs text-muted-foreground"
                    title={format(new Date(note.created_at), 'dd MMM yyyy, h:mm a')}
                  >
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                  {note.updated_at !== note.created_at && (
                    <span className="text-xs text-muted-foreground italic">(edited)</span>
                  )}
                </div>

                {/* Body / edit mode */}
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      className="input resize-none w-full text-sm"
                      rows={3}
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(note.id)}
                        disabled={!editBody.trim()}
                        className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group">
                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                    <div className="flex gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(note)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === note.id ? (
                        <>
                          <span className="text-xs text-destructive font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="text-xs text-destructive font-medium hover:underline"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(note.id)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <p className="text-sm text-muted-foreground py-2 border-t border-border">No notes yet.</p>
      )}
    </div>
  )
}
