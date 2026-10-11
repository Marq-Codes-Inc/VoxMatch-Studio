// src/App.test.tsx
import { describe, it, expect } from 'vitest';
import { shallowCompareProjects } from './App';
import { VoxMatchProject } from './types/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STAGE_STYLE,
  DEFAULT_TEXT_STYLE,
  DEFAULT_LAYOUT,
} from './constants/defaults';

function makeProject(overrides: Partial<VoxMatchProject> = {}): VoxMatchProject {
  return {
    id: 'p1',
    name: 'Test',
    mode: 'lyrics',
    lyrics: [],
    subtitles: [],
    mediaFiles: [],
    activeFileId: null,
    markers: [],
    settings: DEFAULT_SETTINGS,
    stageStyle: DEFAULT_STAGE_STYLE,
    lyricTextStyle: DEFAULT_TEXT_STYLE,
    subtitleTextStyle: DEFAULT_TEXT_STYLE,
    layout: DEFAULT_LAYOUT,
    zoom: 1,
    isSaved: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('shallowCompareProjects', () => {
  it('returns true for identical object reference', () => {
    const p = makeProject();
    expect(shallowCompareProjects(p, p)).toBe(true);
  });

  it('returns true for structurally identical projects', () => {
    expect(shallowCompareProjects(makeProject(), makeProject())).toBe(true);
  });

  it('returns false when name changes', () => {
    expect(
      shallowCompareProjects(makeProject(), makeProject({ name: 'Other' })),
    ).toBe(false);
  });

  it('returns false when a clip text changes (same count)', () => {
    const a = makeProject({
      lyrics: [{ id: 'l1', text: 'A', startTime: 0, endTime: 1 }],
    });
    const b = makeProject({
      lyrics: [{ id: 'l1', text: 'B', startTime: 0, endTime: 1 }],
    });
    expect(shallowCompareProjects(a, b)).toBe(false);
  });

  it('returns false when a clip timing changes (same count)', () => {
    const a = makeProject({
      lyrics: [{ id: 'l1', text: 'A', startTime: 0, endTime: 1 }],
    });
    const b = makeProject({
      lyrics: [{ id: 'l1', text: 'A', startTime: 0, endTime: 2 }],
    });
    expect(shallowCompareProjects(a, b)).toBe(false);
  });

  it('returns false when clip count differs', () => {
    const a = makeProject({
      lyrics: [{ id: 'l1', text: 'A', startTime: 0, endTime: 1 }],
    });
    const b = makeProject({
      lyrics: [
        { id: 'l1', text: 'A', startTime: 0, endTime: 1 },
        { id: 'l2', text: 'B', startTime: 1, endTime: 2 },
      ],
    });
    expect(shallowCompareProjects(a, b)).toBe(false);
  });

  it('returns false when media file loaded state flips', () => {
    const a = makeProject({
      mediaFiles: [
        { id: 'm', name: 'a.mp3', path: '/a', type: 'audio/mpeg', size: 1, url: null, loaded: false },
      ],
    });
    const b = makeProject({
      mediaFiles: [
        { id: 'm', name: 'a.mp3', path: '/a', type: 'audio/mpeg', size: 1, url: 'blob:x', loaded: true },
      ],
    });
    expect(shallowCompareProjects(a, b)).toBe(false);
  });

  it('returns false when isSaved flips', () => {
    expect(
      shallowCompareProjects(makeProject(), makeProject({ isSaved: false })),
    ).toBe(false);
  });

  it('returns false when zoom changes', () => {
    expect(
      shallowCompareProjects(makeProject(), makeProject({ zoom: 2 })),
    ).toBe(false);
  });

  it('ignores runtime-only media handles when metadata matches', () => {
    // url/loaded/file changes are ignored — only name/path/id/loaded matter
    const a = makeProject({
      mediaFiles: [
        { id: 'm', name: 'a.mp3', path: '/a', type: 'audio/mpeg', size: 1, url: null, loaded: true },
      ],
    });
    const b = makeProject({
      mediaFiles: [
        { id: 'm', name: 'a.mp3', path: '/a', type: 'audio/mpeg', size: 1, url: 'blob:x', loaded: true },
      ],
    });
    expect(shallowCompareProjects(a, b)).toBe(true);
  });
});
