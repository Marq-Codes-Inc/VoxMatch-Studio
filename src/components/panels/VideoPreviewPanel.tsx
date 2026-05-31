// src/components/panels/VideoPreviewPanel.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Video, Maximize, Minimize, FileAudio, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { ImportedMediaFile, AppSettings, StageStyle, TextStyle, StageLayer, GradientStop } from '../../types/types';
import { getAspectRatio, hexToRgb, clamp01 } from '../../utils/utils';

interface VideoPreviewPanelProps {
  isVerticalLayout: boolean;
  isPlaying: boolean;
  togglePlayPause: () => void;
  isMaximizedVideo: boolean;
  setIsMaximizedVideo: (isMax: boolean) => void;
  mediaUrl: string | null;
  mediaElementRef: React.RefObject<HTMLVideoElement>;       // ref to the video element (portaled)
  mediaPortalRef: React.RefObject<HTMLDivElement>;          // ref to the portal target
  currentTime: number;
  mediaDuration: number;
  handleSeek: (time: number) => void;
  activeFile: ImportedMediaFile | null;
  settings: AppSettings;
  currentSubtitleText: string | null;
  stageStyle: StageStyle;
  lyricTextStyle: TextStyle;
  subtitleTextStyle: TextStyle;
  overlayMode: 'lyrics' | 'subtitles';
  videoAspect: number | null;                                // received from parent
}

const renderLayer = (layer: StageLayer): React.CSSProperties => {
  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    opacity: layer.opacity ?? 1,
    mixBlendMode: layer.blendMode as any,
    transform: `translate(${layer.x || 0}%, ${layer.y || 0}%) scale(${layer.scale || 1}) rotate(${layer.rotation || 0}deg)`,
  };
  
  if (layer.type === 'color') {
    style.backgroundColor = layer.content;
  } else if (layer.type === 'gradient' && layer.gradient) {
    const { type, angle, stops } = layer.gradient;
    const stopString = stops.map((s: GradientStop) => `${s.color} ${s.position}%`).join(', ');
    if (type === 'linear') style.background = `linear-gradient(${angle || 90}deg, ${stopString})`;
    else if (type === 'radial') style.background = `radial-gradient(circle, ${stopString})`;
    else if (type === 'conic') style.background = `conic-gradient(from ${angle || 0}deg, ${stopString})`;
  } else if ((layer.type === 'image' || layer.type === 'video') && layer.content) {
    style.backgroundImage = `url(${layer.content})`;
    style.backgroundSize = layer.fit || 'cover';
    style.backgroundPosition = 'center';
    style.backgroundRepeat = 'no-repeat';
  }
  return style;
};

