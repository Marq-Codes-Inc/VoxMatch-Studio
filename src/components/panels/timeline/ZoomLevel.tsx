// src/components/panels/timeline/ZoomLevel.tsx
import React from 'react';
import { VolumeSlider as SliderBase } from './VolumeSlider';

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

export const ZoomLevel: React.FC<Props> = (props) => <SliderBase {...props} />;

