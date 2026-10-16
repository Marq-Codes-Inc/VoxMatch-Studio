// src/components/panels/timeline/types.ts

export interface TimelineContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  clipId?: string;
  timeAtClick?: number;
}

export interface TimelineContextMenuProps {
  contextMenu: TimelineContextMenuState;
  onClose: () => void;
  onCopy: (clipId?: string) => void;
  onPaste: (time?: number) => void;
  onSplit: (clipId?: string) => void;
  onMerge: () => void;
  onDelete: (clipId?: string) => void;
  onDuplicate: (clipId?: string) => void;
  hasCopiedClip: boolean;
  hasMultipleSelected: boolean;
}