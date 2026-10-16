// src/utils/projectFile.ts
import {
  VoxMatchProject,
  VXM_SCHEMA_VERSION,
  ImportedMediaFile,
  FileTrack,
  LyricLine,
  TimelineMarker,
  StageStyle,
  TextStyle,
} from '../types/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STAGE_STYLE,
  DEFAULT_TEXT_STYLE,
  DEFAULT_LAYOUT,
  DEFAULT_TRACK_KEY,
} from '../constants/defaults';

export const VXM_EXTENSION = 'vxm';

export function serializeProject(project: VoxMatchProject): string {
  const mediaFiles = Array.isArray(project.mediaFiles)
    ? project.mediaFiles.map(stripMediaHandles)
    : [];

  const sanitized: VoxMatchProject = {
    ...project,
    schemaVersion: VXM_SCHEMA_VERSION,
    mediaFiles,
    tracks: sanitizeTracks(project.tracks),
  };
  return JSON.stringify(sanitized, null, 2);
}

export function deserializeProject(raw: string): VoxMatchProject {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Invalid .vxm file: not valid JSON. ${
        err instanceof Error ? err.message : ''
      }`.trim(),
    );
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid .vxm file: root must be an object.');
  }
  return normalizeProject(parsed);
}

export function normalizeProject(raw: any): VoxMatchProject {
  if (!raw.id || typeof raw.id !== 'string') {
    throw new Error('Invalid .vxm file: missing "id".');
  }
  if (!raw.name || typeof raw.name !== 'string') {
    throw new Error('Invalid .vxm file: missing "name".');
  }

  const mode: VoxMatchProject['mode'] =
    raw.mode === 'lyrics' || raw.mode === 'subtitles' ? raw.mode : 'subtitles';

  const now = Date.now();

  const mediaFiles: ImportedMediaFile[] = Array.isArray(raw.mediaFiles)
    ? raw.mediaFiles.map(normalizeMediaFile)
    : [];

  const activeFileId: string | null =
    typeof raw.activeFileId === 'string' ? raw.activeFileId : null;

  const tracks: Record<string, FileTrack> = {};

  if (raw.tracks && typeof raw.tracks === 'object') {
    for (const [fileId, t] of Object.entries(raw.tracks)) {
      tracks[fileId] = normalizeTrack(t, mode);
    }
  }

  const hasLegacyClips =
    Array.isArray(raw.lyrics) ||
    Array.isArray(raw.subtitles) ||
    Array.isArray(raw.markers) ||
    raw.stageStyle !== undefined ||
    raw.lyricTextStyle !== undefined ||
    raw.subtitleTextStyle !== undefined ||
    typeof raw.zoom === 'number';

  if (hasLegacyClips) {
    const legacyTrack = normalizeTrack(
      {
        lyrics: raw.lyrics,
        subtitles: raw.subtitles,
        markers: raw.markers,
        stageStyle: raw.stageStyle,
        lyricTextStyle: raw.lyricTextStyle,
        subtitleTextStyle: raw.subtitleTextStyle,
        zoom: raw.zoom,
        mode,
      },
      mode,
    );

    if (activeFileId) {
      tracks[activeFileId] = tracks[activeFileId]
        ? {
            ...tracks[activeFileId],
            ...legacyTrack,
            lyrics:
              tracks[activeFileId].lyrics.length > 0
                ? tracks[activeFileId].lyrics
                : legacyTrack.lyrics,
            subtitles:
              tracks[activeFileId].subtitles.length > 0
                ? tracks[activeFileId].subtitles
                : legacyTrack.subtitles,
          }
        : legacyTrack;
    } else if (Object.keys(tracks).length === 0) {
      tracks[DEFAULT_TRACK_KEY] = legacyTrack;
    }
  }

  for (const f of mediaFiles) {
    if (!tracks[f.id]) tracks[f.id] = makeEmptyTrack(mode);
  }

  if (Object.keys(tracks).length === 0) {
    tracks[DEFAULT_TRACK_KEY] = makeEmptyTrack(mode);
  }

  const activeTrack =
    (activeFileId && tracks[activeFileId]) ||
    tracks[Object.keys(tracks)[0]] ||
    makeEmptyTrack(mode);

  const project: VoxMatchProject = {
    id: raw.id,
    name: raw.name,
    mode,
    mediaFiles,
    activeFileId,
    settings: normalizeSettings(raw.settings),
    layout: normalizeLayout(raw.layout),
    isSaved: true,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    projectFilePath:
      typeof raw.projectFilePath === 'string' ? raw.projectFilePath : undefined,
    schemaVersion: VXM_SCHEMA_VERSION,
    tracks,

    lyrics: Array.isArray(raw.lyrics)
      ? raw.lyrics.map(normalizeClip)
      : activeTrack.lyrics,
    subtitles: Array.isArray(raw.subtitles)
      ? raw.subtitles.map(normalizeClip)
      : activeTrack.subtitles,
    markers: Array.isArray(raw.markers)
      ? raw.markers.map(normalizeMarker)
      : activeTrack.markers,
    stageStyle: raw.stageStyle
      ? normalizeStageStyle(raw.stageStyle)
      : activeTrack.stageStyle,
    lyricTextStyle: raw.lyricTextStyle
      ? normalizeTextStyle(raw.lyricTextStyle)
      : activeTrack.lyricTextStyle,
    subtitleTextStyle: raw.subtitleTextStyle
      ? normalizeTextStyle(raw.subtitleTextStyle)
      : activeTrack.subtitleTextStyle,
    zoom: typeof raw.zoom === 'number' ? raw.zoom : activeTrack.zoom,
  };

  return project;
}

export function makeEmptyTrack(
  mode: 'lyrics' | 'subtitles' = 'subtitles',
): FileTrack {
  return {
    lyrics: [],
    subtitles: [],
    markers: [],
    stageStyle: { ...DEFAULT_STAGE_STYLE },
    lyricTextStyle: { ...DEFAULT_TEXT_STYLE },
    subtitleTextStyle: { ...DEFAULT_TEXT_STYLE },
    zoom: 1,
    mode,
  };
}

function sanitizeTracks(
  tracks: Record<string, FileTrack> | undefined | null,
): Record<string, FileTrack> {
  const out: Record<string, FileTrack> = {};
  if (!tracks || typeof tracks !== 'object') return out;
  for (const [k, t] of Object.entries(tracks)) {
    if (t && typeof t === 'object') out[k] = t as FileTrack;
  }
  return out;
}

function normalizeTrack(
  raw: any,
  fallbackMode: 'lyrics' | 'subtitles',
): FileTrack {
  return {
    lyrics: Array.isArray(raw?.lyrics) ? raw.lyrics.map(normalizeClip) : [],
    subtitles: Array.isArray(raw?.subtitles)
      ? raw.subtitles.map(normalizeClip)
      : [],
    markers: Array.isArray(raw?.markers)
      ? raw.markers.map(normalizeMarker)
      : [],
    stageStyle: normalizeStageStyle(raw?.stageStyle),
    lyricTextStyle: normalizeTextStyle(raw?.lyricTextStyle),
    subtitleTextStyle: normalizeTextStyle(raw?.subtitleTextStyle),
    zoom: typeof raw?.zoom === 'number' ? raw.zoom : 1,
    mode:
      raw?.mode === 'lyrics' || raw?.mode === 'subtitles'
        ? raw.mode
        : fallbackMode,
  };
}

function stripMediaHandles(file: ImportedMediaFile): ImportedMediaFile {
  return {
    ...file,
    url: null,
    loaded: false,
    file: undefined,
    posterDataUrl: file.posterDataUrl ?? null,
  };
}

function normalizeClip(clip: any): LyricLine {
  return {
    id: String(clip?.id ?? ''),
    text: String(clip?.text ?? ''),
    startTime: Number(clip?.startTime ?? 0),
    endTime: Number(clip?.endTime ?? 0),
  };
}

function normalizeMarker(m: any): TimelineMarker {
  return {
    id: String(m?.id ?? ''),
    time: Number(m?.time ?? 0),
    label: String(m?.label ?? ''),
    ...(m?.color ? { color: String(m.color) } : {}),
  };
}

function normalizeMediaFile(file: any): ImportedMediaFile {
  return {
    id: String(file?.id ?? ''),
    name: String(file?.name ?? 'Unknown'),
    path: String(file?.path ?? ''),
    type: String(file?.type ?? ''),
    size: Number(file?.size ?? 0),
    duration: typeof file?.duration === 'number' ? file.duration : undefined,
    url: null,
    loaded: false,
    file: undefined,
    posterDataUrl:
      typeof file?.posterDataUrl === 'string' && file.posterDataUrl
        ? file.posterDataUrl
        : null,
  };
}

function normalizeStageStyle(raw: any): StageStyle {
  return {
    ...DEFAULT_STAGE_STYLE,
    ...(raw || {}),
    layers: Array.isArray(raw?.layers)
      ? raw.layers
      : DEFAULT_STAGE_STYLE.layers,
    hideVideoLayer: Boolean(raw?.hideVideoLayer),
    hideAudioTitle: Boolean(raw?.hideAudioTitle),
  };
}

function normalizeTextStyle(raw: any): TextStyle {
  return {
    ...DEFAULT_TEXT_STYLE,
    ...(raw || {}),
    position: {
      ...DEFAULT_TEXT_STYLE.position,
      ...(raw?.position || {}),
    },
  };
}

function normalizeSettings(raw: any) {
  const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  merged.timing = {
    ...DEFAULT_SETTINGS.timing,
    ...(raw?.timing || {}),
  };
  return merged;
}

function normalizeLayout(raw: any) {
  return {
    ...DEFAULT_LAYOUT,
    ...(raw || {}),
    panels: {
      ...DEFAULT_LAYOUT.panels,
      ...(raw?.panels || {}),
    },
  };
}

export function ensureVxmExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith(`.${VXM_EXTENSION}`)
    ? filePath
    : `${filePath}.${VXM_EXTENSION}`;
}