// src/components/layout/HorizontalLayout.tsx
import React, { useCallback, useRef } from 'react';
import { useProjectEditor } from '../../contexts/ProjectEditorContext';
import { ImportMediaPanel } from '../panels/ImportMediaPanel';
import { LyricsSubtitlesPanel } from '../panels/SubtitlesLyricsEditPanel';
import { TimelinePanel } from '../panels/TimelinePanel';
import { ResizeHandle } from './ResizeHandle';
import { usePanelResize } from './usePanelResize';
import { ImportedMediaFile } from '../../types/types';

export interface HorizontalLayoutSizes {
  leftWidth: number;
  videoHeight: number;
  importHeight: number;
}

interface HorizontalLayoutProps {
  sizes: HorizontalLayoutSizes;
  onResize: (updates: Partial<HorizontalLayoutSizes>) => void;
  isLeftPanelFilled: boolean;
  isMaximizedVideo: boolean;
  onToggleLeftPanelFilled: () => void;
  onToggleMaximizeVideo: () => void;
  onContextMenu?: (
    e: React.MouseEvent | React.SyntheticEvent,
    file: ImportedMediaFile,
    targetElement?: HTMLElement,
  ) => void;
  onOpenStageSettingsModal?: () => void;
  videoSlotRef: React.RefObject<HTMLDivElement>;
}

type ResizeType = 'left-width' | 'video-height' | 'left-panel-horizontal';

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const NOOP_CONTEXT_MENU = () => {};

export const HorizontalLayout: React.FC<HorizontalLayoutProps> = ({
  sizes,
  onResize,
  isLeftPanelFilled,
  isMaximizedVideo,
  onToggleLeftPanelFilled,
  onToggleMaximizeVideo,
  onContextMenu,
  onOpenStageSettingsModal,
  videoSlotRef,
}) => {
  const context = useProjectEditor();
  const rootRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const { startResize } = usePanelResize<ResizeType, HorizontalLayoutSizes>({
    rootRef,
    sizes,
    onResize,
    cursorFor: (type) => (type === 'left-width' ? 'col-resize' : 'row-resize'),
    computeUpdates: ({
      type,
      deltaX,
      deltaY,
      initialSizes,
      rootWidth,
      rootHeight,
    }) => {
      const updates: Partial<HorizontalLayoutSizes> = {};
      if (type === 'left-width') {
        updates.leftWidth = clamp(
          initialSizes.leftWidth + (deltaX / rootWidth) * 100,
          20,
          60,
        );
      } else if (type === 'video-height') {
        updates.videoHeight = clamp(
          initialSizes.videoHeight + (deltaY / rootHeight) * 100,
          20,
          80,
        );
      } else if (type === 'left-panel-horizontal') {
        const panel = leftPanelRef.current;
        if (!panel) return {};
        const h = panel.getBoundingClientRect().height;
        if (h <= 0) return {};
        updates.importHeight = clamp(
          initialSizes.importHeight + (deltaY / h) * 100,
          20,
          70,
        );
      }
      return updates;
    },
  });

  const importHeight = sizes.importHeight || 40;
  const lyricsHeight = isLeftPanelFilled ? 100 : 100 - importHeight;

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
      {/* Left column — hidden while maximized. */}
      <div
        ref={leftPanelRef}
        className={`flex flex-col min-h-0 ${isMaximizedVideo ? 'hidden' : ''}`}
        style={{
          width: `${sizes.leftWidth}%`,
          flexShrink: 0,
          flexGrow: 0,
          minWidth: 0,
        }}
      >
        {!isLeftPanelFilled && (
          <>
            <div style={{ height: `${importHeight}%` }} className="min-h-0">
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
            <ResizeHandle
              orientation="horizontal"
              onMouseDown={(e) => startResize('left-panel-horizontal', e)}
            />
          </>
        )}

        <div className="flex-1 min-h-0" style={{ height: `${lyricsHeight}%` }}>
          <LyricsSubtitlesPanel
            isLeftPanelFilled={isLeftPanelFilled}
            setIsLeftPanelFilled={onToggleLeftPanelFilled}
            isVerticalLayout={false}
            isLeftPanelTopRowFilled={false}
            setIsLeftPanelTopRowFilled={() => {}}
            onOpenStageSettingsModal={onOpenStageSettingsModal}
          />
        </div>
      </div>

      {!isMaximizedVideo && (
        <ResizeHandle
          orientation="vertical"
          onMouseDown={(e) => startResize('left-width', e)}
        />
      )}

      {/* Right column — grows to fill. */}
      <div
        className="flex flex-col flex-1 min-h-0"
        style={{ minWidth: 0, flexShrink: 1, flexBasis: 0 }}
      >
        {/* Empty placeholder measured by ProjectEditor. pointer-events-none
            so it never intercepts clicks meant for the floating panel. */}
        <div
          ref={videoSlotRef}
          style={{
            height: isMaximizedVideo ? '100%' : `${sizes.videoHeight}%`,
            flexShrink: 0,
          }}
          className="min-h-0 pointer-events-none"
        />

        {!isMaximizedVideo && (
          <>
            <ResizeHandle
              orientation="horizontal"
              onMouseDown={(e) => startResize('video-height', e)}
            />
            <div
              className="min-h-0 overflow-hidden"
              style={{ height: `${100 - sizes.videoHeight}%`, minWidth: 0 }}
            >
              <TimelinePanel onDrop={handleTimelineDrop} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
