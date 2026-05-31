import { StageStyle, StageLayer } from '../../../types/types';

export interface StageSettingsContentProps {
  stageStyle: StageStyle;
  setStageStyle: (style: StageStyle) => void;
  onClose?: () => void;
}

export interface GradientEditorProps {
  layer: StageLayer;
  updateLayer: (id: string, updates: Partial<StageLayer>) => void;
}

export interface LayerEditorProps {
  layer: StageLayer;
  index: number;
  totalLayers: number;
  updateLayer: (id: string, updates: Partial<StageLayer>) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (layer: StageLayer) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragging: boolean;
  dragOverIndex: number | null;
}

export interface CustomSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  label?: string;
  suffix?: string;
  showValue?: boolean;
  compact?: boolean;
}

export interface ColorInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}

