import React, { useState } from 'react';
import { Mic, Type, Clock, Film, Music, Trash2 } from 'lucide-react';
import { VoxMatchProject } from '../../types/types';
import { DeleteProjectModal } from '../modals/DeleteProjectModal';

interface ProjectRowProps {
  project: VoxMatchProject;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  formatDate: (timestamp: number) => string;
}

export const ProjectRow: React.FC<ProjectRowProps> = ({ project, onOpen, onDelete, formatDate }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="bg-app-surface border border-app-border rounded-lg p-3 hover:border-primary/40 transition-all group shadow-sm hover:shadow-md">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            {project.mode === 'lyrics' ? (
              <Mic size={18} className="text-primary" />
            ) : (
              <Type size={18} className="text-primary" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-semibold text-app-text text-sm truncate">{project.name}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                project.mode === 'lyrics' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
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
                {project.mediaFiles.filter(f => f.type.startsWith('video')).length}
              </span>
              <span className="flex items-center gap-1">
                <Music size={12} className="text-app-text" />
                {project.mediaFiles.filter(f => f.type.startsWith('audio')).length}
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
