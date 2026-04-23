import { useState, useRef, useEffect } from 'react'
import './AuditChat.css'

const MODELS = [
  { id: 'mistral', label: 'Mistral', note: 'default' },
]

const SUGGESTIONS = [
  'What rare earth metals from here end up in consumer electronics?',
  'Which downstream companies likely source from this entity?',
  'Trace the 2–3 year supply chain lag for this material.',
  'How does this entity\'s moral risk compare to others in the database?',
  'What data is missing here — and what does that absence imply?',
  'Could the trade figures for this entity have been falsified?',
  'What would a regulator need to prove liability here?',
]

export default function AuditChat({ entity }) {
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError]         = useState(null)
  const [model, setModel]         = useState('mistral')
  const bottomRef  = useRef()
  const inputRef   = useRef()
  const abortRef   = useRef(null)

  // Reset on entity change
  useEffect(() => {
    abortRef.current?.abort()
    setMessages([])
    setInput('')
    setError(null)
    setStreaming(false)
  }, [entity.id])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text) {
    const trimmed = text?.trim()
    if (!trimmed || streaming) return
    setError(null)

    const userMsg  = { role: 'user', content: trimmed }
    const history  = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setStreaming(true)

    // Placeholder assistant message — we'll append to it
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ entity, messages: history, model }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: copy[copy.length - 1].content + parsed.text,
                }
                return copy
              })
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      const msg = err.message ?? 'Unknown error'
      setError(msg)
      setMessages(prev => {
        const copy = [...prev]
        if (copy[copy.length - 1]?.role === 'assistant' && !copy[copy.length - 1].content) {
          copy.pop() // remove empty placeholder
        }
        return copy
      })
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  function stopStream() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="audit-chat">
      {/* ── empty state ── */}
      {isEmpty && (
        <div className="chat-intro">
          <div className="chat-intro-orb">⬡</div>
          <div className="chat-intro-title">REEtrieve Intelligence</div>
          <div className="chat-intro-entity">
            Analysing <strong>{entity.name}</strong>
            <span className="chat-intro-score" style={{ color: scoreColor(entity.riskScore) }}>
              {entity.riskScore}/100
            </span>
          </div>
          <div className="chat-intro-sub">
            Grounded in USGS, UN Comtrade, OECD, RMI, BHRRC, and Global Witness data.
            Every claim is cited. Analysis is probabilistic — not verdict.
          </div>
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} className="chat-suggestion" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── messages ── */}
      {!isEmpty && (
        <div className="chat-messages">
          {messages.map((m, i) => (
            <ChatMessage
              key={i}
              message={m}
              isLast={i === messages.length - 1}
              streaming={streaming}
            />
          ))}
          {error && (
            <div className="chat-error">
              <span>⚠ {error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      )}

      {/* ── input row ── */}
      <div className="chat-input-area">
        <div className="chat-model-row">
          {MODELS.map(m => (
            <button
              key={m.id}
              className={`chat-model-btn ${model === m.id ? 'active' : ''}`}
              onClick={() => setModel(m.id)}
              disabled={streaming}
            >
              {m.label}
              <span className="chat-model-note">{m.note}</span>
            </button>
          ))}
        </div>
        <div className="chat-input-wrap">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={`Ask about ${entity.name}…`}
            value={input}
            rows={1}
            disabled={streaming}
            onChange={e => {
              setInput(e.target.value)
              // auto-grow
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
          />
          {streaming ? (
            <button className="chat-send-btn stop" onClick={stopStream} title="Stop">
              ■
            </button>
          ) : (
            <button
              className="chat-send-btn"
              disabled={!input.trim()}
              onClick={() => send(input)}
              title="Send (Enter)"
            >
              ↑
            </button>
          )}
        </div>
        <div className="chat-footer">
          {!isEmpty && (
            <button className="chat-clear-btn" onClick={() => setMessages([])}>
              Clear
            </button>
          )}
          <span className="chat-disclaimer">
            RAG-grounded · Cites sources · Probabilistic framing
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Individual message ────────────────────────────────────────────────────────
function ChatMessage({ message, isLast, streaming }) {
  const isUser = message.role === 'user'
  const showCursor = isLast && streaming && !isUser

  return (
    <div className={`chat-msg ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <div className="chat-avatar">⬡</div>}
      <div className="chat-bubble">
        <RichText text={message.content} />
        {showCursor && <span className="chat-cursor" />}
      </div>
    </div>
  )
}

// ── Lightweight markdown renderer ─────────────────────────────────────────────
// Handles: **bold**, `code`, numbered lists, bullet lists, blank-line paragraphs
function RichText({ text }) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // blank line → spacer
    if (!line.trim()) {
      elements.push(<div key={i} className="chat-spacer" />)
      i++
      continue
    }

    // numbered list item
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={i} className="chat-list-item numbered">
          <span className="chat-list-num">{line.match(/^(\d+)\./)[1]}.</span>
          <span>{inlineFormat(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      )
      i++
      continue
    }

    // bullet
    if (/^[-•*]\s/.test(line)) {
      elements.push(
        <div key={i} className="chat-list-item bullet">
          <span className="chat-list-dot">·</span>
          <span>{inlineFormat(line.replace(/^[-•*]\s/, ''))}</span>
        </div>
      )
      i++
      continue
    }

    // heading (### or ##)
    if (/^#{1,3}\s/.test(line)) {
      elements.push(
        <div key={i} className="chat-heading">{inlineFormat(line.replace(/^#+\s/, ''))}</div>
      )
      i++
      continue
    }

    // normal paragraph line
    elements.push(<p key={i} className="chat-para">{inlineFormat(line)}</p>)
    i++
  }

  return <div className="chat-rich">{elements}</div>
}

function inlineFormat(text) {
  // Split on **bold** and `code` patterns
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="chat-code">{part.slice(1, -1)}</code>
    return part
  })
}

function scoreColor(score) {
  if (score >= 85) return '#f87171'
  if (score >= 70) return '#fb923c'
  if (score >= 55) return '#fbbf24'
  return '#4ade80'
}
