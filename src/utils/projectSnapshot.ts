// src/utils/projectSnapshot.ts
import { VoxMatchProject } from '../types/types';
import { renderStageSnapshot } from './stageSnapshot';

const CACHE = new Map<string, string>();
const INFLIGHT = new Map<string, Promise<string>>();

/**
 * Cheap cache key — changes whenever anything that would affect the
 * snapshot changes. We deliberately ignore `updatedAt` so re-saving
 * without visual changes doesn't invalidate the cache.
 */
function makeKey(project: VoxMatchProject): string {
  const s = project.stageStyle;
  const textStyle =
    project.mode === 'lyrics'
      ? project.lyricTextStyle
      : project.subtitleTextStyle;

  const list =
    project.mode === 'lyrics' ? project.lyrics : project.subtitles;
  const firstClip = [...list].sort((a, b) => a.startTime - b.startTime)[0];

  const activeFile =
    project.mediaFiles.find((f) => f.id === project.activeFileId) ?? null;

  return JSON.stringify({
    id: project.id,
    mode: project.mode,
    layers: s.layers,
    backgroundColor: s.backgroundColor,
    aspectRatio: s.aspectRatio,
    customWidth: s.customWidth,
    customHeight: s.customHeight,
    hideVideoLayer: s.hideVideoLayer,
    hideAudioTitle: s.hideAudioTitle,
    textStyle: {
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
    },
    previewText: firstClip?.text ?? null,
    activeFileName: activeFile?.name ?? null,
    posterDataUrl: activeFile?.posterDataUrl ?? null,
  });
}

/**
 * Build (or fetch from cache) a PNG data URL representing a project's stage.
 * When a video poster was extracted, it's drawn as the video frame. Otherwise
 * the snapshot shows stage layers, overlays, and the audio placeholder.
 */
export function getProjectSnapshot(project: VoxMatchProject): Promise<string> {
  const key = makeKey(project);

  const cached = CACHE.get(key);
  if (cached) return Promise.resolve(cached);

  const inflight = INFLIGHT.get(key);
  if (inflight) return inflight;

  const textStyle =
    project.mode === 'lyrics'
      ? project.lyricTextStyle
      : project.subtitleTextStyle;

  const list =
    project.mode === 'lyrics' ? project.lyrics : project.subtitles;
  const firstClip = [...list].sort((a, b) => a.startTime - b.startTime)[0];

  const activeFile =
    project.mediaFiles.find((f) => f.id === project.activeFileId) ?? null;

  const isVideo = !!activeFile?.type?.startsWith('video');

  const promise = renderStageSnapshot({
    stageStyle: project.stageStyle,
    overlayText: firstClip?.text ?? undefined,
    textStyle,
    width: 480,
    mediaElement: null,
    mediaIsVideo: isVideo,
    posterDataUrl: activeFile?.posterDataUrl ?? null,
    hideVideoLayer: project.stageStyle.hideVideoLayer,
    hideAudioTitle: project.stageStyle.hideAudioTitle,
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

/** Remove a project from the cache (call when a project is deleted). */
export function invalidateProjectSnapshot(projectId: string): void {
  for (const key of Array.from(CACHE.keys())) {
    if (key.includes(`"id":"${projectId}"`)) {
      CACHE.delete(key);
    }
  }
}