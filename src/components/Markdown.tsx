import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownProps {
  content: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  if (!content) return null;

  // Split into blocks (code blocks vs text blocks)
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      elements.push(
        <RenderTextBlock key={`text-${lastIndex}`} text={textBefore} />
      );
    }

    const language = match[1] || 'text';
    const code = match[2];
    elements.push(
      <CodeBlock key={`code-${match.index}`} language={language} code={code} />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.slice(lastIndex);
  if (remainingText.trim()) {
    elements.push(
      <RenderTextBlock key={`text-${lastIndex}`} text={remainingText} />
    );
  }

  return <div className="space-y-3 leading-relaxed text-sm md:text-base break-words">{elements}</div>;
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({
  language,
  code,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/90 shadow-lg text-slate-100 font-mono text-xs md:text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/50">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 transition"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto select-text font-mono leading-relaxed">
        <pre className="m-0 whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const RenderTextBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let currentTable: string[] = [];

  const flushList = (key: string) => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      renderedElements.push(
        <ul key={key} className="list-disc pl-5 my-2 space-y-1">
          {currentList.items.map((item, idx) => (
            <li key={idx}>
              <InlineFormat text={item} />
            </li>
          ))}
        </ul>
      );
    } else {
      renderedElements.push(
        <ol key={key} className="list-decimal pl-5 my-2 space-y-1">
          {currentList.items.map((item, idx) => (
            <li key={idx}>
              <InlineFormat text={item} />
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  const flushTable = (key: string) => {
    if (currentTable.length === 0) return;
    const rows = currentTable.map(r =>
      r.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
    );
    if (rows.length >= 2) {
      const headers = rows[0];
      const dataRows = rows.slice(2); // Skip separator row
      renderedElements.push(
        <div key={key} className="overflow-x-auto my-3 rounded-lg border border-slate-700/40">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-800/60 font-semibold border-b border-slate-700/50">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2">
                    <InlineFormat text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/30">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2">
                      <InlineFormat text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    currentTable = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Table line
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(`list-before-table-${index}`);
      currentTable.push(trimmed);
      return;
    } else if (currentTable.length > 0) {
      flushTable(`table-${index}`);
    }

    // Unordered List
    if (/^[-*+]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*+]\s+/, '');
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(itemText);
      } else {
        flushList(`list-switch-${index}`);
        currentList = { type: 'ul', items: [itemText] };
      }
      return;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(itemText);
      } else {
        flushList(`list-switch-${index}`);
        currentList = { type: 'ol', items: [itemText] };
      }
      return;
    }

    // If not in a list, flush any active list
    flushList(`list-flush-${index}`);

    // Headers
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h3 key={`h3-${index}`} className="text-base md:text-lg font-bold mt-4 mb-2 text-primary-400">
          <InlineFormat text={trimmed.replace(/^###\s+/, '')} />
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h2 key={`h2-${index}`} className="text-lg md:text-xl font-bold mt-4 mb-2 border-b border-slate-700/40 pb-1 text-slate-100">
          <InlineFormat text={trimmed.replace(/^##\s+/, '')} />
        </h2>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h1 key={`h1-${index}`} className="text-xl md:text-2xl font-black mt-4 mb-2 text-indigo-300">
          <InlineFormat text={trimmed.replace(/^#\s+/, '')} />
        </h1>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      renderedElements.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-4 border-indigo-500/70 pl-3 py-1 my-2 bg-indigo-950/20 rounded-r text-slate-300 italic"
        >
          <InlineFormat text={trimmed.replace(/^>\s+/, '')} />
        </blockquote>
      );
      return;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      renderedElements.push(<hr key={`hr-${index}`} className="my-4 border-slate-700/50" />);
      return;
    }

    // Regular paragraph
    if (trimmed) {
      renderedElements.push(
        <p key={`p-${index}`} className="my-1.5 leading-relaxed">
          <InlineFormat text={line} />
        </p>
      );
    }
  });

  flushList(`list-end`);
  flushTable(`table-end`);

  return <>{renderedElements}</>;
};

// Inline formatter for bold, italic, code, and links
const InlineFormat: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Split by inline code: `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return (
    <>
      {codeParts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs border border-slate-700/60 inline-block align-baseline"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        // Parse Bold (**text**), Italic (*text*), Links [text](url)
        return <FormatTextTokens key={i} text={part} />;
      })}
    </>
  );
};

const FormatTextTokens: React.FC<{ text: string }> = ({ text }) => {
  // Replace links: [title](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    const pre = text.slice(lastIdx, match.index);
    if (pre) parts.push(<FormatBoldItalic key={`pre-${lastIdx}`} text={pre} />);
    
    const linkTitle = match[1];
    const linkUrl = match[2];
    parts.push(
      <a
        key={`link-${match.index}`}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300 transition"
      >
        {linkTitle}
      </a>
    );
    lastIdx = match.index + match[0].length;
  }

  const post = text.slice(lastIdx);
  if (post) {
    parts.push(<FormatBoldItalic key={`post-${lastIdx}`} text={post} />);
  }

  return <>{parts}</>;
};

const FormatBoldItalic: React.FC<{ text: string }> = ({ text }) => {
  // Split on bold: **bold**
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length >= 4) {
          return (
            <strong key={bIdx} className="font-semibold text-slate-100">
              {bPart.slice(2, -2)}
            </strong>
          );
        }

        // Handle *italic*
        const italicParts = bPart.split(/(\*[^*]+\*)/g);
        return (
          <React.Fragment key={bIdx}>
            {italicParts.map((iPart, iIdx) => {
              if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) {
                return <em key={iIdx} className="italic text-slate-200">{iPart.slice(1, -1)}</em>;
              }
              return iPart;
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};
