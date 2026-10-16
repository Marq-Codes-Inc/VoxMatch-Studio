// src/components/panels/timeline/TimeRuler.tsx
import React, { useMemo } from 'react';
import { getNiceInterval, timeToPercent } from './constants';

interface Props {
  mediaDuration: number;
  zoom: number;
  formatTime: (s: number) => string;
  containerWidth: number;
}

export const TimeRuler: React.FC<Props> = ({
  mediaDuration, zoom, formatTime, containerWidth,
}) => {
  const innerWidth = containerWidth * zoom;
  const secondsPerPixel = mediaDuration / Math.max(innerWidth, 1);
  const major = useMemo(() => getNiceInterval(secondsPerPixel, 80), [secondsPerPixel]);
  const minorCount = major >= 5 ? 4 : 5;
  const minorsEvery = major / minorCount;

  const majors = [];
  for (let t = 0; t <= mediaDuration + 0.0001; t += major) {
    majors.push(
      <div
        key={`maj-${t}`}
        className="absolute top-0 h-full flex flex-col items-center -translate-x-1/2"
        style={{ left: `${timeToPercent(t, mediaDuration)}%` }}
      >
        <div className="w-px h-3 bg-app-gray/80" />
        <span className="text-[10px] text-app-gray mt-1">
          {formatTime(Math.round(t)).substring(0, 8)}
        </span>
      </div>,
    );
  }
  const minors = [];
  for (let t = 0; t <= mediaDuration + 0.0001; t += minorsEvery) {
    if (Math.abs(t % major) < 1e-6) continue;
    minors.push(
      <div
        key={`min-${t}`}
        className="absolute top-0 h-2 w-px bg-app-gray/40 -translate-x-1/2"
        style={{ left: `${timeToPercent(t, mediaDuration)}%` }}
      />,
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 h-10 border-b border-app-border bg-gradient-to-b from-app-gray-dark/40 to-transparent">
      {majors}
      {minors}
    </div>
  );
};