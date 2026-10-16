// src/utils/historyLog.ts
import type { HistoryLogEvent } from '../types/history';

declare global {
  interface Window {
    __VOX_HISTORY_LOG__?: HistoryLogEvent[];
  }
}

export function logHistory(event: HistoryLogEvent): void {
  if (typeof window === 'undefined') return;

  if (!Array.isArray(window.__VOX_HISTORY_LOG__)) {
    window.__VOX_HISTORY_LOG__ = [];
  }
  window.__VOX_HISTORY_LOG__.push(event);

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[history]', event);
  }
}

export function resetHistoryLog(): void {
  if (typeof window === 'undefined') return;
  window.__VOX_HISTORY_LOG__ = [];
}

export function getHistoryLog(): HistoryLogEvent[] {
  if (typeof window === 'undefined') return [];
  return window.__VOX_HISTORY_LOG__ ?? [];
}