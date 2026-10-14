// src/components/layout/VerticalLayout.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useProjectEditor } from '../../contexts/ProjectEditorContext';
import { ImportMediaPanel } from '../panels/ImportMediaPanel';
import { LyricsSubtitlesPanel } from '../panels/SubtitlesLyricsEditPanel';
import { TimelinePanel } from '../panels/TimelinePanel';
import { ResizeHandle } from './ResizeHandle';
import { ImportedMediaFile } from '../../types/types';

type ResizeType = 'left-width' | 'top-split' | 'bottom-height';

interface ResizeState {
  type: ResizeType;
  startX: number;
  startY: number;
  initialLeftWidth: number;
  initialTopSplit: number;
  initialBottomHeight: number;
  containerWidth: number;
  containerHeight: number;
}

interface VerticalLayoutSizes {
  leftWidth: number;
  topSplit: number;
  bottomHeight: number;
}

interface VerticalLayoutProps {
  sizes: VerticalLayoutSizes;
  onResize: (updates: Partial<VerticalLayoutSizes>) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  isLeftPanelTopRowFilled: boolean;
  isMaximizedVideo: boolean;
  onToggleLeftPanelTopRowFilled: () => void;
  onToggleMaximizeVideo: () => void;
  onContextMenu?: (
    e: React.MouseEvent | React.SyntheticEvent,
    file: ImportedMediaFile,
    targetElement?: HTMLElement,
  ) => void;
  onDragStart?: (e: React.DragEvent, file: ImportedMediaFile) => void;
  onOpenStageSettingsModal?: () => void;
  videoSlotRef: React.RefObject<HTMLDivElement>;
}

