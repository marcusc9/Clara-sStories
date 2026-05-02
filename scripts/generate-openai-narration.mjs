import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const STORIES_PATH = path.join(ROOT, "stories.js");
const ASSETS_PATH = path.join(ROOT, "narration-assets.js");
const AUDIO_ROOT = path.join(ROOT, "audio");
const MAX_CHARS = 3600;

const STORY_ID = process.argv[2] ?? "tahirih";
const API_KEY = process.env.OPENAI_API_KEY;
const TTS_MODEL = process.env.CLARA_TTS_MODEL ?? "gpt-4o-mini-tts";
const TRANSCRIBE_MODEL = process.env.CLARA_TRANSCRIBE_MODEL ?? "whisper-1";
const DEFAULT_VOICE = process.env.CLARA_TTS_VOICE ?? "coral";

if (!API_KEY) {
  throw new Error("OPENAI_API_KEY is required to generate cached narration.");
}

async function loadStories() {
  const source = await fs.readFile(STORIES_PATH, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: STORIES_PATH });
  return context.window.ClaraStories ?? [];
}

function storyCentresFemaleFigure(story) {
  const text = [story.title, story.summary, story.author, ...(story.tags ?? [])]
    .join(" ")
    .toLowerCase();

  return [
    "woman",
    "women",
    "female",
    "tahirih",
    "ṭáhirih",
    "rizwanea",
    "martha",
    "mary",
    "queen",
    "princess",
    "mother",
    "daughter",
    "wife"
  ].some((signal) => text.includes(signal));
}

function narrationInstructions(story) {
  const femaleGuidance = storyCentresFemaleFigure(story)
    ? "Use a warm, natural, respectful female narrator voice."
    : "Use the most natural, gentle narrator voice available.";

  return [
    femaleGuidance,
    "Read as a peaceful Bahá'í story: reverent, intelligent, sincere, calm, and trustworthy.",
    "Use medium-slow pacing, clear diction, and thoughtful pauses at paragraph breaks.",
    "Let sacrifice, tenderness, awe, and courage be felt subtly through pacing rather than theatrical emotion.",
    "Take care with Bahá'í names, sacred titles, and historical places."
  ].join(" ");
}

function wordsFromText(text) {
  return String(text).match(/\S+/g) ?? [];
}

function buildChunks(story) {
  const chunks = [];
  let current = [];
  let currentLength = 0;
  let firstParagraph = 0;
  let wordIndex = 0;

  story.story.forEach((paragraph, paragraphIndex) => {
    const text = paragraph.trim();
    const addition = current.length ? `\n\n${text}` : text;

    if (current.length && currentLength + addition.length > MAX_CHARS) {
      chunks.push({
        text: current.join("\n\n"),
        paragraphs: [firstParagraph, paragraphIndex - 1],
        firstWordIndex: wordIndex - wordsFromText(current.join("\n\n")).length
      });
      current = [text];
      currentLength = text.length;
      firstParagraph = paragraphIndex;
    } else {
      current.push(text);
      currentLength += addition.length;
    }

    wordIndex += wordsFromText(text).length;
  });

  if (current.length) {
    chunks.push({
      text: current.join("\n\n"),
      paragraphs: [firstParagraph, story.story.length - 1],
      firstWordIndex: wordIndex - wordsFromText(current.join("\n\n")).length
    });
  }

  return chunks;
}

