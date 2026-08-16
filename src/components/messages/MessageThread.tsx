'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, isToday, isYesterday } from 'date-fns'

type Message = {
  id: string
  sender_id: string
  sender_role: 'parent' | 'tutor'
  body: string
  read_at: string | null
  created_at: string
}

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`
  return format(d, 'd MMM, h:mm a')
}

export default function MessageThread({
  bookingId,
  initialMessages,
  currentRole,
  myName,
  otherPartyName,
  adminParentName,
  adminTutorName,
  readOnly = false,
}: {
  bookingId: string
  initialMessages: Message[]
  currentRole: 'parent' | 'tutor' | 'admin'
  myName: string
  otherPartyName: string
  adminParentName?: string
  adminTutorName?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark messages as read on mount and refresh layout so the badge clears
  useEffect(() => {
    if (readOnly) return
    fetch(`/api/messages/${bookingId}/read`, { method: 'PATCH' }).then(() => router.refresh())
  }, [bookingId, readOnly, router])

  // Poll for new messages every 4 seconds
  useEffect(() => {
    const poll = async () => {
      const res = await fetch(`/api/messages/${bookingId}`)
      if (!res.ok) return
      const data = await res.json()
      const fetched: Message[] = data.messages ?? []
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMsgs = fetched.filter(m => !existingIds.has(m.id))
        if (!newMsgs.length) return prev
        if (!readOnly) {
          const hasNewFromOther = newMsgs.some(m => m.sender_role !== currentRole)
          if (hasNewFromOther) fetch(`/api/messages/${bookingId}/read`, { method: 'PATCH' })
        }
        return [...prev, ...newMsgs]
      })
    }

    const interval = setInterval(poll, 4000)
    return () => clearInterval(interval)
  }, [bookingId, currentRole, readOnly])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    setInput('')

    const res = await fetch(`/api/messages/${bookingId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })

    if (!res.ok) {
      setInput(text)
      setError('Failed to send. Please try again.')
    } else {
      const data = await res.json()
      if (data.message) {
        setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message])
      }
    }
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-md overflow-hidden" style={{ height: '600px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            No messages yet. {!readOnly && 'Start the conversation below.'}
          </p>
        )}

        {messages.map((msg) => {
          let isOwn: boolean
          let senderLabel: string
          if (currentRole === 'admin') {
            isOwn = msg.sender_role === 'tutor'
            senderLabel = msg.sender_role === 'tutor'
              ? (adminTutorName ?? 'Tutor')
              : (adminParentName ?? 'Parent')
          } else {
            isOwn = msg.sender_role === currentRole
            senderLabel = msg.sender_role === currentRole ? myName : otherPartyName
          }

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                <p className="text-xs text-muted-foreground mb-1 px-1">{senderLabel}</p>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted/50 text-foreground rounded-bl-none border border-border'
                }`}>
                  {msg.body}
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  {formatMessageTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!readOnly && (
        <div className="border-t border-border p-4 space-y-2">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="input flex-1"
              placeholder="Type a message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {readOnly && (
        <div className="border-t border-border px-4 py-3 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">Admin view — read only</p>
        </div>
      )}
    </div>
  )
}
