// src/hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback, useRef } from 'react';

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
  ignoreWhenTyping?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  ignoreWhenTyping?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, ignoreWhenTyping = true } = options;
  const shortcutsRef = useRef(shortcuts);
  
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const isTyping = useCallback((): boolean => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const tagName = activeElement.tagName;
    const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
    const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';
    const isRoleTextbox = activeElement.getAttribute('role') === 'textbox';
    return isInput || isContentEditable || isRoleTextbox;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (ignoreWhenTyping && isTyping()) {
        if (e.key !== 'Escape') return;
      }

      for (const shortcut of shortcutsRef.current) {
        const keyMatch = shortcut.key.toLowerCase() === e.key.toLowerCase() ||
                        (shortcut.code && shortcut.code === e.code);
        if (!keyMatch) continue;
        
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = !!shortcut.shift === e.shiftKey;
        const altMatch = !!shortcut.alt === e.altKey;
        const metaMatch = !!shortcut.meta === e.metaKey;
        
        if (ctrlMatch && shiftMatch && altMatch && metaMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
            e.stopPropagation();
          }
          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, ignoreWhenTyping, isTyping]);
}

export const SHORTCUTS = {
  SAVE: { key: 's', ctrl: true, description: 'Save project' },
  SAVE_AS: { key: 's', ctrl: true, shift: true, description: 'Save project as' },
  UNDO: { key: 'z', ctrl: true, description: 'Undo' },
  REDO: { key: 'z', ctrl: true, shift: true, description: 'Redo' },
  REDO_ALT: { key: 'y', ctrl: true, description: 'Redo (alternative)' },
  NEW_CLIP: { key: 'n', ctrl: true, description: 'New clip (subtitle/lyric at current time)' },
  PLAY_PAUSE: { key: ' ', code: 'Space', description: 'Play/Pause' },
  SEEK_BACK: { key: 'ArrowLeft', code: 'ArrowLeft', description: 'Seek backward' },
  SEEK_FORWARD: { key: 'ArrowRight', code: 'ArrowRight', description: 'Seek forward' },
  SEEK_BACK_5: { key: 'ArrowLeft', code: 'ArrowLeft', shift: true, description: 'Seek backward 5s' },
  SEEK_FORWARD_5: { key: 'ArrowRight', code: 'ArrowRight', shift: true, description: 'Seek forward 5s' },
  GO_TO_START: { key: 'Home', code: 'Home', description: 'Go to start' },
  GO_TO_END: { key: 'End', code: 'End', description: 'Go to end' },
  DELETE: { key: 'Delete', code: 'Delete', description: 'Delete selected' },
  ESCAPE: { key: 'Escape', code: 'Escape', description: 'Clear selection/Close menu' },
  SWITCH_TAB: { key: 'Tab', code: 'Tab', description: 'Switch between subtitles/lyrics' },
  RESET_LAYOUT: { key: '\\', ctrl: true, description: 'Reset layout' },
  TOGGLE_MAXIMIZE: { key: 'f', ctrl: true, description: 'Toggle maximize video' },
  TOGGLE_FILL_PANEL: { key: 'f', ctrl: true, shift: true, description: 'Toggle fill panel' },
  ZOOM_IN: { key: '=', ctrl: true, description: 'Zoom in' },
  ZOOM_OUT: { key: '-', ctrl: true, description: 'Zoom out' },
  ZOOM_RESET: { key: '0', ctrl: true, description: 'Reset zoom' },
} as const;