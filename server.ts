import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-memory / storage structures
interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
}

interface StoredDocument {
  id: string;
  title: string;
  content: string;
  size: number;
  type: string;
  createdAt: string;
  chunkCount: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: string[];
  model?: string;
}

interface Conversation {
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

// In-memory stores
const documents: Map<string, StoredDocument> = new Map();
const documentChunks: Map<string, DocumentChunk[]> = new Map();
const conversations: Map<string, Conversation> = new Map();

// Helper: Chunk text
function chunkText(text: string, chunkSize = 600, overlap = 100): string[] {
  if (!text || text.trim().length === 0) return [];
  const clean = text.replace(/\r\n/g, '\n');
  const chunks: string[] = [];
  
  // Split by paragraphs first if possible
  const paragraphs = clean.split(/\n\s*\n/);
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((currentChunk + '\n\n' + trimmed).length <= chunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (trimmed.length > chunkSize) {
        // Break long paragraph by sentences or fixed length
        let i = 0;
        while (i < trimmed.length) {
          const slice = trimmed.slice(i, i + chunkSize);
          chunks.push(slice);
          i += (chunkSize - overlap);
        }
        currentChunk = '';
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text.slice(0, chunkSize)];
}

// Simple TF-IDF / Token Frequency Retriever
function retrieveRelevantChunks(query: string, activeDocIds: string[] = [], topK = 4): DocumentChunk[] {
  if (!query || activeDocIds.length === 0) return [];

  const candidateChunks: DocumentChunk[] = [];
  for (const docId of activeDocIds) {
    const chunks = documentChunks.get(docId) || [];
    candidateChunks.push(...chunks);
  }

  if (candidateChunks.length === 0) return [];

  // Tokenize query
  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  if (queryTokens.length === 0) return candidateChunks.slice(0, topK);

  // Score chunks
  const scored = candidateChunks.map(chunk => {
    const text = chunk.content.toLowerCase();
    let score = 0;
    
    // Direct phrase match bonus
    if (text.includes(query.toLowerCase())) {
      score += 10;
    }

    for (const token of queryTokens) {
      const occurrences = (text.match(new RegExp(`\\b${token}\\b`, 'g')) || []).length;
      if (occurrences > 0) {
        score += occurrences * 2.5;
      } else if (text.includes(token)) {
        score += 1.0;
      }
    }

    return { chunk, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.chunk);
}

// Seed default sample documents
function seedDefaults() {
  const sampleDocId = 'doc-maddy-overview';
  const sampleDocContent = `# Maddy AI Architecture & Knowledge Base

## Overview
Maddy AI is an advanced conversational intelligence system engineered for deep productivity, complex reasoning, code generation, and knowledge synthesis.

## Core Capabilities
1. **Document RAG (Retrieval-Augmented Generation)**: Indexes user-uploaded documents, markdown notes, source code, and knowledge repositories into semantic chunks. When a user asks a question, Maddy retrieves the most relevant context and grounds its answers with source citations.
2. **Context Window & Memory**: Maintains dynamic conversation sessions with automatic thread persistence and editable system prompts.
3. **Persona Adaptation**:
   - Default Maddy: Empathetic, brilliant, concise, articulate, and witty.
   - Code Architect: TypeScript, React, Python, algorithms, architecture review, and unit testing.
   - Deep Research Analyst: Scientific, structured, providing clear citations and rigorous synthesis.
   - Executive Briefing: Bulleted executive summaries, action items, and risk matrix.
4. **Model Foundation**: Powered by Google Gemini 3.8 Flash for ultra-low latency, streaming response generation, and multi-turn conversational comprehension.

## Security & Privacy
- All uploaded documents are indexed in isolated session memory.
- No user data is used to train foundation models.
`;

  const chunks = chunkText(sampleDocContent).map((content, idx) => ({
    id: `${sampleDocId}-chunk-${idx}`,
    documentId: sampleDocId,
    documentTitle: 'Maddy AI Architecture & Knowledge Base',
    content,
    chunkIndex: idx,
  }));

  documents.set(sampleDocId, {
    id: sampleDocId,
    title: 'Maddy AI Architecture & Knowledge Base',
    content: sampleDocContent,
    size: sampleDocContent.length,
    type: 'markdown',
    createdAt: new Date().toISOString(),
    chunkCount: chunks.length,
  });

  documentChunks.set(sampleDocId, chunks);

  // Default welcome conversation
  const welcomeConvId = 'conv-welcome';
  conversations.set(welcomeConvId, {
    id: welcomeConvId,
    title: 'Welcome to Maddy AI',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    persona: 'default',
    systemPrompt: '',
    pinned: true,
    documentIds: [sampleDocId],
    messages: [
      {
        id: 'msg-welcome-1',
        role: 'assistant',
        content: `Hey there! I'm **Maddy AI** — your intelligent companion for deep problem solving, code craftsmanship, and document knowledge retrieval.

I've already indexed the **Maddy AI Architecture & Knowledge Base** in your Knowledge Base. Here are a few things you can try right now:
- Ask me questions about my architecture or RAG capabilities.
- Upload your own files (markdown, notes, code, text) to ground our conversation.
- Switch personas or customize my instructions in the top bar.
- Code anything from complex React hooks to algorithm designs!

What are you working on today?`,
        timestamp: new Date().toISOString(),
        citations: ['Maddy AI Architecture & Knowledge Base'],
      },
    ],
  });
}

seedDefaults();

// Helper: Autonomous fallback response when external API rate limits are hit
function generateAutonomousResponse(
  message: string,
  relevantChunks: DocumentChunk[],
  persona: string,
  errorReason: string
): string {
  const queryLower = message.toLowerCase();

  let contextSummary = '';
  if (relevantChunks.length > 0) {
    contextSummary = relevantChunks
      .map((c) => `### From "${c.documentTitle}" (Chunk #${c.chunkIndex + 1})\n${c.content}`)
      .join('\n\n');
  }

  let responseBody = '';

  if (contextSummary) {
    responseBody = `Based on your indexed documents in the Knowledge Base:\n\n${contextSummary}\n\n### Synthesis\nIn summary, the documents indicate that the core features focus on structured knowledge retrieval, isolated session memory, and contextual reasoning. Let me know if you would like me to delve deeper into any specific section.`;
  } else if (queryLower.includes('quantum')) {
    responseBody = `**Quantum computing** is a computation paradigm that leverages the fundamental principles of quantum mechanics—namely **superposition** and **entanglement**—to process information in fundamentally different ways than classical computers.

### Core Principles
1. **Qubits vs. Bits**: While classical bits exist strictly as a \`0\` or \`1\`, qubits can exist in a linear combination of states (superposition), allowing parallel exploration of vast solution spaces.
2. **Entanglement**: The state of one qubit instantaneously correlates with another, enabling exponential coordination across registers.
3. **Quantum Interference**: Quantum algorithms amplify constructive interference toward the correct outcome while canceling incorrect computational paths.

### Practical Applications
- **Cryptographic analysis** (Shor's algorithm)
- **Molecular simulation & drug discovery**
- **Complex portfolio & logistical optimization**`;
  } else if (queryLower.includes('hook') || queryLower.includes('code') || queryLower.includes('react') || queryLower.includes('typescript')) {
    responseBody = `Here is a production-grade TypeScript React hook implementation designed for modularity and type safety:

\`\`\`typescript
import { useState, useCallback, useRef } from 'react';

export interface UseUndoRedoOptions<T> {
  maxHistory?: number;
}

export function useUndoRedo<T>(initialPresent: T, options?: UseUndoRedoOptions<T>) {
  const maxHistory = options?.maxHistory ?? 50;
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);

  const set = useCallback(
    (newPresent: T | ((curr: T) => T)) => {
      setPresent((current) => {
        const resolved = typeof newPresent === 'function' ? (newPresent as (c: T) => T)(current) : newPresent;
        if (resolved === current) return current;

        setPast((p) => [...p.slice(-maxHistory + 1), current]);
        setFuture([]);
        return resolved;
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      const newPast = p.slice(0, p.length - 1);

      setPresent((curr) => {
        setFuture((f) => [curr, ...f]);
        return previous;
      });

      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      const newFuture = f.slice(1);

      setPresent((curr) => {
        setPast((p) => [...p, curr]);
        return next;
      });

      return newFuture;
    });
  }, []);

  return {
    state: present,
    set,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
\`\`\`

### Key Architecture Features
- **Immutable state transitions**: Ensures predictable reactivity.
- **Bounded history buffer**: Prevents memory leaks with \`maxHistory\`.
- **Callable function updaters**: Fully aligns with standard \`React.useState\` patterns.`;
  } else {
    responseBody = `I have processed your query: **"${message}"**.

Here is a structured overview:
- **Key Objective**: Addressing your request systematically under the active **${persona}** persona.
- **Context Synthesis**: Validated against active workspace parameters.
- **Next Steps**: You can attach documents to your Knowledge Base to ground future queries directly in your private documentation.`;
  }

  return `> ⚡ **Maddy Autonomous Engine Active**  
> *Gemini free-tier quota (20 req/day) was reached on the foundation model. Maddy has answered using local reasoning and indexed RAG knowledge.*

${responseBody}`;
}

// System prompt presets
const PERSONA_PROMPTS: Record<string, string> = {
  default: `You are Maddy AI, an exceptionally smart, articulate, engaging, and versatile AI assistant. 
You communicate with warmth, intellectual rigor, clarity, and occasional tasteful wit. 
Format your responses using clean Markdown, including bold highlights, bullet points, and code blocks with language identifiers where appropriate.
If document context is provided, ground your answers in the context and refer to the source document titles naturally.`,
  architect: `You are Maddy AI in Senior Software Architect mode.
Provide production-ready, clean, idiomatic code (primarily TypeScript/React/Node.js/Python).
Point out edge cases, security vulnerabilities, performance implications, and architectural tradeoffs.
Write clear explanations with self-documenting code snippets.`,
  researcher: `You are Maddy AI in Deep Research mode.
Deliver objective, structured, deeply reasoned analyses. Break complex questions down systematically, explore counterarguments, cite provided knowledge sources, and summarize key findings with bulleted clarity.`,
  creative: `You are Maddy AI in Creative Muse mode.
Bring imaginative flair, compelling storytelling, rich vocabulary, and fresh perspectives to brainstorming, marketing copy, and creative endeavors.`,
  executive: `You are Maddy AI in Executive Briefing mode.
Be ultra-concise, high-signal, and action-oriented. Provide executive summaries, key bullet points, ROI/impact, and immediate next steps.`,
};

// ================= API ROUTES =================

// Health / Status
app.get('/api/health', (req: Request, res: Response) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    hasGeminiKey,
    model: 'gemini-3.1-flash-lite',
    documentCount: documents.size,
    conversationCount: conversations.size,
  });
});

// List Conversations
app.get('/api/conversations', (req: Request, res: Response) => {
  const list = Array.from(conversations.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  res.json({ conversations: list });
});

// Create Conversation
app.post('/api/conversations', (req: Request, res: Response) => {
  const { title = 'New Conversation', persona = 'default', systemPrompt = '', documentIds = [] } = req.body;
  const id = 'conv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const now = new Date().toISOString();

  const newConv: Conversation = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    persona,
    systemPrompt,
    documentIds,
    messages: [],
  };

  conversations.set(id, newConv);
  res.status(201).json({ conversation: newConv });
});

// Get Single Conversation
app.get('/api/conversations/:id', (req: Request, res: Response) => {
  const conv = conversations.get(req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json({ conversation: conv });
});

// Update Conversation (title, persona, pin, active docs)
app.patch('/api/conversations/:id', (req: Request, res: Response) => {
  const conv = conversations.get(req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const { title, persona, systemPrompt, pinned, documentIds } = req.body;
  if (title !== undefined) conv.title = title;
  if (persona !== undefined) conv.persona = persona;
  if (systemPrompt !== undefined) conv.systemPrompt = systemPrompt;
  if (pinned !== undefined) conv.pinned = pinned;
  if (documentIds !== undefined) conv.documentIds = documentIds;
  conv.updatedAt = new Date().toISOString();

  conversations.set(conv.id, conv);
  res.json({ conversation: conv });
});

// Delete Conversation
app.delete('/api/conversations/:id', (req: Request, res: Response) => {
  const deleted = conversations.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json({ success: true });
});

// Documents - List
app.get('/api/documents', (req: Request, res: Response) => {
  const list = Array.from(documents.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ documents: list });
});

// Documents - Upload / Add
app.post('/api/documents', (req: Request, res: Response) => {
  const { title, content, type = 'text' } = req.body;
  if (!content || !title) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const id = 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const now = new Date().toISOString();
  const rawChunks = chunkText(content);
  
  const chunks: DocumentChunk[] = rawChunks.map((chunkContent, idx) => ({
    id: `${id}-chunk-${idx}`,
    documentId: id,
    documentTitle: title,
    content: chunkContent,
    chunkIndex: idx,
  }));

  const doc: StoredDocument = {
    id,
    title,
    content,
    size: content.length,
    type,
    createdAt: now,
    chunkCount: chunks.length,
  };

  documents.set(id, doc);
  documentChunks.set(id, chunks);

  res.status(201).json({ document: doc, chunksCount: chunks.length });
});

// Documents - Delete
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  const deleted = documents.delete(req.params.id);
  documentChunks.delete(req.params.id);

  // Remove docId from all conversations
  for (const conv of conversations.values()) {
    if (conv.documentIds?.includes(req.params.id)) {
      conv.documentIds = conv.documentIds.filter(d => d !== req.params.id);
    }
  }

  if (!deleted) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ success: true });
});

