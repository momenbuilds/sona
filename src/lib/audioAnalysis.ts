// Client-side acoustic feature extraction using the Web Audio API.
// No server-side DSP: everything here runs on a decoded AudioBuffer.

export interface AcousticFeatures {
  durationSec: number;
  pauseCount: number;
  longPauseCount: number;
  avgPauseSec: number;
  longestPauseSec: number;
  silencePercent: number;
  speechOnsetSec: number;
  avgPitchHz: number | null;
  pitchVariation: number | null;
  minPitchHz: number | null;
  maxPitchHz: number | null;
  pitchRangeHz: number | null;
  vocalEnergy: number | null;
  vocalEnergyVariation: number | null;
  speakingSec: number;
}

const FRAME_MS = 20;
const MIN_PAUSE_MS = 250;
const LONG_PAUSE_SEC = 1.5;

// Structural subset of AudioBuffer. analyzeAcoustics only ever touches these
// four members, so a real AudioBuffer satisfies this for free in the browser,
// and a plain object wrapping ffmpeg-decoded PCM satisfies it in Node (see
// scripts/build-reference-stats.mts) — same analysis code, no duplication.
export interface DecodedAudio {
  sampleRate: number;
  duration: number;
  numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
}

export async function decodeAudio(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return buffer;
  } finally {
    ctx.close();
  }
}

function getMonoSamples(buffer: DecodedAudio): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.getChannelData(1);
  const out = new Float32Array(ch0.length);
  for (let i = 0; i < ch0.length; i++) out[i] = (ch0[i] + ch1[i]) / 2;
  return out;
}

function rms(samples: Float32Array, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (end - start));
}

// Naive stride decimation: pitch autocorrelation cost scales with
// sampleRate^2, so running it at full mic sample rate (44.1/48kHz) makes a
// ~90s recording take 10-20s of main-thread work. Voice pitch tops out well
// under 1kHz, so a light low-pass followed by a big stride loses nothing
// perceptible for this purpose while cutting the search space by ~factor^2.
function decimate(samples: Float32Array, factor: number): Float32Array {
  if (factor <= 1) return samples;
  const out = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i++) {
    // Average the skipped samples instead of a hard stride, as a cheap
    // anti-alias filter.
    let sum = 0;
    const start = i * factor;
    for (let j = 0; j < factor; j++) sum += samples[start + j];
    out[i] = sum / factor;
  }
  return out;
}

// Autocorrelation-based pitch detection for a single frame.
function detectPitch(frame: Float32Array, sampleRate: number): number | null {
  const minFreq = 75; // Hz, below typical human voice floor
  const maxFreq = 400; // Hz, above typical human voice ceiling
  const maxLag = Math.floor(sampleRate / minFreq);
  const minLag = Math.floor(sampleRate / maxFreq);

  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= maxLag && lag < frame.length; lag++) {
    let corr = 0;
    for (let i = 0; i < frame.length - lag; i++) {
      corr += frame[i] * frame[i + lag];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag <= 0) return null;

  // Normalize correlation against frame energy to reject noisy/unvoiced frames.
  const energy = frame.reduce((s, v) => s + v * v, 0);
  if (energy <= 0) return null;
  const normalized = bestCorr / energy;
  if (normalized < 0.3) return null;

  return sampleRate / bestLag;
}

