// src/components/panels/TimelinePanel.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ruler, Undo, Redo, Magnet, Volume2, VolumeX, X, Copy, Scissors, Combine, Trash2, ClipboardPaste, ZoomIn, ZoomOut } from "lucide-react";
import { LyricLine, ImportedMediaFile, TimelineMarker } from "../../types/types";
import { useDragClip } from "../../hooks/useDragClip";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const timeToPercent = (time: number, duration: number) =>
  duration ? (time / duration) * 100 : 0;

function getNiceInterval(secondsPerPixel: number, minPx = 80) {
  const target = secondsPerPixel * minPx;
  const bases = [1, 2, 5];
  let pow = Math.pow(10, Math.floor(Math.log10(target || 1)));
  for (let k = 0; k < 100; k++) {
    for (const b of bases) {
      const candidate = b * pow;
      if (candidate >= target) return candidate;
    }
    pow *= 10;
  }
  return target || 1;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  clipId?: string;
  timeAtClick?: number;
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label?: string;
}

const VolumeSlider: React.FC<SliderProps> = ({ value, min, max, step, onChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState(0);

  useEffect(() => {
    if (sliderRef.current) {
      const trackWidth = sliderRef.current.clientWidth;
      const thumbPosition = ((value - min) / (max - min)) * trackWidth;
      setTooltipLeft(thumbPosition);
    }
  }, [value, min, max]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const clickX = moveEvent.clientX - rect.left;
      const newValue = clamp(
        (clickX / rect.width) * (max - min) + min,
        min,
        max
      );
      onChange(newValue);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setShowTooltip(false);
    };

    setShowTooltip(true);
    handleMouseMove(e.nativeEvent);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    const sliderElement = sliderRef.current;
    if (!sliderElement) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault(); 
      const delta = Math.sign(-e.deltaY) * step;
      const newValue = clamp(value + delta, min, max);
      onChange(newValue);
    };

    sliderElement.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      sliderElement.removeEventListener("wheel", handleNativeWheel);
    };
  }, [value, min, max, step, onChange]);

  const percentValue = Math.round((value / max) * 100);

  return (
    <div
      ref={sliderRef}
      className="relative flex items-center h-5 w-28 bg-transparent cursor-pointer rounded-full"
      onMouseDown={handleMouseDown}
    >
      <div className="relative w-full h-1.5 bg-app-gray-dark/50 rounded-full">
        <div
          className="absolute h-full rounded-full bg-primary"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        ></div>
        <div
          className="absolute -top-1.5 w-5 h-5 rounded-full bg-app-card shadow-md flex items-center justify-center border border-app-border cursor-grab active:cursor-grabbing"
          style={{ left: `${((value - min) / (max - min)) * 100}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-1 h-1 rounded-full bg-app-gray"></div>
        </div>
      </div>
      {showTooltip && (
        <div className="absolute top-[-25px] left-0 transition-opacity duration-150 ease-in-out">
          <div
            className="relative bg-app-card text-xs text-app-text font-bold px-2 py-1 rounded-md shadow-md border border-app-border"
            style={{ left: tooltipLeft, transform: "translateX(-50%)" }}
          >
            {percentValue}%
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-solid border-transparent border-t-app-card"></div>
          </div>
        </div>
      )}
    </div>
  );
};

const ZoomLevel: React.FC<SliderProps> = ({ value, min, max, step, onChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState(0);

  useEffect(() => {
    if (sliderRef.current) {
      const trackWidth = sliderRef.current.clientWidth;
      const thumbPosition = ((value - min) / (max - min)) * trackWidth;
      setTooltipLeft(thumbPosition);
    }
  }, [value, min, max]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const clickX = moveEvent.clientX - rect.left;
      const newValue = clamp((clickX / rect.width) * (max - min) + min, min, max);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setShowTooltip(false);
    };

    setShowTooltip(true);
    handleMouseMove(e.nativeEvent);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    const sliderElement = sliderRef.current;
    if (!sliderElement) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.sign(-e.deltaY) * step;
      const newValue = clamp(value + delta, min, max);
      onChange(newValue);
    };

    sliderElement.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      sliderElement.removeEventListener("wheel", handleNativeWheel);
    };
  }, [value, min, max, step, onChange]);

  const percentValue = Math.round((value / max) * 100);

  return (
    <div
      ref={sliderRef}
      className="relative flex items-center h-5 w-28 bg-transparent cursor-pointer rounded-full"
      onMouseDown={handleMouseDown}
    >
      <div className="relative w-full h-1.5 bg-app-gray-dark/50 rounded-full">
        <div
          className="absolute h-full rounded-full bg-primary"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        ></div>
        <div
          className="absolute -top-1.5 w-5 h-5 rounded-full bg-app-card shadow-md flex items-center justify-center border border-app-border cursor-grab active:cursor-grabbing"
          style={{ left: `${((value - min) / (max - min)) * 100}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-1 h-1 rounded-full bg-app-gray"></div>
        </div>
      </div>
      {showTooltip && (
        <div className="absolute top-[-25px] left-0 transition-opacity duration-150 ease-in-out">
          <div
            className="relative bg-app-card text-xs text-app-text font-bold px-2 py-1 rounded-md shadow-md border border-app-border"
            style={{ left: tooltipLeft, transform: "translateX(-50%)" }}
          >
            {percentValue}%
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-solid border-transparent border-t-app-card"></div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TimelineHeaderProps {
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
  snapToGrid: boolean; toggleSnapToGrid: () => void;
  zoom: number; setZoom: (z: number) => void;
  volume: number; setVolume: (v: number) => void;
  isMuted: boolean; toggleMute: () => void;
  onClearTimeline: () => void; isMediaLoaded: boolean; hasClips: boolean;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  undo, redo, canUndo, canRedo, snapToGrid, toggleSnapToGrid,
  zoom, setZoom, volume, setVolume, isMuted, toggleMute,
  onClearTimeline, isMediaLoaded, hasClips
}) => (
  <div className="flex justify-between items-center mb-2 flex-shrink-0">
    <h3 className="text-xl font-semibold flex items-center">
      <Ruler className="mr-2 text-primary" /> Timeline
    </h3>
    <div className="flex items-center gap-3">
      <button onClick={undo} disabled={!canUndo} className="p-1 rounded disabled:opacity-50 text-app-icon-color"><Undo size={18} /></button>
      <button onClick={redo} disabled={!canRedo} className="p-1 rounded disabled:opacity-50 text-app-icon-color"><Redo size={18} /></button>
      <div className="flex items-center gap-2">
        <button onClick={() => setZoom(Math.max(1, zoom - 0.25))} className="p-1 rounded text-app-icon-color"><ZoomOut size={16} /></button>
        <ZoomLevel value={zoom} min={1} max={20} step={0.25} onChange={setZoom} />
        <button onClick={() => setZoom(Math.min(20, zoom + 0.25))} className="p-1 rounded text-app-icon-color"><ZoomIn size={16} /></button>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggleMute} className="p-1 rounded text-app-icon-color">{isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <VolumeSlider value={volume} min={0} max={1} step={0.05} onChange={setVolume} />
      </div>
      <button onClick={toggleSnapToGrid} title="Snap to Grid" className={`p-2 rounded-full transition-all duration-200 ml-5 ${snapToGrid ? "bg-primary text-white shadow-md shadow-primary/40 scale-105" : "bg-app-surface text-app-icon-color hover:bg-app-gray-light hover:text-primary"}`}>
        <Magnet size={15} strokeWidth={2} />
      </button>
      <button onClick={onClearTimeline} className="p-2 rounded-md hover:bg-app-gray-light text-app-icon-color disabled:opacity-50" title="Clear Timeline & Unload Media" disabled={!isMediaLoaded && !hasClips}>
        <Trash2 size={20} />
      </button>
    </div>
  </div>
);

const TimeRuler: React.FC<{ mediaDuration: number; zoom: number; formatTime: (s: number) => string; containerWidth: number; }> = ({ mediaDuration, zoom, formatTime, containerWidth }) => {
  const innerWidth = containerWidth * zoom;
  const secondsPerPixel = mediaDuration / Math.max(innerWidth, 1);
  const major = useMemo(() => getNiceInterval(secondsPerPixel, 80), [secondsPerPixel]);
  const minorCount = major >= 5 ? 4 : 5;
  const minorsEvery = major / minorCount;

  const majors = [];
  for (let t = 0; t <= mediaDuration + 0.0001; t += major) {
    const left = `${timeToPercent(t, mediaDuration)}%`;
    majors.push(
      <div key={`maj-${t}`} className="absolute top-0 h-full flex flex-col items-center -translate-x-1/2" style={{ left }}>
        <div className="w-px h-3 bg-app-gray/80"></div>
        <span className="text-[10px] text-app-gray mt-1">{formatTime(Math.round(t)).substring(0, 8)}</span>
      </div>
    );
  }

  const minors = [];
  for (let t = 0; t <= mediaDuration + 0.0001; t += minorsEvery) {
    if (Math.abs(t % major) < 1e-6) continue;
    const left = `${timeToPercent(t, mediaDuration)}%`;
    minors.push(<div key={`min-${t}`} className="absolute top-0 h-2 w-px bg-app-gray/40 -translate-x-1/2" style={{ left }} />);
  }

  return (
    <div className="absolute top-0 left-0 right-0 h-10 border-b border-app-border bg-gradient-to-b from-app-gray-dark/40 to-transparent">
      {majors}{minors}
    </div>
  );
};

const TrackLane: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute left-0 right-0 top-12 h-14 bg-app-gray-light/30 border border-app-border rounded-md shadow-inner">
    {children}
  </div>
);

const TimelineClip: React.FC<{
  item: LyricLine; mediaDuration: number; isSelected: boolean; zoom: number; containerWidth: number;
  onStartDrag: (type: "body" | "start" | "end", e: React.MouseEvent, timelineWidth: number, isDuplicate?: boolean) => void;
  onDelete: () => void; onClick: (e: React.MouseEvent) => void; onContextMenu: (e: React.MouseEvent, clipId: string) => void;
}> = ({ item, mediaDuration, isSelected, zoom, containerWidth, onStartDrag, onDelete, onClick, onContextMenu }) => {
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
        onClick={onClick} onContextMenu={(e) => onContextMenu(e, item.id)}
      />
    );
  }

  const handleMouseDown = (e: React.MouseEvent, type: "body" | "start" | "end") => {
    e.stopPropagation();
    if(e.button !== 0) return;
    onStartDrag(type, e, totalWidth, e.altKey);
  };

  return (
    <div
      ref={clipRef}
      className={`absolute top-1/2 -translate-y-1/2 h-9 rounded-sm shadow-md text-white text-xs flex items-center truncate ${isSelected ? "bg-gradient-to-r from-teal-500 to-teal-700 border-2 border-teal-900 ring-2 ring-teal-400/50" : "bg-gradient-to-r from-teal-500 to-teal-700 border border-teal-600/60"}`}
      style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, transition: 'none', willChange: 'left, width' }}
      onMouseDown={(e) => handleMouseDown(e, "body")} onClick={onClick} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, item.id); }}
    >
      <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-black/20 hover:bg-black/35 rounded-l-sm" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "start"); }} />
      <span className="px-2 truncate">{item.text}</span>
      <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/20 hover:bg-black/35 rounded-r-sm" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "end"); }} />
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute -top-1 -right-1 p-0.5 m-1 bg-red-600 rounded-full shadow hover:bg-red-700 transition-colors" title="Delete"><X size={10} /></button>
    </div>
  );
};

