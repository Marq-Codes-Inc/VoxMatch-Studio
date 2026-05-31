// LayerPreview.tsx
import React, { useState, useEffect } from 'react';
import { StageLayer, GradientStop } from '../../../../types/types';
import { Maximize2, Minimize2 } from 'lucide-react';

interface LayerPreviewProps {
  layers: StageLayer[];
  backgroundColor: string;
  aspectRatio: number;
  showSafeArea: boolean;
}

export const LayerPreview: React.FC<LayerPreviewProps> = ({
  layers,
  backgroundColor,
  aspectRatio,
  showSafeArea,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const getLayerStyle = (layer: StageLayer): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      opacity: layer.opacity,
      mixBlendMode: layer.blendMode as any,
      transform: `translate(${layer.x || 0}%, ${layer.y || 0}%) scale(${layer.scale || 1}) rotate(${layer.rotation || 0}deg)`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };
    
    if (layer.type === 'color') {
      style.backgroundColor = layer.content;
    } else if (layer.type === 'gradient' && layer.gradient) {
      const { type, angle, stops } = layer.gradient;
      const stopString = stops.map((s: GradientStop) => `${s.color} ${s.position}%`).join(', ');
      if (type === 'linear') {
        style.background = `linear-gradient(${angle}deg, ${stopString})`;
      } else if (type === 'radial') {
        style.background = `radial-gradient(circle, ${stopString})`;
      } else {
        style.background = `conic-gradient(from ${angle}deg, ${stopString})`;
      }
    } else if ((layer.type === 'image' || layer.type === 'video') && layer.content) {
      style.backgroundImage = `url(${layer.content})`;
      style.backgroundSize = layer.fit || 'cover';
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
    }
    
    return style;
  };

  const visibleLayers = layers.filter(l => l.visible !== false);

  return (
    <div className="bg-gradient-to-br from-app-gray-dark/30 to-app-gray-dark/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-app-text uppercase tracking-wider">Preview</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg hover:bg-app-gray-light text-app-gray hover:text-app-text transition-all duration-200"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      
      <div className="flex justify-center">
        <div 
          className={`
            relative rounded-xl overflow-hidden
            border-2 border-app-border shadow-2xl
            transition-all duration-300 ease-out
            ${isFullscreen ? 'scale-100 shadow-2xl' : 'hover:shadow-xl'}
          `}
          style={{
            width: isFullscreen ? '100%' : 'min(100%, 400px)',
            aspectRatio,
            backgroundColor,
            transform: `scale(${previewScale})`,
          }}
        >
          {visibleLayers.map((layer, index) => (
            <div 
              key={layer.id} 
              style={getLayerStyle(layer)}
              className="animate-layer-appear"
            />
          ))}
          
          {showSafeArea && (
            <>
              <div className="absolute inset-[10%] border-2 border-dashed border-yellow-500/60 pointer-events-none rounded-lg animate-pulse" />
              <div className="absolute inset-[20%] border border-dashed border-yellow-500/30 pointer-events-none rounded-lg" />
              <div className="absolute bottom-3 left-3 text-[10px] text-yellow-500/80 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md font-medium">
                Safe Area
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
          className="px-3 py-1 text-xs bg-app-gray-dark rounded-lg hover:bg-app-gray-light transition-colors"
        >
          −
        </button>
        <span className="text-xs text-app-gray min-w-[60px] text-center">
          {Math.round(previewScale * 100)}%
        </span>
        <button
          onClick={() => setPreviewScale(Math.min(2, previewScale + 0.1))}
          className="px-3 py-1 text-xs bg-app-gray-dark rounded-lg hover:bg-app-gray-light transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setPreviewScale(1)}
          className="px-3 py-1 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors ml-2"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
