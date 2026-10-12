export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: string[];
  model?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  persona: string;
  systemPrompt?: string;
  pinned?: boolean;
  messages: ChatMessage[];
  documentIds?: string[];
}

export interface StoredDocument {
  id: string;
  title: string;
  content: string;
  size: number;
  type: string;
  createdAt: string;
  chunkCount: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
}

export interface AppSettings {
  model: string;
  temperature: number;
  persona: string;
  customSystemPrompt: string;
  streaming: boolean;
  topK: number;
  theme: 'dark' | 'light';
  speechVoice: boolean;
}

export interface PersonaConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  badgeColor: string;
}
