// src/utils/projectFile.ts
import {
  VoxMatchProject,
  VXM_SCHEMA_VERSION,
  ImportedMediaFile,
} from '../types/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STAGE_STYLE,
  DEFAULT_TEXT_STYLE,
  DEFAULT_LAYOUT,
} from '../constants/defaults';

// Public API

/**
 * Serialize a project into a .vxm-format JSON string.
 * Media file `url` / `file` handles are stripped — only metadata persists.
 * The video `posterDataUrl` is preserved so home screen thumbnails work
 * without a live video element.
 */
export function serializeProject(project: VoxMatchProject): string {
  const sanitized: VoxMatchProject = {
    ...project,
    schemaVersion: VXM_SCHEMA_VERSION,
    mediaFiles: project.mediaFiles.map(stripMediaHandles),
  };
  return JSON.stringify(sanitized, null, 2);
}

/**
 * Parse a .vxm-format JSON string into a validated VoxMatchProject.
 * Throws with a descriptive error on malformed input.
 */
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

/**
 * Fill in missing fields, validate required ones, and return a
 * guaranteed-well-formed VoxMatchProject.
 */
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

  const mergedStageStyle = {
    ...DEFAULT_STAGE_STYLE,
    ...(raw.stageStyle || {}),
    hideVideoLayer: Boolean(raw.stageStyle?.hideVideoLayer),
    hideAudioTitle: Boolean(raw.stageStyle?.hideAudioTitle),
  };

  const project: VoxMatchProject = {
    id: raw.id,
    name: raw.name,
    mode,
    lyrics: Array.isArray(raw.lyrics) ? raw.lyrics.map(normalizeClip) : [],
    subtitles: Array.isArray(raw.subtitles)
      ? raw.subtitles.map(normalizeClip)
      : [],
    mediaFiles: Array.isArray(raw.mediaFiles)
      ? raw.mediaFiles.map(normalizeMediaFile)
      : [],
    activeFileId:
      typeof raw.activeFileId === 'string' ? raw.activeFileId : null,
    markers: Array.isArray(raw.markers) ? raw.markers : [],
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
    stageStyle: mergedStageStyle,
    lyricTextStyle: { ...DEFAULT_TEXT_STYLE, ...(raw.lyricTextStyle || {}) },
    subtitleTextStyle: {
      ...DEFAULT_TEXT_STYLE,
      ...(raw.subtitleTextStyle || {}),
    },
    layout: {
      ...DEFAULT_LAYOUT,
      ...(raw.layout || {}),
      panels: {
        ...DEFAULT_LAYOUT.panels,
        ...(raw.layout?.panels || {}),
      },
    },
    zoom: typeof raw.zoom === 'number' ? raw.zoom : 1,
    isSaved: true,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    projectFilePath:
      typeof raw.projectFilePath === 'string' ? raw.projectFilePath : undefined,
    schemaVersion: VXM_SCHEMA_VERSION,
  };

  return project;
}

// Internal helpers

function stripMediaHandles(file: ImportedMediaFile): ImportedMediaFile {
  return {
    ...file,
    url: null,
    loaded: false,
    file: undefined,
    // Poster is a string — deliberately preserved so the home screen
    // and export modal can render it without a live video element.
    posterDataUrl: file.posterDataUrl ?? null,
  };
}

function normalizeClip(clip: any) {
  return {
    id: String(clip?.id ?? ''),
    text: String(clip?.text ?? ''),
    startTime: Number(clip?.startTime ?? 0),
    endTime: Number(clip?.endTime ?? 0),
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
    // Preserve the poster across serialize/deserialize
    posterDataUrl:
      typeof file?.posterDataUrl === 'string' && file.posterDataUrl
        ? file.posterDataUrl
        : null,
  };
}

// File name helpers

export const VXM_EXTENSION = 'vxm';

export function ensureVxmExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith(`.${VXM_EXTENSION}`)
    ? filePath
    : `${filePath}.${VXM_EXTENSION}`;
}
