// src/components/panels/EditPanel/LyricsList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, Square, GripVertical, Trash2 } from 'lucide-react';
import { LyricLine } from '../../../types/types';
import { TimeInput } from './helpers';

interface LyricsListProps {
  list: LyricLine[];
  activeClipId: string | null;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  onChange: (id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => void;
  onDelete: (id: string) => void;
  listRef: React.RefObject<HTMLDivElement>;
}

export const LyricsList: React.FC<LyricsListProps> = ({
  list,
  activeClipId,
  selectedIds,
  toggleSelection,
  onChange,
  onDelete,
  listRef,
}) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'above' | 'below' } | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  useEffect(() => {
    textareaRefs.current.forEach((el) => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    });
  }, [list]);

  const handleTextareaChange = (id: string, value: string) => {
    onChange(id, 'text', value);
    const el = textareaRefs.current.get(id);
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemId === targetId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: 'above' | 'below' = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    setDropTarget({ id: targetId, position });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItemId || !dropTarget || draggedItemId === dropTarget.id) {
      setDraggedItemId(null);
      setDropTarget(null);
      return;
    }
    const dragged = list.find((i) => i.id === draggedItemId);
    const targetIndex = list.findIndex((i) => i.id === dropTarget.id);
    if (!dragged || targetIndex === -1) {
      setDraggedItemId(null);
      setDropTarget(null);
      return;
    }

    const target = list[targetIndex];
    const dur = dragged.endTime - dragged.startTime;
    let newStart = 0;

    if (dropTarget.position === 'above') {
      const prev = targetIndex > 0 ? list[targetIndex - 1] : null;
      if (prev && prev.id !== draggedItemId) {
        newStart = Math.max(prev.endTime + 0.1, (prev.endTime + target.startTime) / 2);
      } else {
        newStart = Math.max(0, target.startTime - dur - 0.5);
      }
    } else {
      const next = targetIndex < list.length - 1 ? list[targetIndex + 1] : null;
      if (next && next.id !== draggedItemId) {
        newStart = Math.max(target.endTime + 0.1, (target.endTime + next.startTime) / 2);
      } else {
        newStart = target.endTime + 0.5;
      }
    }

    onChange(draggedItemId, 'startTime', newStart);
    setDraggedItemId(null);
    setDropTarget(null);
  };

  const DropIndicator: React.FC<{ position: 'above' | 'below' }> = ({ position }) => (
    <div
      className={`absolute left-0 right-0 h-0.5 bg-primary z-10 pointer-events-none transform ${
        position === 'above' ? '-top-[2px]' : '-bottom-[2px]'
      }`}
    >
      <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-primary" />
      <div className="absolute -right-1 -top-[3px] w-2 h-2 rounded-full bg-primary" />
    </div>
  );

  return (
    <div
      className="space-y-3 overflow-y-auto lyrics-list-scrollbar min-h-0 relative pr-1 pb-4"
      ref={listRef}
    >
      {list.map((line) => (
        <div
          key={line.id}
          data-clip-id={line.id}
          draggable
          onDragStart={(e) => handleDragStart(e, line.id)}
          onDragOver={(e) => handleDragOver(e, line.id)}
          onDrop={handleDrop}
          onDragEnd={() => {
            setDraggedItemId(null);
            setDropTarget(null);
          }}
          className={`relative flex flex-wrap items-start p-3 rounded-md border cursor-default ${
            selectedIds.has(line.id)
              ? 'bg-primary/10 border-2 border-dashed border-primary shadow-md'
              : activeClipId === line.id
                ? 'bg-primary/15 border-primary ring-1 ring-primary'
                : 'bg-app-gray-light border-app-border'
          } ${draggedItemId === line.id ? 'opacity-40' : ''}`}
        >
          {dropTarget?.id === line.id && <DropIndicator position={dropTarget.position} />}

          <div className="cursor-move mr-2 mt-1.5 text-app-gray hover:text-app-text flex-shrink-0">
            <GripVertical size={14} />
          </div>

          <button
            onClick={() => toggleSelection(line.id)}
            className="mr-3 mt-1 text-app-icon-color flex-shrink-0"
          >
            {selectedIds.has(line.id) ? (
              <CheckSquare size={18} className="text-primary" />
            ) : (
              <Square size={18} />
            )}
          </button>

          <textarea
            ref={(el) => {
              if (el) {
                textareaRefs.current.set(line.id, el);
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              } else {
                textareaRefs.current.delete(line.id);
              }
            }}
            spellCheck={false}
            value={line.text}
            onChange={(e) => handleTextareaChange(line.id, e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 min-w-[150px] bg-transparent border-none outline-none text-app-text text-sm mr-2 resize-none overflow-hidden ${
              activeClipId === line.id ? 'font-medium' : ''
            }`}
            rows={1}
            placeholder="Enter text..."
          />

          <div className="flex items-center mt-2 md:mt-0 ml-auto flex-shrink-0">
            <TimeInput
              value={line.startTime}
              active={activeClipId === line.id}
              onChange={(v) => onChange(line.id, 'startTime', v)}
            />
            <span className="text-app-gray mx-1">-</span>
            <TimeInput
              value={line.endTime}
              active={activeClipId === line.id}
              onChange={(v) => onChange(line.id, 'endTime', v)}
            />
            <button
              onClick={() => onDelete(line.id)}
              className="ml-2 p-1 rounded-full hover:bg-danger text-app-icon-color hover:text-white"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};