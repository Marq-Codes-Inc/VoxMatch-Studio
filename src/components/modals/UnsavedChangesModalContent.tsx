// src/components/modals/UnsavedChangesModalContent.tsx
import React from 'react';

interface Props {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedChangesModalContent: React.FC<Props> = ({ onSave, onDiscard, onCancel }) => (
  <div className="p-6 flex flex-col gap-4">
    <p className="text-app-text text-lg">
      You have unsaved changes to your project. What would you like to do?
    </p>
    <div className="flex justify-end gap-3 mt-4">
      <button
        onClick={onCancel}
        className="px-4 py-2 text-app-text hover:bg-app-gray-light rounded-md border border-app-border"
      >
        Cancel
      </button>
      <button
        onClick={onDiscard}
        className="px-4 py-2 bg-danger text-white hover:bg-red-600 rounded-md"
      >
        Discard
      </button>
      <button
        onClick={onSave}
        className="px-4 py-2 bg-primary text-white hover:bg-primary-hover rounded-md"
      >
        Save & Close
      </button>
    </div>
  </div>
);