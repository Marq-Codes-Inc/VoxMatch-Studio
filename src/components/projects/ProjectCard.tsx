// src/components/projects/ProjectCard.tsx
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

interface ProjectCardProps {
  project: VoxMatchProject;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  formatDate: (timestamp: number) => string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
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

  const hasContent =
    project.lyrics.length > 0 || project.subtitles.length > 0;

  return (
    <>
      <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden hover:border-primary/40 transition-all group shadow-sm hover:shadow-md">
        {/* Thumbnail — real stage snapshot */}
        <div className="relative aspect-video bg-black border-b border-app-border overflow-hidden">
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
                <Loader2 size={20} className="animate-spin text-app-gray" />
              ) : (
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  {project.mode === 'lyrics' ? (
                    <Mic size={20} className="text-primary" />
                  ) : (
                    <Type size={20} className="text-primary" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mode pill — top right */}
          <span
            className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium backdrop-blur-sm ${
              project.mode === 'lyrics'
                ? 'bg-purple-500/80 text-white'
                : 'bg-blue-500/80 text-white'
            }`}
          >
            {project.mode === 'lyrics' ? 'Lyrics' : 'Subtitles'}
          </span>

          {/* Empty-state overlay */}
          {!hasContent && !loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-[11px] text-white/80 font-medium">
                Empty project
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-semibold text-app-text text-sm truncate flex-1">
              {project.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-[12px] text-app-gray mb-2">
            <Clock size={15} />
            <span>{formatDate(project.updatedAt)}</span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-app-gray mb-3">
            <span className="flex items-center gap-1">
              <Film size={12} className="text-app-text" />
              {videoCount}
            </span>
            <span className="flex items-center gap-1">
              <Music size={12} className="text-app-text" />
              {audioCount}
            </span>
            <span className="flex items-center gap-1 ml-auto">
              {project.subtitles.length + project.lyrics.length} clips
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => onOpen(project.id)}
              className="flex-1 px-3 py-1.5 bg-primary text-white rounded-md text-xs hover:bg-primary-hover transition-colors"
            >
              Open
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-2 py-1.5 bg-transparent text-app-icon-color rounded-md text-xs hover:bg-danger/10 hover:text-danger border border-app-border transition-colors"
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