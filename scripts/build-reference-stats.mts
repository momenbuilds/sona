// One-off generator for src/lib/referenceStats.ts. Not part of the app
// build — run manually to regenerate the committed reference stats.
//
// Requires: Node 23.6+ (runs .mts directly, no ts-node/tsx needed) and
// ffmpeg on PATH (decodes the FLAC clips to raw PCM; no other purpose).
//
// Usage: node scripts/build-reference-stats.mts

import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { analyzeAcoustics, type DecodedAudio } from "../src/lib/audioAnalysis.ts";
import { analyzeTranscript } from "../src/lib/transcriptAnalysis.ts";

const DATASET = "openslr/librispeech_asr";
const CONFIG = "clean";
const SPLIT = "validation";
// The validation-clean split (2703 rows) is laid out as 40 contiguous
// per-speaker blocks (sizes 36-101, verified by scanning row.speaker_id
// across the whole split beforehand). These are each block's start offset,
// so one small page per offset lands one page per distinct speaker instead
// of a few large pages that would land within 1-2 speakers' blocks.
const OFFSETS = [
  0, 95, 172, 227, 305, 380, 462, 527, 569, 644, 703, 780, 854, 950, 1009, 1064, 1122, 1174, 1247,
  1306, 1363, 1435, 1473, 1574, 1664, 1758, 1833, 1920, 1969, 2016, 2096, 2179, 2237, 2301, 2342,
  2420, 2491, 2527, 2582, 2646,
];
const PAGE_SIZE = 5; // <= smallest block size (36), so each page stays within one speaker
const PERCENTILES = [5, 10, 25, 50, 75, 90, 95] as const;
const MIN_SAMPLES_PER_METRIC = 30;
const REQUEST_DELAY_MS = 1500; // datasets-server rate-limits aggressive bursts

interface HfRow {
  row: {
    audio: { src: string }[];
    text: string;
    speaker_id: number;
    id: string;
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// datasets-server 429s under bursts; back off and retry rather than fail
// the whole run over a transient rate limit.
async function fetchJsonWithRetry(url: string, tries = 6): Promise<unknown> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.status === 429) {
      const wait = 15 + i * 10;
      console.error(`429, backing off ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return res.json();
  }
  throw new Error(`gave up after ${tries} retries: ${url}`);
}

async function fetchRows(offset: number, length: number): Promise<HfRow[]> {
  const url =
    `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(DATASET)}` +
    `&config=${CONFIG}&split=${SPLIT}&offset=${offset}&length=${length}`;
  const data = (await fetchJsonWithRetry(url)) as { rows: HfRow[] };
  return data.rows;
}

// Decodes to raw mono PCM with no filters or normalization — any loudness
// adjustment here would bake a fake "typical energy" into the reference.
function decodeToFloat32(flac: Buffer): Promise<{ sampleRate: number; samples: Float32Array }> {
  const sampleRate = 16000;
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", String(sampleRate), "pipe:1"]);
    const chunks: Buffer[] = [];
    let stderr = "";
    ff.stdout.on("data", (c: Buffer) => chunks.push(c));
    ff.stderr.on("data", (c: Buffer) => (stderr += c));
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-300)}`));
      const buf = Buffer.concat(chunks);
      const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
      resolve({ sampleRate, samples: new Float32Array(arrayBuffer) });
    });
    ff.stdin.write(flac);
    ff.stdin.end();
  });
}

function toDecodedAudio(samples: Float32Array, sampleRate: number): DecodedAudio {
  return {
    sampleRate,
    duration: samples.length / sampleRate,
    numberOfChannels: 1,
    getChannelData: () => samples,
  };
}

function percentileBreakpoints(values: number[]): Record<(typeof PERCENTILES)[number], number> {
  const sorted = [...values].sort((a, b) => a - b);
  const out = {} as Record<(typeof PERCENTILES)[number], number>;
  for (const p of PERCENTILES) {
    const idx = Math.round((p / 100) * (sorted.length - 1));
    out[p] = sorted[idx];
  }
  return out;
}

