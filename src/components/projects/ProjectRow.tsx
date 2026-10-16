// src/components/projects/ProjectRow.tsx
import React, { useEffect, useState } from 'react';
import {
  Mic,
  Type,
  Clock,
  Film,
  Music,
  Trash2,
  Loader2,
} from 'lucide-react';
import { VoxMatchProject } from '../../types/types';
import { DeleteProjectModal } from '../modals/DeleteProjectModal';
import { getProjectSnapshot } from '../../utils/projectSnapshot';

interface ProjectRowProps {
  project: VoxMatchProject;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  formatDate: (timestamp: number) => string;
}

function totalClips(project: VoxMatchProject): number {
  let total = 0;
  const tracks = project.tracks ?? {};
  for (const t of Object.values(tracks)) {
    total += (t?.lyrics?.length ?? 0) + (t?.subtitles?.length ?? 0);
  }
  return total;
}

function hasAnyContent(project: VoxMatchProject): boolean {
  const tracks = project.tracks ?? {};
  for (const t of Object.values(tracks)) {
    if ((t?.lyrics?.length ?? 0) > 0) return true;
    if ((t?.subtitles?.length ?? 0) > 0) return true;
  }
  return false;
}

export const ProjectRow: React.FC<ProjectRowProps> = ({
  project,
  onOpen,
  onDelete,
  formatDate,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [snapshot, setSnapshot] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getProjectSnapshot(project)
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
  }, [project]);

  const videoCount = project.mediaFiles.filter((f) =>
    f.type.startsWith('video'),
  ).length;
  const audioCount = project.mediaFiles.filter((f) =>
    f.type.startsWith('audio'),
  ).length;

  const hasContent = hasAnyContent(project);
  const clipCount = totalClips(project);

  return (
    <>
      <div className="bg-app-surface border border-app-border rounded-lg p-3 hover:border-primary/40 transition-all group shadow-sm hover:shadow-md">
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          <div className="relative w-20 h-12 rounded-md overflow-hidden border border-app-border bg-black flex-shrink-0">
            {snapshot ? (
              <img
                src={snapshot}
                alt={`${project.name} preview`}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-app-gray-dark to-app-gray-light/50 flex items-center justify-center">
                {loading ? (
                  <Loader2 size={14} className="animate-spin text-app-gray" />
                ) : project.mode === 'lyrics' ? (
                  <Mic size={16} className="text-primary" />
                ) : (
                  <Type size={16} className="text-primary" />
                )}
              </div>
            )}
            {!hasContent && !loading && (
              <div className="absolute inset-0 bg-black/40" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-semibold text-app-text text-sm truncate">
                {project.name}
              </h3>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  project.mode === 'lyrics'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {project.mode === 'lyrics' ? 'Lyrics' : 'Subtitles'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-app-gray">
              <span className="flex items-center gap-1">
                <Clock size={15} />
                {formatDate(project.updatedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Film size={12} className="text-app-text" />
                {videoCount}
              </span>
              <span className="flex items-center gap-1">
                <Music size={12} className="text-app-text" />
                {audioCount}
              </span>
              <span className="flex items-center gap-1">
                {clipCount} clips
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onOpen(project.id)}
              className="px-3 py-1.5 bg-primary text-white rounded-md text-xs hover:bg-primary-hover transition-colors"
            >
              Open
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 bg-transparent text-app-icon-color rounded-md text-xs hover:bg-danger/10 hover:text-danger border border-app-border transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <DeleteProjectModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete(project.id)}
        projectName={project.name}
      />
    </>
  );
};
