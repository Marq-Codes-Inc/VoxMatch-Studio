import { VoxMatchProject, FileTrack } from '../types/types';
import { renderStageSnapshot } from './stageSnapshot';

const MAX_CACHE_ENTRIES = 40;

const CACHE = new Map<string, string>();
const INFLIGHT = new Map<string, Promise<string>>();

function touch(key: string, value: string): void {
  if (CACHE.has(key)) CACHE.delete(key);
  CACHE.set(key, value);
  if (CACHE.size > MAX_CACHE_ENTRIES) {
    const oldest = CACHE.keys().next().value;
    if (oldest !== undefined) CACHE.delete(oldest);
  }
}

function activeTrack(project: VoxMatchProject): FileTrack | undefined {
  if (!project.activeFileId) return undefined;
  return project.tracks?.[project.activeFileId];
}

function makeKey(project: VoxMatchProject): string {
  const track = activeTrack(project);
  const s = track?.stageStyle;
  const textStyle = project.mode === 'lyrics' ? track?.lyricTextStyle : track?.subtitleTextStyle;
  const list = project.mode === 'lyrics' ? track?.lyrics ?? [] : track?.subtitles ?? [];
  const first = [...list].sort((a, b) => a.startTime - b.startTime)[0];
  const activeFile = project.mediaFiles.find((f) => f.id === project.activeFileId) ?? null;

  return JSON.stringify({
    id: project.id,
    mode: project.mode,
    layers: s?.layers,
    backgroundColor: s?.backgroundColor,
    aspectRatio: s?.aspectRatio,
    customWidth: s?.customWidth,
    customHeight: s?.customHeight,
    hideVideoLayer: s?.hideVideoLayer,
    hideAudioTitle: s?.hideAudioTitle,
    textStyle: textStyle
      ? {
          fontFamily: textStyle.fontFamily,
          fontSize: textStyle.fontSize,
          fontWeight: textStyle.fontWeight,
          textColor: textStyle.textColor,
          withBg: textStyle.withBg,
          bgColor: textStyle.bgColor,
          bgOpacity: textStyle.bgOpacity,
          textAlign: textStyle.textAlign,
          verticalAlign: textStyle.verticalAlign,
          horizontalAlign: textStyle.horizontalAlign,
          uppercase: textStyle.uppercase,
          italic: textStyle.italic,
        }
      : null,
    previewText: first?.text ?? null,
    activeFileName: activeFile?.name ?? null,
    posterDataUrl: activeFile?.posterDataUrl ?? null,
  });
}

export function getProjectSnapshot(project: VoxMatchProject): Promise<string> {
  const key = makeKey(project);
  const cached = CACHE.get(key);
  if (cached) {
    touch(key, cached);
    return Promise.resolve(cached);
  }

  const inflight = INFLIGHT.get(key);
  if (inflight) return inflight;

  const track = activeTrack(project);
  const textStyle = project.mode === 'lyrics' ? track?.lyricTextStyle : track?.subtitleTextStyle;
  const list = project.mode === 'lyrics' ? track?.lyrics ?? [] : track?.subtitles ?? [];
  const first = [...list].sort((a, b) => a.startTime - b.startTime)[0];
  const activeFile = project.mediaFiles.find((f) => f.id === project.activeFileId) ?? null;
  const isVideo = !!activeFile?.type?.startsWith('video');

  if (!track || !textStyle) {
    CACHE.set(key, '');
    return Promise.resolve('');
  }

  const promise = renderStageSnapshot({
    stageStyle: track.stageStyle,
    overlayText: first?.text ?? undefined,
    textStyle,
    width: 480,
    mediaElement: null,
    mediaIsVideo: isVideo,
    posterDataUrl: activeFile?.posterDataUrl ?? null,
    hideVideoLayer: track.stageStyle.hideVideoLayer,
    hideAudioTitle: track.stageStyle.hideAudioTitle,
    activeFileName: activeFile?.name ?? null,
  })
    .then((url) => {
      touch(key, url);
      INFLIGHT.delete(key);
      return url;
    })
    .catch(() => {
      INFLIGHT.delete(key);
      return '';
    });

  INFLIGHT.set(key, promise);
  return promise;
}

export function invalidateProjectSnapshot(projectId: string): void {
  const needle = `"id":"${projectId}"`;
  for (const key of [...CACHE.keys()]) {
    if (key.includes(needle)) CACHE.delete(key);
  }
}
