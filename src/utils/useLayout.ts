// src/utils/useLayout.ts
import { useState, useCallback } from 'react';
import { LayoutState, LayoutPanels } from '../types/types';

const DEFAULT_PANELS: LayoutPanels = {
  leftPanelWidth: 35,
  videoPanelHeight: 60,
  importMediaPanelHeight: 40,
  lyricsPanelHeight: 60,
  timelinePanelHeight: 40,
  importMediaPanelVerticalWidth: 40,
  leftPanelBottomHeight: 60
};

const DEFAULT_LAYOUT: LayoutState = {
  isVerticalLayout: false,
  isMaximizedVideo: false,
  isLeftPanelFilled: false,
  isLeftPanelTopRowFilled: false,
  panels: DEFAULT_PANELS
};

interface LayoutActions {
  updatePanel: (updates: Partial<LayoutPanels>) => void;
  toggleVerticalLayout: () => void;
  toggleMaximizeVideo: () => void;
  resetLayout: () => void;
  setIsMaximizedVideo: (value: boolean) => void;
  setIsLeftPanelFilled: (value: boolean) => void;
  setIsLeftPanelTopRowFilled: (value: boolean) => void;
}

export function useLayout(
  initialLayout: LayoutState | undefined,
  mediaControls?: any
): { layout: LayoutState } & LayoutActions {
  const [layout, setLayout] = useState<LayoutState>(initialLayout || DEFAULT_LAYOUT);

  const updatePanel = useCallback((updates: Partial<LayoutPanels>) => {
    setLayout(prev => ({
      ...prev,
      panels: { ...prev.panels, ...updates }
    }));
  }, []);

  const toggleVerticalLayout = useCallback(() => {
    setLayout(prev => ({
      ...prev,
      isVerticalLayout: !prev.isVerticalLayout
    }));
  }, []);

  const toggleMaximizeVideo = useCallback(() => {
    setLayout(prev => ({
      ...prev,
      isMaximizedVideo: !prev.isMaximizedVideo
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
  }, []);

  const setIsMaximizedVideo = useCallback((value: boolean) => {
    setLayout(prev => ({ ...prev, isMaximizedVideo: value }));
  }, []);

  const setIsLeftPanelFilled = useCallback((value: boolean) => {
    setLayout(prev => ({ ...prev, isLeftPanelFilled: value }));
  }, []);

  const setIsLeftPanelTopRowFilled = useCallback((value: boolean) => {
    setLayout(prev => ({ ...prev, isLeftPanelTopRowFilled: value }));
  }, []);

  return {
    layout,
    updatePanel,
    toggleVerticalLayout,
    toggleMaximizeVideo,
    resetLayout,
    setIsMaximizedVideo,
    setIsLeftPanelFilled,
    setIsLeftPanelTopRowFilled
  };
}