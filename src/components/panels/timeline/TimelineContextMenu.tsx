// src/components/panels/timeline/TimelineContextMenu.tsx
import React, { useEffect, useRef } from 'react';
import { Copy, Scissors, Combine, Trash2, ClipboardPaste } from 'lucide-react';
import type { TimelineContextMenuProps } from './types';

export const TimelineContextMenu: React.FC<TimelineContextMenuProps> = ({
  contextMenu, onClose, onCopy, onPaste, onSplit, onMerge, onDelete, onDuplicate,
  hasCopiedClip, hasMultipleSelected,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.visible, onClose]);

  useEffect(() => {
    if (!contextMenu.visible || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    let { x, y } = contextMenu;
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }, [contextMenu]);

  if (!contextMenu.visible) return null;

  const showClipOptions = contextMenu.clipId || hasMultipleSelected;
  const showPasteOption = hasCopiedClip;
  if (!showClipOptions && !showPasteOption) return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-app-surface border border-app-border rounded-lg shadow-lg z-50 min-w-48 py-1"
      style={{ position: 'fixed' }}
    >
      {contextMenu.clipId && (
        <>
          <button
            className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2"
            onClick={() => { onCopy(contextMenu.clipId); onClose(); }}
          >
            <Copy size={14} /> Copy
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2"
            onClick={() => { onDuplicate(contextMenu.clipId); onClose(); }}
          >
            <Copy size={14} className="rotate-180" /> Duplicate
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2"
            onClick={() => { onSplit(contextMenu.clipId); onClose(); }}
          >
            <Scissors size={14} /> Split
          </button>
          <div className="border-t border-app-border my-1" />
        </>
      )}
      {hasMultipleSelected && (
        <button
          className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2"
          onClick={() => { onMerge(); onClose(); }}
        >
          <Combine size={14} /> Merge Selected
        </button>
      )}
      {showPasteOption && (
        <button
          className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2"
          onClick={() => { onPaste(contextMenu.timeAtClick); onClose(); }}
        >
          <ClipboardPaste size={14} /> Paste Here
        </button>
      )}
      {contextMenu.clipId && (
        <button
          className="w-full text-left px-4 py-2 hover:bg-app-gray-light text-red-400 flex items-center gap-2"
          onClick={() => { onDelete(contextMenu.clipId); onClose(); }}
        >
          <Trash2 size={14} /> Delete
        </button>
      )}
    </div>
  );
};
