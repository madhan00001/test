import React, { useState, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { DocumentsModal } from './components/DocumentsModal';
import { SettingsModal } from './components/SettingsModal';
import { AppSettings } from './types';
import { PERSONAS } from './config/personas';

const DEFAULT_SETTINGS: AppSettings = {
  model: 'gemini-3.1-flash-lite',
  temperature: 0.7,
  persona: 'default',
  customSystemPrompt: '',
  streaming: true,
  topK: 4,
  theme: 'dark',
  speechVoice: true,
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('maddy_ai_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const {
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
  } = useChat(settings);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('maddy_ai_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('maddy_ai_settings', JSON.stringify(DEFAULT_SETTINGS));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsDocumentsModalOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewConversation();
      }
      if (e.key === 'Escape') {
        setIsDocumentsModalOpen(false);
        setIsSettingsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activePersonaConfig =
    PERSONAS.find((p) => p.id === settings.persona) || PERSONAS[0];

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
        onTogglePinConversation={togglePinConversation}
        documents={documents}
        onOpenDocuments={() => setIsDocumentsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        hasGeminiKey={hasGeminiKey}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header
          conversation={activeConversation}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenDocuments={() => setIsDocumentsModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onClearMessages={clearCurrentMessages}
          activeDocCount={activeDocIds.length}
        />

        <ChatWindow
          messages={activeConversation?.messages || []}
          isStreaming={isStreaming}
          onSendMessage={sendMessage}
          onRegenerate={regenerateLast}
          persona={activePersonaConfig}
          activeDocCount={activeDocIds.length}
          speechEnabled={settings.speechVoice}
        />

        <MessageInput
          onSendMessage={sendMessage}
          isStreaming={isStreaming}
          onStopGeneration={stopGeneration}
          onOpenDocuments={() => setIsDocumentsModalOpen(true)}
          activeDocCount={activeDocIds.length}
          model={settings.model}
        />
      </div>

      {/* Knowledge Base Modal */}
      <DocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        documents={documents}
        activeDocumentIds={activeDocIds}
        onToggleActiveDocument={toggleActiveDocument}
        onDocumentsChange={refreshData}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
      />
    </div>
  );
}
