// src/components/audio/FloatingVuMeter.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, Minimize2, Maximize2, X } from 'lucide-react';
import { VuMeter } from './VuMeter';

interface FloatingVuMeterProps {
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  isPlaying: boolean;
  onClose: () => void;
}

interface OverlayState {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
}

const STORAGE_KEY = 'voxmatch-vu-overlay';

const DEFAULT_STATE: OverlayState = {
  x: 24,
  y: 96,
  width: 260,
  height: 140,
  collapsed: false,
};

function loadState(): OverlayState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STATE;
}

export const FloatingVuMeter: React.FC<FloatingVuMeterProps> = ({
  analyserRef,
  isPlaying,
  onClose,
}) => {
  const [state, setState] = useState<OverlayState>(loadState);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Drag
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: state.x,
        origY: state.y,
      };
      setIsDragging(true);

      let rafId: number | null = null;
      let pendingX = state.x;
      let pendingY = state.y;

      const flush = () => {
        rafId = null;
        setState(prev => ({ ...prev, x: pendingX, y: pendingY }));
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        pendingX = Math.max(
          0,
          Math.min(window.innerWidth - 100, dragRef.current.origX + dx),
        );
        pendingY = Math.max(
          0,
          Math.min(window.innerHeight - 40, dragRef.current.origY + dy),
        );
        if (rafId === null) rafId = requestAnimationFrame(flush);
      };

      const onUp = () => {
        dragRef.current = null;
        setIsDragging(false);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setState(prev => ({ ...prev, x: pendingX, y: pendingY }));
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [state.x, state.y],
  );

  // Resize
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: state.width,
        origH: state.height,
      };
      setIsResizing(true);

      let rafId: number | null = null;
      let pendingW = state.width;
      let pendingH = state.height;

      const flush = () => {
        rafId = null;
        setState(prev => ({ ...prev, width: pendingW, height: pendingH }));
      };

      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const dw = ev.clientX - resizeRef.current.startX;
        const dh = ev.clientY - resizeRef.current.startY;
        pendingW = Math.max(160, resizeRef.current.origW + dw);
        pendingH = Math.max(60, resizeRef.current.origH + dh);
        if (rafId === null) rafId = requestAnimationFrame(flush);
      };

      const onUp = () => {
        resizeRef.current = null;
        setIsResizing(false);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setState(prev => ({ ...prev, width: pendingW, height: pendingH }));
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [state.width, state.height],
  );

  const toggleCollapse = () =>
    setState(prev => ({ ...prev, collapsed: !prev.collapsed }));

  // Cursor for the drag handle: grab normally, grabbing while dragging
  const handleCursor = isDragging ? 'grabbing' : 'grab';

  return (
    <div
      className="fixed z-40 bg-app-surface border border-app-border rounded-lg shadow-2xl select-none flex flex-col"
      style={{
        left: state.x,
        top: state.y,
        width: state.width,
        height: state.collapsed ? 36 : state.height,
        // Default cursor for the body; only the handle is grabby
        cursor: 'default',
      }}
    >
      {/* Header / drag handle */}
      <div
        onMouseDown={onHeaderMouseDown}
        className={`flex items-center gap-1 px-2 h-9 flex-shrink-0 bg-app-gray-dark/40 rounded-t-lg ${
          state.collapsed ? 'rounded-b-lg' : 'border-b border-app-border'
        }`}
      >
        {/* Six-dot handle */}
        <div
          className="p-0.5 rounded hover:bg-app-gray-light/40 transition-colors"
          style={{ cursor: handleCursor }}
          title="Drag to move"
        >
          <GripVertical size={14} className="text-app-gray" />
        </div>

        <span className="text-xs font-medium text-app-text">Audio Meter</span>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={toggleCollapse}
            className="p-1 rounded hover:bg-app-gray-light text-app-icon-color"
            title={state.collapsed ? 'Expand' : 'Collapse'}
          >
            {state.collapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-danger/20 text-app-icon-color hover:text-danger"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!state.collapsed && (
        <div className="flex-1 p-2 min-h-0">
          <VuMeter
            analyserRef={analyserRef}
            isPlaying={isPlaying}
            variant="full"
            className="w-full h-full"
          />
        </div>
      )}

      {/* Resize handle */}
      {!state.collapsed && (
        <div
          onMouseDown={onResizeMouseDown}
          className={`absolute bottom-0 right-0 w-3 h-3 ${
            isResizing ? 'cursor-nwse-resize' : 'cursor-nwse-resize'
          }`}
          style={{
            background:
              'linear-gradient(135deg, transparent 0 50%, var(--app-border-light) 50% 60%, transparent 60% 70%, var(--app-border-light) 70% 80%, transparent 80%)',
          }}
          title="Resize"
        />
      )}
    </div>
  );
};