async function main() {
  const rows: HfRow[] = [];
  for (const offset of OFFSETS) {
    rows.push(...(await fetchRows(offset, PAGE_SIZE)));
    await sleep(REQUEST_DELAY_MS);
  }
  console.log(`fetched ${rows.length} rows`);

  // articulationRateWpm is deliberately excluded: it divides word count by
  // speakingSec (duration minus detected silence), and the silence detector
  // — tuned for 30-90s recordings — flags 36-47% of these 2-7s clips as
  // silence (alignment padding plus low-energy phonemes misclassified on a
  // short, low-dynamic-range clip). That collapses the denominator and
  // inflates the rate into a measurement artifact, not a real signal, the
  // same failure mode that ruled out raw vocalEnergy.
  const metrics: Record<string, number[]> = {
    wpm: [],
    pitchVariation: [],
    vocalEnergyVariation: [],
  };
  const speakerIds = new Set<number>();
  let processed = 0;

  for (const r of rows) {
    const { audio, text, speaker_id, id } = r.row;
    const src = audio?.[0]?.src;
    if (!src || !text.trim()) continue;

    try {
      const flacRes = await fetch(src);
      if (!flacRes.ok) throw new Error(`audio fetch ${flacRes.status}`);
      const flacBuf = Buffer.from(await flacRes.arrayBuffer());
      const { sampleRate, samples } = await decodeToFloat32(flacBuf);
      if (samples.length < sampleRate * 0.5) continue; // too short to be useful

      const decoded = toDecodedAudio(samples, sampleRate);
      const acoustics = analyzeAcoustics(decoded);
      const transcript = analyzeTranscript(text, acoustics.durationSec);

      if (Number.isFinite(transcript.wpm)) metrics.wpm.push(transcript.wpm);
      if (acoustics.pitchVariation !== null) metrics.pitchVariation.push(acoustics.pitchVariation);
      if (acoustics.vocalEnergyVariation !== null) {
        metrics.vocalEnergyVariation.push(acoustics.vocalEnergyVariation);
      }

      speakerIds.add(speaker_id);
      processed++;
      if (processed % 25 === 0) console.log(`processed ${processed}/${rows.length}`);
    } catch (err) {
      console.error(`skip ${id}: ${(err as Error).message}`);
    }
    await sleep(200); // audio comes from S3-signed URLs, not datasets-server, but stay polite
  }

  console.log(`done: ${processed} clips, ${speakerIds.size} distinct speakers`);
  for (const [key, values] of Object.entries(metrics)) {
    if (values.length < MIN_SAMPLES_PER_METRIC) {
      throw new Error(`too few samples for ${key}: ${values.length} (need ${MIN_SAMPLES_PER_METRIC}+)`);
    }
  }

  const stats = Object.fromEntries(
    Object.entries(metrics).map(([key, values]) => [key, percentileBreakpoints(values)])
  );

  const out = `// AUTO-GENERATED by scripts/build-reference-stats.mts — do not hand-edit.
// Regenerate: node scripts/build-reference-stats.mts
//
// Source: LibriSpeech validation-clean split (Panayotov et al., 2015),
// fetched via the Hugging Face datasets-server API for
// openslr/librispeech_asr. LibriSpeech compiles public-domain LibriVox
// audiobook narration; dataset license CC BY 4.0. https://www.openslr.org/12
//
// This is short, scripted, single-sentence, studio-quality READ narration —
// not spontaneous multi-minute conversation like a Sona recording. Only
// metrics that stay meaningful across that style gap are included here.
// See src/lib/population.ts for why the rest of RecordingMetrics is
// deliberately excluded from the population comparison.
//
// Generated ${new Date().toISOString().slice(0, 10)} from ${processed} clips
// across ${speakerIds.size} distinct speakers.

import { MetricKey } from "./types";

export type PopulationMetricKey = Extract<MetricKey, "wpm" | "pitchVariation" | "vocalEnergyVariation">;

export interface MetricPercentiles {
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export const REFERENCE_META = {
  corpus: "LibriSpeech validation-clean",
  license: "CC BY 4.0",
  sourceUrl: "https://www.openslr.org/12",
  style: "scripted, single-sentence, studio-quality audiobook narration",
  clipCount: ${processed},
  speakerCount: ${speakerIds.size},
  generatedAt: "${new Date().toISOString()}",
} as const;

export const REFERENCE_STATS: Record<PopulationMetricKey, MetricPercentiles> = {
${Object.entries(stats)
  .map(
    ([key, p]) =>
      `  ${key}: { p5: ${p[5].toFixed(3)}, p10: ${p[10].toFixed(3)}, p25: ${p[25].toFixed(3)}, p50: ${p[50].toFixed(3)}, p75: ${p[75].toFixed(3)}, p90: ${p[90].toFixed(3)}, p95: ${p[95].toFixed(3)} },`
  )
  .join("\n")}
};
`;

  const outPath = new URL("../src/lib/referenceStats.ts", import.meta.url);
  await writeFile(outPath, out);
  console.log(`wrote ${outPath.pathname}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
