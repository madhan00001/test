import { Conversation, StoredDocument, DocumentChunk } from '../types';

export const api = {
  async getHealth(): Promise<{
    status: string;
    hasGeminiKey: boolean;
    model: string;
    documentCount: number;
    conversationCount: number;
  }> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getConversations(): Promise<Conversation[]> {
    const res = await fetch('/api/conversations');
    if (!res.ok) throw new Error('Failed to fetch conversations');
    const data = await res.json();
    return data.conversations || [];
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) throw new Error('Conversation not found');
    const data = await res.json();
    return data.conversation;
  },

  async createConversation(payload: {
    title?: string;
    persona?: string;
    systemPrompt?: string;
    documentIds?: string[];
  }): Promise<Conversation> {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    const data = await res.json();
    return data.conversation;
  },

  async updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<Conversation> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update conversation');
    const data = await res.json();
    return data.conversation;
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
  },

  async getDocuments(): Promise<StoredDocument[]> {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    return data.documents || [];
  },

  async getDocument(
    id: string
  ): Promise<{ document: StoredDocument; chunks: DocumentChunk[] }> {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document');
    return res.json();
  },

  async uploadDocument(doc: {
    title: string;
    content: string;
    type?: string;
  }): Promise<StoredDocument> {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new Error('Failed to upload document');
    const data = await res.json();
    return data.document;
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  async streamChat({
    conversationId,
    message,
    persona,
    customSystemPrompt,
    temperature,
    activeDocumentIds,
    model,
    signal,
    onStart,
    onChunk,
    onDone,
    onError,
  }: {
    conversationId?: string;
    message: string;
    persona?: string;
    customSystemPrompt?: string;
    temperature?: number;
    activeDocumentIds?: string[];
    model?: string;
    signal?: AbortSignal;
    onStart?: (data: { citations: string[]; conversationId: string }) => void;
    onChunk?: (text: string) => void;
    onDone?: (data: { messageId: string }) => void;
    onError?: (err: Error) => void;
  }) {
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message,
          persona,
          customSystemPrompt,
          temperature,
          activeDocumentIds,
          model,
        }),
        signal,
      });

      if (!res.ok) {
        throw new Error(`Chat request failed: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream available');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === 'start') {
                onStart?.(data);
              } else if (data.type === 'chunk') {
                onChunk?.(data.text);
              } else if (data.type === 'done') {
                onDone?.(data);
              }
            } catch (e) {
              console.warn('Error parsing SSE event:', e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError?.(err);
      }
    }
  },
};
