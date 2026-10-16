// src/test/useProjectState.history.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectState } from '../hooks/useProjectState';
import { getHistoryLog, resetHistoryLog } from '../utils/historyLog';
import {
  DEFAULT_SETTINGS,
  DEFAULT_LAYOUT,
  DEFAULT_TRACK_KEY,
  makeDefaultTrack,
} from '../constants/defaults';
import type { VoxMatchProject } from '../types/types';

function makeProject(): VoxMatchProject {
  const track = makeDefaultTrack('lyrics');
  return {
    id: 'p1',
    name: 'Test',
    mode: 'lyrics',
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

describe('useProjectState history (full snapshot)', () => {
  beforeEach(() => resetHistoryLog());

  it('undoes a batch-add of lyrics', () => {
    const { result } = renderHook(() => useProjectState(makeProject()));

    act(() =>
      result.current.handleBatchAddLyrics([
        { text: 'A', startTime: 0, endTime: 1 },
      ]),
    );
    expect(result.current.lyrics).toHaveLength(1);

    act(() => result.current.undo());
    expect(result.current.lyrics).toHaveLength(0);

    act(() => result.current.redo());
    expect(result.current.lyrics).toHaveLength(1);

    const log = getHistoryLog();
    expect(log.map((e) => e.action)).toContain('push');
    expect(log.map((e) => e.action)).toContain('undo');
    expect(log.map((e) => e.action)).toContain('redo');
  });

  it('undoes a settings change', () => {
    const { result } = renderHook(() => useProjectState(makeProject()));

    act(() => result.current.handleSettingChange('primaryColor', '#ff0000'));
    expect(result.current.settings.primaryColor).toBe('#ff0000');

    act(() => result.current.undo());
    expect(result.current.settings.primaryColor).toBe(
      DEFAULT_SETTINGS.primaryColor,
    );
  });

  it('undoes a marker insertion', () => {
    const { result } = renderHook(() => useProjectState(makeProject()));

    act(() => result.current.addMarker(5, 'Verse'));
    expect(result.current.markers).toHaveLength(1);

    act(() => result.current.undo());
    expect(result.current.markers).toHaveLength(0);
  });

  it('undoes a zoom change via wrapper', () => {
    const { result } = renderHook(() => useProjectState(makeProject()));

    act(() => result.current.setZoom(2.5));
    expect(result.current.zoom).toBe(2.5);

    act(() => result.current.undo());
    expect(result.current.zoom).toBe(1);
  });

  it('updates subtitleLanguage through history', () => {
    const { result } = renderHook(() => useProjectState(makeProject()));

    act(() => result.current.setSubtitleLanguage('ja-JP'));
    expect(result.current.subtitleLanguage).toBe('ja-JP');
    expect(result.current.settings.defaultSubtitleLanguage).toBe('ja-JP');

    act(() => result.current.undo());
    expect(result.current.subtitleLanguage).toBe('en-US');
  });
});
