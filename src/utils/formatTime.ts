// src/utils/formatTime.ts
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00:00.000';
  const ms = Math.floor((seconds * 1000) % 1000);
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

export const timeStringToSeconds = (timeStr: string): number => {
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
};

