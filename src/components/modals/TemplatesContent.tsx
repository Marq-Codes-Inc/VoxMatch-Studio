// src/components/modals/TemplatesContent.tsx
import React from 'react';
import { TextStyle } from '../../types/types';
import { Check } from 'lucide-react';

interface TemplatesContentProps {
  currentStyle: TextStyle;
  onSelectTextStyle: (style: TextStyle) => void;
}

interface Template {
  name: string;
  description: string;
  style: Partial<TextStyle> & { animation?: string };
}

const TEMPLATES: Template[] = [
  {
    name: 'Clean Minimal',
    description: 'Crisp white, subtle shadow',
    style: {
      fontFamily: 'Inter',
      fontSize: 32,
      fontWeight: 600,
      textColor: '#FFFFFF',
      withBg: false,
      padding: 0,
      borderRadius: 0,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 85,
      textAlign: 'center',
      position: { x: 0, y: 0 },
      animation: 'fade',
      italic: false,
      uppercase: false,
      letterSpacing: 0,
      lineHeight: 42,
    },
  },
  {
    name: 'Bold Yellow',
    description: 'High-contrast gold, uppercase',
    style: {
      fontFamily: 'Inter',
      fontSize: 36,
      fontWeight: 800,
      textColor: '#FFD700',
      withBg: false,
      padding: 0,
      borderRadius: 0,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 85,
      textAlign: 'center',
      position: { x: 0, y: 0 },
      animation: 'pop',
      uppercase: true,
      letterSpacing: 1.5,
      italic: false,
      lineHeight: 44,
    },
  },
  {
    name: 'Karaoke Cyan',
    description: 'Bright teal, sliding in',
    style: {
      fontFamily: 'Inter',
      fontSize: 34,
      fontWeight: 700,
      textColor: '#00E5FF',
      withBg: false,
      padding: 0,
      borderRadius: 0,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 80,
      textAlign: 'center',
      position: { x: 0, y: 0 },
      animation: 'slide-up',
      uppercase: false,
      letterSpacing: 0.5,
      italic: false,
      lineHeight: 42,
    },
  },
  {
    name: 'Elegant Serif',
    description: 'Italic serif, editorial feel',
    style: {
      fontFamily: 'Georgia',
      fontSize: 30,
      fontWeight: 400,
      textColor: '#F5F5DC',
      withBg: false,
      padding: 0,
      borderRadius: 0,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 80,
      textAlign: 'center',
      position: { x: 0, y: 0 },
      animation: 'fade',
      italic: true,
      uppercase: false,
      letterSpacing: 0.5,
      lineHeight: 40,
    },
  },
  {
    name: 'Neon Pink',
    description: 'Hot pink, uppercase pop',
    style: {
      fontFamily: 'Inter',
      fontSize: 36,
      fontWeight: 800,
      textColor: '#FF3D9A',
      withBg: false,
      padding: 0,
      borderRadius: 0,
      verticalAlign: 'flex-end',
      horizontalAlign: 'center',
      width: 85,
      textAlign: 'center',
      position: { x: 0, y: 0 },
      animation: 'pop',
      italic: false,
      uppercase: true,
      letterSpacing: 1,
      lineHeight: 44,
    },
  },
  {
    name: 'Cinematic Left',
    description: 'Filmic, left-aligned',
    style: {
      fontFamily: 'Inter',
      fontSize: 28,
      fontWeight: 500,
      textColor: '#FFFFFF',
      withBg: false,
      padding: 0,
      borderRadius: 0,
      verticalAlign: 'flex-end',
      horizontalAlign: 'flex-start',
      width: 60,
      textAlign: 'left',
      position: { x: 5, y: 0 },
      animation: 'fade',
      italic: false,
      uppercase: false,
      letterSpacing: 0.5,
      lineHeight: 38,
    },
  },
  {
    name: 'Lime Pop',
    description: 'Energetic bright lime',
    style: {
      fontFamily: 'Inter',
      fontSize: 38,
      fontWeight: 900,
      textColor: '#B6FF1A',
      withBg: false,
      padding: 0,
      borderRadius: 0,
      verticalAlign: 'center',
      horizontalAlign: 'center',
      width: 90,
      textAlign: 'center',
      position: { x: 0, y: 0 },
      animation: 'pop',
      italic: false,
      uppercase: true,
      letterSpacing: 2,
      lineHeight: 46,
    },
  },
  {
    name: 'Soft Shadow',
    description: 'Center-stage white',
    style: {
      fontFamily: 'Inter',
      fontSize: 30,
      fontWeight: 600,
      textColor: '#FFFFFF',
      withBg: false,
      padding: 0,
      borderRadius: 0,
      verticalAlign: 'center',
      horizontalAlign: 'center',
      width: 80,
      textAlign: 'center',
      position: { x: 0, y: 0 },
      animation: 'slide-up',
      italic: false,
      uppercase: false,
      letterSpacing: 0,
      lineHeight: 40,
    },
  },
];