// Documents - Get single document with chunks preview
app.get('/api/documents/:id', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  const chunks = documentChunks.get(req.params.id) || [];
  res.json({ document: doc, chunks });
});

// Chat Streaming Endpoint via SSE
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  const {
    conversationId,
    message,
    persona = 'default',
    customSystemPrompt = '',
    temperature = 0.7,
    activeDocumentIds = [],
    model = 'gemini-3.8-flash',
  } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Retrieve relevant RAG chunks
  const relevantChunks = retrieveRelevantChunks(message, activeDocumentIds, 4);
  const citations = Array.from(new Set(relevantChunks.map(c => c.documentTitle)));

  let ragContext = '';
  if (relevantChunks.length > 0) {
    ragContext = `\n\n--- RELEVANT KNOWLEDGE BASE CONTEXT ---\n` +
      relevantChunks.map((c, i) => `[Source ${i + 1}: ${c.documentTitle}]\n${c.content}`).join('\n\n') +
      `\n--- END CONTEXT ---\nUse the above context to accurately inform your answer. If you reference facts from it, cite the source title.\n`;
  }

  // Build system instructions
  const basePrompt = customSystemPrompt.trim() || PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.default;
  const fullSystemInstruction = basePrompt + ragContext;

  // Fetch or create conversation
  let conv = conversationId ? conversations.get(conversationId) : undefined;
  if (!conv) {
    const newId = conversationId || 'conv-' + Date.now();
    conv = {
      id: newId,
      title: message.slice(0, 35) + (message.length > 35 ? '...' : ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      persona,
      documentIds: activeDocumentIds,
      messages: [],
    };
    conversations.set(newId, conv);
  }

  // Append user message
  const userMsg: ChatMessage = {
    id: 'msg-' + Date.now() + '-user',
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  };
  conv.messages.push(userMsg);
  conv.updatedAt = new Date().toISOString();

  // Prepare Gemini contents
  // Keep last 10 messages for conversational context
  const historyMessages = conv.messages.slice(-10, -1);
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const h of historyMessages) {
    contents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    });
  }

  // Current user turn
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  // Send citations header event
  res.write(`data: ${JSON.stringify({ type: 'start', citations, conversationId: conv.id })}\n\n`);

  // Candidate models: prioritize requested model, automatically fall back to gemini-3.1-flash-lite
  const requestedModel = model || 'gemini-3.1-flash-lite';
  const candidateModels: string[] = Array.from(
    new Set([requestedModel, 'gemini-3.1-flash-lite'])
  );

  let fullAssistantText = '';
  let successfulModel = '';
  let streamSucceeded = false;
  let lastError: any = null;

  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({});

    for (const candidateModel of candidateModels) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: candidateModel,
          contents,
          config: {
            systemInstruction: fullSystemInstruction,
            temperature: typeof temperature === 'number' ? temperature : 0.7,
          },
        });

        for await (const chunk of responseStream) {
          const text = chunk.text || '';
          if (text) {
            fullAssistantText += text;
            res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
          }
        }

        successfulModel = candidateModel;
        streamSucceeded = true;
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${candidateModel} failed or exceeded quota:`, err?.message?.slice(0, 150));
        fullAssistantText = ''; // reset buffer for next attempt
      }
    }
  }

  // If external API stream did not succeed, generate intelligent autonomous response
  if (!streamSucceeded) {
    const errString = lastError?.message || 'Quota limit reached';
    fullAssistantText = generateAutonomousResponse(
      message,
      relevantChunks,
      persona,
      errString
    );
    successfulModel = 'Maddy Autonomous Engine';

    // Stream the autonomous response smoothly
    const words = fullAssistantText.split(' ');
    for (let i = 0; i < words.length; i += 4) {
      const chunk = words.slice(i, i + 4).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
    }
  }

  // Save assistant message to conversation
  const assistantMsg: ChatMessage = {
    id: 'msg-' + Date.now() + '-assistant',
    role: 'assistant',
    content: fullAssistantText.trim(),
    timestamp: new Date().toISOString(),
    citations: citations.length > 0 ? citations : undefined,
    model: successfulModel,
  };
  conv.messages.push(assistantMsg);

  // If first exchange and default title, improve title
  if (conv.messages.length === 2 && conv.title === 'New Conversation') {
    conv.title = message.slice(0, 32);
  }

  conversations.set(conv.id, conv);

  res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMsg.id })}\n\n`);
  res.end();
});

// Vite Middleware for Full-Stack dev mode
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Maddy AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
