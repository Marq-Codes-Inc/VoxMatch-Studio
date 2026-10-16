// src/utils/projectFile.test.ts
import { describe, it, expect } from 'vitest';
import {
  serializeProject,
  deserializeProject,
  normalizeProject,
  ensureVxmExtension,
} from './projectFile';
import { VoxMatchProject, VXM_SCHEMA_VERSION } from '../types/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STAGE_STYLE,
  DEFAULT_TEXT_STYLE,
  DEFAULT_LAYOUT,
  DEFAULT_TRACK_KEY,
  makeDefaultTrack,
} from '../constants/defaults';

function makeProject(overrides: Partial<VoxMatchProject> = {}): VoxMatchProject {
  const track = makeDefaultTrack('lyrics');
  return {
    id: 'proj-1',
    name: 'My Song',
    mode: 'lyrics',
    lyrics: [
      { id: 'l1', text: 'Hello world', startTime: 0, endTime: 2 },
      { id: 'l2', text: 'Second line', startTime: 2.5, endTime: 4 },
    ],
    subtitles: [],
    mediaFiles: [
      {
        id: 'm1',
        name: 'song.mp3',
        path: '/music/song.mp3',
        type: 'audio/mpeg',
        size: 12345,
        duration: 180,
        url: null,
        loaded: false,
      },
    ],
    activeFileId: 'm1',
    markers: [{ id: 'mk1', time: 10, label: 'Verse' }],
    settings: DEFAULT_SETTINGS,
    stageStyle: DEFAULT_STAGE_STYLE,
    lyricTextStyle: DEFAULT_TEXT_STYLE,
    subtitleTextStyle: DEFAULT_TEXT_STYLE,
    layout: DEFAULT_LAYOUT,
    zoom: 1,
    isSaved: true,
    createdAt: 1_000_000,
    updatedAt: 2_000_000,
    projectFilePath: '/projects/my-song.vxm',

    tracks: { [DEFAULT_TRACK_KEY]: track },
    ...overrides,
  };
}