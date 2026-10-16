// src/test/clipboard.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectState } from '../hooks/useProjectState';
import { resetHistoryLog } from '../utils/historyLog';
import {
  DEFAULT_SETTINGS,
  DEFAULT_LAYOUT,
  DEFAULT_TRACK_KEY,
  makeDefaultTrack,
} from '../constants/defaults';
import type { VoxMatchProject } from '../types/types';

function makeProject(): VoxMatchProject {
  const track = makeDefaultTrack('subtitles');
  return {
    id: 'p1',
    name: 'Test',
    mode: 'subtitles',
    mediaFiles: [],
    activeFileId: null,
    settings: { ...DEFAULT_SETTINGS },
    layout: { ...DEFAULT_LAYOUT },
    isSaved: true,
    createdAt: 1,
    updatedAt: 1,

    lyrics: track.lyrics,
    subtitles: track.subtitles,
    markers: track.markers,
    stageStyle: track.stageStyle,
    lyricTextStyle: track.lyricTextStyle,
    subtitleTextStyle: track.subtitleTextStyle,
    zoom: track.zoom,

    tracks: { [DEFAULT_TRACK_KEY]: track },
  };
}

describe('clipboard (batch-add) path used by Ctrl+C / Ctrl+V', () => {
  beforeEach(() => resetHistoryLog());

  it('pastes a copied subtitle and can undo it', () => {
    const { result } = renderHook(() => useProjectState(makeProject()));

    act(() =>
      result.current.handleBatchAddSubtitles([
        { text: 'Copied', startTime: 1, endTime: 2 },
      ]),
    );
    expect(result.current.subtitles).toHaveLength(1);

    act(() => result.current.undo());
    expect(result.current.subtitles).toHaveLength(0);
  });

  it('pastes multiple clips in one batch', () => {
    const { result } = renderHook(() => useProjectState(makeProject()));

    act(() =>
      result.current.handleBatchAddSubtitles([
        { text: 'A', startTime: 0, endTime: 1 },
        { text: 'B', startTime: 1, endTime: 2 },
        { text: 'C', startTime: 2, endTime: 3 },
      ]),
    );
    expect(result.current.subtitles).toHaveLength(3);

    act(() => result.current.undo());
    expect(result.current.subtitles).toHaveLength(0);
  });
});