// src/components/panels/timeline/TrackLane.tsx
import React from 'react';

export const TrackLane: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute left-0 right-0 top-12 h-14 bg-app-gray-light/30 border border-app-border rounded-md shadow-inner">
    {children}
  </div>
);