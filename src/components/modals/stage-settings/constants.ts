export const BLEND_MODE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
];

export const ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: '16:9 Landscape' },
  { value: '4:3', label: '4:3 Standard' },
  { value: '1:1', label: '1:1 Square' },
  { value: '9:16', label: '9:16 Portrait' },
  { value: '21:9', label: '21:9 Ultrawide' },
  { value: '2.35:1', label: '2.35:1 Cinemascope' },
  { value: 'custom', label: 'Custom' },
];

export const LAYER_TYPE_OPTIONS = [
  { value: 'color', label: 'Solid Color', icon: '🎨' },
  { value: 'gradient', label: 'Gradient', icon: '🌈' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'video', label: 'Video Overlay', icon: '🎬' },
];

export const GRADIENT_TYPE_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
  { value: 'conic', label: 'Conic' },
];

export const FIT_MODE_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
  { value: 'none', label: 'None' },
];