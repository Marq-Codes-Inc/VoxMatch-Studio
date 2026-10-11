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
} from '../constants/defaults';

// Fixtures

function makeProject(overrides: Partial<VoxMatchProject> = {}): VoxMatchProject {
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
    ...overrides,
  };
}

// serializeProject

describe('serializeProject', () => {
  it('produces valid JSON', () => {
    const json = serializeProject(makeProject());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('stamps schema version', () => {
    const json = serializeProject(makeProject());
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(VXM_SCHEMA_VERSION);
  });

  it('strips runtime media handles (url/loaded/file)', () => {
    const withHandle: VoxMatchProject = makeProject({
      mediaFiles: [
        {
          id: 'm1',
          name: 'a.mp3',
          path: '/a.mp3',
          type: 'audio/mpeg',
          size: 1,
          url: 'blob:fake',
          loaded: true,
          file: new File(['x'], 'a.mp3'),
        },
      ],
    });
    const parsed = JSON.parse(serializeProject(withHandle));
    expect(parsed.mediaFiles[0].url).toBeNull();
    expect(parsed.mediaFiles[0].loaded).toBe(false);
    expect(parsed.mediaFiles[0].file).toBeUndefined();
  });

  it('preserves clip content', () => {
    const parsed = JSON.parse(serializeProject(makeProject()));
    expect(parsed.lyrics).toHaveLength(2);
    expect(parsed.lyrics[0].text).toBe('Hello world');
    expect(parsed.lyrics[1].startTime).toBe(2.5);
  });
});

// deserializeProject

describe('deserializeProject', () => {
  it('round-trips a project', () => {
    const original = makeProject();
    const restored = deserializeProject(serializeProject(original));
    expect(restored.id).toBe(original.id);
    expect(restored.name).toBe(original.name);
    expect(restored.lyrics).toEqual(original.lyrics);
    expect(restored.markers).toEqual(original.markers);
    expect(restored.projectFilePath).toBe('/projects/my-song.vxm');
  });

  it('throws on invalid JSON', () => {
    expect(() => deserializeProject('not json')).toThrow(/Invalid \.vxm file/);
  });

  it('throws when id is missing', () => {
    expect(() =>
      deserializeProject(JSON.stringify({ name: 'No ID' })),
    ).toThrow(/missing "id"/);
  });

  it('throws when name is missing', () => {
    expect(() =>
      deserializeProject(JSON.stringify({ id: 'x' })),
    ).toThrow(/missing "name"/);
  });

  it('fills defaults for missing optional fields', () => {
    const restored = deserializeProject(JSON.stringify({ id: 'x', name: 'y' }));
    expect(restored.mode).toBe('subtitles');
    expect(restored.lyrics).toEqual([]);
    expect(restored.subtitles).toEqual([]);
    expect(restored.mediaFiles).toEqual([]);
    expect(restored.markers).toEqual([]);
    expect(restored.zoom).toBe(1);
    expect(restored.isSaved).toBe(true);
    expect(restored.settings).toBeDefined();
    expect(restored.layout.panels).toBeDefined();
  });

  it('rejects unknown modes and falls back to subtitles', () => {
    const restored = deserializeProject(
      JSON.stringify({ id: 'x', name: 'y', mode: 'karaoke' }),
    );
    expect(restored.mode).toBe('subtitles');
  });

  it('normalizes clips with missing fields', () => {
    const restored = deserializeProject(
      JSON.stringify({
        id: 'x',
        name: 'y',
        lyrics: [{ text: 'no id' }, null, { id: 'ok', text: 'good', startTime: 1, endTime: 2 }],
      }),
    );
    expect(restored.lyrics).toHaveLength(3);
    expect(restored.lyrics[0].id).toBe('');
    expect(restored.lyrics[2].text).toBe('good');
  });
});

// normalizeProject

describe('normalizeProject', () => {
  it('is idempotent', () => {
    const p1 = normalizeProject(makeProject());
    const p2 = normalizeProject(p1);
    expect(p2).toEqual(p1);
  });

  it('deep-merges layout.panels with defaults', () => {
    const restored = normalizeProject({
      id: 'x',
      name: 'y',
      layout: { isVerticalLayout: true, panels: { leftPanelWidth: 42 } },
    });
    expect(restored.layout.isVerticalLayout).toBe(true);
    expect(restored.layout.panels.leftPanelWidth).toBe(42);
    // untouched panel fields still defaulted
    expect(restored.layout.panels.videoPanelHeight).toBe(
      DEFAULT_LAYOUT.panels.videoPanelHeight,
    );
  });
});

// ensureVxmExtension

describe('ensureVxmExtension', () => {
  it('appends .vxm when missing', () => {
    expect(ensureVxmExtension('/path/my-project')).toBe('/path/my-project.vxm');
  });
  it('is case-insensitive', () => {
    expect(ensureVxmExtension('/path/my-project.VXM')).toBe('/path/my-project.VXM');
  });
  it('leaves existing .vxm alone', () => {
    expect(ensureVxmExtension('a.vxm')).toBe('a.vxm');
  });
});
