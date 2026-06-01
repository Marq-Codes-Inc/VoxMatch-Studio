import { StageStyle } from "../types/types";

// src/utils/utils.ts
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00.000';
  const ms = Math.floor((seconds * 1000) % 1000);
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function timeStringToSeconds(timeStr: string): number {
  try {
    const parts = timeStr.split(/[:.]/);
    if (parts.length !== 4) return 0;
    const h = parseInt(parts[0], 10) * 3600;
    const m = parseInt(parts[1], 10) * 60;
    const s = parseInt(parts[2], 10);
    const ms = parseInt(parts[3], 10) / 1000;
    return h + m + s + ms;
  } catch {
    return 0;
  }
}

export function getAspectRatio(stageStyle: StageStyle): number {
  if (stageStyle.aspectRatio === 'custom' && stageStyle.customWidth && stageStyle.customHeight) {
    return stageStyle.customWidth / stageStyle.customHeight;
  }
  const ratios: Record<string, number> = {
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '1:1': 1,
    '9:16': 9 / 16,
    '21:9': 21 / 9,
    '2.35:1': 2.35,
  };
  return ratios[stageStyle.aspectRatio || '16:9'] || 16 / 9;
}

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function renderStageBackground(stageStyle: any): React.ReactNode {
  return null;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
