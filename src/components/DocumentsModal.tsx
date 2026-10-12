import React, { useState } from 'react';
import {
  X,
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  Layers,
  Search,
  Plus,
  Eye,
  FileCode,
  File,
  AlertCircle
} from 'lucide-react';
import { StoredDocument, DocumentChunk } from '../types';
import { api } from '../services/api';

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: StoredDocument[];
  activeDocumentIds: string[];
  onToggleActiveDocument: (docId: string) => void;
  onDocumentsChange: () => void;
}

export const DocumentsModal: React.FC<DocumentsModalProps> = ({
  isOpen,
  onClose,
  documents,
  activeDocumentIds,
  onToggleActiveDocument,
  onDocumentsChange,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadType, setUploadType] = useState('text');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ document: StoredDocument; chunks: DocumentChunk[] } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      setUploadContent(content || '');
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'md') setUploadType('markdown');
      else if (['js', 'ts', 'tsx', 'jsx', 'py', 'json', 'html', 'css'].includes(ext || '')) setUploadType('code');
      else setUploadType('text');
      setActiveTab('upload');
    };
    reader.readAsText(file);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadContent.trim()) {
      setErrorMsg('Please provide both a title and document content.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg('');
      const newDoc = await api.uploadDocument({
        title: uploadTitle.trim(),
        content: uploadContent.trim(),
        type: uploadType,
      });

      // Auto-activate uploaded doc
      onToggleActiveDocument(newDoc.id);
      onDocumentsChange();

      // Reset form
      setUploadTitle('');
      setUploadContent('');
      setActiveTab('list');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to index document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this document from the knowledge base?')) return;
    try {
      await api.deleteDocument(docId);
      onDocumentsChange();
      if (previewDoc?.document.id === docId) setPreviewDoc(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleOpenPreview = async (doc: StoredDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingPreview(true);
    try {
      const res = await api.getDocument(doc.id);
      setPreviewDoc(res);
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Knowledge Base & RAG Index
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  {documents.length} docs
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ground Maddy AI with your custom documents, notes, specifications, or codebase.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Indexed Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Document
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="relative w-48 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search index..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/70 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'list' ? (
            <>
              {filteredDocs.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-300">No documents found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No indexed content matched your query.'
                      : 'Upload notes, manuals, product specs, or code to start grounding Maddy AI in your data.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
                  >
                    <Upload className="w-4 h-4" />
                    Upload your first document
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-xs text-slate-400 flex items-center justify-between pb-1">
                    <span>Select which documents to include in active query context:</span>
                    <span>{activeDocumentIds.length} of {documents.length} linked</span>
                  </div>
                  {filteredDocs.map((doc) => {
                    const isActive = activeDocumentIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => onToggleActiveDocument(doc.id)}
                        className={`group p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isActive
                            ? 'bg-indigo-950/30 border-indigo-500/50 shadow-sm'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-4">
                          <div
                            className={`p-2 rounded-lg ${
                              isActive
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200'
                            }`}
                          >
                            {doc.type === 'code' ? (
                              <FileCode className="w-4 h-4" />
                            ) : doc.type === 'markdown' ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <File className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-white truncate flex items-center gap-2">
                              {doc.title}
                              {isActive && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">
                                  ACTIVE IN CHAT
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                              <span>{(doc.size / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{doc.chunkCount} RAG chunks</span>
                              <span>•</span>
                              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleOpenPreview(doc, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Preview Chunks"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                              isActive
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-700 bg-slate-900 group-hover:border-slate-500'
                            }`}
                          >
                            {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSaveDocument} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Quick File Select */}
              <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-center hover:border-indigo-500/60 transition group">
                <input
                  type="file"
                  id="doc-file-input"
                  onChange={handleFileUpload}
                  accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.py,.html,.css"
                  className="hidden"
                />
                <label
                  htmlFor="doc-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <Upload className="w-7 h-7 text-indigo-400 mb-2 group-hover:scale-110 transition" />
                  <span className="text-xs font-semibold text-white">
                    Click to browse or drop a file
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Supports Markdown, Text, JSON, CSV, Source Code files
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 Strategic Plan, API Documentation..."
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Format
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="text">Plain Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="code">Source Code</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Content (will be chunked and indexed)
                </label>
                <textarea
                  rows={8}
                  placeholder="Paste or write document text here..."
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  {isUploading ? 'Chunking & Indexing...' : 'Save & Index Document'}
                </button>
              </div>
            </form>
          )}

          {/* Chunk Preview Modal View */}
          {previewDoc && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white">{previewDoc.document.title}</h3>
                    <p className="text-xs text-slate-400">
                      {previewDoc.chunks.length} Chunks indexed in RAG memory
                    </p>
                  </div>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto py-4 space-y-3 flex-1">
                  {previewDoc.chunks.map((chunk, idx) => (
                    <div
                      key={chunk.id}
                      className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-indigo-400 font-sans font-semibold">
                        <span>Chunk #{idx + 1}</span>
                        <span>{chunk.content.length} characters</span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="px-4 py-2 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-white"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
