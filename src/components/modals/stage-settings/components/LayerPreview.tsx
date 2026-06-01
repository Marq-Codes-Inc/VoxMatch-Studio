// src/components/modals/stage-settings/components/LayerPreview.tsx
import React, { useState, useRef, useEffect } from 'react';
import { StageLayer, GradientStop } from '../../../../types/types';

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
  const [previewScale, setPreviewScale] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fittedSize, setFittedSize] = useState<{ width: number; height: number }>({ width: 400, height: 225 });

  // Measure available space and compute the maximum size that preserves the aspect ratio
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;

        const containerRatio = width / height;
        if (aspectRatio > containerRatio) {
          // Preview is wider than container → fit by width
          setFittedSize({
            width,
            height: width / aspectRatio,
          });
        } else {
          // Preview is taller (or equal) → fit by height
          setFittedSize({
            width: height * aspectRatio,
            height,
          });
        }
      }
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [aspectRatio]);

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

  const visibleLayers = layers.filter((l) => l.visible !== false);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Card that fills the available height */}
      <div className="bg-gradient-to-br from-app-gray-dark/30 to-app-gray-dark/50 rounded-2xl p-6 flex flex-col flex-1 min-h-0">
        <h4 className="text-sm font-semibold text-app-text uppercase tracking-wider mb-4 shrink-0">
          Preview
        </h4>

        {/* The measured area for the preview */}
        <div
          ref={wrapperRef}
          className="flex-1 min-h-0 relative overflow-hidden my-2"
        >
          <div
            className="absolute top-1/2 left-1/2 rounded-xl overflow-hidden border-2 border-app-border shadow-2xl transition-all duration-300 ease-out"
            style={{
              width: fittedSize.width,
              height: fittedSize.height,
              backgroundColor,
              transform: `translate(-50%, -50%) scale(${previewScale})`,
              transformOrigin: 'center center',
            }}
          >
            {visibleLayers.map((layer) => (
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

        {/* Zoom controls – always visible */}
        <div className="shrink-0 flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPreviewScale(Math.max(0.25, previewScale - 0.1))}
            className="px-3 py-1 text-xs bg-app-gray-dark rounded-lg hover:bg-app-gray-light transition-colors"
          >
            −
          </button>
          <span className="text-xs text-app-gray min-w-[60px] text-center">
            {Math.round(previewScale * 100)}%
          </span>
          <button
            onClick={() => setPreviewScale(Math.min(3, previewScale + 0.1))}
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
    </div>
  );
};
