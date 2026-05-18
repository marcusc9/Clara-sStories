import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORIES_PATH = path.join(ROOT, "stories.js");

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function normaliseText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-zA-Z0-9\s'"-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hashText(value) {
  const text = normaliseText(value);
  return text ? crypto.createHash("sha256").update(text).digest("hex").slice(0, 16) : "";
}

function sourceHost(source) {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function loadStories() {
  const source = await fs.readFile(STORIES_PATH, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: STORIES_PATH });
  return Array.isArray(context.window.ClaraStories) ? context.window.ClaraStories : [];
}

function storyText(story) {
  return Array.isArray(story.story) ? story.story.join("\n\n") : "";
}

function firstStoryParagraph(story) {
  return Array.isArray(story.story) ? story.story.find((paragraph) => String(paragraph).trim()) ?? "" : "";
}

function lastStoryParagraph(story) {
  if (!Array.isArray(story.story)) {
    return "";
  }

  return [...story.story].reverse().find((paragraph) => String(paragraph).trim()) ?? "";
}

function storyIndexEntry(story) {
  const body = storyText(story);
  const firstParagraph = firstStoryParagraph(story);
  const lastParagraph = lastStoryParagraph(story);

  return {
    id: story.id ?? "",
    title: story.title ?? "",
    titleKey: normaliseText(story.title),
    addedOn: story.addedOn ?? "",
    featuredOn: story.featuredOn ?? "",
    source: story.source ?? "",
    sourceHost: sourceHost(story.source),
    sourceDetail: story.sourceDetail ?? story.book ?? "",
    sourcePages: story.sourcePages ?? "",
    author: story.author ?? "",
    theme: story.theme ?? "",
    tags: story.tags ?? [],
    collectionTags: story.collectionTags ?? [],
    quoteHash: hashText(story.quote),
    summaryHash: hashText(story.summary),
    firstParagraphHash: hashText(firstParagraph),
    lastParagraphHash: hashText(lastParagraph),
    bodyHash: hashText(body),
    paragraphCount: Array.isArray(story.story) ? story.story.length : 0,
    wordCount: normaliseText(body).split(/\s+/).filter(Boolean).length,
    image: story.featureImage || story.image || ""
  };
}

function buildDuplicateSignals(entries) {
  return {
    ids: entries.map((entry) => entry.id).filter(Boolean),
    titleKeys: entries.map((entry) => entry.titleKey).filter(Boolean),
    sources: entries.map((entry) => entry.source).filter(Boolean),
    sourcePageKeys: entries
      .map((entry) => normaliseText([entry.sourceHost, entry.sourceDetail, entry.sourcePages].join(" ")))
      .filter(Boolean),
    quoteHashes: entries.map((entry) => entry.quoteHash).filter(Boolean),
    firstParagraphHashes: entries.map((entry) => entry.firstParagraphHash).filter(Boolean),
    bodyHashes: entries.map((entry) => entry.bodyHash).filter(Boolean)
  };
}

function sourceUsage(entries) {
  const sourceFamilies = new Map();
  const themes = new Map();
  const recent = entries.slice(0, 12);

  for (const entry of entries) {
    const sourceKey = entry.sourceDetail || entry.sourceHost || "Unknown source";
    sourceFamilies.set(sourceKey, (sourceFamilies.get(sourceKey) ?? 0) + 1);

    if (entry.theme) {
      themes.set(entry.theme, (themes.get(entry.theme) ?? 0) + 1);
    }
  }

  return {
    recentSources: recent.map((entry) => ({
      id: entry.id,
      addedOn: entry.addedOn,
      sourceHost: entry.sourceHost,
      sourceDetail: entry.sourceDetail,
      theme: entry.theme,
      image: entry.image
    })),
    sourceFamilies: Object.fromEntries([...sourceFamilies.entries()].sort((a, b) => b[1] - a[1])),
    themes: Object.fromEntries([...themes.entries()].sort((a, b) => b[1] - a[1]))
  };
}

const stories = await loadStories();
const entries = stories.map(storyIndexEntry);
const recentLimit = Number.parseInt(argValue("recent", "12"), 10);
const recentEntries = entries.slice(0, Number.isFinite(recentLimit) ? recentLimit : 12);

const output = {
  generatedAt: new Date().toISOString(),
  storyCount: entries.length,
  recent: recentEntries,
  duplicateSignals: buildDuplicateSignals(entries),
  sourceUsage: sourceUsage(entries)
};

if (hasFlag("full")) {
  output.allStories = entries;
}

console.log(JSON.stringify(output, null, 2));
