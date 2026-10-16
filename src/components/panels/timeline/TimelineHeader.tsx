// src/components/panels/timeline/TimelineHeader.tsx
import React from 'react';
import {
  Ruler,
  Undo,
  Redo,
  Magnet,
  Volume2,
  VolumeX,
  Trash2,
  ZoomIn,
  ZoomOut,
  Activity,
} from 'lucide-react';
import { VuMeter } from '../../audio/VuMeter';
import { VolumeSlider } from './VolumeSlider';
import { ZoomLevel } from './ZoomLevel';
import { FileTabs } from '../../editor/FileTabs';

interface Props {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  onClearTimeline: () => void;
  isMediaLoaded: boolean;
  hasClips: boolean;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  isPlaying: boolean;
  isVuOverlayEnabled: boolean;
  onToggleVuOverlay: () => void;
}

export const TimelineHeader: React.FC<Props> = ({
  undo, redo, canUndo, canRedo, snapToGrid, toggleSnapToGrid,
  zoom, setZoom, volume, setVolume, isMuted, toggleMute,
  onClearTimeline, isMediaLoaded, hasClips, analyserRef, isPlaying,
  isVuOverlayEnabled, onToggleVuOverlay,
}) => (
  <div className="flex items-center gap-4 mb-2 flex-shrink-0 min-w-0">
    <h3 className="text-xl font-semibold flex items-center flex-shrink-0">
      <Ruler className="mr-2 text-primary" /> Timeline
    </h3>

    <div className="flex-1 min-w-0 flex items-center">
      <FileTabs />
    </div>

    <div className="flex items-center gap-3 flex-shrink-0">
      <button
        onClick={undo}
        disabled={!canUndo}
        className="p-1 rounded disabled:opacity-50 text-app-icon-color"
      >
        <Undo size={18} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="p-1 rounded disabled:opacity-50 text-app-icon-color"
      >
        <Redo size={18} />
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setZoom(Math.max(1, zoom - 0.25))}
          className="p-1 rounded text-app-icon-color"
        >
          <ZoomOut size={16} />
        </button>
        <ZoomLevel value={zoom} min={1} max={20} step={0.25} onChange={setZoom} />
        <button
          onClick={() => setZoom(Math.min(20, zoom + 0.25))}
          className="p-1 rounded text-app-icon-color"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={toggleMute} className="p-1 rounded text-app-icon-color">
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <VolumeSlider value={volume} min={0} max={1} step={0.05} onChange={setVolume} />
        <VuMeter analyserRef={analyserRef} isPlaying={isPlaying} variant="compact" />
        <button
          onClick={onToggleVuOverlay}
          className={`p-1.5 rounded-full transition-all duration-200 ${
            isVuOverlayEnabled
              ? 'bg-primary text-white shadow-md shadow-primary/40'
              : 'text-app-icon-color hover:bg-app-gray-light hover:text-primary'
          }`}
          title={isVuOverlayEnabled ? 'Hide floating audio meter' : 'Show floating audio meter'}
        >
          <Activity size={15} strokeWidth={2} />
        </button>
      </div>

      <button
        onClick={toggleSnapToGrid}
        title="Snap to Grid"
        className={`p-2 rounded-full transition-all duration-200 ${
          snapToGrid
            ? 'bg-primary text-white shadow-md shadow-primary/40 scale-105'
            : 'bg-app-surface text-app-icon-color hover:bg-app-gray-light hover:text-primary'
        }`}
      >
        <Magnet size={15} strokeWidth={2} />
      </button>

      <button
        onClick={onClearTimeline}
        className="p-2 rounded-md hover:bg-app-gray-light text-app-icon-color disabled:opacity-50"
        title="Clear Timeline & Unload Media"
        disabled={!isMediaLoaded && !hasClips}
      >
        <Trash2 size={20} />
      </button>
    </div>
  </div>
);