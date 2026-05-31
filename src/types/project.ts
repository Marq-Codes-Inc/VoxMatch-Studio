// src/types/project.ts
import { LyricLine, ImportedMediaFile, TimelineMarker, StageStyle, TextStyle, AppSettings, LayoutState } from './types';

export interface VoxMatchProject {
  id: string;
  name: string;
  mode: 'lyrics' | 'subtitles';
  lyrics: LyricLine[];
  subtitles: LyricLine[];
  mediaFiles: ImportedMediaFile[];
  activeFileId: string | null;
  markers: TimelineMarker[];
  settings: AppSettings;
  stageStyle: StageStyle;
  lyricTextStyle: TextStyle;
  subtitleTextStyle: TextStyle;
  layout: LayoutState;
  zoom: number;
  isSaved: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  updatedAt: number;
  thumbnail?: string;
}
