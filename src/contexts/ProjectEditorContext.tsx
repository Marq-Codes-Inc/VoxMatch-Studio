import React, { createContext, useContext } from 'react';
import { AppSettings, LyricLine, ImportedMediaFile, TimelineMarker, StageStyle, TextStyle } from '../types/types';

export interface ProjectEditorContextValue {
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  activeLeftPanelTab: 'subtitles' | 'lyrics';
  activeSubTab: 'edit' | 'styles' | 'templates';
  lyrics: LyricLine[];
  subtitles: LyricLine[];
  selectedSubtitleIds: Set<string>;
  mediaDuration: number;
  isMediaLoaded: boolean;
  importedFiles: ImportedMediaFile[];
  activeFileId: string | null;
  mediaUrl: string | null;
  loadingFileId: string | null;
  zoom: number;
  markers: TimelineMarker[];
  currentSubtitleText: string | null;
  settings: AppSettings;
  stageStyle: StageStyle;
  lyricTextStyle: TextStyle;
  subtitleTextStyle: TextStyle;
  canUndo: boolean;
  canRedo: boolean;
  activeFile: ImportedMediaFile | null;
  timelineData: LyricLine[];
  
  setIsPlaying: (value: boolean) => void;
  setVolume: (value: number) => void;
  setActiveLeftPanelTab: (tab: 'subtitles' | 'lyrics') => void;
  setActiveSubTab: (tab: 'edit' | 'styles' | 'templates') => void;
  setZoom: (value: number) => void;
  handleSeek: (time: number) => void;
  togglePlayPause: () => void;
  handleLyricChange: (id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => void;
  handleSubtitleChange: (id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => void;
  handleAddLyric: () => void;
  handleAddSubtitle: () => void;
  handleDeleteLyric: (id: string) => void;
  handleDeleteSubtitle: (id: string) => void;
  handleMergeSubtitles: () => void;
  handleSplitSubtitle: () => void;
  toggleSubtitleSelection: (id: string) => void;
  handleBatchAddLyrics: (newLyrics: Omit<LyricLine, 'id'>[]) => void;
  handleBatchAddSubtitles: (newSubtitles: Omit<LyricLine, 'id'>[]) => void;
  undo: () => void;
  redo: () => void;
  handleSettingChange: (name: string, value: string | boolean | number) => void;
  setStageStyle: React.Dispatch<React.SetStateAction<StageStyle>>;
  setLyricTextStyle: React.Dispatch<React.SetStateAction<TextStyle>>;
  setSubtitleTextStyle: React.Dispatch<React.SetStateAction<TextStyle>>;
  
  // Media & Timeline Actions
  onFileActivate: (file: ImportedMediaFile) => Promise<void>;
  handleOpenFile: () => Promise<void>;
  handleFilesDropped: (files: File[]) => Promise<void>;
  handleClearTimelineAll: () => void;
  updateTimelineData: (id: string, newStart: number, newEnd: number) => void;
  deleteTimelineItem: (id: string) => void;
  addMarker: (time: number, label: string) => void;
  addTimelineItem: (item: LyricLine) => void;
  duplicateTimelineItem: (id: string, newStart?: number, newEnd?: number) => void;
  handleNewClip: () => void; // Added for Ctrl+N support
  
  formatTime: (seconds: number) => string;
  markAsUnsaved: () => void;
  
  mediaElementRef: React.RefObject<HTMLVideoElement>;
  audioElementRef: React.RefObject<HTMLAudioElement>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
}

const ProjectEditorContext = createContext<ProjectEditorContextValue | null>(null);

export const useProjectEditor = () => {
  const context = useContext(ProjectEditorContext);
  if (!context) {
    throw new Error('useProjectEditor must be used within ProjectEditorProvider');
  }
  return context;
};

export const ProjectEditorProvider: React.FC<{
  value: ProjectEditorContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <ProjectEditorContext.Provider value={value}>
      {children}
    </ProjectEditorContext.Provider>
  );
};