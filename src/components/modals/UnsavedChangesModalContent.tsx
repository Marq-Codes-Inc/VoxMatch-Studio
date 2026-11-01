// src/components/modals/UnsavedChangesModalContent.tsx
import React from 'react';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';

interface Props {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedChangesModalContent: React.FC<Props> = ({ onSave, onDiscard, onCancel }) => (
  <div className="p-8 flex flex-col items-center text-center gap-6 max-w-xl mx-auto">
    
    {/* Warning Icon */}
    <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
      <AlertTriangle className="text-warning" size={32} />
    </div>

    {/* Text Content */}
    <div className="space-y-2">
      <h3 className="text-xl font-semibold text-app-text">Unsaved Changes</h3>
      <p className="text-sm text-app-gray leading-relaxed max-w-md">
        You have unsaved changes to your project. If you leave now, these changes will be lost permanently.
      </p>
    </div>

    {/* Action Buttons */}
    <div className="flex items-center justify-center gap-3 w-full mt-2">
      <button
        onClick={onCancel}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-app-text bg-app-gray-light hover:bg-app-border hover:text-white rounded-lg font-medium transition-colors whitespace-nowrap"
      >
        <X size={16} />
        Cancel
      </button>
      
      <button
        onClick={onDiscard}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-red-500/80 hover:bg-red-500 rounded-lg font-medium transition-colors whitespace-nowrap"
      >
        <Trash2 size={16} />
        Discard
      </button>
      
      <button
        onClick={onSave}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white hover:bg-primary-hover rounded-lg font-medium transition-all whitespace-nowrap"
      >
        <Save size={16} />
        Save & Close
      </button>
    </div>
  </div>
);