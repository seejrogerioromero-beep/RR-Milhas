// Server-side AI helpers for the Skip Cloud backend (pb_hooks $ai endpoints).

import pb, { BACKEND_URL } from '@/lib/pocketbase/client'

export interface OpenAIChatResult {
  content: string
  model?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

export interface AgentCitation {
  id: string
  title?: string
  url?: string
  snippet?: string
}

export interface AgentChatResult {
  content: string
  citations?: AgentCitation[]
  agentId?: string
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  citations?: AgentCitation[]
}

export interface DisplayMessage {
  role: AgentMessage['role']
  content: string
  citations: AgentCitation[]
}

export interface OpenAIChatStreamChunk {
  delta?: string
  done?: boolean
}

export interface AgentChatStreamEvent {
  type: 'content' | 'citations' | 'done' | 'error'
  content?: string
  citations?: AgentCitation[]
  error?: string
}

export interface StreamAgentChatHandlers {
  onContent?: (delta: string) => void
  onCitations?: (citations: AgentCitation[]) => void
  onDone?: (result: AgentChatResult) => void
  onError?: (error: Error) => void
}

export interface StreamAgentChatResult extends AgentChatResult {
  aborted: boolean
}

/** Only messages the UI should render (drops empty assistant turns). */
export function displayableMessages(messages: AgentMessage[]): DisplayMessage[] {
  return messages
    .filter((m) => m.role !== 'system' && m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content, citations: m.citations || [] }))
}

/**
 * Streams an agent chat from the backend hook (`/backend/v1/ai/agent-chat`).
 * The request goes to the ABSOLUTE backend URL (pb.baseURL / VITE_POCKETBASE_URL),
 * never to the frontend origin — the SPA host does not proxy to the backend.
 * The backend proxies the LLM so no API key ever reaches the browser.
 */
export async function streamAgentChat(
  agentId: string,
  messages: AgentMessage[],
  handlers: StreamAgentChatHandlers = {},
  signal?: AbortSignal,
): Promise<StreamAgentChatResult> {
  const result: StreamAgentChatResult = { content: '', citations: [], agentId, aborted: false }

  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/backend/v1/ai/agent-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, messages }),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) {
      result.aborted = true
      return result
    }
    handlers.onError?.(err as Error)
    throw err
  }

  if (!response.ok || !response.body) {
    const error = new Error(`Falha na chamada do assistente (${response.status})`)
    handlers.onError?.(error)
    throw error
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const processLine = (line: string) => {
    if (!line.startsWith('data:')) return
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') return
    try {
      const event = JSON.parse(payload) as AgentChatStreamEvent
      switch (event.type) {
        case 'content':
          if (event.content) {
            result.content += event.content
            handlers.onContent?.(event.content)
          }
          break
        case 'citations':
          result.citations = event.citations || []
          handlers.onCitations?.(result.citations)
          break
        case 'error':
          handlers.onError?.(new Error(event.error || 'Erro no assistente'))
          break
        case 'done':
          handlers.onDone?.({ content: result.content, citations: result.citations, agentId })
          break
      }
    } catch {
      // ignore malformed keep-alive lines
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    lines.forEach(processLine)
  }
  if (buffer) processLine(buffer)

  return result
}