export const VerticalLayout: React.FC<VerticalLayoutProps> = ({
  sizes,
  onResize,
  containerRef,
  isLeftPanelTopRowFilled,
  isMaximizedVideo,
  onToggleLeftPanelTopRowFilled,
  onToggleMaximizeVideo,
  onContextMenu,
  onDragStart,
  onOpenStageSettingsModal = () => {},
  videoSlotRef,
}) => {
  const context = useProjectEditor();
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  const handleContextMenu = onContextMenu || (() => {});
  const handleDragStart = onDragStart || (() => {});

  const startResize = useCallback(
    (type: ResizeType, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      setResizeState({
        type,
        startX: e.clientX,
        startY: e.clientY,
        initialLeftWidth: sizes.leftWidth,
        initialTopSplit: sizes.topSplit,
        initialBottomHeight: sizes.bottomHeight,
        containerWidth: rect.width,
        containerHeight: rect.height,
      });

      document.body.style.cursor =
        type === 'top-split' || type === 'left-width'
          ? 'col-resize'
          : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [sizes, containerRef],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeState) return;

      const {
        type,
        startX,
        startY,
        initialLeftWidth,
        initialTopSplit,
        initialBottomHeight,
        containerWidth,
        containerHeight,
      } = resizeState;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const updates: Partial<VerticalLayoutSizes> = {};

      switch (type) {
        case 'left-width': {
          const deltaPercent = (deltaX / containerWidth) * 100;
          updates.leftWidth = Math.min(
            75,
            Math.max(50, initialLeftWidth + deltaPercent),
          );
          break;
        }
        case 'top-split': {
          if (!leftPanelRef.current) return;
          const leftPanelRect = leftPanelRef.current.getBoundingClientRect();
          const deltaPercent = (deltaX / leftPanelRect.width) * 100;
          updates.topSplit = Math.min(
            60,
            Math.max(25, initialTopSplit + deltaPercent),
          );
          break;
        }
        case 'bottom-height': {
          if (!leftPanelRef.current) return;
          const leftPanelRect = leftPanelRef.current.getBoundingClientRect();
          const deltaPercent = (-deltaY / leftPanelRect.height) * 100;
          updates.bottomHeight = Math.min(
            60,
            Math.max(20, initialBottomHeight + deltaPercent),
          );
          break;
        }
      }

      if (Object.keys(updates).length > 0) onResize(updates);
    },
    [resizeState, onResize],
  );

  const stopResize = useCallback(() => {
    setResizeState(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (resizeState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResize);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [resizeState, handleMouseMove, stopResize]);

  const topRowHeight = 100 - sizes.bottomHeight;
  const rightColumnWidth = 100 - sizes.leftWidth;

  const handleTimelineDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const fileId = e.dataTransfer.getData('text/plain');
      const fileToLoad = context.importedFiles.find((f) => f.id === fileId);
      if (fileToLoad) {
        await context.onFileActivate(fileToLoad);
      }
    },
    [context.importedFiles, context.onFileActivate],
  );

  return (
    <div className="flex flex-row w-full h-full p-2 gap-2">
      <div
        ref={leftPanelRef}
        className="flex flex-col gap-2 min-h-0"
        style={{ width: `${sizes.leftWidth}%` }}
      >
        <div
          className="flex flex-row gap-2 min-h-0"
          style={{ height: `${topRowHeight}%` }}
        >
          <div
            className={`min-w-0 ${isLeftPanelTopRowFilled ? 'hidden' : ''}`}
            style={{ width: `${sizes.topSplit}%` }}
          >
            <ImportMediaPanel
              importedFiles={context.importedFiles}
              activeFileId={context.activeFileId}
              loadingFileId={context.loadingFileId || undefined}
              handleOpenFile={context.handleOpenFile}
              handleContextMenu={handleContextMenu}
              handleDragStart={handleDragStart}
              onFileActivate={context.onFileActivate}
              onFilesDropped={context.handleFilesDropped}
            />
          </div>

          {!isLeftPanelTopRowFilled && (
            <ResizeHandle
              orientation="vertical"
              onMouseDown={(e) => startResize('top-split', e)}
            />
          )}

          <div className="flex-1 min-w-0">
            <LyricsSubtitlesPanel
              activeLeftPanelTab={context.activeLeftPanelTab}
              setActiveLeftPanelTab={context.setActiveLeftPanelTab}
              activeSubTab={context.activeSubTab}
              setActiveSubTab={context.setActiveSubTab}
              lyrics={context.lyrics}
              subtitles={context.subtitles}
              handleLyricChange={context.handleLyricChange}
              handleSubtitleChange={context.handleSubtitleChange}
              handleAddSubtitle={context.handleAddSubtitle}
              handleAddLyric={context.handleAddLyric}
              handleDeleteSubtitle={context.handleDeleteSubtitle}
              handleDeleteLyric={context.handleDeleteLyric}
              handleMergeSubtitles={context.handleMergeSubtitles}
              handleSplitSubtitle={context.handleSplitSubtitle}
              formatTime={context.formatTime}
              isLeftPanelFilled={false}
              setIsLeftPanelFilled={() => {}}
              isVerticalLayout={true}
              isLeftPanelTopRowFilled={isLeftPanelTopRowFilled}
              setIsLeftPanelTopRowFilled={onToggleLeftPanelTopRowFilled}
              selectedSubtitleIds={context.selectedSubtitleIds}
              toggleSubtitleSelection={context.toggleSubtitleSelection}
              stageStyle={context.stageStyle}
              setStageStyle={context.setStageStyle}
              lyricTextStyle={context.lyricTextStyle}
              setLyricTextStyle={context.setLyricTextStyle}
              subtitleTextStyle={context.subtitleTextStyle}
              setSubtitleTextStyle={context.setSubtitleTextStyle}
              subtitleLanguage="en-US"
              setSubtitleLanguage={() => {}}
              onOpenStageSettingsModal={onOpenStageSettingsModal}
              handleBatchAddLyrics={context.handleBatchAddLyrics}
              handleBatchAddSubtitles={context.handleBatchAddSubtitles}
              currentTime={context.currentTime}
              mediaDuration={context.mediaDuration}
              settings={context.settings}
              onImportSubtitleFile={context.importSubtitleFile}
            />
          </div>
        </div>

        <ResizeHandle
          orientation="horizontal"
          onMouseDown={(e) => startResize('bottom-height', e)}
        />

        <div
          className="min-h-0 overflow-hidden"
          style={{ height: `${sizes.bottomHeight}%` }}
        >
          <TimelinePanel
            currentTime={context.currentTime}
            mediaDuration={context.mediaDuration}
            isMediaLoaded={context.isMediaLoaded}
            formatTime={context.formatTime}
            handleSeek={context.handleSeek}
            handleDragOver={(e) => e.preventDefault()}
            handleDrop={handleTimelineDrop}
            activeFile={context.activeFile}
            volume={context.volume}
            setVolume={context.setVolume}
            zoom={context.zoom}
            setZoom={context.setZoom}
            timelineData={context.timelineData}
            updateTimelineData={context.updateTimelineData}
            deleteTimelineItem={context.deleteTimelineItem}
            selectedIds={context.selectedSubtitleIds}
            toggleSelection={context.toggleSubtitleSelection}
            undo={context.undo}
            redo={context.redo}
            canUndo={context.canUndo}
            canRedo={context.canRedo}
            snapToGrid={context.settings.snapToGrid}
            toggleSnapToGrid={() =>
              context.handleSettingChange(
                'snapToGrid',
                !context.settings.snapToGrid,
              )
            }
            addMarker={context.addMarker}
            markers={context.markers}
            analyserRef={context.analyserRef}
            isPlaying={context.isPlaying}
            waveformColor={context.settings.waveformColor}
            onClearTimelineAll={context.handleClearTimelineAll}
            isVuOverlayEnabled={context.isVuOverlayEnabled}
            onToggleVuOverlay={context.toggleVuOverlay}
          />
        </div>
      </div>

      {!isMaximizedVideo && (
        <ResizeHandle
          orientation="vertical"
          onMouseDown={(e) => startResize('left-width', e)}
        />
      )}

      <div
        className="flex-1 flex flex-col min-w-0"
        style={{ width: `${rightColumnWidth}%` }}
      >
        <div ref={videoSlotRef} className="flex-1 min-h-0" />
      </div>
    </div>
  );
};