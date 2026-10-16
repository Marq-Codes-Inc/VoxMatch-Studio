// src/types/types.ts

// Media

export interface ImportedMediaFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  duration?: number;
  url: string | null;
  loaded: boolean;
  file?: File;
  posterDataUrl?: string | null;
}

// Settings

export interface TimingSettings {
  baseDurationPerChar: number;
  minClipDuration: number;
  maxClipDuration: number;
  pauseBetweenClips: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  snapToGrid: boolean;
  defaultSubtitleLanguage?: string;
  waveformColor: string;
  defaultReadingSpeed: 'slow' | 'normal' | 'fast';
  timing: TimingSettings;
  autoSave?: boolean;
  autoSaveFrequency?: number;
}

// Lyrics / Subtitles

export interface LyricLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color?: string;
}

// Stage

export interface GradientStop {
  color: string;
  position: number;
}

export interface StageGradient {
  type: 'linear' | 'radial' | 'conic';
  angle?: number;
  stops: GradientStop[];
}

export interface StageLayer {
  id: string;
  type: 'color' | 'gradient' | 'image' | 'video';
  content: string;
  opacity: number;
  blendMode: string;
  visible?: boolean;
  locked?: boolean;
  name?: string;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  fileName?: string;
  gradient?: StageGradient;
}

export interface StageStyle {
  layers: StageLayer[];
  backgroundColor: string;
  backgroundImage?: string;
  backgroundOpacity: number;
  aspectRatio?: string;
  customWidth?: number;
  customHeight?: number;
  showSafeArea?: boolean;
  hideVideoLayer?: boolean;
  hideAudioTitle?: boolean;
}

// Text Styles

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  uppercase: boolean;
  letterSpacing: number;
  lineHeight: number;
  textColor: string;
  withBg: boolean;
  bgColor: string;
  bgOpacity: number;
  padding: number;
  borderRadius: number;
  textAlign: 'left' | 'center' | 'right';
  position: { x: number; y: number };
  width: number;
  verticalAlign: 'flex-start' | 'center' | 'flex-end';
  horizontalAlign: 'flex-start' | 'center' | 'flex-end';
  animation?: string;
}

// Layout

export interface LayoutPanels {
  leftPanelWidth: number;
  videoPanelHeight: number;
  importMediaPanelHeight: number;
  lyricsPanelHeight: number;
  timelinePanelHeight: number;
  importMediaPanelVerticalWidth: number;
  leftPanelBottomHeight: number;
}

export interface LayoutState {
  isVerticalLayout: boolean;
  isMaximizedVideo: boolean;
  isLeftPanelFilled: boolean;
  isLeftPanelTopRowFilled: boolean;
  panels: LayoutPanels;
}

// Context Menu

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  file: ImportedMediaFile | null;
}

// Per-file Track

export interface FileTrack {
  lyrics: LyricLine[];
  subtitles: LyricLine[];
  markers: TimelineMarker[];
  stageStyle: StageStyle;
  lyricTextStyle: TextStyle;
  subtitleTextStyle: TextStyle;
  zoom: number;
  mode: 'lyrics' | 'subtitles';
}

// Project

export interface VoxMatchProject {
  id: string;
  name: string;
  mode: 'lyrics' | 'subtitles';
  mediaFiles: ImportedMediaFile[];
  activeFileId: string | null;
  settings: AppSettings;
  layout: LayoutState;
  isSaved: boolean;
  createdAt: number;
  updatedAt: number;
  projectFilePath?: string;
  schemaVersion?: number;

  // Top-level properties (mirror the active track; what existing UI reads/writes)
  lyrics: LyricLine[];
  subtitles: LyricLine[];
  markers: TimelineMarker[];
  stageStyle: StageStyle;
  lyricTextStyle: TextStyle;
  subtitleTextStyle: TextStyle;
  zoom: number;

  // Track map for multi-file support
  tracks: Record<string, FileTrack>;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  updatedAt: number;
  thumbnail?: string;
}

export const VXM_SCHEMA_VERSION = 2;