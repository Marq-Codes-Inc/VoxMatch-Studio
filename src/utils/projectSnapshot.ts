// src/utils/projectSnapshot.ts
import { VoxMatchProject, FileTrack } from '../types/types';
import { renderStageSnapshot } from './stageSnapshot';

const CACHE = new Map<string, string>();
const INFLIGHT = new Map<string, Promise<string>>();

/* Resolve the current project's active track (or undefined if none). */
function activeTrack(project: VoxMatchProject): FileTrack | undefined {
  if (!project.activeFileId) return undefined;
  return project.tracks?.[project.activeFileId];
}

function makeKey(project: VoxMatchProject): string {
  const track = activeTrack(project);
  const s = track?.stageStyle;
  const textStyle =
    project.mode === 'lyrics'
      ? track?.lyricTextStyle
      : track?.subtitleTextStyle;

  const list =
    project.mode === 'lyrics'
      ? track?.lyrics ?? []
      : track?.subtitles ?? [];
  const firstClip = [...list].sort((a, b) => a.startTime - b.startTime)[0];

  const activeFile =
    project.mediaFiles.find((f) => f.id === project.activeFileId) ?? null;

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
    previewText: firstClip?.text ?? null,
    activeFileName: activeFile?.name ?? null,
    posterDataUrl: activeFile?.posterDataUrl ?? null,
  });
}

export function getProjectSnapshot(project: VoxMatchProject): Promise<string> {
  const key = makeKey(project);

  const cached = CACHE.get(key);
  if (cached) return Promise.resolve(cached);

  const inflight = INFLIGHT.get(key);
  if (inflight) return inflight;

  const track = activeTrack(project);
  const textStyle =
    project.mode === 'lyrics'
      ? track?.lyricTextStyle
      : track?.subtitleTextStyle;

  const list =
    project.mode === 'lyrics'
      ? track?.lyrics ?? []
      : track?.subtitles ?? [];
  const firstClip = [...list].sort((a, b) => a.startTime - b.startTime)[0];

  const activeFile =
    project.mediaFiles.find((f) => f.id === project.activeFileId) ?? null;

  const isVideo = !!activeFile?.type?.startsWith('video');

  // If the project has no track yet, fall back to a plain placeholder
  if (!track || !textStyle) {
    const emptyPromise = Promise.resolve('');
    CACHE.set(key, '');
    return emptyPromise;
  }

  const promise = renderStageSnapshot({
    stageStyle: track.stageStyle,
    overlayText: firstClip?.text ?? undefined,
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
      CACHE.set(key, url);
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
  for (const key of Array.from(CACHE.keys())) {
    if (key.includes(`"id":"${projectId}"`)) {
      CACHE.delete(key);
    }
  }
}