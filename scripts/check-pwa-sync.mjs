import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML_FILES = ["index.html", "stories.html", "story.html", "about.html"];
const SERVICE_WORKER = "service-worker.js";
const VERSION_PATTERN = /\?v=([^"'`\s)]+)/g;

async function readProjectFile(file) {
  return fs.readFile(path.join(ROOT, file), "utf8");
}

function assetVersions(source) {
  return [...source.matchAll(VERSION_PATTERN)].map((match) => match[1]);
}

function unique(values) {
  return [...new Set(values)];
}

const serviceWorkerSource = await readProjectFile(SERVICE_WORKER);
const versionMatch = serviceWorkerSource.match(/const VERSION = "([^"]+)";/);
const failures = [];

if (!versionMatch) {
  failures.push(`${SERVICE_WORKER} is missing const VERSION.`);
}

const serviceWorkerVersion = versionMatch?.[1] ?? "";
const files = [SERVICE_WORKER, ...HTML_FILES];

for (const file of files) {
  const source = file === SERVICE_WORKER ? serviceWorkerSource : await readProjectFile(file);
  const versions = unique(assetVersions(source));

  if (!versions.length) {
    failures.push(`${file} has no cache-busted asset URLs.`);
    continue;
  }

  const unexpectedVersions = versions.filter((version) => version !== serviceWorkerVersion);

  if (unexpectedVersions.length) {
    failures.push(
      `${file} uses ${unexpectedVersions.join(", ")} but service worker VERSION is ${serviceWorkerVersion}.`
    );
  }
}

const htmlAssetUrls = new Set();

for (const file of HTML_FILES) {
  const source = await readProjectFile(file);

  for (const match of source.matchAll(/(?:href|src)="(\.\/[^"]+\?v=[^"]+)"/g)) {
    htmlAssetUrls.add(match[1]);
  }
}

const missingShellAssets = [...htmlAssetUrls].filter((assetUrl) => !serviceWorkerSource.includes(`"${assetUrl}"`));

if (missingShellAssets.length) {
  failures.push(`${SERVICE_WORKER} APP_SHELL is missing ${missingShellAssets.join(", ")}.`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`PWA asset versions are in sync: ${serviceWorkerVersion}`);
