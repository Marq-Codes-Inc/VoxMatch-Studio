import { useEffect, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  code?: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (e: KeyboardEvent) => void;
  description: string;
  preventDefault?: boolean;
  allowInInputs?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable || target.getAttribute('role') === 'textbox';
}

function matches(e: KeyboardEvent, s: KeyboardShortcut): boolean {
  const keyMatch =
    s.key.toLowerCase() === e.key.toLowerCase() ||
    (!!s.code && s.code === e.code);
  if (!keyMatch) return false;

  const mod = e.ctrlKey || e.metaKey;
  const ctrlOk = s.ctrl ? mod : !mod;
  const shiftOk = !!s.shift === e.shiftKey;
  const altOk = !!s.alt === e.altKey;

  return ctrlOk && shiftOk && altOk;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {},
) {
  const { enabled = true } = options;
  const ref = useRef(shortcuts);

  useEffect(() => {
    ref.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const editable = isEditableTarget(e.target);
      for (const s of ref.current) {
        if (!matches(e, s)) continue;
        if (editable && !s.allowInInputs) continue;

        if (s.preventDefault !== false) {
          e.preventDefault();
          e.stopPropagation();
        }
        s.handler(e);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);
}

export const SHORTCUTS = {
  SAVE: { key: 's', ctrl: true, description: 'Save project' },
  SAVE_AS: { key: 's', ctrl: true, shift: true, description: 'Save project as' },
  UNDO: { key: 'z', ctrl: true, description: 'Undo' },
  REDO: { key: 'z', ctrl: true, shift: true, description: 'Redo' },
  REDO_ALT: { key: 'y', ctrl: true, description: 'Redo' },
  NEW_CLIP: { key: 'n', ctrl: true, description: 'New clip' },
  PLAY_PAUSE: { key: ' ', code: 'Space', description: 'Play/pause' },
  DELETE: { key: 'Delete', code: 'Delete', description: 'Delete selected' },
  COPY: { key: 'c', ctrl: true, description: 'Copy clip' },
  PASTE: { key: 'v', ctrl: true, description: 'Paste clip' },
  FOCUS_TEXT: { key: 't', description: 'Focus text' },
} as const;
