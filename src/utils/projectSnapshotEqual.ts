// src/utils/projectSnapshotEqual.ts
import type { ProjectSnapshot } from '../types/history';

export function projectSnapshotsEqual(
  a: ProjectSnapshot,
  b: ProjectSnapshot,
): boolean {
  if (a === b) return true;
  if (a.activeFileId !== b.activeFileId) return false;
  if (a.activeLeftPanelTab !== b.activeLeftPanelTab) return false;
  if (a.subtitleLanguage !== b.subtitleLanguage) return false;
  if (!layoutEqual(a.layout, b.layout)) return false;
  if (!mediaFilesEqual(a.importedFiles, b.importedFiles)) return false;
  if (!settingsEqual(a.settings, b.settings)) return false;

  const aKeys = Object.keys(a.tracks);
  const bKeys = Object.keys(b.tracks);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) if (!b.tracks[k]) return false;

  for (const k of aKeys) {
    if (JSON.stringify(a.tracks[k]) !== JSON.stringify(b.tracks[k])) {
      return false;
    }
  }
  return true;
}

function layoutEqual(
  a: ProjectSnapshot['layout'],
  b: ProjectSnapshot['layout'],
): boolean {
  return (
    a.isVerticalLayout === b.isVerticalLayout &&
    a.isMaximizedVideo === b.isMaximizedVideo &&
    a.isLeftPanelFilled === b.isLeftPanelFilled &&
    a.isLeftPanelTopRowFilled === b.isLeftPanelTopRowFilled
  );
}

function mediaFilesEqual(
  a: ProjectSnapshot['importedFiles'],
  b: ProjectSnapshot['importedFiles'],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.name !== y.name ||
      x.path !== y.path ||
      x.type !== y.type ||
      x.size !== y.size ||
      x.duration !== y.duration ||
      x.loaded !== y.loaded ||
      x.posterDataUrl !== y.posterDataUrl
    ) {
      return false;
    }
  }
  return true;
}

function settingsEqual(
  a: ProjectSnapshot['settings'],
  b: ProjectSnapshot['settings'],
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}