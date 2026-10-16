// src/constants/defaults.ts
import {
  AppSettings,
  StageStyle,
  TextStyle,
  LayoutState,
  TimingSettings,
  VoxMatchProject,
  FileTrack,
} from '../types/types';

export const DEFAULT_TIMING: TimingSettings = {
  baseDurationPerChar: 0.08,
  minClipDuration: 1.0,
  maxClipDuration: 5.0,
  pauseBetweenClips: 0.2,
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  primaryColor: '#046466',
  snapToGrid: true,
  waveformColor: '#046466',
  defaultReadingSpeed: 'normal',
  timing: DEFAULT_TIMING,
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
      name: 'Background',
    },
  ],
  backgroundColor: '#000000',
  backgroundOpacity: 1,
  aspectRatio: '16:9',
  customWidth: 1920,
  customHeight: 1080,
  showSafeArea: false,
  hideVideoLayer: false,
  hideAudioTitle: false,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Inter',
  fontSize: 25,
  fontWeight: 500,
  italic: false,
  uppercase: false,
  letterSpacing: 0,
  lineHeight: 50,
  textColor: '#FFFFFF',
  withBg: true,
  bgColor: '#000000',
  bgOpacity: 0.0,
  padding: 12,
  borderRadius: 8,
  textAlign: 'center',
  position: { x: 0, y: 0 },
  width: 90,
  verticalAlign: 'flex-end',
  horizontalAlign: 'center',
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
    leftPanelBottomHeight: 60,
  },
};

export const DEFAULT_TRACK_KEY = '__default__';

export function makeDefaultTrack(
  mode: 'lyrics' | 'subtitles' = 'subtitles',
): FileTrack {
  return {
    lyrics: [],
    subtitles: [],
    markers: [],
    stageStyle: { ...DEFAULT_STAGE_STYLE },
    lyricTextStyle: { ...DEFAULT_TEXT_STYLE },
    subtitleTextStyle: { ...DEFAULT_TEXT_STYLE },
    zoom: 1,
    mode,
  };
}

export function createDefaultProject(
  name?: string,
): Omit<VoxMatchProject, 'id'> {
  const defaultTrack = makeDefaultTrack('subtitles');

  return {
    name: name || `Project ${new Date().toLocaleDateString()}`,
    mode: 'subtitles',
    mediaFiles: [],
    activeFileId: null,
    settings: { ...DEFAULT_SETTINGS },
    layout: { ...DEFAULT_LAYOUT },
    isSaved: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),

    lyrics: defaultTrack.lyrics,
    subtitles: defaultTrack.subtitles,
    markers: defaultTrack.markers,
    stageStyle: defaultTrack.stageStyle,
    lyricTextStyle: defaultTrack.lyricTextStyle,
    subtitleTextStyle: defaultTrack.subtitleTextStyle,
    zoom: defaultTrack.zoom,

    tracks: {
      [DEFAULT_TRACK_KEY]: defaultTrack,
    },
  };
}