// src/components/editor/ContextMenu.tsx
import React, { useEffect, useRef } from 'react';
import { Info, RotateCw, Trash2, Mic } from 'lucide-react';

interface ContextMenuProps {
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    type: string;
    file: any;
  };
  onItemClick: (action: string) => void;
  activeFileId: string | null;
  projectMode?: 'lyrics' | 'subtitles';
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  onItemClick,
  activeFileId,
  projectMode = 'subtitles',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onItemClick('close');
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.visible, onItemClick]);

  if (!contextMenu.visible || !contextMenu.file) return null;

  const isLoaded = contextMenu.file.loaded; // Check if the media is loaded
  const isActive = contextMenu.file.id === activeFileId;
  
  const transcribeLabel =
    projectMode === 'lyrics' ? 'Transcribe to Lyrics' : 'Transcribe to Subtitles';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] overflow-hidden rounded-lg border border-app-border bg-app-surface/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: Math.min(contextMenu.y, window.innerHeight - 200),
        left: Math.min(contextMenu.x, window.innerWidth - 220),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-0.5">
        <button
          onClick={() => onItemClick('info')}
          className="group flex w-full items-center rounded-md px-3 py-2 text-sm text-app-text transition-colors hover:bg-app-gray-light"
        >
          <Info size={15} className="mr-2.5 text-app-gray group-hover:text-app-text" />
          File Info
        </button>

        <button
          onClick={() => onItemClick('activate')}
          className="group flex w-full items-center rounded-md px-3 py-2 text-sm text-app-text transition-colors hover:bg-app-gray-light"
        >
          <RotateCw size={15} className="mr-2.5 text-app-gray group-hover:text-app-text" />
          {isActive ? 'Reload in timeline' : 'Load into timeline'}
        </button>

        <div className="my-1 h-px bg-app-border/50" />

        {/* Transcribe Action - Disabled if not loaded */}
        <button
          onClick={() => onItemClick('transcribe')}
          disabled={!isLoaded}
          className={`group flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors ${
            isLoaded
              ? 'text-app-text hover:bg-app-gray-light'
              : 'text-app-gray/50 cursor-not-allowed opacity-60'
          }`}
          title={!isLoaded ? 'Load file into timeline first' : undefined}
        >
          <Mic
            size={15}
            className={`mr-2.5 ${
              isLoaded ? 'text-app-gray group-hover:text-app-text' : 'text-app-gray/50'
            }`}
          />
          {transcribeLabel}
        </button>

        <div className="my-1 h-px bg-app-border/50" />

        <button
          onClick={() => onItemClick('remove')}
          className="group flex w-full items-center rounded-md px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
        >
          <Trash2 size={15} className="mr-2.5 text-red-500" />
          Remove File
        </button>
      </div>
    </div>
  );
};