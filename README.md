# Sona

Your voice changes before you notice it. Pace, pauses, pitch, energy, all of it shifts with stress, sleep, mood, illness, whatever is going on with you that day. Sona records you talking, measures how you actually sound, and compares it against your own normal so you can see when something is off.

No accounts. No database. No server storing your voice. Everything lives in your browser's local storage, and you can wipe it with one click.

## The idea

Most voice or health apps ask you to describe a picture or read a script out loud. Sona doesn't. You just talk, about your day, something on your mind, whatever. Three short takes back to back is enough for it to start comparing you against yourself.

The whole flow is dead simple: **record, analyze, see what changed.**

- Record 3 short takes in one sitting
- Sona pulls real acoustic and speech features out of each one
- From the second take on, it shows you how you compare to the one before
- After the third, you get a full breakdown across timing, fluency, and voice

It builds a personal baseline over time. The more you use it, the more it knows what "normal" sounds like for you specifically, not some generic average voice.

## What it actually measures

All of this comes straight out of the raw audio, no black box, no made up scores.

**Timing**
speaking pace, articulation rate (pace while actually talking, pauses excluded), pause count, long pause count, longest pause, silence percentage, response latency

**Fluency** (needs a transcript)
filler words per minute, repeated words, lexical diversity

**Voice**
average pitch, pitch variation, pitch range, vocal energy, energy variability

Each metric gets compared to your own rolling average and rolled up into three category scores (Timing, Fluency, Voice), which blend into one overall Voice Stability score. If a category has no usable data for a given recording (say, no transcript), it's just left out of the score instead of quietly zeroing it out.

The transcript-based features are optional. Sona tries a Whisper transcription if an API key is configured, and if not, it falls back to the browser's built in speech recognition. If neither is available it just runs on acoustic features alone and tells you clearly what's missing.

## Comparing to general speech, not just to yourself

Everything above compares a recording to *your own* rolling average. There's a second, separate layer: how a recording compares to a small reference sample of general speech, regardless of your own history.

**Where the reference data comes from:** [LibriSpeech](https://www.openslr.org/12)'s `validation-clean` split — LibriVox volunteers reading public-domain audiobooks aloud, compiled by Panayotov et al. (2015), dataset license CC BY 4.0. Fetched via Hugging Face's `datasets-server` API, one small page per speaker's block in the split so the sample spans many distinct speakers instead of a handful. The numbers currently shipped come from **200 clips across 40 distinct speakers** (see `REFERENCE_META` in `src/lib/referenceStats.ts`) — a small sample, not a large-scale norm, and the app's own copy says so.

**This is not DementiaBank, ADReSS, or any clinically labeled dataset.** Those require a registered research access agreement Sona doesn't have, and nothing clinically labeled is used anywhere in this project.

**The style doesn't match your recordings, and that limits what's compared.** LibriSpeech clips are short (a handful of seconds), scripted, single-sentence, studio-quality audiobook narration — not the spontaneous, multi-minute, conversational speech you record in Sona. A single read sentence doesn't contain a natural pause or a filler word, so comparing pause counts, silence, filler rate, or word variety against it would be comparing against a style that structurally can't have them. Only three metrics survive that mismatch and get a population comparison: **speaking pace, pitch variation, and energy variability** — the two variation metrics are scale-invariant (coefficients of variation, so they aren't thrown off by different recording setups), and pace is valid even on a short clip. Everything else was cut for a specific, checked reason:

- **Articulation rate** (words per minute of *non-silent* time) looked plausible at first but isn't: on these 2-7 second clips, the silence detector — tuned for 30-90 second recordings — flags 36-47% of each clip as silence (alignment padding plus low-energy phonemes it can't resolve at that timescale), collapsing the denominator and inflating the rate into a measurement artifact rather than a real signal.
- **Average pitch and pitch range** are bimodal by sex (pooled male ~110Hz / female ~200Hz voices), so a percentile position would flag ordinary voices on both sides as "atypical."
- **Raw vocal energy** is a function of mic gain and mouth-to-mic distance more than of the voice itself, so it's comparing recording setups, not speakers.

**How the comparison works:** the exact same feature-extraction code Sona uses in the browser (`analyzeAcoustics`, `analyzeTranscript`) runs unmodified over the reference clips, offline, in `scripts/build-reference-stats.mts` — Node decodes each clip via `ffmpeg` (no loudness normalization, since that would fabricate a "typical" energy level) and feeds it through the same pipeline a real recording goes through. From that, the script computes percentile breakpoints (p5–p95) per metric — not a mean/standard-deviation z-score, since speaking pace in particular is right-skewed and a normal-distribution assumption would misplace the tails. A recording's value gets located in that distribution by linear interpolation and turned into a percentile per metric. There's deliberately no single rolled-up "how typical" score: collapsing to one number that peaks at the median would make the 5th and 95th percentile score identically low, even though one means unusually flat/slow and the other unusually expressive/fast — that's not the same thing as "atypical." Only the resulting percentile tables are committed to the repo (`src/lib/referenceStats.ts`); no reference audio ships with Sona.

**Regenerating it:** `node scripts/build-reference-stats.mts` (Node 23.6+, `ffmpeg` on `PATH`). It's a one-off maintenance script, not part of `npm run build`.

## How it's built

- **Next.js + TypeScript + Tailwind**, App Router, one page
- **MediaRecorder** for capturing audio straight from the mic
- **Web Audio API** for everything else: RMS energy per frame for silence and pause detection, autocorrelation for pitch tracking, all running client side in the browser
- Pitch detection runs on a decimated copy of the signal (about 11kHz), because full-resolution autocorrelation on a 90 second clip is genuinely slow, it's an O(n^2)-ish search and would freeze the tab for 10+ seconds otherwise. Decimating first gets that down to a few hundred milliseconds without losing anything meaningful in the 75 to 400Hz range human voices actually live in.
- **localStorage** as the only persistence layer. There's no backend beyond one optional API route that proxies to Whisper if you give it a key.
- The acoustic/transcript feature extractors are written against a small structural interface rather than the literal `AudioBuffer` type, so the identical code also runs in Node (see the general-speech comparison section below) — same analysis, no duplicated logic.

## Why this instead of a "real" backend

Because it doesn't need one. Nothing here requires a server: the analysis runs in your browser, the history lives in your browser, and the whole point is that your voice never has to leave your machine unless you explicitly want better transcription. Simpler stack, fewer moving parts, and honestly a stronger privacy story than most apps doing something similar.

## Running it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. That's it.

If you want Whisper transcription instead of relying on the browser's speech recognition, set `OPENAI_API_KEY` in your environment before starting the dev server. Without it, Sona just uses whatever the browser gives it (or nothing, and tells you so).

## A real disclaimer

This is an experimental speech pattern demo, not a diagnostic tool and not medical advice. It never claims to detect any condition — that covers both comparisons Sona shows you: the personal-baseline one (how you're speaking today against how you usually speak) and the general-speech one (how a recording sits against a small, style-mismatched reference sample, described above). Neither is a screening tool. Neither measures cognitive health, dementia risk, or any other clinical marker. Both are statistical descriptions of measured audio, full stop.
