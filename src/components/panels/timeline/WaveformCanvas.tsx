// src/components/panels/timeline/WaveformCanvas.tsx
import React from 'react';

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const WaveformCanvas: React.FC<Props> = ({ canvasRef }) => (
  <canvas
    ref={canvasRef}
    height={50}
    className="absolute bottom-0 left-0 w-full h-[50px] pointer-events-none opacity-80 transition-opacity duration-300"
  />
);
