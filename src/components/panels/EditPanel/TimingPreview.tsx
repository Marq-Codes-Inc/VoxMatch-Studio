// src/components/panels/EditPanel/TimingPreview.tsx
import React from 'react';
import { Clock } from 'lucide-react';

export const TimingPreview: React.FC<{ clips: { text: string; duration: number }[] }> = ({
  clips,
}) => (
  <div className="p-3 bg-app-gray-light rounded-md border border-app-border">
    <div className="flex items-center mb-2">
      <Clock size={14} className="text-primary mr-2" />
      <span className="text-xs font-medium">Estimated Timing Preview</span>
      <span className="ml-auto text-xs text-app-gray">
        {clips.length} clips · Total:{' '}
        {clips.reduce((sum, c) => sum + c.duration, 0).toFixed(1)}s
      </span>
    </div>
    <div className="text-xs space-y-1">
      {clips.slice(0, 3).map((c, i) => (
        <div key={i} className="flex justify-between">
          <span className="truncate flex-1">{c.text}</span>
          <span className="text-app-gray ml-2">{c.duration.toFixed(1)}s</span>
        </div>
      ))}
      {clips.length > 3 && (
        <div className="text-app-gray">...and {clips.length - 3} more</div>
      )}
    </div>
  </div>
);
