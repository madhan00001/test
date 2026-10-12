import { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, ChatMessage, StoredDocument, AppSettings } from '../types';
import { api } from '../services/api';

export function useChat(settings: AppSettings) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [activeDocIds, setActiveDocIds] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial health, conversations and documents
  const refreshData = useCallback(async () => {
    try {
      const [health, convs, docs] = await Promise.all([
        api.getHealth(),
        api.getConversations(),
        api.getDocuments(),
      ]);

      setHasGeminiKey(health.hasGeminiKey);
      setConversations(convs);
      setDocuments(docs);

      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
        setActiveDocIds(convs[0].documentIds || []);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, [activeConversationId]);

  useEffect(() => {
    refreshData();
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || null;

  // Sync activeDocIds when switching conversations
  useEffect(() => {
    if (activeConversation) {
      if (activeConversation.documentIds && activeConversation.documentIds.length > 0) {
        setActiveDocIds(activeConversation.documentIds);
      }
    }
  }, [activeConversationId]);

  // Create new conversation
  const createNewConversation = async () => {
    try {
      const newConv = await api.createConversation({
        title: 'New Conversation',
        persona: settings.persona,
        documentIds: activeDocIds,
      });
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      return newConv;
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  // Select conversation
  const selectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  // Rename conversation
  const renameConversation = async (id: string, newTitle: string) => {
    try {
      const updated = await api.updateConversation(id, { title: newTitle });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c))
      );
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  // Toggle pin conversation
  const togglePinConversation = async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    try {
      const updated = await api.updateConversation(id, { pinned: !conv.pinned });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinned: updated.pinned } : c))
      );
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Delete conversation
  const deleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConversationId === id) {
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Clear messages in current conversation
  const clearCurrentMessages = async () => {
    if (!activeConversation) return;
    try {
      await api.updateConversation(activeConversation.id, {
        messages: [],
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id ? { ...c, messages: [] } : c
        )
      );
    } catch (err) {
      console.error('Failed to clear messages:', err);
    }
  };

  // Toggle active document for current session RAG
  const toggleActiveDocument = async (docId: string) => {
    const nextIds = activeDocIds.includes(docId)
      ? activeDocIds.filter((id) => id !== docId)
      : [...activeDocIds, docId];

    setActiveDocIds(nextIds);

    if (activeConversation) {
      try {
        await api.updateConversation(activeConversation.id, {
          documentIds: nextIds,
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id ? { ...c, documentIds: nextIds } : c
          )
        );
      } catch (err) {
        console.error('Failed to update documentIds in conversation:', err);
      }
    }
  };

  // Stop Generation
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Send Message
  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    let targetConv = activeConversation;
    if (!targetConv) {
      targetConv = (await createNewConversation()) || null;
      if (!targetConv) return;
    }

    const convId = targetConv.id;
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-user',
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const tempAssistantMsgId = 'msg-' + Date.now() + '-temp-assistant';
    const tempAssistantMsg: ChatMessage = {
      id: tempAssistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
      model: settings.model,
    };

    // Optimistically update conversation in UI
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const updatedMessages = [...c.messages, userMsg, tempAssistantMsg];
          const newTitle =
            c.messages.length === 0 ? text.slice(0, 32) : c.title;
          return {
            ...c,
            title: newTitle,
            updatedAt: new Date().toISOString(),
            messages: updatedMessages,
          };
        }
        return c;
      })
    );

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    let streamedAssistantText = '';
    let citationsFound: string[] = [];

    await api.streamChat({
      conversationId: convId,
      message: text,
      persona: settings.persona,
      customSystemPrompt: settings.customSystemPrompt,
      temperature: settings.temperature,
      activeDocumentIds: activeDocIds,
      model: settings.model,
      signal: abortControllerRef.current.signal,
      onStart: (data) => {
        citationsFound = data.citations || [];
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              const msgs = c.messages.map((m) =>
                m.id === tempAssistantMsgId
                  ? { ...m, citations: citationsFound }
                  : m
              );
              return { ...c, messages: msgs };
            }
            return c;
          })
        );
      },
      onChunk: (chunk) => {
        streamedAssistantText += chunk;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              const msgs = c.messages.map((m) =>
                m.id === tempAssistantMsgId
                  ? { ...m, content: streamedAssistantText }
                  : m
              );
              return { ...c, messages: msgs };
            }
            return c;
          })
        );
      },
      onDone: (data) => {
        setIsStreaming(false);
        abortControllerRef.current = null;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              const msgs = c.messages.map((m) =>
                m.id === tempAssistantMsgId
                  ? {
                      ...m,
                      id: data.messageId || m.id,
                      isStreaming: false,
                    }
                  : m
              );
              return { ...c, messages: msgs };
            }
            return c;
          })
        );
      },
      onError: (err) => {
        console.error('Stream error:', err);
        setIsStreaming(false);
        abortControllerRef.current = null;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              const msgs = c.messages.map((m) =>
                m.id === tempAssistantMsgId
                  ? {
                      ...m,
                      content:
                        streamedAssistantText ||
                        'Sorry, an error occurred while streaming the response.',
                      isStreaming: false,
                    }
                  : m
              );
              return { ...c, messages: msgs };
            }
            return c;
          })
        );
      },
    });
  };

  // Regenerate last response
  const regenerateLast = () => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;
    if (msgs.length < 2) return;

    // Find the last user message
    let lastUserMsg: ChatMessage | null = null;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserMsg = msgs[i];
        break;
      }
    }

    if (!lastUserMsg) return;

    // Remove the last assistant message
    const trimmed = msgs.filter((m, idx) => !(idx === msgs.length - 1 && m.role === 'assistant'));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id ? { ...c, messages: trimmed } : c
      )
    );

    // Re-send the prompt
    sendMessage(lastUserMsg.content);
  };

  return {
    conversations,
    activeConversation,
    activeConversationId,
    documents,
    activeDocIds,
    isStreaming,
    hasGeminiKey,
    selectConversation,
    createNewConversation,
    renameConversation,
    togglePinConversation,
    deleteConversation,
    clearCurrentMessages,
    toggleActiveDocument,
    sendMessage,
    stopGeneration,
    regenerateLast,
    refreshData,
  };
}
