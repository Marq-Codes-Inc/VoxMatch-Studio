// src/utils/audioTranscription.ts
import * as lamejs from '@breezystack/lamejs';

const MAX_CHUNK_DURATION_SEC = 600; 

export interface TimestampSegment {
  startTime: number;
  endTime: number;
}

interface GroqResponse {
  text: string;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
  }>;
}

async function extractAudioChunks(file: File): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  const chunks: Blob[] = [];
  let offset = 0;
  
  while (offset < audioBuffer.duration) {
    const remaining = audioBuffer.duration - offset;
    const duration = Math.min(MAX_CHUNK_DURATION_SEC, remaining);
    const sampleCount = Math.floor(duration * audioBuffer.sampleRate);
    const startSample = Math.floor(offset * audioBuffer.sampleRate);
    const chunkBuffer = audioCtx.createBuffer(1, sampleCount, audioBuffer.sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    chunkBuffer.copyToChannel(channelData.subarray(startSample, startSample + sampleCount), 0);
    chunks.push(encodeToMp3(chunkBuffer));
    offset += duration;
  }
  return chunks;
}

function encodeToMp3(buffer: AudioBuffer): Blob {
  const floatSamples = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); 
  const int16Samples = new Int16Array(floatSamples.length);
  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const sampleBlockSize = 1152;
  const mp3Data: BlobPart[] = [];
  for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
    const mp3buf = mp3encoder.encodeBuffer(int16Samples.subarray(i, i + sampleBlockSize));
    if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf) as any);
  }
  const finalBuf = mp3encoder.flush();
  if (finalBuf.length > 0) mp3Data.push(new Int8Array(finalBuf) as any);
  return new Blob(mp3Data, { type: 'audio/mp3' });
}

/**
 * Transcribes the audio file using Groq's Whisper API.
 * This is used for generating text from scratch.
 * Note: Forced alignment of EXISTING text is now handled by the local ONNX Wav2Vec2 model in Aligner.ts.
 */
export async function transcribeMediaFile(
  file: File, 
  onProgress: (msg: string, percent: number) => void
): Promise<{ text: string; startTime: number; endTime: number }[]> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_GROQ_API_KEY.");
  if (!window.electronAPI?.transcribeAudio) throw new Error("Electron API not available.");

  onProgress('Extracting audio...', 0);
  const chunks = await extractAudioChunks(file);
  onProgress('Transcribing...', 5);
  
  const results: { text: string; startTime: number; endTime: number }[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const arrayBuffer = await chunks[i].arrayBuffer();
    
    // We do not pass a prompt for raw transcription.
    // The main.ts handler adds the timestamp_granularities[] parameter to get segments.
    const data: GroqResponse = await window.electronAPI.transcribeAudio(
      arrayBuffer, 
      'audio/mp3', 
      apiKey
    );
    
    if (data?.segments) {
      for (const seg of data.segments) {
        results.push({
          text: seg.text.trim(),
          startTime: Math.round((seg.start + i * MAX_CHUNK_DURATION_SEC) * 1000) / 1000,
          endTime: Math.round((seg.end + i * MAX_CHUNK_DURATION_SEC) * 1000) / 1000,
        });
      }
    }
    onProgress('Transcribing...', 5 + Math.round(((i + 1) / chunks.length) * 85));
  }
  return results;
}