// src/hooks/useLayoutResize.ts (Fixed - ensure it's a proper module)
import { useState, useCallback, useEffect } from 'react';

export type ResizeType = 
  | 'vertical-left-width'
  | 'vertical-top-split'
  | 'vertical-bottom-height'
  | 'horizontal-left-width'
  | 'horizontal-video-height'
  | 'horizontal-timeline-height';

export interface LayoutSizes {
  vertical: {
    leftWidth: number;
    topSplit: number;
    bottomHeight: number;
  };
  horizontal: {
    leftWidth: number;
    videoHeight: number;
  };
}

interface ResizeState {
  type: ResizeType;
  startX: number;
  startY: number;
  initialSizes: LayoutSizes;
}

const DEFAULT_SIZES: LayoutSizes = {
  vertical: {
    leftWidth: 60,
    topSplit: 35,
    bottomHeight: 40,
  },
  horizontal: {
    leftWidth: 35,
    videoHeight: 60,
  },
};

export function useLayoutResize(initialSizes?: Partial<LayoutSizes>) {
  const [sizes, setSizes] = useState<LayoutSizes>({
    vertical: { ...DEFAULT_SIZES.vertical, ...initialSizes?.vertical },
    horizontal: { ...DEFAULT_SIZES.horizontal, ...initialSizes?.horizontal },
  });
  const [isResizing, setIsResizing] = useState<ResizeState | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const updateContainerRect = useCallback((element: HTMLElement | null) => {
    if (element) {
      setContainerRect(element.getBoundingClientRect());
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRect) return;

    const { type, startX, startY, initialSizes } = isResizing;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    setSizes(prev => {
      const newSizes = { ...prev };

      switch (type) {
        case 'vertical-left-width': {
          const newWidth = Math.min(75, Math.max(40, 
            initialSizes.vertical.leftWidth + (deltaX / containerRect.width) * 100
          ));
          newSizes.vertical.leftWidth = newWidth;
          break;
        }
        case 'vertical-top-split': {
          const leftPanelWidthPx = (containerRect.width * prev.vertical.leftWidth) / 100;
          const newSplit = Math.min(60, Math.max(25, 
            initialSizes.vertical.topSplit + (deltaX / leftPanelWidthPx) * 100
          ));
          newSizes.vertical.topSplit = newSplit;
          break;
        }
        case 'vertical-bottom-height': {
          const leftPanelHeightPx = containerRect.height;
          const newHeight = Math.min(60, Math.max(20, 
            initialSizes.vertical.bottomHeight + (deltaY / leftPanelHeightPx) * 100
          ));
          newSizes.vertical.bottomHeight = newHeight;
          break;
        }
        case 'horizontal-left-width': {
          const newWidth = Math.min(60, Math.max(20, 
            initialSizes.horizontal.leftWidth + (deltaX / containerRect.width) * 100
          ));
          newSizes.horizontal.leftWidth = newWidth;
          break;
        }
        case 'horizontal-video-height': {
          const rightPanelHeightPx = containerRect.height;
          const newHeight = Math.min(80, Math.max(30, 
            initialSizes.horizontal.videoHeight + (deltaY / rightPanelHeightPx) * 100
          ));
          newSizes.horizontal.videoHeight = newHeight;
          break;
        }
      }

      return newSizes;
    });
  }, [isResizing, containerRect]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizing.type.includes('width') || isResizing.type.includes('split') 
        ? 'col-resize' 
        : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const startResize = useCallback((type: ResizeType, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing({
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialSizes: sizes,
    });
  }, [sizes]);

  const resetSizes = useCallback(() => {
    setSizes(DEFAULT_SIZES);
  }, []);

  return {
    sizes,
    setSizes,
    isResizing,
    startResize,
    updateContainerRect,
    resetSizes,
  };
}