export function analyzeAcoustics(buffer: DecodedAudio): AcousticFeatures {
  const samples = getMonoSamples(buffer);
  const sampleRate = buffer.sampleRate;
  const frameSize = Math.floor((FRAME_MS / 1000) * sampleRate);
  const frameCount = Math.floor(samples.length / frameSize);

  const frameRms: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    frameRms.push(rms(samples, i * frameSize, (i + 1) * frameSize));
  }

  // Adaptive silence threshold: a fraction of the 90th-percentile loudness,
  // so it scales with mic gain instead of using a fixed absolute cutoff.
  const sorted = [...frameRms].sort((a, b) => a - b);
  const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0.0001;
  const threshold = Math.max(p90 * 0.15, 0.004);

  const silentFrames = frameRms.map((v) => v < threshold);
  const framesPerMs = 1 / FRAME_MS;
  const minPauseFrames = Math.round(MIN_PAUSE_MS * framesPerMs);

  const pauses: number[] = [];
  let runStart = -1;
  for (let i = 0; i <= silentFrames.length; i++) {
    const isSilent = i < silentFrames.length && silentFrames[i];
    if (isSilent && runStart === -1) {
      runStart = i;
    } else if (!isSilent && runStart !== -1) {
      const runLen = i - runStart;
      if (runLen >= minPauseFrames) {
        pauses.push((runLen * FRAME_MS) / 1000);
      }
      runStart = -1;
    }
  }

  const silentFrameCount = silentFrames.filter(Boolean).length;
  const silencePercent = frameCount > 0 ? (silentFrameCount / frameCount) * 100 : 0;

  const pauseCount = pauses.length;
  const longPauseCount = pauses.filter((p) => p >= LONG_PAUSE_SEC).length;
  const avgPauseSec = pauseCount > 0 ? pauses.reduce((a, b) => a + b, 0) / pauseCount : 0;
  const longestPauseSec = pauseCount > 0 ? Math.max(...pauses) : 0;

  // How long before the first voiced frame — a rough "response latency".
  const firstVoicedFrame = silentFrames.findIndex((s) => !s);
  const speechOnsetSec = firstVoicedFrame >= 0 ? (firstVoicedFrame * FRAME_MS) / 1000 : 0;

  // Pitch + energy over voiced (non-silent) frames only. Pitch tracking runs
  // on a decimated copy of the signal — see decimate() for why.
  const decimationFactor = Math.max(1, Math.round(sampleRate / 11025));
  const pitchSampleRate = sampleRate / decimationFactor;
  const decimatedSamples = decimate(samples, decimationFactor);
  const pitchFrameSize = Math.floor(0.04 * pitchSampleRate); // 40ms frames for pitch tracking
  const pitchHopSize = pitchFrameSize;
  const pitches: number[] = [];
  const voicedRms: number[] = [];

  for (
    let start = 0;
    start + pitchFrameSize < decimatedSamples.length;
    start += pitchHopSize
  ) {
    const originalStart = start * decimationFactor;
    const frameIdx = Math.floor(originalStart / frameSize);
    if (frameIdx < silentFrames.length && silentFrames[frameIdx]) continue;
    const frame = decimatedSamples.subarray(start, start + pitchFrameSize);
    const frameEnergy = rms(frame, 0, frame.length);
    voicedRms.push(frameEnergy);
    const pitch = detectPitch(frame, pitchSampleRate);
    if (pitch !== null) pitches.push(pitch);
  }

  let avgPitchHz: number | null = null;
  let pitchVariation: number | null = null;
  let minPitchHz: number | null = null;
  let maxPitchHz: number | null = null;
  let pitchRangeHz: number | null = null;
  if (pitches.length >= 5) {
    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((a, b) => a + (b - mean) ** 2, 0) / pitches.length;
    const stdev = Math.sqrt(variance);
    avgPitchHz = mean;
    // Coefficient of variation (%) so it's comparable across recordings/voices.
    pitchVariation = mean > 0 ? (stdev / mean) * 100 : 0;
    minPitchHz = Math.min(...pitches);
    maxPitchHz = Math.max(...pitches);
    pitchRangeHz = maxPitchHz - minPitchHz;
  }

  let vocalEnergy: number | null = null;
  let vocalEnergyVariation: number | null = null;
  if (voicedRms.length > 0) {
    const meanEnergy = voicedRms.reduce((a, b) => a + b, 0) / voicedRms.length;
    vocalEnergy = meanEnergy * 100;
    if (voicedRms.length >= 5 && meanEnergy > 0) {
      const variance = voicedRms.reduce((a, b) => a + (b - meanEnergy) ** 2, 0) / voicedRms.length;
      vocalEnergyVariation = (Math.sqrt(variance) / meanEnergy) * 100;
    }
  }

  const durationSec = buffer.duration;
  const speakingSec = durationSec * (1 - silencePercent / 100);

  return {
    durationSec,
    pauseCount,
    longPauseCount,
    avgPauseSec,
    longestPauseSec,
    silencePercent,
    speechOnsetSec,
    avgPitchHz,
    pitchVariation,
    minPitchHz,
    maxPitchHz,
    pitchRangeHz,
    vocalEnergy,
    vocalEnergyVariation,
    speakingSec,
  };
}
