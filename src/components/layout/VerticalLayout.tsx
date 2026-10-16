// src/components/layout/VerticalLayout.tsx
import React, { useCallback, useRef } from 'react';
import { useProjectEditor } from '../../contexts/ProjectEditorContext';
import { ImportMediaPanel } from '../panels/ImportMediaPanel';
import { LyricsSubtitlesPanel } from '../panels/SubtitlesLyricsEditPanel';
import { TimelinePanel } from '../panels/TimelinePanel';
import { ResizeHandle } from './ResizeHandle';
import { usePanelResize } from './usePanelResize';
import { ImportedMediaFile } from '../../types/types';

export interface VerticalLayoutSizes {
  leftWidth: number;
  topSplit: number;
  bottomHeight: number;
}

interface VerticalLayoutProps {
  sizes: VerticalLayoutSizes;
  onResize: (updates: Partial<VerticalLayoutSizes>) => void;
  isLeftPanelTopRowFilled: boolean;
  isMaximizedVideo: boolean;
  onToggleLeftPanelTopRowFilled: () => void;
  onToggleMaximizeVideo: () => void;
  onContextMenu?: (
    e: React.MouseEvent | React.SyntheticEvent,
    file: ImportedMediaFile,
    targetElement?: HTMLElement,
  ) => void;
  onOpenStageSettingsModal?: () => void;
  videoSlotRef: React.RefObject<HTMLDivElement>;
}

type ResizeType = 'left-width' | 'top-split' | 'bottom-height';

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const NOOP_CONTEXT_MENU = () => {};

export const VerticalLayout: React.FC<VerticalLayoutProps> = ({
  sizes,
  onResize,
  isLeftPanelTopRowFilled,
  isMaximizedVideo,
  onToggleLeftPanelTopRowFilled,
  onToggleMaximizeVideo,
  onContextMenu,
  onOpenStageSettingsModal,
  videoSlotRef,
}) => {
  const context = useProjectEditor();
  const rootRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const { startResize } = usePanelResize<ResizeType, VerticalLayoutSizes>({
    rootRef,
    sizes,
    onResize,
    cursorFor: (type) =>
      type === 'top-split' || type === 'left-width'
        ? 'col-resize'
        : 'row-resize',
    computeUpdates: ({ type, deltaX, deltaY, initialSizes, rootWidth }) => {
      const updates: Partial<VerticalLayoutSizes> = {};
      if (type === 'left-width') {
        updates.leftWidth = clamp(
          initialSizes.leftWidth + (deltaX / rootWidth) * 100,
          50,
          75,
        );
      } else if (type === 'top-split') {
        const panel = leftPanelRef.current;
        if (!panel) return {};
        const w = panel.getBoundingClientRect().width;
        if (w <= 0) return {};
        updates.topSplit = clamp(
          initialSizes.topSplit + (deltaX / w) * 100,
          25,
          60,
        );
      } else if (type === 'bottom-height') {
        const panel = leftPanelRef.current;
        if (!panel) return {};
        const h = panel.getBoundingClientRect().height;
        if (h <= 0) return {};
        updates.bottomHeight = clamp(
          initialSizes.bottomHeight + (-deltaY / h) * 100,
          20,
          60,
        );
      }
      return updates;
    },
  });

  const topRowHeight = 100 - sizes.bottomHeight;

  const handleTimelineDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const fileId = e.dataTransfer.getData('text/plain');
      const file = context.importedFiles.find((f) => f.id === fileId);
      if (file) await context.onFileActivate(file);
    },
    [context],
  );

  return (
    <div
      ref={rootRef}
      className="relative z-20 flex flex-row w-full h-full p-2"
    >
      {/* Left column — fixed width, never shrinks. */}
      <div
        ref={leftPanelRef}
        className="flex flex-col min-h-0"
        style={{
          width: `${sizes.leftWidth}%`,
          flexShrink: 0,
          flexGrow: 0,
          minWidth: 0,
        }}
      >
        <div
          className="flex flex-row min-h-0"
          style={{ height: `${topRowHeight}%`, flexShrink: 0 }}
        >
          <div
            className={`min-w-0 ${isLeftPanelTopRowFilled ? 'hidden' : ''}`}
            style={{
              width: `${sizes.topSplit}%`,
              flexShrink: 0,
              flexGrow: 0,
            }}
          >
            <ImportMediaPanel
              importedFiles={context.importedFiles}
              activeFileId={context.activeFileId}
              loadingFileId={context.loadingFileId}
              handleOpenFile={context.handleOpenFile}
              handleContextMenu={onContextMenu ?? NOOP_CONTEXT_MENU}
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

          <div
            className="flex-1 min-w-0"
            style={{ minWidth: 0, flexBasis: 0, flexShrink: 1 }}
          >
            <LyricsSubtitlesPanel
              isLeftPanelFilled={false}
              setIsLeftPanelFilled={() => {}}
              isVerticalLayout={true}
              isLeftPanelTopRowFilled={isLeftPanelTopRowFilled}
              setIsLeftPanelTopRowFilled={onToggleLeftPanelTopRowFilled}
              onOpenStageSettingsModal={onOpenStageSettingsModal}
            />
          </div>
        </div>

        <ResizeHandle
          orientation="horizontal"
          onMouseDown={(e) => startResize('bottom-height', e)}
        />

        <div
          className="min-h-0 overflow-hidden"
          style={{ height: `${sizes.bottomHeight}%`, minWidth: 0, flexShrink: 0 }}
        >
          <TimelinePanel onDrop={handleTimelineDrop} />
        </div>
      </div>

      {!isMaximizedVideo && (
        <ResizeHandle
          orientation="vertical"
          onMouseDown={(e) => startResize('left-width', e)}
        />
      )}

      {/* Right column — grows to fill, allowed to shrink below content. */}
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{ minWidth: 0, flexShrink: 1, flexBasis: 0 }}
      >
        <div
          ref={videoSlotRef}
          className="flex-1 min-h-0"
          style={{ minHeight: 0 }}
        />
      </div>
    </div>
  );
};