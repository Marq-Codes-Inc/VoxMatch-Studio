// src/components/panels/timeline/TimelineClip.tsx
import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { LyricLine } from '../../../types/types';

interface Props {
  item: LyricLine;
  mediaDuration: number;
  isSelected: boolean;
  zoom: number;
  containerWidth: number;
  onStartDrag: (
    type: 'body' | 'start' | 'end',
    e: React.MouseEvent,
    timelineWidth: number,
    isDuplicate?: boolean,
  ) => void;
  onDelete: () => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, clipId: string) => void;
}

export const TimelineClip: React.FC<Props> = ({
  item, mediaDuration, isSelected, zoom, containerWidth,
  onStartDrag, onDelete, onClick, onContextMenu,
}) => {
  const clipRef = useRef<HTMLDivElement | null>(null);
  const totalWidth = containerWidth * zoom;
  const leftPercent = (item.startTime / mediaDuration) * 100;
  const widthPercent = ((item.endTime - item.startTime) / mediaDuration) * 100;
  const pixelWidth = (widthPercent / 100) * totalWidth;

  if (pixelWidth < 4) {
    return (
      <div
        className="absolute top-1/2 -translate-y-1/2 h-9 bg-gradient-to-r from-teal-500 to-teal-700 opacity-40 rounded-sm"
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, transition: 'none' }}
        title={`${item.text} (${(item.endTime - item.startTime).toFixed(2)}s)`}
        onClick={onClick}
        onContextMenu={(e) => onContextMenu(e, item.id)}
      />
    );
  }

  const handleMouseDown = (e: React.MouseEvent, type: 'body' | 'start' | 'end') => {
    e.stopPropagation();
    if (e.button !== 0) return;
    onStartDrag(type, e, totalWidth, e.altKey);
  };

  return (
    <div
      ref={clipRef}
      className={`absolute top-1/2 -translate-y-1/2 h-9 rounded-sm shadow-md text-white text-xs flex items-center truncate ${
        isSelected
          ? 'bg-gradient-to-r from-teal-500 to-teal-700 border-2 border-teal-900 ring-2 ring-teal-400/50'
          : 'bg-gradient-to-r from-teal-500 to-teal-700 border border-teal-600/60'
      }`}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        transition: 'none',
        willChange: 'left, width',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'body')}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, item.id);
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-black/20 hover:bg-black/35 rounded-l-sm"
        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'start'); }}
      />
      <span className="px-2 truncate">{item.text}</span>
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/20 hover:bg-black/35 rounded-r-sm"
        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'end'); }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute -top-1 -right-1 p-0.5 m-1 bg-red-600 rounded-full shadow hover:bg-red-700"
        title="Delete"
      >
        <X size={10} />
      </button>
    </div>
  );
};
