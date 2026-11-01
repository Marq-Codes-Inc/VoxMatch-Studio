// src/utils/alignment.ts
import { LyricLine } from '../types/types';
import { WordTimestamp } from './aligner';

/**
 * Maps existing text clips to word-level timestamps returned by the local AI.
 * Uses a sequential matcher that tolerates minor transcription hallucinations.
 */
export function alignClipsToWords(
  clips: LyricLine[],
  words: WordTimestamp[]
): LyricLine[] {
  if (!clips.length || !words.length) return clips;

  // Sort clips by their current start time to ensure chronological matching
  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
  
  let wordIdx = 0;
  const updatedClips: LyricLine[] = [];

  for (const clip of sortedClips) {
    // Normalize the clip text into an array of clean words
    const clipWords = clip.text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
    
    if (clipWords.length === 0) {
      updatedClips.push(clip);
      continue;
    }

    const firstWordStr = clipWords[0];
    const lastWordStr = clipWords[clipWords.length - 1];

    let startTime: number | null = null;
    let endTime: number | null = null;

    // 1. Find the start time by looking for the first word
    // We search forward from the current wordIdx to prevent going backwards
    for (let i = wordIdx; i < Math.min(wordIdx + 50, words.length); i++) {
      const w = words[i].word.toLowerCase().replace(/[^\w]/g, '');
      if (w === firstWordStr || w.includes(firstWordStr) || firstWordStr.includes(w)) {
        startTime = words[i].start;
        wordIdx = i; // Advance the global pointer
        break;
      }
    }

    // If we couldn't find the start word, we can't reliably align this clip
    if (startTime === null) {
      updatedClips.push(clip);
      continue;
    }

    // 2. Find the end time by looking for the last word
    // Start searching from the matched start word onwards
    for (let i = wordIdx; i < Math.min(wordIdx + 50, words.length); i++) {
      const w = words[i].word.toLowerCase().replace(/[^\w]/g, '');
      if (w === lastWordStr || w.includes(lastWordStr) || lastWordStr.includes(w)) {
        endTime = words[i].end;
        wordIdx = i + 1; // Advance pointer past this word for the next clip
        break;
      }
    }

    // Fallback: If we found the start but not the end, estimate based on character length
    if (endTime === null) {
      const duration = Math.max(1, clipWords.length * 0.3);
      endTime = startTime + duration;
    }

    updatedClips.push({
      ...clip,
      startTime: Math.max(0, startTime),
      endTime: Math.max(startTime + 0.1, endTime),
    });
  }

  // Return in chronological order
  return updatedClips.sort((a, b) => a.startTime - b.startTime);
}
