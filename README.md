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

## How it's built

- **Next.js + TypeScript + Tailwind**, App Router, one page
- **MediaRecorder** for capturing audio straight from the mic
- **Web Audio API** for everything else: RMS energy per frame for silence and pause detection, autocorrelation for pitch tracking, all running client side in the browser
- Pitch detection runs on a decimated copy of the signal (about 11kHz), because full-resolution autocorrelation on a 90 second clip is genuinely slow, it's an O(n^2)-ish search and would freeze the tab for 10+ seconds otherwise. Decimating first gets that down to a few hundred milliseconds without losing anything meaningful in the 75 to 400Hz range human voices actually live in.
- **localStorage** as the only persistence layer. There's no backend beyond one optional API route that proxies to Whisper if you give it a key.

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

This is an experimental speech pattern demo, not a diagnostic tool and not medical advice. It never claims to detect any condition. It just measures how you're speaking today against how you usually speak, and shows you the numbers.
