// src/components/panels/TimelinePanel.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

interface TimelinePanelProps {
  onDrop?: (e: React.DragEvent) => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({ onDrop }) => {
  const ctx = useProjectEditor();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const lastVolume = useRef(ctx.volume);
  const [contextMenu, setContextMenu] = useState<TimelineContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });

  const { waveformRef, clear: clearWaveform } = useTimelineWaveform(
    ctx.activeFile,
    ctx.isMediaLoaded,
    ctx.settings.waveformColor,
    innerRef,
  );

  const { onMouseDown: onTimelineMouseDown } = useTimelineScrub(
    scrollRef,
    innerRef,
    ctx.mediaDuration,
    ctx.isMediaLoaded,
    ctx.handleSeek,
  );

  useAutoScrollPlayhead(
    scrollRef,
    innerRef,
    ctx.currentTime,
    ctx.mediaDuration,
    ctx.zoom,
    ctx.isMediaLoaded,
  );

  const { startDrag } = useDragClip(
    ctx.mediaDuration,
    ctx.settings.snapToGrid,
    ctx.updateTimelineData,
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateWidth = () => setContainerWidth(el.clientWidth);
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
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
    if (ctx.volume > 0 && isMuted) setIsMuted(false);
  }, [ctx.volume, isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) ctx.setVolume(lastVolume.current);
    else {
      lastVolume.current = ctx.volume;
      ctx.setVolume(0);
    }
    setIsMuted((v) => !v);
  }, [isMuted, ctx]);

  const handleClearTimeline = useCallback(() => {
    clearWaveform();
    setContextMenu({ visible: false, x: 0, y: 0 });
    ctx.handleClearTimelineAll();
  }, [clearWaveform, ctx]);

  const openContextMenu = useCallback(
    (e: React.MouseEvent, clipId?: string) => {
      e.preventDefault();
      e.stopPropagation();
      let timeAtClick = ctx.currentTime;
      if (innerRef.current && ctx.mediaDuration > 0) {
        const rect = innerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        timeAtClick = (x / rect.width) * ctx.mediaDuration;
      }
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        clipId,
        timeAtClick,
      });
    },
    [ctx.currentTime, ctx.mediaDuration],
  );

  const closeContextMenu = useCallback(
    () => setContextMenu({ visible: false, x: 0, y: 0 }),
    [],
  );

  const handleCopy = useCallback(
    (clipId?: string) => {
      const id =
        clipId || (ctx.selectedIds.size > 0 ? [...ctx.selectedIds][0] : null);
      if (id) ctx.copyClipToClipboard(id);
    },
    [ctx],
  );

  const handleDuplicate = useCallback(
    (clipId?: string) => {
      const id =
        clipId || (ctx.selectedIds.size > 0 ? [...ctx.selectedIds][0] : null);
      if (id) ctx.duplicateTimelineItem(id);
    },
    [ctx],
  );

  const handlePaste = useCallback(
    (specificTime?: number) => {
      ctx.pasteClipboardAt(
        specificTime !== undefined ? specificTime : ctx.currentTime,
      );
    },
    [ctx],
  );

  const handleSplit = useCallback(
    (clipId?: string) => {
      if (clipId) ctx.splitTimelineItem(clipId, ctx.currentTime);
    },
    [ctx],
  );

  const handleMerge = useCallback(() => {
    if (ctx.selectedIds.size >= 2) ctx.mergeTimelineItems([...ctx.selectedIds]);
  }, [ctx]);

  const handleDelete = useCallback(
    (clipId?: string) => {
      if (clipId) ctx.deleteTimelineItem(clipId);
      else ctx.selectedIds.forEach((id) => ctx.deleteTimelineItem(id));
    },
    [ctx],
  );

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
      if (isDuplicate && type === 'body') {
        ctx.duplicateTimelineItem(id, startTime + 0.2);
      } else {
        startDrag(id, type, e, startTime, endTime, timelineWidth);
      }
    },
    [ctx, startDrag],
  );

  const handleZoomChange = (newZoom: number) => {
    const sc = scrollRef.current;
    const inner = innerRef.current;
    if (!sc || !inner || ctx.mediaDuration === 0 || !ctx.isMediaLoaded) {
      ctx.setZoom(newZoom);
      return;
    }
    const playheadPos = (ctx.currentTime / ctx.mediaDuration) * inner.scrollWidth;
    const scrollLeftBefore = sc.scrollLeft;
    const offset = playheadPos - scrollLeftBefore;

    ctx.setZoom(newZoom);

    requestAnimationFrame(() => {
      const newInner = innerRef.current;
      const newSc = scrollRef.current;
      if (!newInner || !newSc) return;
      const newPlayheadPos =
        (ctx.currentTime / ctx.mediaDuration) * newInner.scrollWidth;
      newSc.scrollLeft = ctx.isPlaying
        ? newPlayheadPos - offset
        : (scrollLeftBefore / inner.scrollWidth) * newInner.scrollWidth;
    });
  };

  const handleLocalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleLocalDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop?.(e);
    },
    [onDrop],
  );

  return (
    /*
      FIX: this outer wrapper now has `overflow-hidden min-w-0` so any child
      that refuses to shrink (long FileTabs, wide ruler, header controls)
      gets clipped instead of pushing the column wider. The parent column
      already constrains us; we just need to honor the constraint.
    */
    <div
      className="bg-app-surface p-4 rounded-lg border border-app-border flex-grow flex flex-col h-full min-w-0 overflow-hidden"
      onDragOver={handleLocalDragOver}
      onDrop={handleLocalDrop}
      onContextMenu={(e) => openContextMenu(e)}
    >
      <div className="min-w-0 overflow-hidden flex-shrink-0">
        <TimelineHeader
          undo={ctx.undo}
          redo={ctx.redo}
          canUndo={ctx.canUndo}
          canRedo={ctx.canRedo}
          snapToGrid={ctx.settings.snapToGrid}
          toggleSnapToGrid={() =>
            ctx.handleSettingChange('snapToGrid', !ctx.settings.snapToGrid)
          }
          zoom={ctx.zoom}
          setZoom={handleZoomChange}
          volume={ctx.volume}
          setVolume={ctx.setVolume}
          isMuted={isMuted}
          toggleMute={toggleMute}
          onClearTimeline={handleClearTimeline}
          isMediaLoaded={ctx.isMediaLoaded}
          hasClips={ctx.timelineData.length > 0}
          analyserRef={ctx.analyserRef}
          isPlaying={ctx.isPlaying}
          isVuOverlayEnabled={ctx.isVuOverlayEnabled}
          onToggleVuOverlay={ctx.toggleVuOverlay}
        />
      </div>

      <p className="text-sm text-app-gray mb-3 flex-shrink-0 font-mono truncate min-w-0">
        {ctx.formatTime(ctx.currentTime)} / {ctx.formatTime(ctx.mediaDuration)}
        {ctx.activeFile && ctx.isMediaLoaded && (
          <span className="ml-2 text-xs bg-primary/20 px-2 py-1 rounded">
            {ctx.activeFile.type.startsWith('video') ? 'Video' : 'Audio'}
          </span>
        )}
        {ctx.clipboardClip && (
          <span className="ml-2 text-xs bg-green-500/20 px-2 py-1 rounded text-green-400">
            Clip Copied
          </span>
        )}
        {ctx.isMediaLoaded && (
          <span className="ml-2 text-xs text-app-gray">
            {ctx.timelineData.length} clips
          </span>
        )}
      </p>

      <div
        ref={scrollRef}
        onMouseDown={onTimelineMouseDown}
        className={`rounded-lg flex-1 min-h-0 min-w-0 relative overflow-x-auto overflow-y-hidden lyrics-list-scrollbar ${
          ctx.isMediaLoaded ? '' : 'border-2 border-dashed border-app-border'
        }`}
      >
        {ctx.isMediaLoaded ? (
          <div
            ref={innerRef}
            className="relative h-full"
            style={{ width: `${Math.max(1, ctx.zoom) * 100}%` }}
          >
            <TimeRuler
              mediaDuration={ctx.mediaDuration}
              zoom={Math.max(1, ctx.zoom)}
              formatTime={ctx.formatTime}
              containerWidth={containerWidth}
            />
            <TrackLane>
              {ctx.timelineData.map((item) => (
                <TimelineClip
                  key={item.id}
                  item={item}
                  mediaDuration={ctx.mediaDuration}
                  isSelected={ctx.selectedIds.has(item.id)}
                  zoom={ctx.zoom}
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
                  onDelete={() => ctx.deleteTimelineItem(item.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.toggleTimelineSelection(item.id, e);
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
                  innerRef.current && ctx.mediaDuration > 0
                    ? (ctx.currentTime / ctx.mediaDuration) *
                      innerRef.current.scrollWidth
                    : 0
                }px)`,
                opacity: ctx.isMediaLoaded || ctx.currentTime > 0 ? 1 : 0,
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
        hasMultipleSelected={ctx.selectedIds.size >= 2}
      />
    </div>
  );
};