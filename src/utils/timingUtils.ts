// src/utils/timingUtils.ts
export interface TimingConfig {
  baseDurationPerChar: number;
  minDuration: number;
  maxDuration: number;
  pauseBetweenClips: number;
  readingSpeed: 'slow' | 'normal' | 'fast';
  languageMultiplier?: number;
}

export const DEFAULT_CONFIG: TimingConfig = {
  baseDurationPerChar: 0.08,
  minDuration: 1.0,
  maxDuration: 5.0,
  pauseBetweenClips: 0.2,
  readingSpeed: 'normal'
};

const SPEED_MULTIPLIERS = {
  slow: 1.3,
  normal: 1.0,
  fast: 0.7
};

const LANGUAGE_MULTIPLIERS: Record<string, number> = {
  'en-US': 1.0,
  'en-GB': 1.0,
  'es-ES': 0.9,
  'es-MX': 0.9,
  'fr-FR': 0.95,
  'fr-CA': 0.95,
  'de-DE': 0.85,
  'ja-JP': 1.2,
  'ko-KR': 1.15,
  'it-IT': 0.9,
  'pt-BR': 0.95,
  'ru-RU': 0.9,
  'zh-CN': 1.1,
  'zh-TW': 1.1,
  'ar-SA': 1.05,
  'hi-IN': 1.0
};

export function getTimingConfigForLanguage(language: string): { languageMultiplier: number } {
  return { languageMultiplier: LANGUAGE_MULTIPLIERS[language] || 1.0 };
}

export function calculateSmartTiming(
  lines: string[],
  startTime: number,
  remainingDuration: number,
  config: Partial<TimingConfig> = {}
): Array<{ text: string; startTime: number; endTime: number }> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const speedMultiplier = SPEED_MULTIPLIERS[fullConfig.readingSpeed];
  const langMultiplier = fullConfig.languageMultiplier || 1.0;
  
  // Calculate duration for each line based on character count
  const durations = lines.map(line => {
    const charCount = line.length;
    let duration = charCount * fullConfig.baseDurationPerChar * speedMultiplier * langMultiplier;
    duration = Math.max(fullConfig.minDuration, Math.min(fullConfig.maxDuration, duration));
    return duration;
  });
  
  // Adjust to fit remaining duration if needed
  const totalNeeded = durations.reduce((sum, d) => sum + d + fullConfig.pauseBetweenClips, 0);
  let scaleFactor = totalNeeded > remainingDuration ? remainingDuration / totalNeeded : 1.0;
  scaleFactor = Math.max(0.5, Math.min(1.5, scaleFactor));
  
  // Generate clips
  const clips: Array<{ text: string; startTime: number; endTime: number }> = [];
  let currentTime = startTime;
  
  for (let i = 0; i < lines.length; i++) {
    const duration = durations[i] * scaleFactor;
    const endTime = currentTime + duration;
    
    clips.push({
      text: lines[i],
      startTime: currentTime,
      endTime: endTime
    });
    
    currentTime = endTime + fullConfig.pauseBetweenClips;
  }
  
  return clips;
}
