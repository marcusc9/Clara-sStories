import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORIES_PATH = path.join(ROOT, "stories.js");
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "he",
  "her",
  "him",
  "his",
  "i",
  "in",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "our",
  "she",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "who",
  "will",
  "with",
  "you",
  "your"
]);

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function normaliseText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`´]/g, "'")
    .replace(/[^a-zA-Z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stem(word) {
  if (word.length > 7 && word.endsWith("ation")) {
    return word.slice(0, -5);
  }
  if (word.length > 5 && word.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.length > 5 && word.endsWith("ing")) {
    return word.slice(0, -3);
  }
  if (word.length > 4 && word.endsWith("ed")) {
    return word.slice(0, -2);
  }
  if (word.length > 4 && word.endsWith("es")) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith("s")) {
    return word.slice(0, -1);
  }
  return word;
}

function contentWords(value) {
  return new Set(
    normaliseText(value)
      .split(/\s+/)
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
      .map(stem)
  );
}

function copySimilarity(story) {
  const titleText = normaliseText(story.title);
  const quoteText = normaliseText(story.quote);
  const titleWords = contentWords(story.title);
  const quoteWords = contentWords(story.quote);
  const sharedWords = [...titleWords].filter((word) => quoteWords.has(word));
  const smallerWordCount = Math.min(titleWords.size, quoteWords.size);
  const containment = smallerWordCount ? sharedWords.length / smallerWordCount : 0;
  const phraseRepeat =
    Boolean(titleText && quoteText) &&
    (titleText === quoteText || titleText.includes(quoteText) || quoteText.includes(titleText));

  return {
    containment,
    phraseRepeat,
    sharedWords,
    tooSimilar: phraseRepeat || (sharedWords.length >= 2 && containment >= 0.8)
  };
}

async function loadStories() {
  const source = await fs.readFile(STORIES_PATH, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: STORIES_PATH });
  return Array.isArray(context.window.ClaraStories) ? context.window.ClaraStories : [];
}

const stories = await loadStories();
const requestedLimit = Number.parseInt(argValue("recent", "1"), 10);
const limit = process.argv.includes("--all")
  ? stories.length
  : Number.isFinite(requestedLimit) && requestedLimit > 0
    ? requestedLimit
    : 1;
const checkedStories = stories.slice(0, limit);
const failures = checkedStories
  .map((story) => ({ story, similarity: copySimilarity(story) }))
  .filter(({ similarity }) => similarity.tooSimilar);

if (failures.length) {
  for (const { story, similarity } of failures) {
    const percentage = Math.round(similarity.containment * 100);
    console.error(
      [
        `${story.id}: title and quote are too similar (${percentage}% content-word overlap).`,
        `  Title: ${story.title}`,
        `  Quote: ${story.quote}`,
        `  Shared words: ${similarity.sharedWords.join(", ")}`
      ].join("\n")
    );
  }
  process.exit(1);
}

console.log(
  `Story title/quote separation passed for ${checkedStories.length} ${checkedStories.length === 1 ? "story" : "stories"}.`
);
