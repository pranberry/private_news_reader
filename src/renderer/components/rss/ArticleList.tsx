import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Article } from '../../../shared/types';

interface ArticleListProps {
  articles: Article[];
  selectedArticleId: number | null;
  onSelectArticle: (id: number) => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function ArticleList({ articles, selectedArticleId, onSelectArticle }: ArticleListProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPending = () => {
    if (showTimeout.current) {
      clearTimeout(showTimeout.current);
      showTimeout.current = null;
    }
  };

  if (articles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4 text-center">
        No articles yet. Add a feed or hit refresh.
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      onMouseLeave={() => { cancelPending(); setTooltip(null); }}
    >
      {articles.map(article => {
        const isSelected = article.id === selectedArticleId;
        return (
          <button
            key={article.id}
            onClick={() => onSelectArticle(article.id)}
            data-article-id={article.id}
            onMouseEnter={(e) => {
              cancelPending();
              setTooltip(null);

              // Detect clamping via Range: measures true text height including
              // hidden overflow, which is reliable in production Electron builds
              // where scrollHeight === clientHeight even when text is clamped.
              const titleEl = e.currentTarget.querySelector<HTMLElement>('[data-title]');
              if (!titleEl) return;
              const range = document.createRange();
              range.selectNodeContents(titleEl);
              const textHeight = range.getBoundingClientRect().height;
              const elHeight = titleEl.getBoundingClientRect().height;
              if (textHeight <= elHeight + 1) return;

              const text = article.title || '(untitled)';
              const x = e.clientX;
              const y = e.clientY;
              showTimeout.current = setTimeout(() => {
                setTooltip({ text, x, y });
              }, 1000);
            }}
            onMouseMove={(e) => {
              setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
            }}
            className={`w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-gray-800/50 transition-all block relative ${
              isSelected
                ? 'bg-blue-50 dark:bg-blue-900/30'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            } ${article.isRead ? 'opacity-60' : ''}`}
          >
            {isSelected && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
            )}
            {/* Title row */}
            <div
              data-title
              className={`text-[13px] leading-snug mb-1 ${
                article.isRead ? 'font-normal' : 'font-semibold'
              }`}
              style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {article.isStarred && <span className="text-yellow-500 mr-1">*</span>}
              {article.title || '(untitled)'}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              {article.author && (
                <span className="truncate max-w-[120px]">{article.author}</span>
              )}
              <span className="flex-shrink-0">{timeAgo(article.publishedAt)}</span>
            </div>
          </button>
        );
      })}

      {tooltip && createPortal(
        <div
          className="fixed z-[9999] px-2 py-1.5 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg pointer-events-none leading-snug"
          style={{ left: tooltip.x + 16, top: tooltip.y + 8, maxWidth: '280px', wordBreak: 'break-word' }}
        >
          {tooltip.text}
        </div>,
        document.body
      )}
    </div>
  );
}
