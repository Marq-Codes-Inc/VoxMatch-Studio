import React from 'react';
import { Modal } from '../ui/Modal';

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  projectName,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Project"
      size="sm"
    >
      <div className="p-6">
        <p className="text-app-gray mb-6">
          Are you sure you want to delete "{projectName}"? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-app-text-secondary hover:text-app-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-danger text-white rounded-lg hover:bg-danger/80 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
};