const TimelineContextMenu: React.FC<{
  contextMenu: ContextMenuState; onClose: () => void; onCopy: (clipId?: string) => void;
  onPaste: (time?: number) => void; onSplit: (clipId?: string) => void; onMerge: () => void;
  onDelete: (clipId?: string) => void; onDuplicate: (clipId?: string) => void;
  hasCopiedClip: boolean; hasMultipleSelected: boolean;
}> = ({ contextMenu, onClose, onCopy, onPaste, onSplit, onMerge, onDelete, onDuplicate, hasCopiedClip, hasMultipleSelected }) => {
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
    <div ref={menuRef} className="fixed bg-app-surface border border-app-border rounded-lg shadow-lg z-50 min-w-48 py-1" style={{ position: 'fixed' }}>
      {contextMenu.clipId && (
        <>
          <button className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2" onClick={() => { onCopy(contextMenu.clipId); onClose(); }}><Copy size={14} /> Copy</button>
          <button className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2" onClick={() => { onDuplicate(contextMenu.clipId); onClose(); }}><Copy size={14} className="rotate-180" /> Duplicate</button>
          <button className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2" onClick={() => { onSplit(contextMenu.clipId); onClose(); }}><Scissors size={14} /> Split</button>
          <div className="border-t border-app-border my-1"></div>
        </>
      )}
      {hasMultipleSelected && (
        <button className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2" onClick={() => { onMerge(); onClose(); }}><Combine size={14} /> Merge Selected</button>
      )}
      {showPasteOption && (
        <button className="w-full text-left px-4 py-2 hover:bg-app-gray-light flex items-center gap-2" onClick={() => { onPaste(contextMenu.timeAtClick); onClose(); }}><ClipboardPaste size={14} /> Paste Here</button>
      )}
      {contextMenu.clipId && (
        <button className="w-full text-left px-4 py-2 hover:bg-app-gray-light text-red-400 flex items-center gap-2" onClick={() => { onDelete(contextMenu.clipId); onClose(); }}><Trash2 size={14} /> Delete</button>
      )}
    </div>
  );
};

