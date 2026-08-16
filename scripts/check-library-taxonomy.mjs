import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAXONOMY_PATH = path.join(ROOT, "taxonomy.js");
const STORIES_PATH = path.join(ROOT, "stories.js");

function normalise(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`´]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

async function loadLibrary() {
  const [taxonomySource, storiesSource] = await Promise.all([
    fs.readFile(TAXONOMY_PATH, "utf8"),
    fs.readFile(STORIES_PATH, "utf8")
  ]);
  const context = { window: {} };
  vm.runInNewContext(taxonomySource, context, { filename: TAXONOMY_PATH });
  vm.runInNewContext(storiesSource, context, { filename: STORIES_PATH });
  return {
    taxonomy: context.window.ClaraTaxonomy ?? {},
    stories: Array.isArray(context.window.ClaraStories) ? context.window.ClaraStories : []
  };
}

function addError(errors, condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const { taxonomy, stories } = await loadLibrary();
const errors = [];
const shelves = Array.isArray(taxonomy.shelves) ? taxonomy.shelves : [];
const shelfIds = shelves.map((shelf) => normalise(shelf.id));
const shelfIdSet = new Set(shelfIds);
const themeShelves = taxonomy.themeShelves ?? {};
const tagAliases = taxonomy.tagAliases ?? {};
const storyIds = new Set();
const shelfCounts = new Map(shelfIds.map((id) => [id, 0]));

addError(errors, shelves.length === 8, `Expected exactly 8 library shelves; found ${shelves.length}.`);
addError(errors, shelfIdSet.size === shelves.length, "Library shelf IDs must be unique.");

shelves.forEach((shelf, index) => {
  addError(errors, Boolean(String(shelf.id ?? "").trim()), `Shelf ${index + 1} needs an ID.`);
  addError(errors, Boolean(String(shelf.label ?? "").trim()), `Shelf ${index + 1} needs a label.`);
  addError(
    errors,
    Boolean(String(shelf.description ?? "").trim()),
    `Shelf ${shelf.label || index + 1} needs a description.`
  );
});

Object.entries(themeShelves).forEach(([theme, shelf]) => {
  addError(
    errors,
    shelfIdSet.has(normalise(shelf)),
    `Theme "${theme}" points to unknown shelf "${shelf}".`
  );
});

stories.forEach((story, index) => {
  const label = story.id || `story ${index + 1}`;
  const id = String(story.id ?? "").trim();
  const theme = normalise(story.theme);
  const shelf = normalise(themeShelves[theme]);
  const tags = Array.isArray(story.tags) ? story.tags : [];
  const normalisedTags = tags.map(normalise);
  const collections = Array.isArray(story.collectionTags) ? story.collectionTags : [];
  const normalisedCollections = collections.map(normalise);

  addError(errors, Boolean(id), `Story ${index + 1} needs an ID.`);
  addError(errors, !storyIds.has(id), `Duplicate story ID: "${id}".`);
  storyIds.add(id);

  addError(errors, Boolean(theme), `${label}: theme is missing.`);
  addError(errors, Boolean(shelf), `${label}: theme "${story.theme}" has no shelf mapping.`);
  addError(errors, shelfIdSet.has(shelf), `${label}: shelf "${shelf}" is not defined.`);

  if (shelfIdSet.has(shelf)) {
    shelfCounts.set(shelf, (shelfCounts.get(shelf) ?? 0) + 1);
  }

  addError(errors, tags.length >= 1 && tags.length <= 5, `${label}: use between 1 and 5 tags.`);
  addError(
    errors,
    new Set(normalisedTags).size === normalisedTags.length,
    `${label}: tags contain a duplicate or spelling variant.`
  );

  Object.keys(tagAliases).forEach((alias) => {
    addError(errors, !tags.includes(alias), `${label}: replace tag "${alias}" with "${tagAliases[alias]}".`);
  });

  addError(
    errors,
    normalisedCollections.every((collection) => collection === "anecdotes"),
    `${label}: collectionTags may only contain "Anecdotes".`
  );
  addError(
    errors,
    new Set(normalisedCollections).size === normalisedCollections.length,
    `${label}: collectionTags contains a duplicate.`
  );
});

shelfCounts.forEach((count, shelf) => {
  addError(errors, count > 0, `Shelf "${shelf}" has no stories.`);
});

if (errors.length) {
  console.error(`Library taxonomy check failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const summary = shelves
    .map((shelf) => `${shelf.label}: ${shelfCounts.get(normalise(shelf.id)) ?? 0}`)
    .join(", ");
  console.log(`Library taxonomy check passed for ${stories.length} stories across ${shelves.length} shelves.`);
  console.log(summary);
}
