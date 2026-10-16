// src/components/panels/TimelinePanel.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LyricLine, ImportedMediaFile, TimelineMarker } from '../../types/types';
import { useDragClip } from '../../hooks/useDragClip';
import { useProjectEditor } from '../../contexts/ProjectEditorContext';
import { TimelineHeader } from './timeline/TimelineHeader';
import { TimelineClip } from './timeline/TimelineClip';
import { TimelineContextMenu } from './timeline/TimelineContextMenu';
import { TimeRuler } from './timeline/TimeRuler';
import { TrackLane } from './timeline/TrackLane';
import { WaveformCanvas } from './timeline/WaveformCanvas';
import { useTimelineWaveform } from './timeline/useTimelineWaveform';
import { useTimelineScrub } from './timeline/useTimelineScrub';
import { useAutoScrollPlayhead } from './timeline/useTimelineScroll';
import type { TimelineContextMenuState } from './timeline/types';

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
  onClearTimelineAll?: () => void;
  isVuOverlayEnabled: boolean;
  onToggleVuOverlay: () => void;
  splitTimelineItem: (id: string, splitTime: number) => void;
  mergeTimelineItems: (ids: string[]) => void;
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
  onClearTimelineAll,
  isVuOverlayEnabled,
  onToggleVuOverlay,
  splitTimelineItem,
  mergeTimelineItems,
}) => {
  const ctx = useProjectEditor();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const lastVolume = useRef(volume);
  const [contextMenu, setContextMenu] = useState<TimelineContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });

  const { waveformRef, clear: clearWaveform } = useTimelineWaveform(
    activeFile,
    isMediaLoaded,
    waveformColor,
    innerRef,
  );

  const { onMouseDown: onTimelineMouseDown } = useTimelineScrub(
    scrollRef,
    innerRef,
    mediaDuration,
    isMediaLoaded,
    handleSeek,
  );

  useAutoScrollPlayhead(
    scrollRef,
    innerRef,
    currentTime,
    mediaDuration,
    zoom,
    isMediaLoaded,
  );

  const { startDrag } = useDragClip(mediaDuration, snapToGrid, updateTimelineData);

  useEffect(() => {
    if (!scrollRef.current) return;
    const updateWidth = () => {
      if (scrollRef.current) setContainerWidth(scrollRef.current.clientWidth);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target && target.isContentEditable)
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.shiftKey || e.altKey) return;

      if (e.key.toLowerCase() === 'c') {
        if (selectedIds.size !== 1) return;
        const id = Array.from(selectedIds)[0];
        e.preventDefault();
        e.stopPropagation();
        ctx.copyClipToClipboard(id);
        console.log('[timeline clipboard] copied', id);
        return;
      }
      if (e.key.toLowerCase() === 'v') {
        if (!ctx.clipboardClip) return;
        e.preventDefault();
        e.stopPropagation();
        ctx.pasteClipboardAt(currentTime);
        console.log('[timeline clipboard] pasted at', currentTime.toFixed(2));
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [selectedIds, currentTime, ctx]);

  useEffect(() => {
    if (volume > 0 && isMuted) setIsMuted(false);
  }, [volume, isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) setVolume(lastVolume.current);
    else {
      lastVolume.current = volume;
      setVolume(0);
    }
    setIsMuted((v) => !v);
  }, [isMuted, setVolume, volume]);

  const handleClearTimeline = useCallback(() => {
    clearWaveform();
    setContextMenu({ visible: false, x: 0, y: 0 });
    if (onClearTimelineAll) onClearTimelineAll();
    else timelineData.forEach((item) => deleteTimelineItem(item.id));
  }, [clearWaveform, onClearTimelineAll, timelineData, deleteTimelineItem]);

  const openContextMenu = useCallback(
    (e: React.MouseEvent, clipId?: string) => {
      e.preventDefault();
      e.stopPropagation();
      let timeAtClick = currentTime;
      if (innerRef.current && mediaDuration > 0) {
        const rect = innerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        timeAtClick = (x / rect.width) * mediaDuration;
      }
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        clipId,
        timeAtClick,
      });
    },
    [currentTime, mediaDuration],
  );

  const closeContextMenu = useCallback(
    () => setContextMenu({ visible: false, x: 0, y: 0 }),
    [],
  );

  const handleCopy = useCallback(
    (clipId?: string) => {
      const id = clipId || (selectedIds.size > 0 ? Array.from(selectedIds)[0] : null);
      if (id) ctx.copyClipToClipboard(id);
    },
    [selectedIds, ctx],
  );

  const handleDuplicate = useCallback(
    (clipId?: string) => {
      const id = clipId || (selectedIds.size > 0 ? Array.from(selectedIds)[0] : null);
      if (id) ctx.duplicateTimelineItem(id);
    },
    [selectedIds, ctx],
  );

  const handlePaste = useCallback(
    (specificTime?: number) => {
      ctx.pasteClipboardAt(specificTime !== undefined ? specificTime : currentTime);
    },
    [ctx, currentTime],
  );

  const handleSplit = useCallback(
    (clipId?: string) => {
      if (clipId) splitTimelineItem(clipId, currentTime);
    },
    [splitTimelineItem, currentTime],
  );

  const handleMerge = useCallback(() => {
    if (selectedIds.size >= 2) mergeTimelineItems(Array.from(selectedIds));
  }, [selectedIds, mergeTimelineItems]);

  const handleDelete = useCallback(
    (clipId?: string) => {
      if (clipId) deleteTimelineItem(clipId);
      else selectedIds.forEach((id) => deleteTimelineItem(id));
    },
    [deleteTimelineItem, selectedIds],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === 'Delete' && selectedIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleDelete();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [selectedIds, handleDelete]);

  const handleStartDrag = useCallback(
    (
      id: string,
      type: 'body' | 'start' | 'end',
      e: React.MouseEvent,
      startTime: number,
      endTime: number,
      timelineWidth: number,
      isDuplicate?: boolean,
    ) => {
      e.stopPropagation();
      if (isDuplicate && type === 'body') ctx.duplicateTimelineItem(id, startTime + 0.2);
      else startDrag(id, type, e, startTime, endTime, timelineWidth);
    },
    [ctx, startDrag],
  );

  const handleZoomChange = (newZoom: number) => {
    if (!scrollRef.current || !innerRef.current || mediaDuration === 0 || !isMediaLoaded) {
      setZoom(newZoom);
      return;
    }
    const sc = scrollRef.current;
    const inner = innerRef.current;
    const playheadPos = (currentTime / mediaDuration) * inner.scrollWidth;
    const scrollLeftBefore = sc.scrollLeft;
    const offset = playheadPos - scrollLeftBefore;

    setZoom(newZoom);

    requestAnimationFrame(() => {
      if (!innerRef.current || !scrollRef.current) return;
      const newInner = innerRef.current;
      const newSc = scrollRef.current;
      const newPlayheadPos = (currentTime / mediaDuration) * newInner.scrollWidth;
      if (isPlaying) newSc.scrollLeft = newPlayheadPos - offset;
      else newSc.scrollLeft = (scrollLeftBefore / inner.scrollWidth) * newInner.scrollWidth;
    });
  };

  const handleLocalDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDragOver(e);
    },
    [handleDragOver],
  );

  const handleLocalDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (handleDrop) handleDrop(e);
    },
    [handleDrop],
  );

  return (
    <div
      className="bg-app-surface p-4 rounded-lg border border-app-border flex-grow flex flex-col h-full"
      onDragOver={handleLocalDragOver}
      onDrop={handleLocalDrop}
      onContextMenu={(e) => openContextMenu(e)}
    >
      <TimelineHeader
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        snapToGrid={snapToGrid}
        toggleSnapToGrid={toggleSnapToGrid}
        zoom={zoom}
        setZoom={handleZoomChange}
        volume={volume}
        setVolume={setVolume}
        isMuted={isMuted}
        toggleMute={toggleMute}
        onClearTimeline={handleClearTimeline}
        isMediaLoaded={isMediaLoaded}
        hasClips={timelineData.length > 0}
        analyserRef={analyserRef}
        isPlaying={!!isPlaying}
        isVuOverlayEnabled={isVuOverlayEnabled}
        onToggleVuOverlay={onToggleVuOverlay}
      />

      <p className="text-sm text-app-gray mb-3 flex-shrink-0 font-mono">
        {formatTime(currentTime)} / {formatTime(mediaDuration)}
        {activeFile && isMediaLoaded && (
          <span className="ml-2 text-xs bg-primary/20 px-2 py-1 rounded">
            {activeFile.type.startsWith('video') ? 'Video' : 'Audio'}
          </span>
        )}
        {ctx.clipboardClip && (
          <span className="ml-2 text-xs bg-green-500/20 px-2 py-1 rounded text-green-400">
            Clip Copied
          </span>
        )}
        {isMediaLoaded && (
          <span className="ml-2 text-xs text-app-gray">
            {timelineData.length} clips
          </span>
        )}
      </p>

      <div
        ref={scrollRef}
        onMouseDown={onTimelineMouseDown}
        className={`rounded-lg flex-1 relative overflow-x-auto overflow-y-hidden lyrics-list-scrollbar ${
          isMediaLoaded ? '' : 'border-2 border-dashed border-app-border'
        }`}
      >
        {isMediaLoaded ? (
          <div
            ref={innerRef}
            className="relative h-full"
            style={{ width: `${Math.max(1, zoom) * 100}%` }}
          >
            <TimeRuler
              mediaDuration={mediaDuration}
              zoom={Math.max(1, zoom)}
              formatTime={formatTime}
              containerWidth={containerWidth}
            />
            <TrackLane>
              {timelineData.map((item) => (
                <TimelineClip
                  key={item.id}
                  item={item}
                  mediaDuration={mediaDuration}
                  isSelected={selectedIds.has(item.id)}
                  zoom={zoom}
                  containerWidth={containerWidth}
                  onStartDrag={(type, e, timelineWidth, isDuplicate) =>
                    handleStartDrag(
                      item.id,
                      type,
                      e,
                      item.startTime,
                      item.endTime,
                      timelineWidth,
                      isDuplicate,
                    )
                  }
                  onDelete={() => deleteTimelineItem(item.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(item.id, e);
                  }}
                  onContextMenu={openContextMenu}
                />
              ))}
            </TrackLane>
            <WaveformCanvas canvasRef={waveformRef} />
            <div
              className="absolute top-0 w-[3px] bg-red-500 h-full pointer-events-none z-20 shadow-lg shadow-red-500/50"
              style={{
                transform: `translateX(${
                  innerRef.current && mediaDuration > 0
                    ? (currentTime / mediaDuration) * innerRef.current.scrollWidth
                    : 0
                }px)`,
                opacity: isMediaLoaded || currentTime > 0 ? 1 : 0,
                transition: 'none',
                zIndex: 20,
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
        hasCopiedClip={!!ctx.clipboardClip}
        hasMultipleSelected={selectedIds.size >= 2}
      />
    </div>
  );
};

