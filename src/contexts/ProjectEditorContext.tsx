// src/contexts/ProjectEditorContext.tsx
import React, { createContext, useContext } from 'react';
import {
  AppSettings,
  LyricLine,
  ImportedMediaFile,
  TimelineMarker,
  StageStyle,
  TextStyle,
  FileTrack,
} from '../types/types';
import type { ImportSubtitleResult } from '../utils/subtitleImport';

export interface ProjectEditorContextValue {
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  mediaDuration: number;
  isMediaLoaded: boolean;
  mediaUrl: string | null;
  mediaElementRef: React.RefObject<HTMLVideoElement>;
  audioElementRef: React.RefObject<HTMLAudioElement>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;

  activeLeftPanelTab: 'subtitles' | 'lyrics';
  activeSubTab: 'edit' | 'styles' | 'templates';
  layout: {
    isVerticalLayout: boolean;
    isMaximizedVideo: boolean;
    isLeftPanelFilled: boolean;
    isLeftPanelTopRowFilled: boolean;
  };

  tracks: Record<string, FileTrack>;
  lyrics: LyricLine[];
  subtitles: LyricLine[];
  timelineData: LyricLine[];
  markers: TimelineMarker[];
  zoom: number;

  settings: AppSettings;
  stageStyle: StageStyle;
  lyricTextStyle: TextStyle;
  subtitleTextStyle: TextStyle;
  currentSubtitleText: string | null;
  subtitleLanguage: string;

  selectedSubtitleIds: Set<string>;
  selectedLyricIds: Set<string>;
  selectedIds: Set<string>;
  clipboardClip: LyricLine | null;

  importedFiles: ImportedMediaFile[];
  activeFileId: string | null;
  activeFile: ImportedMediaFile | null;
  loadingFileId: string | null;

  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  setIsPlaying: (value: boolean) => void;
  setVolume: (value: number) => void;
  handleSeek: (time: number) => void;
  togglePlayPause: () => void;

  setActiveLeftPanelTab: (tab: 'subtitles' | 'lyrics') => void;
  setActiveSubTab: (tab: 'edit' | 'styles' | 'templates') => void;
  setZoom: (value: number) => void;

  handleLyricChange: (
    id: string,
    field: 'text' | 'startTime' | 'endTime',
    value: string | number,
  ) => void;
  handleSubtitleChange: (
    id: string,
    field: 'text' | 'startTime' | 'endTime',
    value: string | number,
  ) => void;
  handleAddLyric: () => void;
  handleAddSubtitle: () => void;
  handleDeleteLyric: (id: string) => void;
  handleDeleteSubtitle: (id: string) => void;
  handleMergeSubtitles: () => void;
  handleSplitSubtitle: () => void;
  handleSplitSubtitleAt: (id: string, t: number) => void;
  handleBatchAddLyrics: (newLyrics: Omit<LyricLine, 'id'>[]) => void;
  handleBatchAddSubtitles: (newSubtitles: Omit<LyricLine, 'id'>[]) => void;

  toggleSubtitleSelection: (id: string) => void;
  toggleLyricSelection: (id: string) => void;
  toggleTimelineSelection: (id: string, e?: React.MouseEvent) => void;
  clearSelection: () => void;
  selectAll: () => void;

  handleSettingChange: (name: string, value: string | boolean | number) => void;
  setStageStyle: React.Dispatch<React.SetStateAction<StageStyle>>;
  setLyricTextStyle: React.Dispatch<React.SetStateAction<TextStyle>>;
  setSubtitleTextStyle: React.Dispatch<React.SetStateAction<TextStyle>>;
  setSubtitleLanguage: (lang: string) => void;

  updateTimelineData: (id: string, newStart: number, newEnd: number) => void;
  deleteTimelineItem: (id: string) => void;
  addTimelineItem: (item: LyricLine) => void;
  duplicateTimelineItem: (id: string, newStart?: number, newEnd?: number) => void;
  splitTimelineItem: (id: string, splitTime: number) => void;
  mergeTimelineItems: (ids: string[]) => void;

  addMarker: (time: number, label: string) => void;

  copyClipToClipboard: (id: string) => void;
  pasteClipboardAt: (time: number) => void;

  onFileActivate: (file: ImportedMediaFile) => Promise<void>;
  handleOpenFile: () => Promise<void>;
  handleFilesDropped: (files: File[]) => Promise<void>;
  handleClearTimelineAll: () => void;
  handleNewClip: () => void;
  switchActiveFile: (id: string) => void;

  formatTime: (seconds: number) => string;
  markAsUnsaved: () => void;
  pushHistory: (label: string) => void;

  isVuOverlayEnabled: boolean;
  toggleVuOverlay: () => void;

  importSubtitleFile: (
    file: File,
    options?: { replace?: boolean },
  ) => Promise<ImportSubtitleResult | null>;

  openStageSettingsModal: () => void;
}

const ProjectEditorContext = createContext<ProjectEditorContextValue | null>(null);

export const useProjectEditor = () => {
  const ctx = useContext(ProjectEditorContext);
  if (!ctx) {
    throw new Error('useProjectEditor must be used within ProjectEditorProvider');
  }
  return ctx;
};

export const ProjectEditorProvider: React.FC<{
  value: ProjectEditorContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <ProjectEditorContext.Provider value={value}>
    {children}
  </ProjectEditorContext.Provider>
);