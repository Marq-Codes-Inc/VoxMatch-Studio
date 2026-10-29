// src/utils/subtitleImport.ts
/**
 * Subtitle / lyrics file parsers.
 *
 * Each parser returns an array of `ParsedClip` — text plus time bounds in
 * seconds. IDs and insertion into project state are handled by the caller
 * so we can guarantee uniqueness and support undo/redo.
 */

export interface ParsedClip {
  text: string;
  startTime: number;
  endTime: number;
}

export type SubtitleFileFormat = 'srt' | 'vtt' | 'lrc' | 'ass';

export interface ParseResult {
  format: SubtitleFileFormat;
  clips: ParsedClip[];
  warnings: string[];
}

/** Result of importing a file into the timeline, surfaced to the UI. */
export interface ImportSubtitleResult {
  format: SubtitleFileFormat;
  added: number;
  shifted: number;
  warnings: string[];
}

// Public API

/** Detect format from a filename or fall back to sniffing the content. */
export function detectFormat(
  fileName: string,
  content: string,
): SubtitleFileFormat | null {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'srt') return 'srt';
  if (ext === 'vtt') return 'vtt';
  if (ext === 'lrc') return 'lrc';
  if (ext === 'ass' || ext === 'ssa') return 'ass';

  const head = content.slice(0, 512).trim();
  if (/^WEBVTT/m.test(head)) return 'vtt';
  if (/^\[Script Info\]/m.test(head)) return 'ass';
  if (/^\[\d{2}:\d{2}/m.test(head)) return 'lrc';
  if (/^\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}\s*-->/m.test(head)) return 'srt';

  return null;
}

/** True if a filename looks like a supported subtitle format. */
export function isSubtitleFileName(name: string): boolean {
  const ext = name.toLowerCase().split('.').pop() || '';
  return ['srt', 'vtt', 'lrc', 'ass', 'ssa'].includes(ext);
}

/** Parse a subtitle file's content. Throws on unrecoverable input. */
export function parseSubtitleFile(
  fileName: string,
  content: string,
): ParseResult {
  const format = detectFormat(fileName, content);
  if (!format) {
    throw new Error(
      'Unrecognized subtitle format. Supported: .srt, .vtt, .lrc, .ass',
    );
  }

  switch (format) {
    case 'srt':
      return { format, ...parseSrt(content) };
    case 'vtt':
      return { format, ...parseVtt(content) };
    case 'lrc':
      return { format, ...parseLrc(content) };
    case 'ass':
      return { format, ...parseAss(content) };
  }
}

// Time helpers

