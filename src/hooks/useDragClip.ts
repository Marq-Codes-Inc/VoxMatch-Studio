// src/hooks/useDragClip.ts
import { useCallback, useRef } from 'react';

interface DragState {
  id: string;
  type: 'body' | 'start' | 'end';
  startX: number;
  startTime: number;
  endTime: number;
  originalStart: number;
  originalEnd: number;
  timelineWidth: number;
}

export function useDragClip(
  mediaDuration: number,
  snapToGrid: boolean,
  updateTimelineData: (id: string, newStart: number, newEnd: number) => void
) {
  const dragState = useRef<DragState | null>(null);

  const snapToGridValue = useCallback((value: number, gridSize: number = 0.1): number => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid]);

  const startDrag = useCallback((
    id: string,
    type: 'body' | 'start' | 'end',
    e: React.MouseEvent,
    startTime: number,
    endTime: number,
    timelineWidth: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    dragState.current = {
      id,
      type,
      startX: e.clientX,
      startTime,
      endTime,
      originalStart: startTime,
      originalEnd: endTime,
      timelineWidth
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragState.current) return;

      const deltaX = moveEvent.clientX - dragState.current.startX;
      const deltaTime = (deltaX / dragState.current.timelineWidth) * mediaDuration;

      let newStart = dragState.current.originalStart;
      let newEnd = dragState.current.originalEnd;

      switch (dragState.current.type) {
        case 'body':
          newStart = snapToGridValue(dragState.current.originalStart + deltaTime);
          newEnd = snapToGridValue(dragState.current.originalEnd + deltaTime);
          // Constrain to media boundaries
          newStart = Math.max(0, Math.min(mediaDuration - (newEnd - newStart), newStart));
          newEnd = newStart + (dragState.current.originalEnd - dragState.current.originalStart);
          break;
        case 'start':
          newStart = snapToGridValue(dragState.current.originalStart + deltaTime);
          newStart = Math.max(0, Math.min(dragState.current.originalEnd - 0.1, newStart));
          break;
        case 'end':
          newEnd = snapToGridValue(dragState.current.originalEnd + deltaTime);
          newEnd = Math.max(dragState.current.originalStart + 0.1, Math.min(mediaDuration, newEnd));
          break;
      }

      updateTimelineData(dragState.current.id, newStart, newEnd);
    };

    const handleMouseUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [mediaDuration, snapToGridValue, updateTimelineData]);

  return { startDrag };
}