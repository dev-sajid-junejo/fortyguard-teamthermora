import { useState, useRef, useEffect } from 'react'

const SUGGESTED_QUESTIONS = [
  "Which site should we choose?",
  "Why is this site ranked #1?",
  "Compare the top 2 sites",
  "What are the biggest heat risks?",
  "Explain this for an executive",
  "Which site is best for worker safety?",
]

export default function CopilotChat({ analysis }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const question = text || input.trim()
    if (!question || loading) return

    setError(null)
    setInput('')
    const userMsg = { role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [m.content],
      }))

      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          analysis,
          history,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'model', content: data.reply }])

      if (!data.available) {
        setError(data.reply)
      }
    } catch (e) {
      setError(e.message)
      setMessages(prev => [...prev, {
        role: 'model',
        content: `Error: ${e.message}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (reportLoading) return
    setReportLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/copilot/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Generate due-diligence report',
          analysis,
          history: [],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: 'user', content: 'Generate due-diligence report' },
        { role: 'model', content: data.reply },
      ])

      if (!data.available) {
        setError(data.reply)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setReportLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-[#0E4A8A] to-blue-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">SiteVerdict AI Copilot</h3>
              <p className="text-xs text-blue-100">Powered by Gemini</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null) }}
              className="text-xs text-blue-100 hover:text-white transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="h-[400px] overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[#0E4A8A]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#0E4A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 mb-1">Ask about your site analysis</p>
            <p className="text-xs text-slate-400">The AI copilot interprets SiteVerdict results using Gemini</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-[#0E4A8A] text-white'
                : 'bg-slate-100 text-slate-800'
            }`}>
              <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                __html: formatMessage(msg.content)
              }} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-lg px-4 py-3 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>Analyzing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          {error}
        </div>
      )}

      {/* Suggested questions (shown before first message) */}
      {messages.length === 0 && !loading && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-400 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="px-3 py-1.5 text-xs text-[#0E4A8A] bg-[#0E4A8A]/5 border border-[#0E4A8A]/20
                  rounded-full hover:bg-[#0E4A8A]/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your site analysis..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-[#0E4A8A]/30 focus:border-[#0E4A8A]
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-slate-400"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-[#0E4A8A] text-white text-sm font-medium rounded-lg
              hover:bg-[#0c3d73] disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors shadow-sm"
          >
            Send
          </button>
          <button
            onClick={generateReport}
            disabled={reportLoading || loading}
            className="px-4 py-2.5 bg-slate-700 text-white text-sm font-medium rounded-lg
              hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors shadow-sm whitespace-nowrap"
          >
            {reportLoading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          AI responses are interpretations of SiteVerdict analysis data. Always verify critical decisions.
        </p>
      </div>
    </div>
  )
}

function formatMessage(text) {
  // Basic markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-200 px-1 rounded text-xs">$1</code>')
    .replace(/### (.*?)(?:\n|$)/g, '<h4 class="font-semibold text-sm mt-3 mb-1">$1</h4>')
    .replace(/## (.*?)(?:\n|$)/g, '<h3 class="font-semibold text-sm mt-4 mb-1">$1</h3>')
    .replace(/# (.*?)(?:\n|$)/g, '<h2 class="font-semibold text-base mt-4 mb-2">$1</h2>')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
}