const buildStyle = (
  base: TextStyle,
  overrides: Partial<TextStyle> & { animation?: string },
): TextStyle =>
  ({
    ...base,
    ...overrides,
    animation: overrides.animation || base.animation || 'none',
  } as TextStyle);

/**
 * Compare the "identity" fields of a style to determine if it matches
 * a template. We intentionally ignore fields like `padding`, `width`,
 * `position`, etc. because the template set doesn't uniquely define
 * them — only the visual signature fields matter for "which template
 * is selected?".
 */
function styleMatchesTemplate(
  current: TextStyle,
  templateStyle: Partial<TextStyle> & { animation?: string },
): boolean {
  const fields: (keyof TextStyle)[] = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'textColor',
    'withBg',
    'uppercase',
    'italic',
    'letterSpacing',
    'textAlign',
    'verticalAlign',
    'horizontalAlign',
  ];

  for (const key of fields) {
    const templateVal = templateStyle[key];
    // Only compare fields the template explicitly declares
    if (templateVal === undefined) continue;
    if (current[key] !== templateVal) return false;
  }

  // Animation is a special case — both must agree, including 'none'
  const templateAnim = templateStyle.animation ?? 'none';
  const currentAnim = current.animation ?? 'none';
  if (templateAnim !== currentAnim) return false;

  return true;
}

const PREVIEW_TEXT = 'Sample Text';

export const TemplatesContent: React.FC<TemplatesContentProps> = ({
  currentStyle,
  onSelectTextStyle,
}) => {
  // Precompute which template (if any) matches the current style
  const activeTemplateName = React.useMemo(() => {
    const match = TEMPLATES.find(t => styleMatchesTemplate(currentStyle, t.style));
    return match?.name ?? null;
  }, [currentStyle]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-app-text">Text Templates</h3>
        <span className="text-[10px] text-app-gray uppercase tracking-wide">
          No backgrounds
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map(template => {
          const preview = buildStyle(currentStyle, template.style);
          const isActive = activeTemplateName === template.name;

          return (
            <button
              key={template.name}
              onClick={() => onSelectTextStyle(preview)}
              className={`
                group text-left rounded-lg overflow-hidden
                bg-app-gray-dark transition-none relative
                ${
                  isActive
                    ? 'border-2 border-primary shadow-lg shadow-primary/20'
                    : 'border border-app-border hover:border-primary/60'
                }
              `}
              title={template.description}
              aria-pressed={isActive}
            >
              {/* Active checkmark badge */}
              {isActive && (
                <div className="absolute top-1.5 left-1.5 z-20 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}

              {/* Preview stage — mimics a video frame */}
              <div className="relative aspect-[16/9] bg-gradient-to-br from-[#2a2a2a] via-[#1a1a1a] to-[#0a0a0a] overflow-hidden">
                {/* Faint grid to suggest a video frame */}
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                {/* Positioned preview text */}
                <div
                  className="absolute inset-0 flex"
                  style={{
                    justifyContent: preview.horizontalAlign || 'center',
                    alignItems: preview.verticalAlign || 'flex-end',
                    padding: '8px',
                  }}
                >
                  <div
                    style={{
                      textAlign: preview.textAlign || 'center',
                      color: preview.textColor,
                      fontFamily: preview.fontFamily,
                      fontSize: `${Math.min(preview.fontSize, 20)}px`,
                      fontWeight: preview.fontWeight,
                      fontStyle: preview.italic ? 'italic' : 'normal',
                      textTransform: preview.uppercase ? 'uppercase' : 'none',
                      letterSpacing: `${Math.min(preview.letterSpacing, 3)}px`,
                      lineHeight: '1.15',
                      width: `${Math.min(preview.width, 95)}%`,
                      textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {PREVIEW_TEXT}
                  </div>
                </div>

                {/* Animation badge */}
                {preview.animation && preview.animation !== 'none' && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-[2px] rounded-full bg-black/60 text-white/90 backdrop-blur-sm">
                    {preview.animation}
                  </span>
                )}
              </div>

              {/* Label row */}
              <div
                className={`px-2.5 py-2 border-t ${
                  isActive
                    ? 'bg-primary/10 border-primary/40'
                    : 'bg-app-gray-light/40 border-app-border'
                }`}
              >
                <div
                  className={`text-xs font-semibold truncate ${
                    isActive ? 'text-primary' : 'text-app-text'
                  }`}
                >
                  {template.name}
                </div>
                <div className="text-[10px] text-app-gray truncate">
                  {template.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-app-gray text-center pt-2">
        Templates use no background — text sits directly on the video. Perfect
        for lyric videos and clean subtitles.
      </p>
    </div>
  );
};