export interface TimelinePanelProps {
  currentTime: number;
  mediaDuration: number;
  isMediaLoaded: boolean;
  formatTime: (sec: number) => string;
  handleSeek: (time: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  activeFile: ImportedMediaFile | null;
  volume: number;
  setVolume: (vol: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  timelineData: LyricLine[];
  updateTimelineData: (id: string, newStart: number, newEnd: number) => void;
  deleteTimelineItem: (id: string) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string, e: React.MouseEvent) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
  addMarker: (time: number, label: string) => void;
  markers: TimelineMarker[];
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  isPlaying?: boolean;
  waveformColor: string;
  duplicateTimelineItem?: (id: string, newStart?: number, newEnd?: number) => void;
  splitTimelineItem?: (id: string, splitTime: number) => void;
  mergeTimelineItems?: (ids: string[]) => void;
  addTimelineItem?: (item: LyricLine) => void;
  onClearTimelineAll?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  currentTime,
  mediaDuration,
  isMediaLoaded,
  formatTime,
  handleSeek,
  handleDragOver,
  handleDrop,
  activeFile,
  volume,
  setVolume,
  zoom,
  setZoom,
  timelineData,
  updateTimelineData,
  deleteTimelineItem,
  selectedIds,
  toggleSelection,
  undo,
  redo,
  canUndo,
  canRedo,
  snapToGrid,
  toggleSnapToGrid,
  addMarker,
  markers,
  analyserRef,
  isPlaying,
  waveformColor,
  duplicateTimelineItem,
  splitTimelineItem,
  mergeTimelineItems,
  addTimelineItem,
  onClearTimelineAll,
  onDrop,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const waveformRef = useRef<HTMLCanvasElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(0);
  const [copiedClip, setCopiedClip] = useState<LyricLine | null>(null);
  
  const lastVolume = useRef(volume);
  const { startDrag } = useDragClip(mediaDuration, snapToGrid, updateTimelineData);

  const lastWaveformImageRef = useRef<ImageData | null>(null);
  const waveformDrawRequestRef = useRef<number | null>(null);
  const peaksRef = useRef<Float32Array | null>(null);
  const peaksWidthRef = useRef<number>(0);
  const lastDrawArgsRef = useRef<{ width: number; height: number } | null>(null);
  const animationRef = useRef<number | null>(null);

  const containerOverflowClass = zoom > 1 ? "overflow-x-auto" : "overflow-x-hidden";

  useEffect(() => {
    if (!scrollRef.current) return;
    const updateWidth = () => { if (scrollRef.current) setContainerWidth(scrollRef.current.clientWidth); };
    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(scrollRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleClearTimeline = useCallback(() => {
    setAudioBuffer(null); peaksRef.current = null; lastWaveformImageRef.current = null;
    if (waveformRef.current) {
      const ctx = waveformRef.current.getContext("2d", { willReadFrequently: true });
      if (ctx) ctx.clearRect(0, 0, waveformRef.current.width, waveformRef.current.height);
    }
    setCopiedClip(null); setContextMenu({ visible: false, x: 0, y: 0 });

    if (onClearTimelineAll) {
      onClearTimelineAll();
    } else {
      timelineData.forEach(item => deleteTimelineItem(item.id));
    }
  }, [onClearTimelineAll, timelineData, deleteTimelineItem]);

  const handleContextMenu = useCallback((e: React.MouseEvent, clipId?: string) => {
    e.preventDefault(); e.stopPropagation();
    let timeAtClick = currentTime;
    if (innerRef.current && scrollRef.current && mediaDuration > 0) {
        const rect = innerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        timeAtClick = (x / rect.width) * mediaDuration;
    }
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, clipId, timeAtClick });
  }, [currentTime, mediaDuration]);

  const closeContextMenu = useCallback(() => setContextMenu({ visible: false, x: 0, y: 0 }), []);

  const handleCopy = useCallback((clipId?: string) => {
    const idToCopy = clipId || (selectedIds.size > 0 ? Array.from(selectedIds)[0] : null);
    if (!idToCopy) return;
    const clip = timelineData.find(item => item.id === idToCopy);
    if (clip) setCopiedClip(clip);
  }, [timelineData, selectedIds]);

  const handleDuplicate = useCallback((clipId?: string) => {
     const idToDup = clipId || (selectedIds.size > 0 ? Array.from(selectedIds)[0] : null);
     if (idToDup && duplicateTimelineItem) duplicateTimelineItem(idToDup);
  }, [selectedIds, duplicateTimelineItem]);

  const handlePaste = useCallback((specificTime?: number) => {
    if (!copiedClip || !addTimelineItem) return;
    const targetStartTime = specificTime !== undefined ? specificTime : currentTime;
    const clipDuration = copiedClip.endTime - copiedClip.startTime;
    addTimelineItem({ ...copiedClip, id: `${copiedClip.id}-paste-${Date.now()}`, startTime: targetStartTime, endTime: targetStartTime + clipDuration });
    setCopiedClip(null);
  }, [copiedClip, currentTime, addTimelineItem]);

  const handleSplit = useCallback((clipId?: string) => { 
    if (clipId && splitTimelineItem) splitTimelineItem(clipId, currentTime); 
  }, [currentTime, splitTimelineItem]);
  
  const handleMerge = useCallback(() => { 
    if (selectedIds.size >= 2 && mergeTimelineItems) mergeTimelineItems(Array.from(selectedIds)); 
  }, [selectedIds, mergeTimelineItems]);
  
  const handleDelete = useCallback((clipId?: string) => {
    if (clipId) {
      deleteTimelineItem(clipId);
      if (copiedClip && copiedClip.id === clipId) setCopiedClip(null);
    } else if (selectedIds.size > 0) {
      if (copiedClip && selectedIds.has(copiedClip.id)) setCopiedClip(null);
      selectedIds.forEach(id => deleteTimelineItem(id));
    }
  }, [deleteTimelineItem, selectedIds, copiedClip]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' && selectedIds.size > 0) { e.preventDefault(); handleDelete(); }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') { e.preventDefault(); handleCopy(); }
        else if (e.key === 'v') { e.preventDefault(); handlePaste(); }
        else if (e.key === 'd') { e.preventDefault(); handleDuplicate(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, handleCopy, handlePaste, handleDuplicate, handleDelete]);

  const handleStartDrag = useCallback((id: string, type: "body" | "start" | "end", e: React.MouseEvent, startTime: number, endTime: number, timelineWidth: number, isDuplicate?: boolean) => {
    e.stopPropagation();
    if (isDuplicate && type === "body" && duplicateTimelineItem) duplicateTimelineItem(id, startTime + 0.2);
    else startDrag(id, type, e, startTime, endTime, timelineWidth);
  }, [duplicateTimelineItem, startDrag]);

  useEffect(() => {
    if (!activeFile || !isMediaLoaded) {
      setAudioBuffer(null);
      peaksRef.current = null;
      lastWaveformImageRef.current = null;
      if (waveformRef.current) {
        const ctx = waveformRef.current.getContext("2d", { willReadFrequently: true });
        if (ctx) ctx.clearRect(0, 0, waveformRef.current.width, waveformRef.current.height);
      }
      return;
    }

    const loadWaveform = async () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        let arrayBuffer: ArrayBuffer | null = null;

        if (activeFile.file instanceof File) {
          arrayBuffer = await activeFile.file.arrayBuffer();
        } else if (activeFile.url) {
          try {
            const res = await fetch(activeFile.url);
            if (res.ok) {
              arrayBuffer = await res.arrayBuffer();
            }
          } catch (fetchError) {
            const mediaElement = document.querySelector('video, audio') as HTMLMediaElement;
            if (mediaElement && mediaElement.src) {
              const res = await fetch(mediaElement.src);
              if (res.ok) {
                arrayBuffer = await res.arrayBuffer();
              }
            }
          }
        }

        if (arrayBuffer) {
          const buffer = await ctx.decodeAudioData(arrayBuffer);
          setAudioBuffer(buffer);
        }
      } catch (err) {
        console.error("Error decoding audio for waveform:", err);
        setAudioBuffer(null);
      }
    };

    loadWaveform();
  }, [activeFile?.id, isMediaLoaded]);