export const VideoPreviewPanel: React.FC<VideoPreviewPanelProps> = ({
  isVerticalLayout, isPlaying, togglePlayPause, isMaximizedVideo, setIsMaximizedVideo,
  mediaUrl, mediaElementRef, mediaPortalRef, currentTime, mediaDuration, handleSeek,
  activeFile, currentSubtitleText,
  stageStyle, lyricTextStyle, subtitleTextStyle, overlayMode,
  videoAspect,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string | null>(null);

  const isVideo = !!activeFile && activeFile.type.startsWith('video');
  const isAudioFile = !!activeFile && activeFile.type.startsWith('audio');

  useEffect(() => {
    if (!isAudioFile) {
      setBackgroundVideoUrl(null);
      return;
    }
    const videoLayer = stageStyle.layers?.find(l => l.type === 'video' && l.visible !== false && l.content);
    if (videoLayer && videoLayer.content) {
      setBackgroundVideoUrl(videoLayer.content);
    } else {
      setBackgroundVideoUrl(null);
    }
  }, [stageStyle.layers, isAudioFile]);

  useEffect(() => {
    if (!backgroundVideoRef.current || !backgroundVideoUrl) return;
    const video = backgroundVideoRef.current;
    if (isPlaying) {
      video.play().catch(e => console.warn('Background video play failed:', e));
    } else {
      video.pause();
    }
  }, [isPlaying, backgroundVideoUrl]);

  useEffect(() => {
    if (!backgroundVideoRef.current || !backgroundVideoUrl || !isAudioFile) return;
    const video = backgroundVideoRef.current;
    if (Math.abs(video.currentTime - currentTime) > 0.2) {
      video.currentTime = currentTime;
    }
  }, [currentTime, backgroundVideoUrl, isAudioFile]);

  const formatTime = (t: number) => {
    if (!isFinite(t) || isNaN(t)) return '0:00';
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const pageXToTime = (pageX: number) => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(pageX - rect.left, rect.width));
    const pct = rect.width > 0 ? x / rect.width : 0;
    return pct * mediaDuration;
  };

  const onPointerDownTrack = (e: React.PointerEvent) => {
    if (!mediaDuration) return;
    isDraggingRef.current = true;
    pointerIdRef.current = (e as any).pointerId;
    (e.target as Element).setPointerCapture?.((e as any).pointerId);
    const newTime = pageXToTime(e.pageX);
    handleSeek(newTime);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current || pointerIdRef.current !== ev.pointerId) return;
      const t = pageXToTime(ev.pageX);
      handleSeek(t);
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (pointerIdRef.current !== ev.pointerId) return;
      isDraggingRef.current = false;
      pointerIdRef.current = null;
      (e.target as Element).releasePointerCapture?.(ev.pointerId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onSeekBarKeyDown = (e: React.KeyboardEvent) => {
    if (!mediaDuration) return;
    if (e.key === 'ArrowLeft') { handleSeek(currentTime - 5); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { handleSeek(currentTime + 5); e.preventDefault(); }
    else if (e.key === 'Home') { handleSeek(0); e.preventDefault(); }
    else if (e.key === 'End') { handleSeek(mediaDuration); e.preventDefault(); }
  };

  // ── Text style & animation ──
  const textStyle = overlayMode === 'lyrics' ? lyricTextStyle : subtitleTextStyle;
  const stageAspectRatio = getAspectRatio(stageStyle);

  const animClass =
    (textStyle as any).animation && (textStyle as any).animation !== 'none'
      ? `animate-text-${(textStyle as any).animation}`
      : '';

  const getBgStyle = (): React.CSSProperties => {
    if (!textStyle.withBg) return {};
    const bg = textStyle.bgColor;
    if (bg && (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient'))) {
      return { background: bg };
    }
    return {
      backgroundColor: `rgba(${hexToRgb(bg)}, ${clamp01(textStyle.bgOpacity)})`,
    };
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: textStyle.horizontalAlign || 'center',
    alignItems: textStyle.verticalAlign || 'flex-end',
    pointerEvents: 'none',
    zIndex: 15,
  };

  const textInnerStyle: React.CSSProperties = {
    textAlign: textStyle.textAlign || 'center',
    color: textStyle.textColor,
    fontFamily: textStyle.fontFamily,
    fontSize: `${textStyle.fontSize}px`,
    fontWeight: textStyle.fontWeight as any,
    fontStyle: textStyle.italic ? 'italic' : 'normal',
    letterSpacing: `${textStyle.letterSpacing}px`,
    lineHeight: `${textStyle.lineHeight}px`,
    textTransform: textStyle.uppercase ? 'uppercase' : 'none',
    padding: `${textStyle.padding}px`,
    borderRadius: `${textStyle.borderRadius}px`,
    width: `${textStyle.width}%`,
    maxWidth: '100%',
    transform: `translate(${textStyle.position.x}%, ${textStyle.position.y}%)`,
    pointerEvents: 'auto',
    opacity: currentSubtitleText ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    ...getBgStyle(),
  };

  const handleSeekBackward = () => { handleSeek(Math.max(0, currentTime - 1)); };
  const handleSeekForward = () => { handleSeek(Math.min(mediaDuration, currentTime + 1)); };

  const progressPercent = mediaDuration > 0 ? (currentTime / mediaDuration) * 100 : 0;
  const visibleLayers = stageStyle.layers?.filter(l => l.visible !== false) || [];
  const showBackgroundVideo = isAudioFile && backgroundVideoUrl && !isVideo;

  return (
    <div className="bg-app-surface p-4 rounded-lg border border-app-border flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h3 className="text-xl font-semibold flex items-center"><Video className="mr-2 text-primary" /> Monitor</h3>
        {!isVerticalLayout && (
          <button onClick={() => setIsMaximizedVideo(!isMaximizedVideo)} className="p-1 rounded-md hover:bg-app-gray-light text-app-icon-color" title={isMaximizedVideo ? 'Minimize Video' : 'Maximize Video'}>
            {isMaximizedVideo ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        )}
      </div>

      {activeFile && <p className="text-sm text-app-gray mb-2 flex-shrink-0 truncate">{activeFile.name}</p>}

      <div className="w-full flex-grow flex items-center justify-center min-h-0 mx-auto">
        <div className="relative overflow-hidden bg-black rounded-lg" style={{ height: '100%', width: 'auto', aspectRatio: isVideo ? (videoAspect || stageAspectRatio) : stageAspectRatio }}>
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0" style={{ backgroundColor: stageStyle.backgroundColor || '#000000' }} />
            {visibleLayers.map((layer) => (
              <div key={layer.id} style={renderLayer(layer)} />
            ))}
          </div>

          {/* Portal target – the actual <video> element will be injected here by the parent */}
          <div ref={mediaPortalRef} className="absolute inset-0 z-10" />

          {showBackgroundVideo && (
            <video
              ref={backgroundVideoRef}
              src={backgroundVideoUrl}
              className="absolute inset-0 w-full h-full object-cover z-5"
              loop
              muted
              playsInline
            />
          )}

          {/* Audio file placeholder – now darker */}
          {isAudioFile && !showBackgroundVideo && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900">
              <FileAudio size={48} className="text-primary mb-4" />
              <div className="text-lg font-medium text-app-text mb-2">{activeFile?.name || 'Audio File'}</div>
              <div className="text-sm text-app-gray">Audio</div>
            </div>
          )}

          {/* Text overlay */}
          <div style={overlayStyle}>
            <div className={animClass} style={textInnerStyle}>
              {currentSubtitleText || ''}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center space-x-4 mt-4 flex-shrink-0">
        <button onClick={handleSeekBackward} className="p-2 rounded-full hover:text-primary transition-colors" title="1s back">
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <button onClick={togglePlayPause} className="p-2 rounded-full hover:text-primary transition-colors" title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={22} strokeWidth={1.5} /> : <Play size={22} strokeWidth={1.5} />}
        </button>
        <button onClick={handleSeekForward} className="p-2 rounded-full hover:text-primary transition-colors" title="1s forward">
          <ChevronRight size={22} strokeWidth={1.5} />
        </button>
      </div>

      {isMaximizedVideo && mediaDuration > 0 && (
        <div className="flex items-center w-full mt-4 flex-shrink-0 space-x-2">
          <span className="text-xs text-app-gray w-10 text-right">{formatTime(currentTime)}</span>
          <div 
            ref={containerRef} 
            role="slider" 
            aria-valuemin={0} 
            aria-valuemax={mediaDuration} 
            aria-valuenow={currentTime} 
            tabIndex={0} 
            onKeyDown={onSeekBarKeyDown} 
            onPointerDown={onPointerDownTrack} 
            className="relative flex-grow h-3 bg-app-gray-light rounded-full select-none cursor-pointer" 
            style={{ touchAction: 'none' }}
          >
            <div 
              ref={progressFillRef} 
              className="absolute top-0 left-0 h-full bg-primary rounded-full z-10" 
              style={{ width: `${progressPercent}%` }} 
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md z-20" 
              style={{ left: `calc(${progressPercent}% - 8px)` }} 
            />
          </div>
          <span className="text-xs text-app-gray w-10">{formatTime(mediaDuration)}</span>
        </div>
      )}
    </div>
  );
};