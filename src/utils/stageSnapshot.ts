// src/utils/stageSnapshot.ts
import {
  StageStyle,
  StageLayer,
  GradientStop,
  TextStyle,
  ImportedMediaFile,
} from '../types/types';
import { getAspectRatio, hexToRgb, clamp01 } from './utils';

interface SnapshotOptions {
  stageStyle: StageStyle;
  /** Current lyric/subtitle text to draw (optional). */
  overlayText?: string | null;
  /** Style used to render the overlay text. */
  textStyle?: TextStyle;
  /** Width in device pixels. Height is derived from aspect ratio. */
  width?: number;
  /** Media element to draw as the video frame (optional). */
  mediaElement?: HTMLVideoElement | null;
  /** Media type — controls whether we skip drawing the video element. */
  mediaIsVideo?: boolean;
  /** Honour the "hide video" flag in the current stage settings. */
  hideVideoLayer?: boolean;
  /** Honour the "hide audio title" flag in the current stage settings. */
  hideAudioTitle?: boolean;
  /** Active file name — drawn in the audio placeholder when applicable. */
  activeFileName?: string | null;
}

/**
 * Offscreen-render the current stage to a PNG data URL.
 * - Video element (if provided) is drawn first when it's the active source.
 * - Layers are painted in order.
 * - Overlay text is drawn last using the supplied text style.
 */
export async function renderStageSnapshot(
  options: SnapshotOptions,
): Promise<string> {
  const {
    stageStyle,
    overlayText,
    textStyle,
    width = 320,
    mediaElement,
    mediaIsVideo,
    hideVideoLayer,
    hideAudioTitle,
    activeFileName,
  } = options;

  const aspect = getAspectRatio(stageStyle);
  const height = Math.round(width / aspect);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // ----- Base background -----
  ctx.fillStyle = stageStyle.backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);

  // ----- Video element (only if it's the active source and not hidden) -----
  if (
    mediaIsVideo &&
    !hideVideoLayer &&
    mediaElement &&
    mediaElement.readyState >= 2 /* HAVE_CURRENT_DATA */
  ) {
    try {
      drawVideoContain(ctx, mediaElement, width, height);
    } catch {
      // Silent — Tainted canvas or not-yet-ready; fall through to layers
    }
  }

  // ----- Layers -----
  const layers = (stageStyle.layers || []).filter((l) => l.visible !== false);
  for (const layer of layers) {
    await drawLayer(ctx, layer, width, height);
  }

  // ----- Audio title placeholder -----
  const isAudioActive = !!activeFileName && !mediaIsVideo;
  if (isAudioActive && !hideAudioTitle) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, width, height);
    drawCenteredText(ctx, '♪ Audio', width, height);
  }

  // ----- Overlay text -----
  if (overlayText && textStyle) {
    drawOverlayText(ctx, overlayText, textStyle, width, height);
  }

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

// --------------------------------------------------------------------------
// Layer rendering
// --------------------------------------------------------------------------

async function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: StageLayer,
  w: number,
  h: number,
): Promise<void> {
  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;

  const cx = w / 2;
  const cy = h / 2;
  ctx.translate(cx, cy);
  const tx = ((layer.x || 0) / 100) * w;
  const ty = ((layer.y || 0) / 100) * h;
  ctx.translate(tx, ty);
  ctx.scale(layer.scale || 1, layer.scale || 1);
  ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  try {
    if (layer.type === 'color') {
      ctx.fillStyle = layer.content || '#000';
      ctx.fillRect(0, 0, w, h);
    } else if (layer.type === 'gradient' && layer.gradient) {
      const { type, angle = 90, stops } = layer.gradient;
      if (type === 'linear') {
        const rad = (angle * Math.PI) / 180;
        const x1 = cx - (Math.cos(rad) * w) / 2;
        const y1 = cy - (Math.sin(rad) * h) / 2;
        const x2 = cx + (Math.cos(rad) * w) / 2;
        const y2 = cy + (Math.sin(rad) * h) / 2;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        applyStops(grad, stops);
        ctx.fillStyle = grad;
      } else if (type === 'radial') {
        const grad = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          Math.max(w, h) / 2,
        );
        applyStops(grad, stops);
        ctx.fillStyle = grad;
      } else {
        // Conic isn't widely supported on CanvasRenderingContext2D;
        // fall back to a linear gradient so the snapshot is still useful.
        const grad = ctx.createLinearGradient(0, 0, w, h);
        applyStops(grad, stops);
        ctx.fillStyle = grad;
      }
      ctx.fillRect(0, 0, w, h);
    } else if (
      (layer.type === 'image' || layer.type === 'video') &&
      layer.content
    ) {
      // Skip video layers here — the primary video element is drawn above.
      if (layer.type === 'image') {
        const img = await loadImage(layer.content);
        if (img) {
          drawImageWithFit(ctx, img, w, h, layer.fit || 'cover');
        }
      }
    }
  } catch {
    // Never fail the whole snapshot for a single bad layer.
  }

  ctx.restore();
}

