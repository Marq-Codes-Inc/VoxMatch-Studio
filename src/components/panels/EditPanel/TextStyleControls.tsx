// src/components/panels/EditPanel/TextStyleControls.tsx
import React from 'react';
import { TextStyle } from '../../../types/types';
import { Dropdown } from '../../ui/Dropdown';
import { Slider } from '../../ui/Slider';
import { Checkbox } from '../../ui/Checkbox';

export const TextStyleControls: React.FC<{
  label: string;
  style: TextStyle;
  onChange: (next: TextStyle) => void;
}> = ({ label, style, onChange }) => {
  const defaults: TextStyle = {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 500,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 50,
    textColor: '#FFFFFF',
    withBg: false,
    bgColor: 'transparent',
    bgOpacity: 0,
    padding: 4,
    borderRadius: 4,
    textAlign: 'center',
    position: { x: 0, y: 0 },
    width: 25,
    verticalAlign: 'flex-end',
    horizontalAlign: 'center',
  };

  const update = <K extends keyof TextStyle>(k: K, v: TextStyle[K]) =>
    onChange({ ...style, [k]: v });

  const grid: { v: TextStyle['verticalAlign']; h: TextStyle['horizontalAlign'] }[] = [
    { v: 'flex-start', h: 'flex-start' },
    { v: 'flex-start', h: 'center' },
    { v: 'flex-start', h: 'flex-end' },
    { v: 'center', h: 'flex-start' },
    { v: 'center', h: 'center' },
    { v: 'center', h: 'flex-end' },
    { v: 'flex-end', h: 'flex-start' },
    { v: 'flex-end', h: 'center' },
    { v: 'flex-end', h: 'flex-end' },
  ];

  return (
    <div className="p-4 rounded-xl border border-app-border bg-app-surface shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-app-text text-lg">{label} Style</h3>
        <button
          onClick={() => onChange(defaults)}
          className="px-3 py-1 text-xs rounded-lg bg-app-gray-light hover:bg-danger hover:text-white"
        >
          Reset
        </button>
      </div>

      <div>
        <label className="text-xs text-app-gray mb-2 block">Position</label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-app-gray-dark rounded-md">
          {grid.map((a, i) => (
            <button
              key={i}
              onClick={() =>
                onChange({ ...style, verticalAlign: a.v, horizontalAlign: a.h })
              }
              className={`h-8 rounded ${
                style.verticalAlign === a.v && style.horizontalAlign === a.h
                  ? 'bg-primary'
                  : 'bg-app-gray-light hover:bg-app-gray'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Slider label="Width" value={style.width} min={10} max={100} onChange={(v) => update('width', v)} />
        <Slider label="X Offset" value={style.position.x} min={0} max={100} onChange={(v) => update('position', { ...style.position, x: v })} />
        <Slider label="Y Offset" value={style.position.y} min={0} max={100} onChange={(v) => update('position', { ...style.position, y: v })} />
      </div>

      <hr className="border-app-border" />

      <div className="grid grid-cols-2 gap-4">
        <Dropdown
          id={`${label}-font`}
          name="fontFamily"
          label="Font Family"
          value={style.fontFamily}
          options={[
            { value: 'Inter', label: 'Inter' },
            { value: 'Arial', label: 'Arial' },
            { value: 'Roboto', label: 'Roboto' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Georgia', label: 'Georgia' },
          ]}
          onChange={(_, value) => update('fontFamily', value as string)}
        />

        <Dropdown
          id={`${label}-weight`}
          name="fontWeight"
          label="Font Weight"
          value={String(style.fontWeight)}
          options={[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => ({
            value: String(w),
            label: String(w),
          }))}
          onChange={(_, value) => update('fontWeight', Number(value))}
        />

        <Slider label="Font Size" value={style.fontSize} min={8} max={100} onChange={(v) => update('fontSize', v)} />
        <Slider label="Line Height" value={style.lineHeight} min={10} max={200} onChange={(v) => update('lineHeight', v)} />
        <Slider label="Letter Spacing" value={style.letterSpacing} min={-2} max={20} onChange={(v) => update('letterSpacing', v)} />

        <Dropdown
          id={`${label}-align`}
          name="textAlign"
          label="Align"
          value={style.textAlign}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(_, value) => update('textAlign', value as TextStyle['textAlign'])}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-app-gray">Text Color</label>
          <input
            type="color"
            value={style.textColor}
            onChange={(e) => update('textColor', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            label="Background"
            checked={style.withBg}
            onChange={(checked) => update('withBg', checked)}
          />
          <input
            type="color"
            value={style.bgColor}
            disabled={!style.withBg}
            onChange={(e) => update('bgColor', e.target.value)}
            className="w-10 h-8 border border-app-border rounded cursor-pointer disabled:opacity-50"
          />
          <Slider
            label={`Opacity: ${style.bgOpacity}`}
            value={style.bgOpacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => update('bgOpacity', v)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Slider label="Padding" value={style.padding} min={0} max={64} onChange={(v) => update('padding', v)} />
        <Slider label="Border Radius" value={style.borderRadius} min={0} max={64} onChange={(v) => update('borderRadius', v)} />
      </div>
    </div>
  );
};