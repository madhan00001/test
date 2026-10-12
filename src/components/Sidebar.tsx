import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Layers,
  Settings,
  Trash2,
  Pin,
  PinOff,
  Edit2,
  Check,
  Search,
  Sparkles,
  Database,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Conversation, StoredDocument } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  documents: StoredDocument[];
  onOpenDocuments: () => void;
  onOpenSettings: () => void;
  hasGeminiKey: boolean;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  documents,
  onOpenDocuments,
  onOpenSettings,
  hasGeminiKey,
  isOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedConversations = filteredConversations.filter((c) => c.pinned);
  const recentConversations = filteredConversations.filter((c) => !c.pinned);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const submitRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-slate-950/95 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="p-4 border-b border-slate-800/80">
          <Logo />
        </div>

        {/* Action Buttons: New Chat & Search */}
        <div className="p-3 space-y-2 border-b border-slate-800/80">
          <button
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span>New Conversation</span>
            </div>
            <kbd className="hidden md:inline-flex text-[10px] bg-indigo-800/60 px-1.5 py-0.5 rounded text-indigo-200 font-mono">
              ⌘N
            </kbd>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Pinned */}
          {pinnedConversations.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-2 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Pin className="w-3 h-3 text-indigo-400" />
                <span>Pinned</span>
              </div>
              <div className="space-y-1">
                {pinnedConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === activeConversationId}
                    isEditing={conv.id === editingId}
                    editingTitle={editingTitle}
                    setEditingTitle={setEditingTitle}
                    onSelect={() => {
                      onSelectConversation(conv.id);
                      onCloseMobile();
                    }}
                    onRename={submitRename}
                    onStartRename={(e) => startRename(conv, e)}
                    onTogglePin={(e) => {
                      e.stopPropagation();
                      onTogglePinConversation(conv.id);
                    }}
                    onDelete={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recents */}
          <div>
            <div className="px-2 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Recent Chats ({recentConversations.length})</span>
            </div>
            {recentConversations.length === 0 && pinnedConversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No conversations yet.
              </div>
            ) : (
              <div className="space-y-1">
                {recentConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === activeConversationId}
                    isEditing={conv.id === editingId}
                    editingTitle={editingTitle}
                    setEditingTitle={setEditingTitle}
                    onSelect={() => {
                      onSelectConversation(conv.id);
                      onCloseMobile();
                    }}
                    onRename={submitRename}
                    onStartRename={(e) => startRename(conv, e)}
                    onTogglePin={(e) => {
                      e.stopPropagation();
                      onTogglePinConversation(conv.id);
                    }}
                    onDelete={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer shortcuts: Documents & Settings */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-1.5">
          {/* Knowledge Base Button */}
          <button
            onClick={() => {
              onOpenDocuments();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 transition group"
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
              <span>Knowledge Base</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {documents.length} docs
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 transition"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Maddy Settings</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Engine Status */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              {hasGeminiKey ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Gemini Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-medium">Key Needed</span>
                </>
              )}
            </div>
            <span className="text-slate-500 font-mono text-[10px]">RAG active</span>
          </div>
        </div>
      </aside>
    </>
  );
};

interface ConversationItemProps {
  conv: Conversation;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  setEditingTitle: (val: string) => void;
  onSelect: () => void;
  onRename: (id: string) => void;
  onStartRename: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conv,
  isActive,
  isEditing,
  editingTitle,
  setEditingTitle,
  onSelect,
  onRename,
  onStartRename,
  onTogglePin,
  onDelete,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition select-none ${
        isActive
          ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-xs'
          : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
        <MessageSquare
          className={`w-3.5 h-3.5 shrink-0 ${
            isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'
          }`}
        />
        {isEditing ? (
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={() => onRename(conv.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRename(conv.id);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-slate-950 px-1 py-0.5 rounded text-white text-xs border border-indigo-500 outline-none"
          />
        ) : (
          <span className="truncate">{conv.title || 'Untitled Chat'}</span>
        )}
      </div>

      {/* Action buttons on hover */}
      <div
        className={`flex items-center gap-1 shrink-0 ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } transition`}
      >
        <button
          onClick={onTogglePin}
          className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
          title={conv.pinned ? 'Unpin' : 'Pin to top'}
        >
          {conv.pinned ? <PinOff className="w-3 h-3 text-indigo-400" /> : <Pin className="w-3 h-3" />}
        </button>
        <button
          onClick={onStartRename}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Rename"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
