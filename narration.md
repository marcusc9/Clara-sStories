# OpenAI Narration Setup

Clara's Stories uses cached OpenAI narration files instead of device-native browser speech.

## Generate Tahirih's Audio

Run this locally after exporting an OpenAI API key in your shell or loading it from an uncommitted local env file. Do not put keys in browser code, checked-in files, or static site configuration.

```sh
export OPENAI_API_KEY="your_key_here"
node scripts/generate-openai-narration.mjs tahirih
```

The script creates:

- `audio/tahirih/*.mp3` cached narration chunks
- `narration-assets.js` timing metadata for progressive word highlighting

The site then plays the cached files directly. It does not call OpenAI from the browser and does not regenerate audio on each play.

If this project later adds live narration or other API-backed features, keep all provider calls in server or edge functions, read secrets only from environment variables, validate request bodies, and rate-limit the routes.

## Voice Direction

For stories centered on female figures, the generator uses the configured female-leaning voice and sends voice instructions for a warm, calm, natural, reverent reading. Override the voice or model if needed:

```sh
CLARA_TTS_VOICE=coral CLARA_TTS_MODEL=gpt-4o-mini-tts node scripts/generate-openai-narration.mjs tahirih
```

## Sync

After audio is generated, the script transcribes each chunk with word timestamps and writes word-level cues into `narration-assets.js`. The story page uses those cues to:

- highlight the active word
- fade previously read words
- keep the current reading position comfortably visible
- pause auto-follow briefly when the reader manually scrolls

If the cached audio or timing metadata is missing, the Listen button shows that audio is not ready. It does not fall back to robotic device speech unless that behavior is deliberately reintroduced.
