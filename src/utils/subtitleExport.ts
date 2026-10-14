// src/utils/subtitleExport.ts
import { LyricLine } from '../types/types';

// --- Time formatting helpers ---

/** SRT: 00:00:05,500 */
function toSrtTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const ms = Math.floor((safe * 1000) % 1000);
  const s = Math.floor(safe % 60);
  const m = Math.floor((safe / 60) % 60);
  const h = Math.floor(safe / 3600);
  return (
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` +
    `,${String(ms).padStart(3, '0')}`
  );
}

/** WebVTT: 00:00:05.500 */
function toVttTime(seconds: number): string {
  return toSrtTime(seconds).replace(',', '.');
}

/** LRC: [mm:ss.xx] */
function toLrcTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const cs = Math.floor((safe * 100) % 100);
  const s = Math.floor(safe % 60);
  const m = Math.floor((safe / 60) % 60);
  return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}]`;
}

/** ASS: 0:00:05.50 */
function toAssTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const cs = Math.floor((safe * 100) % 100);
  const s = Math.floor(safe % 60);
  const m = Math.floor((safe / 60) % 60);
  const h = Math.floor(safe / 3600);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function sortedClips(clips: LyricLine[]): LyricLine[] {
  return [...clips].sort((a, b) => a.startTime - b.startTime);
}

// --- Public generators ---

export function toSrt(clips: LyricLine[]): string {
  return sortedClips(clips)
    .map((clip, i) => {
      return `${i + 1}\n${toSrtTime(clip.startTime)} --> ${toSrtTime(
        clip.endTime,
      )}\n${clip.text}\n`;
    })
    .join('\n');
}

export function toVtt(clips: LyricLine[]): string {
  const body = sortedClips(clips)
    .map((clip) => {
      return `${toVttTime(clip.startTime)} --> ${toVttTime(
        clip.endTime,
      )}\n${clip.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

export function toLrc(clips: LyricLine[]): string {
  return sortedClips(clips)
    .map((clip) => `${toLrcTime(clip.startTime)}${clip.text}`)
    .join('\n');
}

/**
 * Basic ASS (Advanced SubStation Alpha) generator.
 * Uses a single default style; good enough for most players.
 */
export function toAss(clips: LyricLine[]): string {
  const header = `[Script Info]
Title: VoxMatch Export
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Inter,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,40,40,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = sortedClips(clips)
    .map((clip) => {
      const text = clip.text.replace(/\n/g, '\\N');
      return `Dialogue: 0,${toAssTime(clip.startTime)},${toAssTime(
        clip.endTime,
      )},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return `${header}${events}\n`;
}

export type SubtitleFormat = 'srt' | 'vtt' | 'ass' | 'lrc';

export function serializeSubtitles(
  clips: LyricLine[],
  format: SubtitleFormat,
): string {
  switch (format) {
    case 'srt':
      return toSrt(clips);
    case 'vtt':
      return toVtt(clips);
    case 'ass':
      return toAss(clips);
    case 'lrc':
      return toLrc(clips);
  }
}