async function generateSpeech(text, outPath, story) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: story.narration?.voice ?? DEFAULT_VOICE,
      input: text,
      instructions: narrationInstructions(story),
      response_format: "mp3"
    })
  });

  if (!response.ok) {
    throw new Error(`Speech generation failed: ${response.status} ${await response.text()}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outPath, audio);
}

async function transcribeAudio(filePath) {
  const audioBuffer = await fs.readFile(filePath);
  const body = new FormData();
  body.append("model", TRANSCRIBE_MODEL);
  body.append("response_format", "verbose_json");
  body.append("timestamp_granularities[]", "word");
  body.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), path.basename(filePath));

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function alignCuesToStoryWords(chunk, transcript, globalStart) {
  const originalWords = wordsFromText(chunk.text);
  const transcriptWords = transcript.words ?? [];
  const duration = transcript.duration ?? transcriptWords.at(-1)?.end ?? 0;

  if (!originalWords.length) {
    return [];
  }

  if (!transcriptWords.length) {
    const secondsPerWord = Math.max(duration, originalWords.length * 0.36) / originalWords.length;
    return originalWords.map((_, index) => ({
      wordIndex: chunk.firstWordIndex + index,
      start: globalStart + index * secondsPerWord,
      end: globalStart + (index + 1) * secondsPerWord,
      index
    }));
  }

  return originalWords.map((_, index) => {
    const mappedIndex =
      originalWords.length === 1
        ? 0
        : Math.round((index / (originalWords.length - 1)) * (transcriptWords.length - 1));
    const word = transcriptWords[Math.min(mappedIndex, transcriptWords.length - 1)];
    return {
      wordIndex: chunk.firstWordIndex + index,
      start: globalStart + Number(word.start ?? 0),
      end: globalStart + Number(word.end ?? word.start ?? 0) + 0.04,
      index
    };
  });
}

async function writeNarrationAssets(storyId, asset) {
  let existing = {};
  try {
    const source = await fs.readFile(ASSETS_PATH, "utf8");
    const context = { window: {} };
    vm.runInNewContext(source, context, { filename: ASSETS_PATH });
    existing = context.window.ClaraNarrationAssets ?? {};
  } catch {
    existing = {};
  }

  existing[storyId] = asset;
  const output = `window.ClaraNarrationAssets = ${JSON.stringify(existing, null, 2)};\n`;
  await fs.writeFile(ASSETS_PATH, output);
}

const stories = await loadStories();
const story = stories.find((item) => item.id === STORY_ID);

if (!story) {
  throw new Error(`Story not found: ${STORY_ID}`);
}

const outDir = path.join(AUDIO_ROOT, STORY_ID);
await fs.mkdir(outDir, { recursive: true });

const chunks = buildChunks(story);
const assetChunks = [];
const cues = [];
let globalStart = 0;

for (const [index, chunk] of chunks.entries()) {
  const part = String(index + 1).padStart(3, "0");
  const filename = `${STORY_ID}-${part}.mp3`;
  const audioPath = path.join(outDir, filename);

  try {
    await fs.access(audioPath);
    console.log(`Reusing ${filename}`);
  } catch {
    console.log(`Generating ${filename}`);
    await generateSpeech(chunk.text, audioPath, story);
  }

  console.log(`Timing ${filename}`);
  const transcript = await transcribeAudio(audioPath);
  const duration = transcript.duration ?? transcript.words?.at(-1)?.end ?? 0;
  const chunkStart = globalStart;

  assetChunks.push({
    src: `./audio/${STORY_ID}/${filename}`,
    start: Number(chunkStart.toFixed(3)),
    duration: Number(duration.toFixed(3)),
    paragraphs: chunk.paragraphs
  });

  cues.push(
    ...alignCuesToStoryWords(chunk, transcript, chunkStart).map((cue, cueIndex) => ({
      ...cue,
      start: Number(cue.start.toFixed(3)),
      end: Number(cue.end.toFixed(3)),
      index: cues.length + cueIndex
    }))
  );

  globalStart += duration;
}

await writeNarrationAssets(STORY_ID, {
  provider: "openai",
  model: TTS_MODEL,
  voice: story.narration?.voice ?? DEFAULT_VOICE,
  generatedAt: new Date().toISOString(),
  duration: Number(globalStart.toFixed(3)),
  chunks: assetChunks,
  cues
});

console.log(`Narration cache ready for ${STORY_ID}: ${assetChunks.length} chunks, ${cues.length} cues.`);
