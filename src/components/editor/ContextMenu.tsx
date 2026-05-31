// src/components/editor/ContextMenu.tsx
import React, { useEffect, useRef } from 'react';
import { Info, LoaderIcon, Trash2 } from 'lucide-react';
import { ContextMenuState } from '../../types/types';

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  onItemClick: (action: 'info' | 'activate' | 'remove' | 'loadToTimeline') => void;
  activeFileId: string | null;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  onItemClick,
  activeFileId,
}) => {
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!contextMenu.visible || !menuRef.current) return;
    
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    let { x, y } = contextMenu;
    
    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 10;
    }
    if (y + rect.height > window.innerHeight) {
      y = window.innerHeight - rect.height - 10;
    }
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }, [contextMenu]);

  if (!contextMenu.visible || !contextMenu.file) return null;

  return (
    <ul
      ref={menuRef}
      className="fixed bg-app-surface border border-app-border rounded-md shadow-lg py-1 z-50 min-w-[160px]"
      style={{ position: 'fixed' }}
    >
      <li
        className="flex items-center px-4 py-2 hover:bg-app-gray-light cursor-pointer text-sm"
        onClick={() => onItemClick('info')}
      >
        <Info size={16} className="mr-2" /> File Info
      </li>
      <li
        className="flex items-center px-4 py-2 hover:bg-app-gray-light cursor-pointer text-sm"
        onClick={() => onItemClick('activate')}
      >
        <LoaderIcon size={16} className="mr-2" />
        {activeFileId === contextMenu.file.id ? "Reload in timeline" : "Load into timeline"}
      </li>
      <li
        className="flex items-center px-4 py-2 hover:bg-danger hover:text-white cursor-pointer text-sm"
        onClick={() => onItemClick('remove')}
      >
        <Trash2 size={16} className="mr-2" /> Delete
      </li>
    </ul>
  );
};