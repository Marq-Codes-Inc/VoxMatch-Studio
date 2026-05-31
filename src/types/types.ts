// src/types/types.ts - Updated with full StageLayer properties

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
}

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
  // Visibility and locking
  visible?: boolean;
  locked?: boolean;
  name?: string;
  // Transform properties
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  // Image/Video specific
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  fileName?: string;
  // Gradient specific
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
}

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
  animation?: string;   // <-- add this line
}

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

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  file: ImportedMediaFile | null;
}

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
  projectFilePath?: string;
}

