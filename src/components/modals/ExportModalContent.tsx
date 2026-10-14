// src/components/modals/ExportModalContent.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppSettings,
  ImportedMediaFile,
  VoxMatchProject,
} from '../../types/types';
import {
  serializeSubtitles,
  SubtitleFormat,
} from '../../utils/subtitleExport';
import { renderStageSnapshot } from '../../utils/stageSnapshot';
import { Dropdown } from '../ui/Dropdown';
import {
  Download,
  FileAudio,
  FileVideo,
  FolderOpen,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  ExportProgressOverlay,
  ExportJobResult,
} from './ExportProgressOverlay';

// Types

interface ExportModalContentProps {
  settings: AppSettings;
  handleSettingChange: (
    name: string,
    value: string | boolean | number | any,
  ) => void;
  selectSaveLocation: () => Promise<string | null>;
  file: ImportedMediaFile | null;
  project: VoxMatchProject;
  onClose: () => void;
  mediaElementRef?: React.RefObject<HTMLVideoElement>;
}

type ExportKind = 'subtitles' | 'lyrics' | 'video';

// Constants

const EXPORT_PATH_STORAGE_KEY = 'voxmatch-export-last-path';

const SUBTITLE_FORMATS: {
  value: SubtitleFormat;
  label: string;
  ext: string;
  mime: string;
  description: string;
}[] = [
  {
    value: 'srt',
    label: 'SubRip (.srt)',
    ext: 'srt',
    mime: 'text/plain',
    description: 'Universal - YouTube, VLC, Premiere',
  },
  {
    value: 'vtt',
    label: 'WebVTT (.vtt)',
    ext: 'vtt',
    mime: 'text/vtt',
    description: 'Web players & HTML5 <track>',
  },
  {
    value: 'ass',
    label: 'Advanced SubStation (.ass)',
    ext: 'ass',
    mime: 'text/plain',
    description: 'Styled subtitles for Aegisub, mpv',
  },
  {
    value: 'lrc',
    label: 'Lyrics (.lrc)',
    ext: 'lrc',
    mime: 'text/plain',
    description: 'Timed lyrics for music players',
  },
];

const KIND_OPTIONS: {
  value: ExportKind;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'subtitles',
    label: 'Subtitles',
    hint: 'Burned-in or sidecar captions',
    icon: <FileVideo size={16} />,
  },
  {
    value: 'lyrics',
    label: 'Lyrics',
    hint: 'Karaoke-style sync',
    icon: <FileAudio size={16} />,
  },
  {
    value: 'video',
    label: 'Video',
    hint: 'Render stage + clips',
    icon: <FileVideo size={16} />,
  },
];

// Helpers

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Join folder + filename with the correct separator for the platform. */
function joinPath(folder: string, fileName: string): string {
  if (!folder) return fileName;
  // Detect Windows-style path (drive letter or backslash)
  const isWindows = /^[a-zA-Z]:\\/.test(folder) || folder.includes('\\');
  const sep = isWindows ? '\\' : '/';
  const trimmed = folder.replace(/[\\/]+$/, '');
  return `${trimmed}${sep}${fileName}`;
}

