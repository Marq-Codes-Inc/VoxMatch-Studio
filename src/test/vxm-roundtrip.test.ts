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

/**
 * Simulates the full user workflow:
 *   1. User creates project with media + lyrics
 *   2. Saves As → disk write (mocked)
 *   3. App closes
 *   4. User re-opens .vxm from disk → deserialized project
 *   5. Media is re-attached at runtime (url/loaded/file repopulated)
 */

function simulateDiskWrite(project: VoxMatchProject): string {
  // Exactly what project:save does on disk
  return serializeProject(project);
}

function simulateDiskRead(raw: string, filePath: string): VoxMatchProject {
  const project = deserializeProject(raw);
  project.projectFilePath = filePath;
  return project;
}

describe('.vxm end-to-end round trip', () => {
  it('preserves full project state through save → load', () => {
    const original: VoxMatchProject = {
      id: 'proj-e2e',
      name: 'Karaoke Demo',
      mode: 'lyrics',
      lyrics: [
        { id: 'l1', text: 'First line', startTime: 0, endTime: 2 },
        { id: 'l2', text: 'Second line', startTime: 2.5, endTime: 5 },
        { id: 'l3', text: 'Third line', startTime: 5.5, endTime: 8 },
      ],
      subtitles: [],
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
      markers: [
        { id: 'mk1', time: 0, label: 'Intro' },
        { id: 'mk2', time: 30, label: 'Verse 1' },
      ],
      settings: { ...DEFAULT_SETTINGS, theme: 'light', primaryColor: '#3B82F6' },
      stageStyle: { ...DEFAULT_STAGE_STYLE, aspectRatio: '9:16' },
      lyricTextStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 42, textColor: '#FFD700' },
      subtitleTextStyle: DEFAULT_TEXT_STYLE,
      layout: DEFAULT_LAYOUT,
      zoom: 2.5,
      isSaved: true,
      createdAt: 100,
      updatedAt: 200,
    };

    // 1. User hits Save As → we pick a path
    const chosenPath = ensureVxmExtension('/exports/Karaoke Demo');
    expect(chosenPath).toBe('/exports/Karaoke Demo.vxm');

    // 2. Disk write
    const onDisk = simulateDiskWrite(original);
    expect(onDisk).toContain('"Karaoke Demo"');
    expect(onDisk).toContain('"First line"');

    // 3. App closes, user re-opens the .vxm
    const reloaded = simulateDiskRead(onDisk, chosenPath);

    // 4. Verify identity
    expect(reloaded.id).toBe(original.id);
    expect(reloaded.name).toBe(original.name);
    expect(reloaded.mode).toBe('lyrics');
    expect(reloaded.projectFilePath).toBe(chosenPath);
    expect(reloaded.zoom).toBe(2.5);

    // 5. Verify clips
    expect(reloaded.lyrics).toEqual(original.lyrics);

    // 6. Verify markers
    expect(reloaded.markers).toEqual(original.markers);

    // 7. Verify styling
    expect(reloaded.settings.theme).toBe('light');
    expect(reloaded.settings.primaryColor).toBe('#3B82F6');
    expect(reloaded.stageStyle.aspectRatio).toBe('9:16');
    expect(reloaded.lyricTextStyle.fontSize).toBe(42);
    expect(reloaded.lyricTextStyle.textColor).toBe('#FFD700');

    // 8. Media handles were stripped and must be re-attached at runtime
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