function applyStops(grad: CanvasGradient, stops: GradientStop[]) {
  for (const s of stops) {
    try {
      grad.addColorStop(clamp01(s.position / 100), s.color);
    } catch {
      // Ignore invalid stops
    }
  }
}

// --------------------------------------------------------------------------
// Image helpers
// --------------------------------------------------------------------------

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawImageWithFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  fit: 'cover' | 'contain' | 'fill' | 'none',
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  if (fit === 'fill') {
    ctx.drawImage(img, 0, 0, w, h);
    return;
  }
  if (fit === 'none') {
    ctx.drawImage(img, 0, 0, iw, ih);
    return;
  }

  const scale =
    fit === 'cover'
      ? Math.max(w / iw, h / ih)
      : Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  if (fit === 'cover') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }
}

function drawVideoContain(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const scale = Math.min(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  ctx.fillStyle = '#000';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.drawImage(video, dx, dy, dw, dh);
}

// --------------------------------------------------------------------------
// Text helpers
// --------------------------------------------------------------------------

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
) {
  ctx.fillStyle = '#ffffff';
  ctx.font = `500 ${Math.round(h * 0.08)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
}

function drawOverlayText(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  w: number,
  h: number,
) {
  const padding = style.padding ?? 12;
  const boxWidth = (style.width / 100) * w;
  const baseFontSize = style.fontSize ?? 24;
  // Scale the font proportionally to the snapshot width vs. stage preview width
  const fontScale = w / 400;
  const fontSize = Math.max(8, baseFontSize * fontScale);

  const fontParts = [
    style.italic ? 'italic' : '',
    String(style.fontWeight || 500),
    `${fontSize}px`,
    style.fontFamily || 'Inter',
  ]
    .filter(Boolean)
    .join(' ');

  ctx.font = fontParts;
  ctx.textBaseline = 'top';
  ctx.textAlign = (style.textAlign as CanvasTextAlign) || 'center';

  const lines = wrapText(ctx, text, boxWidth - padding * 2);
  const lineHeight = (style.lineHeight || fontSize * 1.2) * fontScale;
  const textBlockHeight = lines.length * lineHeight;

  // Compute anchor inside the canvas based on alignment
  const vAnchor = style.verticalAlign || 'flex-end';
  const hAnchor = style.horizontalAlign || 'center';

  let blockX = 0;
  if (hAnchor === 'center') blockX = (w - boxWidth) / 2;
  else if (hAnchor === 'flex-end') blockX = w - boxWidth - padding;
  else blockX = padding;

  let blockY = 0;
  if (vAnchor === 'center') blockY = (h - textBlockHeight) / 2;
  else if (vAnchor === 'flex-end') blockY = h - textBlockHeight - padding * 2;
  else blockY = padding;

  const innerX = blockX + padding;
  const innerY = blockY + padding;

  // Background (if enabled)
  if (style.withBg && style.bgOpacity > 0) {
    ctx.save();
    const rgba = hexToRgbArray(style.bgColor);
    ctx.fillStyle = `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${clamp01(
      style.bgOpacity,
    )})`;
    roundRect(
      ctx,
      blockX,
      blockY,
      boxWidth,
      textBlockHeight + padding * 2,
      style.borderRadius || 0,
    );
    ctx.fill();
    ctx.restore();
  }

  // Text shadow for readability
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = style.textColor || '#ffffff';

  const alignX =
    style.textAlign === 'left'
      ? innerX
      : style.textAlign === 'right'
      ? innerX + (boxWidth - padding * 2)
      : innerX + (boxWidth - padding * 2) / 2;
  ctx.textAlign = (style.textAlign as CanvasTextAlign) || 'center';

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(
      style.uppercase ? lines[i].toUpperCase() : lines[i],
      alignX,
      innerY + i * lineHeight,
    );
  }
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function hexToRgbArray(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}