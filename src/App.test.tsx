// src/App.test.tsx
import { describe, it, expect } from 'vitest';
import { shallowCompareProjects } from './App';
import { VoxMatchProject } from './types/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STAGE_STYLE,
  DEFAULT_TEXT_STYLE,
  DEFAULT_LAYOUT,
  DEFAULT_TRACK_KEY,
  makeDefaultTrack,
} from './constants/defaults';

function makeProject(overrides: Partial<VoxMatchProject> = {}): VoxMatchProject {
  const track = makeDefaultTrack('lyrics');
  return {
    id: 'p1',
    name: 'Test',
    mode: 'lyrics',
    mediaFiles: [],
    activeFileId: null,
    settings: DEFAULT_SETTINGS,
    layout: DEFAULT_LAYOUT,
    isSaved: true,
    createdAt: 1,
    updatedAt: 1,

    // legacy top-level mirrors (kept in sync with the default track)
    lyrics: track.lyrics,
    subtitles: track.subtitles,
    markers: track.markers,
    stageStyle: track.stageStyle,
    lyricTextStyle: track.lyricTextStyle,
    subtitleTextStyle: track.subtitleTextStyle,
    zoom: track.zoom,

    tracks: { [DEFAULT_TRACK_KEY]: track },
    ...overrides,
  };
}