// src/types/history.ts
import type {
  AppSettings,
  ImportedMediaFile,
  FileTrack,
} from './types';

export interface ProjectSnapshot {
  tracks: Record<string, FileTrack>;
  activeFileId: string | null;
  activeLeftPanelTab: 'subtitles' | 'lyrics';
  subtitleLanguage: string;
  importedFiles: ImportedMediaFile[];
  settings: AppSettings;
  layout: {
    isVerticalLayout: boolean;
    isMaximizedVideo: boolean;
    isLeftPanelFilled: boolean;
    isLeftPanelTopRowFilled: boolean;
  };
}

export interface HistoryEntry<T> {
  state: T;
  label: string;
  ts: number;
}

export interface HistoryLogEvent {
  ts: number;
  action: 'reset' | 'push' | 'undo' | 'redo' | 'skip';
  label?: string;
  reason?: string;
  index: number;
}