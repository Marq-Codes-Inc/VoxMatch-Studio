// src/test/setup.ts
import '@testing-library/jest-dom/vitest';

// Reset window.__VOX_HISTORY_LOG__ before every test.
import { beforeEach } from 'vitest';
import { resetHistoryLog } from '../utils/historyLog';

beforeEach(() => {
  resetHistoryLog();
});

// jsdom already provides localStorage, but guard for safety
// in case tests run in a non-browser environment.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      get length() {
        return store.size;
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
    },
  });
}