// src/test/vxm-roundtrip.test.ts
import { describe, it, expect } from 'vitest';
import {
  serializeProject,
  deserializeProject,
  ensureVxmExtension,
} from '../utils/projectFile';
import { VoxMatchProject } from '../types/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STAGE_STYLE,
  DEFAULT_TEXT_STYLE,
  DEFAULT_LAYOUT,
} from '../constants/defaults';

function simulateDiskWrite(project: VoxMatchProject): string {
  return serializeProject(project);
}

function simulateDiskRead(raw: string, filePath: string): VoxMatchProject {
  const project = deserializeProject(raw);
  project.projectFilePath = filePath;
  return project;
}

describe('.vxm end-to-end round trip', () => {
  it('preserves full project state through save → load', () => {
    const m1Track = {
      lyrics: [
        { id: 'l1', text: 'First line', startTime: 0, endTime: 2 },
        { id: 'l2', text: 'Second line', startTime: 2.5, endTime: 5 },
        { id: 'l3', text: 'Third line', startTime: 5.5, endTime: 8 },
      ],
      subtitles: [],
      markers: [
        { id: 'mk1', time: 0, label: 'Intro' },
        { id: 'mk2', time: 30, label: 'Verse 1' },
      ],
      stageStyle: { ...DEFAULT_STAGE_STYLE, aspectRatio: '9:16' },
      lyricTextStyle: {
        ...DEFAULT_TEXT_STYLE,
        fontSize: 42,
        textColor: '#FFD700',
      },
      subtitleTextStyle: DEFAULT_TEXT_STYLE,
      zoom: 2.5,
      mode: 'lyrics' as const,
    };

    const original: VoxMatchProject = {
      id: 'proj-e2e',
      name: 'Karaoke Demo',
      mode: 'lyrics',
      mediaFiles: [
        {
          id: 'm1',
          name: 'track.mp3',
          path: '/music/track.mp3',
          type: 'audio/mpeg',
          size: 5_000_000,
          duration: 240,
          url: 'blob:runtime-handle',
          loaded: true,
          file: new File(['x'], 'track.mp3'),
        },
      ],
      activeFileId: 'm1',
      settings: { ...DEFAULT_SETTINGS, theme: 'light', primaryColor: '#3B82F6' },
      layout: DEFAULT_LAYOUT,
      isSaved: true,
      createdAt: 100,
      updatedAt: 200,

      lyrics: m1Track.lyrics,
      subtitles: m1Track.subtitles,
      markers: m1Track.markers,
      stageStyle: m1Track.stageStyle,
      lyricTextStyle: m1Track.lyricTextStyle,
      subtitleTextStyle: m1Track.subtitleTextStyle,
      zoom: m1Track.zoom,

      tracks: {
        m1: m1Track,
      },
    };

    const chosenPath = ensureVxmExtension('/exports/Karaoke Demo');
    expect(chosenPath).toBe('/exports/Karaoke Demo.vxm');

    const onDisk = simulateDiskWrite(original);
    expect(onDisk).toContain('"Karaoke Demo"');
    expect(onDisk).toContain('"First line"');

    const reloaded = simulateDiskRead(onDisk, chosenPath);

    expect(reloaded.id).toBe(original.id);
    expect(reloaded.name).toBe(original.name);
    expect(reloaded.mode).toBe('lyrics');
    expect(reloaded.projectFilePath).toBe(chosenPath);

    const track = reloaded.tracks['m1'];
    expect(track).toBeTruthy();
    expect(track.zoom).toBe(2.5);
    expect(track.lyrics).toEqual(original.tracks['m1'].lyrics);
    expect(track.markers).toEqual(original.tracks['m1'].markers);

    expect(reloaded.settings.theme).toBe('light');
    expect(reloaded.settings.primaryColor).toBe('#3B82F6');
    expect(track.stageStyle.aspectRatio).toBe('9:16');
    expect(track.lyricTextStyle.fontSize).toBe(42);
    expect(track.lyricTextStyle.textColor).toBe('#FFD700');

    expect(reloaded.mediaFiles).toHaveLength(1);
    expect(reloaded.mediaFiles[0].id).toBe('m1');
    expect(reloaded.mediaFiles[0].path).toBe('/music/track.mp3');
    expect(reloaded.mediaFiles[0].url).toBeNull();
    expect(reloaded.mediaFiles[0].loaded).toBe(false);
    expect(reloaded.mediaFiles[0].file).toBeUndefined();
  });

  it('rejects a corrupted .vxm file', () => {
    const corrupt = '{ "id": "x", "name": "y", "lyrics": [ BROKEN';
    expect(() => simulateDiskRead(corrupt, '/x.vxm')).toThrow(/Invalid \.vxm file/);
  });

  it('rejects a .vxm missing required fields', () => {
    const missing = JSON.stringify({ lyrics: [] });
    expect(() => simulateDiskRead(missing, '/x.vxm')).toThrow(/missing "id"/);
  });
});