// src/components/modals/AboutModalContent.tsx
import React from 'react';

export const AboutModalContent: React.FC = () => {
  return (
    <div className="p-6 space-y-4 text-center">
      <img
        src="assets/VoxMatch-logo.png"
        alt="VoxMatch Studio"
        className="w-48 mx-auto mb-4"
      />
      <h2 className="text-2xl font-bold">VoxMatch Studio</h2>
      <p className="text-app-gray">Version 1.0.0</p>
      <p className="text-app-gray">
        Professional audio/video editing software with advanced lyrics and subtitle synchronization.
      </p>
      <div className="pt-4 border-t border-app-border">
            <p className="text-app-gray text-sm">VoxMatch Studio &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