function loadStoredPath(): string {
  try {
    return localStorage.getItem(EXPORT_PATH_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function storePath(path: string): void {
  try {
    localStorage.setItem(EXPORT_PATH_STORAGE_KEY, path);
  } catch {
    /* ignore */
  }
}

// Stage thumbnail

const StageThumbnail: React.FC<{
  project: VoxMatchProject;
  file: ImportedMediaFile | null;
  mediaElementRef?: React.RefObject<HTMLVideoElement>;
  overlayText?: string | null;
}> = ({ project, file, mediaElementRef, overlayText }) => {
  const [snapshot, setSnapshot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const isVideo = !!file && file.type.startsWith('video');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const textStyle =
      project.mode === 'lyrics'
        ? project.lyricTextStyle
        : project.subtitleTextStyle;

    const videoEl = isVideo ? mediaElementRef?.current ?? null : null;

    renderStageSnapshot({
      stageStyle: project.stageStyle,
      overlayText: overlayText || undefined,
      textStyle,
      width: 480,
      mediaElement: videoEl,
      mediaIsVideo: isVideo,
      hideVideoLayer: project.stageStyle.hideVideoLayer,
      hideAudioTitle: project.stageStyle.hideAudioTitle,
      activeFileName: file?.name || null,
    })
      .then((url) => {
        if (cancelled) return;
        setSnapshot(url);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    project.stageStyle,
    project.mode,
    project.lyricTextStyle,
    project.subtitleTextStyle,
    file?.name,
    overlayText,
    isVideo,
    mediaElementRef,
    refreshKey,
  ]);

  return (
    <div className="relative w-32 h-20 rounded-md overflow-hidden border border-app-border bg-black flex-shrink-0 group">
      {snapshot ? (
        <img
          src={snapshot}
          alt="Stage preview"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-app-gray">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-app-gray" />
          ) : (
            'No preview'
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setRefreshKey((k) => k + 1)}
        className="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/80"
        title="Refresh preview"
      >
        <RefreshCw size={12} />
      </button>

      <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/60 text-[9px] text-white/90">
        {project.stageStyle.aspectRatio || '16:9'}
      </span>
    </div>
  );
};

// Main component

export const ExportModalContent: React.FC<ExportModalContentProps> = ({
  file,
  project,
  onClose,
  mediaElementRef,
}) => {
  const hasSubtitles = project.subtitles.length > 0;
  const hasLyrics = project.lyrics.length > 0;

  const defaultKind: ExportKind = hasSubtitles
    ? 'subtitles'
    : hasLyrics
    ? 'lyrics'
    : 'video';

  // Form state
  const [kind, setKind] = useState<ExportKind>(defaultKind);
  const [subtitleFormat, setSubtitleFormat] = useState<SubtitleFormat>('srt');
  const [fileName, setFileName] = useState<string>(() =>
    sanitizeFileName(project.name || 'export'),
  );
  const [lastEditedExt, setLastEditedExt] = useState<string | null>(null);

  // NEW: export folder
  const [exportPath, setExportPath] = useState<string>(loadStoredPath);

  // In-flight job
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobPromise, setJobPromise] = useState<Promise<ExportJobResult> | null>(
    null,
  );
  const [jobTitle, setJobTitle] = useState('Exporting…');

  const cancelRef = useRef(false);

  // Derived
  const clips = kind === 'subtitles' ? project.subtitles : project.lyrics;

  const activeFormat = useMemo(
    () => SUBTITLE_FORMATS.find((f) => f.value === subtitleFormat)!,
    [subtitleFormat],
  );

  const desiredExt = kind === 'video' ? 'mp4' : activeFormat.ext;

  const finalFileName = useMemo(() => {
    const trimmed = fileName.trim() || 'export';
    const hasExt = /\.[a-z0-9]{2,5}$/i.test(trimmed);
    return hasExt ? trimmed : `${trimmed}.${desiredExt}`;
  }, [fileName, desiredExt]);

  // Full destination path (empty folder → rely on the save dialog)
  const destination = useMemo(
    () => (exportPath ? joinPath(exportPath, finalFileName) : ''),
    [exportPath, finalFileName],
  );

  const canExportText = clips.length > 0;
  const canExportVideo = !!file;
  const isWorking = jobPromise !== null;

  // Persist chosen folder
  useEffect(() => {
    if (exportPath) storePath(exportPath);
  }, [exportPath]);

  // Keep extension in sync when format changes
  useEffect(() => {
    setFileName((prev) => {
      if (lastEditedExt && prev.toLowerCase().endsWith(`.${lastEditedExt}`)) {
        const base = prev.slice(0, -(lastEditedExt.length + 1));
        return `${base}.${desiredExt}`;
      }
      return prev;
    });
    setLastEditedExt(desiredExt);
  }, [desiredExt, lastEditedExt]);

  // Overlay text for the preview snapshot
  const previewText = useMemo(() => {
    const list = kind === 'lyrics' ? project.lyrics : project.subtitles;
    if (!list.length) return null;
    return [...list].sort((a, b) => a.startTime - b.startTime)[0].text;
  }, [kind, project.lyrics, project.subtitles]);

  // Folder picker
  const handleBrowseFolder = useCallback(async () => {
    if (!window.electronAPI?.openFile) {
      // Web fallback — we can't access a real folder path, so prompt for a
      // virtual path the user understands won't be enforced.
      const entered = window.prompt(
        'Enter a destination folder (used only as a hint in the browser):',
        exportPath || '',
      );
      if (entered !== null) setExportPath(entered.trim());
      return;
    }

    try {
      const result = await window.electronAPI.openFile({
        title: 'Select Export Folder',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (!result.canceled && result.filePaths?.[0]) {
        setExportPath(result.filePaths[0]);
      }
    } catch (err) {
      console.error('Failed to pick folder:', err);
    }
  }, [exportPath]);

  // Start an export
  const handleExport = () => {
    if (isWorking) return;

    const id = makeJobId();
    cancelRef.current = false;

    const title =
      kind === 'video'
        ? 'Exporting Video'
        : `Exporting ${activeFormat.label}`;

    const promise: Promise<ExportJobResult> = (async () => {
      try {
        if (kind === 'video') {
          return await runVideoExport(id);
        }
        return await runTextExport(id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, message: msg };
      }
    })();

    setJobId(id);
    setJobTitle(title);
    setJobPromise(promise);
  };

  // Text export
  const runTextExport = async (id: string): Promise<ExportJobResult> => {
    if (!canExportText) {
      return { success: false, message: 'No clips to export.' };
    }

    const content = serializeSubtitles(clips, subtitleFormat);

    // Browser fallback
    if (!window.electronAPI?.writeTextFile) {
      const blob = new Blob([content], { type: activeFormat.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFileName;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, path: finalFileName };
    }

    // If the user chose a folder, we pass the full path so no dialog appears.
    // Otherwise, we fall back to the OS save dialog by omitting `filePath`.
    const filePath = destination || undefined;

    const result = await window.electronAPI.writeTextFile({
      content,
      filePath,
      title: `Export ${activeFormat.label}`,
      defaultPath: finalFileName,
      jobId: id,
      filters: [
        { name: activeFormat.label, extensions: [activeFormat.ext] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    return {
      success: !!result?.success,
      path: result?.path,
      message: result?.success ? undefined : 'Cancelled',
    };
  };

  // Video export
  const runVideoExport = async (id: string): Promise<ExportJobResult> => {
    if (!file) {
      return { success: false, message: 'No media file loaded.' };
    }

    if (!window.electronAPI?.exportVideo) {
      return {
        success: false,
        message: 'Video export requires the desktop app.',
      };
    }

    const safe = sanitizeFileName(project.name) || 'export';
    const result = await window.electronAPI.exportVideo({
      title: 'Export Video',
      defaultPath: destination || `${safe}.mp4`,
    });

    if (!result?.success || !result.path) {
      return { success: false, message: 'Cancelled' };
    }

    await new Promise((r) => setTimeout(r, 1500));
    return { success: true, path: result.path, partial: true };
  };

  // Overlay lifecycle
  const handleComplete = (_result: ExportJobResult) => {
    setJobId(null);
    setJobPromise(null);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setJobId(null);
    setJobPromise(null);
  };

  // Dropdown options
  const subtitleFormatOptions = SUBTITLE_FORMATS.map((f) => ({
    value: f.value,
    label: f.label,
  }));

  const visibleDescription =
    kind === 'video'
      ? 'Renders the current stage layers plus active subtitle/lyric clips into a single MP4.'
      : activeFormat.description;

  const disabled =
    isWorking ||
    (kind !== 'video' && !canExportText) ||
    (kind === 'video' && !canExportVideo);

  return (
    <>
      <div className="flex flex-col max-h-[calc(90vh-100px)]">
        <div
          className="flex-1 overflow-y-auto p-6 space-y-6 export-scroll-hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Destination preview */}
          <div className="flex items-start gap-4 p-4 rounded-lg border border-app-border bg-app-gray-dark/30">
            <StageThumbnail
              project={project}
              file={file}
              mediaElementRef={mediaElementRef}
              overlayText={previewText}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-app-text truncate">
                {project.name || 'Untitled project'}
              </h3>
              <p className="text-xs text-app-gray mt-0.5 truncate">
                {file?.name || 'No media loaded'}
              </p>
              <p className="text-[11px] text-app-gray mt-1">
                {project.subtitles.length} subtitle clip
                {project.subtitles.length === 1 ? '' : 's'} ·{' '}
                {project.lyrics.length} lyric clip
                {project.lyrics.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Export kind */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Export Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {KIND_OPTIONS.map((opt) => {
                const optDisabled =
                  (opt.value === 'subtitles' && !hasSubtitles) ||
                  (opt.value === 'lyrics' && !hasLyrics) ||
                  (opt.value === 'video' && !canExportVideo);
                const active = kind === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={optDisabled || isWorking}
                    onClick={() => setKind(opt.value)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-md border text-left transition-colors ${
                      active
                        ? 'bg-primary/15 border-primary text-app-text'
                        : 'bg-app-gray-light/40 border-app-border hover:bg-app-gray-light text-app-text'
                    } ${
                      optDisabled || isWorking
                        ? 'opacity-40 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {opt.icon}
                      <span className="text-sm font-medium">{opt.label}</span>
                    </span>
                    <span className="text-[10px] text-app-gray">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format selector */}
          {kind !== 'video' && (
            <div>
              <Dropdown
                id="export-format"
                name="subtitleFormat"
                label="Subtitle Format"
                value={subtitleFormat}
                options={subtitleFormatOptions}
                onChange={(_, value) =>
                  setSubtitleFormat(value as SubtitleFormat)
                }
                disabled={isWorking}
              />
              <p className="text-[11px] text-app-gray mt-1.5 flex items-center gap-1.5">
                <Info size={12} />
                {visibleDescription}
              </p>
            </div>
          )}

          {kind === 'video' && (
            <div className="text-xs text-app-gray bg-app-gray-light/40 border border-app-border rounded-md p-3">
              {visibleDescription} Encoding will be enabled once the ffmpeg
              backend is connected; a destination file will still be requested
              and confirmed.
            </div>
          )}

          {/* File name */}
          <div>
            <label
              htmlFor="export-filename"
              className="block text-sm font-medium text-app-text mb-2"
            >
              File Name
            </label>
            <div className="flex items-center gap-2">
              <input
                id="export-filename"
                type="text"
                value={fileName}
                disabled={isWorking}
                onChange={(e) => {
                  setFileName(e.target.value);
                  setLastEditedExt(null);
                }}
                placeholder="my-export"
                className="flex-1 px-3 py-2 bg-app-input-bg border border-app-border rounded-md text-sm text-app-text focus:outline-none focus:border-primary disabled:opacity-60"
              />
              <span className="text-xs text-app-gray px-2 py-1 rounded bg-app-gray-dark font-mono">
                .{desiredExt}
              </span>
            </div>
          </div>

          {/* Export folder (NEW) */}
          <div>
            <label
              htmlFor="export-path"
              className="block text-sm font-medium text-app-text mb-2"
            >
              Export Folder
            </label>
            <div className="flex items-center gap-2">
              <input
                id="export-path"
                type="text"
                value={exportPath}
                disabled={isWorking}
                onChange={(e) => setExportPath(e.target.value)}
                placeholder="Leave blank to choose on export…"
                className="flex-1 px-3 py-2 bg-app-input-bg border border-app-border rounded-md text-sm text-app-text focus:outline-none focus:border-primary disabled:opacity-60 font-mono"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                disabled={isWorking}
                className="px-3 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center gap-2 text-sm disabled:opacity-60"
                title="Browse for folder"
              >
                <FolderOpen size={16} />
                Browse
              </button>
            </div>
            <p className="text-[11px] text-app-gray mt-1.5">
              {exportPath ? (
                <>
                  Will save to{' '}
                  <span className="text-app-text font-mono break-all">
                    {destination}
                  </span>
                </>
              ) : (
                'A save dialog will appear when you click Export.'
              )}
            </p>
          </div>

          {/* Summary */}
          <div className="bg-app-gray-light p-3 rounded-md text-xs">
            <p className="text-sm font-medium text-app-text mb-1">Summary</p>
            <ul className="space-y-0.5 text-app-gray">
              <li>
                Media:{' '}
                <span className="text-app-text">{file?.name || 'None'}</span>
              </li>
              <li>
                Mode:{' '}
                <span className="text-app-text">
                  {project.mode === 'lyrics' ? 'Lyrics' : 'Subtitles'}
                </span>
              </li>
              <li>
                Clips:{' '}
                <span className="text-app-text">
                  {kind === 'video'
                    ? project.subtitles.length + project.lyrics.length
                    : clips.length}
                </span>
              </li>
              {kind !== 'video' && (
                <li>
                  Output:{' '}
                  <span className="text-app-text">{activeFormat.label}</span>
                </li>
              )}
              {kind === 'video' && (
                <li>
                  Container:{' '}
                  <span className="text-app-text">MP4 (H.264)</span>
                </li>
              )}
              <li>
                Save to:{' '}
                <span className="text-app-text font-mono break-all">
                  {exportPath ? destination : 'Save dialog on export'}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-app-border p-4 flex items-center justify-end gap-3 bg-app-surface">
          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            className="px-4 py-2 bg-app-gray-light rounded-md hover:bg-app-gray text-app-text text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={disabled}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm min-w-[140px]"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Progress overlay */}
      {jobPromise && jobId && (
        <ExportProgressOverlay
          jobId={jobId}
          title={jobTitle}
          promise={jobPromise}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};