  const computePeaks = useCallback((buffer: AudioBuffer, width: number) => {
    if (!buffer || width <= 0) return null;
    
    const channels = Math.max(1, buffer.numberOfChannels);
    const dataLen = buffer.length;
    const samplesPerBucket = Math.floor(dataLen / width) || 1;
    const peaks = new Float32Array(width * 2);

    for (let c = 0; c < channels; c++) {
      const data = buffer.getChannelData(c);
      let bucketIndex = 0;
      let min = 1.0, max = -1.0;
      let iInBucket = 0;
      for (let i = 0; i < dataLen; i++) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
        iInBucket++;
        if (iInBucket >= samplesPerBucket) {
          const base = bucketIndex * 2;
          if (base < peaks.length) {
            peaks[base] = Math.min(peaks[base] || 1, min);
            peaks[base + 1] = Math.max(peaks[base + 1] || -1, max);
          }
          bucketIndex++;
          min = 1.0; max = -1.0; iInBucket = 0;
          if (bucketIndex >= width) break;
        }
      }
      if (bucketIndex < width && iInBucket > 0) {
        const base = bucketIndex * 2;
        if (base < peaks.length) {
          peaks[base] = Math.min(peaks[base] || 1, min);
          peaks[base + 1] = Math.max(peaks[base + 1] || -1, max);
        }
      }
    }

    for (let b = 0; b < peaks.length; b++) {
      if (!Number.isFinite(peaks[b])) peaks[b] = 0;
    }

    peaksWidthRef.current = width;
    peaksRef.current = peaks;
    return peaks;
  }, []);

  const saveWaveformImage = useCallback((canvas: HTMLCanvasElement) => {
    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        lastWaveformImageRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.warn("Failed to save waveform image:", e);
    }
  }, []);

  const drawWaveformInternal = useCallback((width: number, height: number, saveImage: boolean = true) => {
    if (!audioBuffer || !waveformRef.current || !isMediaLoaded) {
      if (waveformRef.current) {
        const ctx = waveformRef.current.getContext("2d", { willReadFrequently: true });
        if (ctx) ctx.clearRect(0, 0, waveformRef.current.width, waveformRef.current.height);
      }
      return;
    }

    const canvas = waveformRef.current;
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.floor(width * dpr));
    const pixelHeight = Math.max(1, Math.floor(height * dpr));
    
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (!peaksRef.current || peaksWidthRef.current !== pixelWidth) {
      computePeaks(audioBuffer, pixelWidth);
    }
    
    const peaks = peaksRef.current;
    if (!peaks) return;

    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    
    ctx.fillStyle = waveformColor || "#046466";
    const halfH = pixelHeight / 2;

    for (let x = 0; x < pixelWidth; x++) {
      const base = x * 2;
      if (base + 1 >= peaks.length) break;
      
      const min = peaks[base];
      const max = peaks[base + 1];
      
      const yTop = Math.round((1 - max) * halfH);
      const yBottom = Math.round((1 - min) * halfH);
      const h = Math.max(1, yBottom - yTop);
      
      ctx.fillRect(x, yTop, 1, h);
    }

    lastDrawArgsRef.current = { width, height };
    if (saveImage) {
      saveWaveformImage(canvas);
    }
  }, [audioBuffer, computePeaks, waveformColor, isMediaLoaded, saveWaveformImage]);

  const scheduleDraw = useCallback((width: number, height: number, saveImage: boolean = true) => {
    if (waveformDrawRequestRef.current) {
      cancelAnimationFrame(waveformDrawRequestRef.current);
      waveformDrawRequestRef.current = null;
    }
    waveformDrawRequestRef.current = requestAnimationFrame(() => {
      waveformDrawRequestRef.current = null;
      drawWaveformInternal(width, height, saveImage);
    });
  }, [drawWaveformInternal]);

  useEffect(() => {
    if (!innerRef.current || !audioBuffer || !isMediaLoaded) return;
    const clientW = innerRef.current.clientWidth || (innerRef.current.scrollWidth || 1000);
    scheduleDraw(clientW, 50, true);
  }, [audioBuffer, zoom, scheduleDraw, isMediaLoaded]);

  useEffect(() => {
    const container = innerRef.current;
    if (!container) return;
    
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }
    
    const ro = new ResizeObserver(() => {
      if (audioBuffer && isMediaLoaded) {
        scheduleDraw(container.clientWidth || 800, 50, true);
      }
    });
    ro.observe(container);
    resizeObserverRef.current = ro;
    
    return () => {
      try { ro.disconnect(); } catch (e) {}
      resizeObserverRef.current = null;
    };
  }, [scheduleDraw, audioBuffer, isMediaLoaded]);

  const drawAudioAnalysis = useCallback(() => {
    if (!analyserRef.current || !waveformRef.current || !isPlaying || !isMediaLoaded) return;
    
    const analyser = analyserRef.current;
    const canvas = waveformRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isPlaying || !analyserRef.current || !isMediaLoaded) {
        if (waveformRef.current && lastWaveformImageRef.current) {
          const restoreCtx = waveformRef.current.getContext("2d");
          if (restoreCtx) {
            restoreCtx.putImageData(lastWaveformImageRef.current, 0, 0);
          }
        }
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      const width = canvas.width;
      const height = canvas.height;
      
      if (lastWaveformImageRef.current) {
        ctx.putImageData(lastWaveformImageRef.current, 0, 0);
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      const barWidth = (width / bufferLength) * 1.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.6;
        ctx.fillStyle = `rgba(4, 100, 102, 0.5)`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 0.5;
      }
    };
    
    draw();
  }, [isPlaying, analyserRef, isMediaLoaded]);

  useEffect(() => {
    if (isPlaying && analyserRef.current && activeFile && isMediaLoaded) {
      drawAudioAnalysis();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      if (waveformRef.current && lastWaveformImageRef.current && innerRef.current && isMediaLoaded) {
        const ctx = waveformRef.current.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.putImageData(lastWaveformImageRef.current, 0, 0);
        }
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, analyserRef, activeFile, drawAudioAnalysis, isMediaLoaded]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(lastVolume.current);
    } else {
      lastVolume.current = volume;
      setVolume(0);
    }
    setIsMuted((v) => !v);
  }, [isMuted, setVolume, volume]);

  useEffect(() => {
    if (volume > 0 && isMuted) setIsMuted(false);
  }, [volume, isMuted]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isScrubbing || !scrollRef.current || !innerRef.current || mediaDuration === 0 || !isMediaLoaded) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left + scrollRef.current.scrollLeft, 0, innerRef.current.scrollWidth);
      handleSeek((x / innerRef.current.scrollWidth) * mediaDuration);
    };
    const stop = () => setIsScrubbing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [isScrubbing, mediaDuration, handleSeek, isMediaLoaded]);

  const lastScrollCheckRef = useRef<number | null>(null);
  useEffect(() => {
    if (!scrollRef.current || !innerRef.current || mediaDuration === 0 || !isMediaLoaded) return;
    const sc = scrollRef.current;
    const inner = innerRef.current;
    const totalWidth = inner.scrollWidth;
    const viewportWidth = sc.clientWidth;
    if (totalWidth <= viewportWidth) return;

    const playheadX = (currentTime / mediaDuration) * totalWidth;
    const leftVisible = sc.scrollLeft;
    const rightVisible = leftVisible + viewportWidth;
    const margin = Math.max(80, viewportWidth * 0.0015);

    let targetLeft: number | null = null;
    if (playheadX > rightVisible - margin) {
      const desired = Math.max(0, playheadX - viewportWidth / 4);
      targetLeft = Math.min(desired, totalWidth - viewportWidth);
    } else if (playheadX < leftVisible + margin) {
      const desired = Math.max(0, playheadX - viewportWidth / 4);
      targetLeft = Math.max(0, desired);
    }

    if (targetLeft !== null) {
      if (lastScrollCheckRef.current) {
        window.cancelAnimationFrame(lastScrollCheckRef.current);
        lastScrollCheckRef.current = null;
      }
      lastScrollCheckRef.current = window.requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollLeft = targetLeft!;
      });
    }
  }, [currentTime, mediaDuration, zoom, isMediaLoaded]);

  const handleZoomChange = (newZoom: number) => {
    if (!scrollRef.current || !innerRef.current || mediaDuration === 0 || !isMediaLoaded) {
      setZoom(newZoom);
      return;
    }
    
    const sc = scrollRef.current;
    const inner = innerRef.current;
    const currentPlayheadPosition = (currentTime / mediaDuration) * inner.scrollWidth;
    const scrollLeftBefore = sc.scrollLeft;
    const playheadOffsetFromViewport = currentPlayheadPosition - scrollLeftBefore;
    
    setZoom(newZoom);

    requestAnimationFrame(() => {
      if (!innerRef.current || !scrollRef.current) return;
      const newInner = innerRef.current;
      const newSc = scrollRef.current;
      const newPlayheadPosition = (currentTime / mediaDuration) * newInner.scrollWidth;
      
      if (isPlaying) {
        newSc.scrollLeft = newPlayheadPosition - playheadOffsetFromViewport;
      } else {
        const scrollRatio = scrollLeftBefore / inner.scrollWidth;
        newSc.scrollLeft = scrollRatio * newInner.scrollWidth;
      }
      
      scheduleDraw(newInner.clientWidth, 50, true);
    });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const onWheel = (e: WheelEvent) => {
      if (zoom <= 1) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom]);

  const onTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !isMediaLoaded) return;
    const target = e.target as HTMLElement;
    if (target.closest('.absolute.top-1\\/2')) return;
    
    if (!scrollRef.current || !innerRef.current || mediaDuration === 0) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left + scrollRef.current.scrollLeft, 0, innerRef.current.scrollWidth);
    
    handleSeek((x / innerRef.current.scrollWidth) * mediaDuration);
    setIsScrubbing(true);
  };

  const handleLocalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragOver(e);
  }, [handleDragOver]);

  const handleLocalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDrop) {
      onDrop(e);
    } else {
      handleDrop(e);
    }
  }, [onDrop, handleDrop]);

  return (
    <div 
      className="bg-app-surface p-4 rounded-lg border border-app-border flex-grow flex flex-col h-full" 
      onDragOver={handleLocalDragOver}
      onDrop={handleLocalDrop}
      onContextMenu={(e) => handleContextMenu(e)}
    >
      <TimelineHeader 
        undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} 
        snapToGrid={snapToGrid} toggleSnapToGrid={toggleSnapToGrid} 
        zoom={zoom} setZoom={handleZoomChange} 
        volume={volume} setVolume={setVolume} isMuted={isMuted} toggleMute={toggleMute} 
        onClearTimeline={handleClearTimeline} isMediaLoaded={isMediaLoaded} hasClips={timelineData.length > 0} 
      />
      <p className="text-sm text-app-gray mb-3 flex-shrink-0 font-mono">
        {formatTime(currentTime)} / {formatTime(mediaDuration)}
        {activeFile && isMediaLoaded && <span className="ml-2 text-xs bg-primary/20 px-2 py-1 rounded">{activeFile.type.startsWith('video') ? 'Video' : 'Audio'}</span>}
        {copiedClip && <span className="ml-2 text-xs bg-green-500/20 px-2 py-1 rounded text-green-400">Clip Copied</span>}
        {isMediaLoaded && <span className="ml-2 text-xs text-app-gray">{timelineData.length} clips</span>}
      </p>

      <div 
        ref={scrollRef} 
        onMouseDown={onTimelineMouseDown} 
        className={`rounded-lg flex-1 relative ${containerOverflowClass} overflow-y-hidden lyrics-list-scrollbar ${isMediaLoaded ? "" : "border-2 border-dashed border-app-border"}`}
      >
        {isMediaLoaded ? (
          <div ref={innerRef} className="relative h-full" style={{ width: `${Math.max(1, zoom) * 100}%` }}>
            <TimeRuler mediaDuration={mediaDuration} zoom={Math.max(1, zoom)} formatTime={formatTime} containerWidth={containerWidth} />
            <TrackLane>
              {timelineData.map((item: LyricLine) => (
                <TimelineClip 
                  key={item.id} 
                  item={item} 
                  mediaDuration={mediaDuration} 
                  isSelected={selectedIds.has(item.id)} 
                  zoom={zoom} 
                  containerWidth={containerWidth} 
                  onStartDrag={(type, e, timelineWidth, isDuplicate) => handleStartDrag(item.id, type, e, item.startTime, item.endTime, timelineWidth, isDuplicate)} 
                  onDelete={() => deleteTimelineItem(item.id)} 
                  onClick={(e) => { e.stopPropagation(); toggleSelection(item.id, e); }} 
                  onContextMenu={handleContextMenu} 
                />
              ))}
            </TrackLane>
            <canvas ref={waveformRef} height={50} className="absolute bottom-0 left-0 w-full h-[50px] pointer-events-none opacity-80 transition-opacity duration-300" />
            <div 
              className="absolute top-0 w-[3px] bg-red-500 h-full pointer-events-none z-20 shadow-lg shadow-red-500/50" 
              style={{ 
                transform: `translateX(${innerRef.current && mediaDuration > 0 ? (currentTime / mediaDuration) * innerRef.current.scrollWidth : 0}px)`, 
                opacity: (isMediaLoaded || currentTime > 0) ? 1 : 0, 
                transition: 'none', 
                zIndex: 20 
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-app-gray text-sm font-mono select-none">
            Drag imported file here to start editing
          </div>
        )}
      </div>

      <TimelineContextMenu 
        contextMenu={contextMenu} 
        onClose={closeContextMenu} 
        onCopy={handleCopy} 
        onPaste={handlePaste} 
        onSplit={handleSplit} 
        onMerge={handleMerge} 
        onDelete={handleDelete} 
        onDuplicate={handleDuplicate} 
        hasCopiedClip={!!copiedClip} 
        hasMultipleSelected={selectedIds.size >= 2} 
      />
    </div>
  );
};