/** "00:00:05,500" or "00:00:05.500" → 5.5 */
function parseHmsTime(raw: string): number | null {
  const m = raw
    .trim()
    .match(/^(\d+):(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const s = parseInt(m[3], 10);
  const ms = m[4] ? parseInt(m[4].padEnd(3, '0'), 10) : 0;
  return h * 3600 + min * 60 + s + ms / 1000;
}

/** "[mm:ss.xx]" → 65.42 */
function parseLrcTime(raw: string): number | null {
  const m = raw.trim().match(/^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const s = parseInt(m[2], 10);
  const cs = m[3] ? parseInt(m[3].padEnd(2, '0'), 10) : 0;
  return min * 60 + s + cs / 100;
}

/** "0:00:05.50" (ASS) → 5.5 */
function parseAssTime(raw: string): number | null {
  const m = raw
    .trim()
    .match(/^(\d+):(\d{1,2}):(\d{1,2})(?:[.](\d{1,3}))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const s = parseInt(m[3], 10);
  const cs = m[4] ? parseInt(m[4].padEnd(2, '0').slice(0, 2), 10) : 0;
  return h * 3600 + min * 60 + s + cs / 100;
}

// SRT

function parseSrt(content: string): {
  clips: ParsedClip[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const clips: ParsedClip[] = [];

  const normalized = content.replace(/\r\n?/g, '\n').trim();
  const blocks = normalized.split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim());
    if (lines.length === 0) continue;

    let idx = 0;
    if (/^\d+$/.test(lines[0])) idx = 1;

    const timeLine = lines[idx];
    const timeMatch = timeLine?.match(
      /^(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/,
    );
    if (!timeMatch) continue;

    const start = parseHmsTime(timeMatch[1]);
    const end = parseHmsTime(timeMatch[2]);
    if (start === null || end === null || end <= start) {
      warnings.push(`Skipped malformed cue near "${lines[idx]}"`);
      continue;
    }

    const text = lines
      .slice(idx + 1)
      .join('\n')
      .trim();

    if (!text) continue;

    clips.push({ text, startTime: start, endTime: end });
  }

  return { clips, warnings };
}

// VTT

function parseVtt(content: string): {
  clips: ParsedClip[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const clips: ParsedClip[] = [];

  const normalized = content.replace(/\r\n?/g, '\n').trim();
  const body = normalized.replace(/^WEBVTT[^\n]*\n/, '');

  const blocks = body.split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim());
    if (!lines.length) continue;

    if (/^(NOTE|STYLE|REGION)\b/i.test(lines[0])) continue;

    let idx = 0;
    if (!lines[0].includes('-->') && lines.length > 1) idx = 1;

    const timeLine = lines[idx];
    const timeMatch = timeLine?.match(
      /^(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})/,
    );
    if (!timeMatch) continue;

    const start = parseHmsTime(timeMatch[1]);
    const end = parseHmsTime(timeMatch[2]);
    if (start === null || end === null || end <= start) {
      warnings.push(`Skipped malformed cue near "${lines[idx]}"`);
      continue;
    }

    const rawText = lines.slice(idx + 1).join('\n');
    const cleanText = rawText
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (!cleanText) continue;

    clips.push({ text: cleanText, startTime: start, endTime: end });
  }

  return { clips, warnings };
}

// LRC

function parseLrc(content: string): {
  clips: ParsedClip[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const raw: { time: number; text: string }[] = [];

  const lines = content.replace(/\r\n?/g, '\n').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^\[(ti|ar|al|by|offset|re|ve|length|tool|encoding):/i.test(trimmed)) {
      continue;
    }

    const tagRegex = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;
    const tags: number[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = tagRegex.exec(trimmed)) !== null) {
      const t = parseLrcTime(`[${match[1]}:${match[2]}]`);
      if (t !== null) tags.push(t);
      lastIndex = match.index + match[0].length;
    }

    const text = trimmed.slice(lastIndex).trim();
    if (tags.length === 0 || !text) continue;

    for (const t of tags) raw.push({ time: t, text });
  }

  if (raw.length === 0) {
    return { clips: [], warnings: ['No timestamped lines found.'] };
  }

  raw.sort((a, b) => a.time - b.time);

  const DEFAULT_TAIL = 3;
  const clips: ParsedClip[] = raw.map((entry, i) => {
    const next = raw[i + 1];
    const end = next ? next.time : entry.time + DEFAULT_TAIL;
    return {
      text: entry.text,
      startTime: entry.time,
      endTime: Math.max(end, entry.time + 0.2),
    };
  });

  return { clips, warnings };
}

// ASS / SSA

function parseAss(content: string): {
  clips: ParsedClip[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const clips: ParsedClip[] = [];

  const lines = content.replace(/\r\n?/g, '\n').split('\n');

  let inEvents = false;
  let formatFields: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^\[Events\]/i.test(trimmed)) {
      inEvents = true;
      continue;
    }
    if (/^\[/.test(trimmed) && inEvents) {
      inEvents = false;
      continue;
    }
    if (!inEvents) continue;

    if (/^Format:/i.test(trimmed)) {
      formatFields = trimmed
        .slice('Format:'.length)
        .split(',')
        .map((f) => f.trim().toLowerCase());
      continue;
    }

    if (/^Dialogue:/i.test(trimmed)) {
      const body = trimmed.slice('Dialogue:'.length).trim();
      const maxSplits = Math.max(0, formatFields.length - 1);
      const parts: string[] = [];
      let rest = body;
      for (let i = 0; i < maxSplits; i++) {
        const comma = rest.indexOf(',');
        if (comma === -1) break;
        parts.push(rest.slice(0, comma));
        rest = rest.slice(comma + 1);
      }
      parts.push(rest);

      const get = (name: string) => {
        const i = formatFields.indexOf(name);
        return i >= 0 ? parts[i]?.trim() ?? '' : '';
      };

      const startStr = get('start');
      const endStr = get('end');
      const textStr = get('text');

      if (!startStr || !endStr || !textStr) continue;

      const start = parseAssTime(startStr);
      const end = parseAssTime(endStr);
      if (start === null || end === null || end <= start) {
        warnings.push(`Skipped malformed ASS cue at ${startStr}`);
        continue;
      }

      const cleanText = textStr
        .replace(/\\[Nn]/g, '\n')
        .replace(/\{[^}]*\}/g, '')
        .trim();

      if (!cleanText) continue;

      clips.push({ text: cleanText, startTime: start, endTime: end });
    }
  }

  return { clips, warnings };
}