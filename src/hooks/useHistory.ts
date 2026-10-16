// src/hooks/useHistory.ts
import { useCallback, useRef, useState } from 'react';
import type { HistoryEntry } from '../types/history';
import { logHistory } from '../utils/historyLog';

export interface UseHistoryOptions<T> {
  maxSize?: number;
  isEqual?: (a: T, b: T) => boolean;
}

export interface UseHistoryReturn<T> {
  push: (state: T, label: string) => void;
  undo: () => T | null;
  redo: () => T | null;
  reset: (state: T) => void;
  canUndo: boolean;
  canRedo: boolean;
  size: number;
  index: number;
  entries: HistoryEntry<T>[];
}

export function useHistory<T>(
  options: UseHistoryOptions<T> = {},
): UseHistoryReturn<T> {
  const { maxSize = 200, isEqual } = options;

  const [entries, setEntries] = useState<HistoryEntry<T>[]>([]);
  const [index, setIndex] = useState(-1);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const indexRef = useRef(index);
  indexRef.current = index;

  const push = useCallback(
    (state: T, label: string) => {
      const prev = entriesRef.current;
      const currIdx = indexRef.current;

      // Skip duplicate pushes at the same position
      if (isEqual && currIdx >= 0 && prev[currIdx]) {
        if (isEqual(prev[currIdx].state, state)) {
          logHistory({
            ts: Date.now(),
            action: 'skip',
            label,
            reason: 'equal-to-current',
            index: currIdx,
          });
          return;
        }
      }

      const trimmed = prev.slice(0, currIdx + 1);
      const next: HistoryEntry<T> = { state, label, ts: Date.now() };
      const combined = [...trimmed, next];
      const capped =
        combined.length > maxSize
          ? combined.slice(combined.length - maxSize)
          : combined;
      const newIndex = capped.length - 1;

      entriesRef.current = capped;
      indexRef.current = newIndex;
      setEntries(capped);
      setIndex(newIndex);

      logHistory({
        ts: Date.now(),
        action: 'push',
        label,
        index: newIndex,
      });
    },
    [maxSize, isEqual],
  );

  const undo = useCallback((): T | null => {
    const currIdx = indexRef.current;
    if (currIdx <= 0) return null;
    const newIdx = currIdx - 1;
    const entry = entriesRef.current[newIdx];
    if (!entry) return null;

    indexRef.current = newIdx;
    setIndex(newIdx);

    logHistory({
      ts: Date.now(),
      action: 'undo',
      label: entry.label,
      index: newIdx,
    });
    return entry.state;
  }, []);

  const redo = useCallback((): T | null => {
    const currIdx = indexRef.current;
    const list = entriesRef.current;
    if (currIdx >= list.length - 1) return null;
    const newIdx = currIdx + 1;
    const entry = list[newIdx];
    if (!entry) return null;

    indexRef.current = newIdx;
    setIndex(newIdx);

    logHistory({
      ts: Date.now(),
      action: 'redo',
      label: entry.label,
      index: newIdx,
    });
    return entry.state;
  }, []);

  const reset = useCallback((state: T) => {
    const entry: HistoryEntry<T> = {
      state,
      label: 'initial',
      ts: Date.now(),
    };
    entriesRef.current = [entry];
    indexRef.current = 0;
    setEntries([entry]);
    setIndex(0);
    logHistory({ ts: Date.now(), action: 'reset', index: 0 });
  }, []);

  return {
    push,
    undo,
    redo,
    reset,
    canUndo: index > 0,
    canRedo: index >= 0 && index < entries.length - 1,
    size: entries.length,
    index,
    entries,
  };
}