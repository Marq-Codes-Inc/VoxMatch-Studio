import React from 'react';
import { TextStyle } from '../../types/types';

interface TemplatesContentProps {
  currentStyle: TextStyle;           // the current lyric or subtitle style
  onSelectTextStyle: (style: TextStyle) => void;
}

// Helper – merges the template over the base style
const buildStyle = (base: TextStyle, overrides: Partial<TextStyle> & { animation?: string }): TextStyle => {
  return {
    ...base,
    ...overrides,
    // ensure 'animation' is always a string (default 'none')
    animation: overrides.animation || base.animation || 'none',
  } as TextStyle;
};

const TEMPLATES: Array<{ name: string; style: Partial<TextStyle> & { animation?: string } }> = [
  {
    name: 'Clean White',
    style: {
      textColor: '#FFFFFF',
      fontFamily: 'Inter',
      fontSize: 30,
      fontWeight: 600,
      withBg: true,
      bgColor: '#000000',
      bgOpacity: 0.65,
      padding: 14,
      borderRadius: 8,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 80,
      position: { x: 0, y: 0 },
      animation: 'fade',
    },
  },
  {
    name: 'Bold Yellow',
    style: {
      textColor: '#FFD700',
      fontFamily: 'Roboto',
      fontSize: 28,
      fontWeight: 700,
      withBg: true,
      bgColor: '#1A1A1A',
      bgOpacity: 0.8,
      padding: 12,
      borderRadius: 4,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 85,
      position: { x: 0, y: 0 },
      animation: 'slide-up',
    },
  },
  {
    name: 'Crimson Edge',
    style: {
      textColor: '#DC143C',
      fontFamily: 'Georgia',
      fontSize: 26,
      fontWeight: 600,
      uppercase: true,
      letterSpacing: 2,
      withBg: true,
      bgColor: '#111111',
      bgOpacity: 0.75,
      padding: 10,
      borderRadius: 2,
      verticalAlign: 'flex-end',
      horizontalAlign: 'flex-start',
      width: 60,
      position: { x: 5, y: -5 },
      animation: 'fade',
    },
  },
  {
    name: 'Neon Green',
    style: {
      textColor: '#39FF14',
      fontFamily: 'Inter',
      fontSize: 32,
      fontWeight: 500,
      withBg: false,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 70,
      position: { x: 0, y: -3 },
      animation: 'typewriter',
    },
  },
  {
    name: 'Serif Classic',
    style: {
      textColor: '#F5F5DC',
      fontFamily: 'Times New Roman',
      fontSize: 27,
      fontWeight: 400,
      italic: true,
      withBg: true,
      bgColor: '#2E2E2E',
      bgOpacity: 0.7,
      padding: 10,
      borderRadius: 6,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 75,
      position: { x: 0, y: 0 },
      animation: 'fade',
    },
  },
  {
    name: 'Gradient Card',
    style: {
      textColor: '#FFFFFF',
      fontFamily: 'Inter',
      fontSize: 28,
      fontWeight: 600,
      withBg: true,
      bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      bgOpacity: 1,
      padding: 16,
      borderRadius: 12,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 80,
      position: { x: 0, y: 0 },
      animation: 'slide-up',
    },
  },
  {
    name: 'Shadow Pop',
    style: {
      textColor: '#FF8C00',
      fontFamily: 'Arial',
      fontSize: 34,
      fontWeight: 700,
      withBg: false,
      verticalAlign: 'center',
      horizontalAlign: 'center',
      width: 90,
      position: { x: 0, y: 0 },
      animation: 'pop',
    },
  },
  {
    name: 'Top‑Left Minimal',
    style: {
      textColor: '#CCCCCC',
      fontFamily: 'Roboto',
      fontSize: 22,
      fontWeight: 400,
      withBg: true,
      bgColor: '#000000',
      bgOpacity: 0.5,
      padding: 8,
      borderRadius: 4,
      verticalAlign: 'flex-start',
      horizontalAlign: 'flex-start',
      width: 50,
      position: { x: 3, y: 3 },
      animation: 'fade',
    },
  },
];

// Quick hex → rgb helper
function hexToRgb(hex: string): string {
  if (!hex || hex === 'transparent') return '0,0,0';
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

export const TemplatesContent: React.FC<TemplatesContentProps> = ({
  currentStyle,
  onSelectTextStyle,
}) => {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-medium text-app-text mb-2">Lower Thirds & Subtitles</h3>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((template) => {
          const preview = buildStyle(currentStyle, template.style);
          return (
            <button
              key={template.name}
              onClick={() => onSelectTextStyle(preview)}
              className="p-3 bg-app-gray-light rounded-lg border border-app-border hover:border-primary transition-colors text-left"
            >
              <h4 className="font-semibold text-xs mb-1.5 text-app-text">
                {template.name}
              </h4>
              <div
                className="p-1.5 rounded text-center text-xs leading-tight"
                style={{
                  color: preview.textColor,
                  fontFamily: preview.fontFamily,
                  fontSize: `${Math.min(preview.fontSize, 18)}px`,
                  fontWeight: preview.fontWeight,
                  fontStyle: preview.italic ? 'italic' : 'normal',
                  letterSpacing: `${preview.letterSpacing}px`,
                  textTransform: preview.uppercase ? 'uppercase' : 'none',
                  backgroundColor: preview.withBg
                    ? preview.bgColor.startsWith('linear-gradient')
                      ? undefined
                      : `rgba(${hexToRgb(preview.bgColor)}, ${preview.bgOpacity})`
                    : 'transparent',
                  backgroundImage: preview.withBg && preview.bgColor.startsWith('linear-gradient')
                    ? preview.bgColor
                    : undefined,
                  padding: `${preview.padding}px`,
                  borderRadius: `${preview.borderRadius}px`,
                }}
              >
                {template.name}
              </div>
              <div className="text-[10px] text-app-gray mt-1 flex items-center gap-1">
                {preview.animation && preview.animation !== 'none' && (
                  <span className="bg-primary/20 text-primary px-1 rounded">✨ {preview.animation}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

