import React, { useState } from 'react';
import { Mic, Type, Clock, Film, Music, Trash2 } from 'lucide-react';
import { VoxMatchProject } from '../../types/types';
import { DeleteProjectModal } from '../modals/DeleteProjectModal';

interface ProjectCardProps {
  project: VoxMatchProject;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  formatDate: (timestamp: number) => string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onDelete, formatDate }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden hover:border-primary/40 transition-all group shadow-sm hover:shadow-md">
        {/* Thumbnail */}
        <div className="aspect-video bg-gradient-to-br from-app-gray-dark to-app-gray-light/50 flex items-center justify-center border-b border-app-border">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            {project.mode === 'lyrics' ? (
              <Mic size={20} className="text-primary" />
            ) : (
              <Type size={20} className="text-primary" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-semibold text-app-text text-sm truncate flex-1">{project.name}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              project.mode === 'lyrics' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {project.mode === 'lyrics' ? 'Lyrics' : 'Subs'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-app-gray mb-2">
            <Clock size={15} />
            <span>{formatDate(project.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-app-gray mb-3">
            <span className="flex items-center gap-1">
              <Film size={12} className="text-app-text" />
              {project.mediaFiles.filter(f => f.type.startsWith('video')).length}
            </span>
            <span className="flex items-center gap-1">
              <Music size={12} className="text-app-text" />
              {project.mediaFiles.filter(f => f.type.startsWith('audio')).length}
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
