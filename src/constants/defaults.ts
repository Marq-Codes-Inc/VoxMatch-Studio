// src/constants/defaults.ts
import { AppSettings, StageStyle, TextStyle, LayoutState, TimingSettings, VoxMatchProject } from '../types/types';

export const DEFAULT_TIMING: TimingSettings = {
  baseDurationPerChar: 0.08,
  minClipDuration: 1.0,
  maxClipDuration: 5.0,
  pauseBetweenClips: 0.2
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  primaryColor: '#046466',
  snapToGrid: true,
  waveformColor: '#046466',
  defaultReadingSpeed: 'normal',
  timing: DEFAULT_TIMING
};

export const DEFAULT_STAGE_STYLE: StageStyle = {
  layers: [
    {
      id: 'base',
      type: 'color',
      content: '#1a1a1a',
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      name: 'Background'
    }
  ],
  backgroundColor: '#000000',
  backgroundOpacity: 1,
  aspectRatio: '16:9',
  customWidth: 1920,
  customHeight: 1080,
  showSafeArea: false
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Inter',
  fontSize: 32,
  fontWeight: 600,
  italic: false,
  uppercase: false,
  letterSpacing: 0,
  lineHeight: 50,
  textColor: '#FFFFFF',
  withBg: true,
  bgColor: '#000000',
  bgOpacity: 0.6,
  padding: 12,
  borderRadius: 8,
  textAlign: 'center',
  position: { x: 0, y: 0 },
  width: 90,
  verticalAlign: 'flex-end',
  horizontalAlign: 'center'
};

export const DEFAULT_LAYOUT: LayoutState = {
  isVerticalLayout: false,
  isMaximizedVideo: false,
  isLeftPanelFilled: false,
  isLeftPanelTopRowFilled: false,
  panels: {
    leftPanelWidth: 35,
    videoPanelHeight: 60,
    importMediaPanelHeight: 40,
    lyricsPanelHeight: 60,
    timelinePanelHeight: 40,
    importMediaPanelVerticalWidth: 40,
    leftPanelBottomHeight: 60
  }
};

export function createDefaultProject(name?: string): Omit<VoxMatchProject, 'id'> {
  return {
    name: name || `Project ${new Date().toLocaleDateString()}`,
    mode: 'subtitles',
    lyrics: [],
    subtitles: [],
    mediaFiles: [],
    activeFileId: null,
    markers: [],
    settings: { ...DEFAULT_SETTINGS },
    stageStyle: { ...DEFAULT_STAGE_STYLE },
    lyricTextStyle: { ...DEFAULT_TEXT_STYLE },
    subtitleTextStyle: { ...DEFAULT_TEXT_STYLE },
    layout: { ...DEFAULT_LAYOUT },
    zoom: 1,
    isSaved: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

