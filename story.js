const stories = window.ClaraStories ?? [];
const page = document.querySelector("[data-story-page]");
const header = document.querySelector("[data-header]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const params = new URLSearchParams(window.location.search);
const requestedStoryId = sanitiseStoryId(params.get("id"));
const story = stories.find((item) => item.id === requestedStoryId);

function sanitiseStoryId(value) {
  const candidate = String(value ?? "")
    .trim()
    .slice(0, 120);

  return /^[a-z0-9-]+$/i.test(candidate) ? candidate : "";
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";

  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", isDark ? "#09131a" : "#fbf6e8");
  }

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }
}

function initialiseTheme() {
  const savedTheme = localStorage.getItem("claraTheme") === "dark" ? "dark" : "light";
  applyTheme(savedTheme);
}

function quoteIsStoryEnding(item) {
  const finalParagraph = item.story.at(-1) ?? "";
  const clean = (value) =>
    String(value ?? "")
      .toLowerCase()
      .replace(/[“”"'.!?]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  return clean(finalParagraph).includes(clean(item.quote));
}

function sourceLabel(item) {
  const url = String(item.source ?? "");

  if (url.includes("bahai.org/library")) {
    return "Bahá’í Reference Library";
  }

  if (url.includes("bahaistories.com")) {
    return "Bahá’í Stories";
  }

  return String(item.sourceDetail ?? item.book ?? "").replace(/^From\s+/i, "").replace(/\.$/, "");
}

function sourcePagesLabel(value) {
  const text = String(value ?? "").trim().toLowerCase();

  if (text.startsWith("section ")) {
    return "Section";
  }

  if (text.startsWith("chapter ")) {
    return "Chapter";
  }

  if (text.startsWith("p.") || text.startsWith("pp.")) {
    return "Pages";
  }

  return "Location";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function safeResourceUrl(url) {
  const value = String(url ?? "").trim();

  if (!value) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("./") || value.startsWith("../")) {
    return value;
  }

  return "";
}

function renderNarrationParagraph(paragraph, index, wordState) {
  let offset = 0;
  const words = String(paragraph)
    .split(/(\s+)/)
    .map((token) => {
      const start = offset;
      offset += token.length;

      if (/^\s+$/.test(token)) {
        return token;
      }

      const wordIndex = wordState.index;
      wordState.index += 1;

      return `<span class="reader-word" data-word-index="${wordIndex}" data-word-start="${start}" data-word-end="${offset}">${escapeHtml(
        token
      )}</span>`;
    })
    .join("");

  return `<p data-narration-paragraph="${index}">${words}</p>`;
}

function storyHtml(item) {
  const safeImage = safeResourceUrl(item.image);
  const safeSource = safeResourceUrl(item.source);
  const image = safeImage
    ? `<figure class="reader-image"><img src="${escapeAttribute(safeImage)}" alt="${escapeAttribute(
        item.imageAlt
      )}" /></figure>`
    : "";
  const wordState = { index: 0 };
  const story = item.story
    .map((paragraph, index) => renderNarrationParagraph(paragraph, index, wordState))
    .join("");
  const sourcePages = item.sourcePages
    ? `<div><dt>${escapeHtml(sourcePagesLabel(item.sourcePages))}</dt><dd>${escapeHtml(
        item.sourcePages
      )}</dd></div>`
    : "";
  const tags = (item.tags ?? [item.theme])
    .map(
      (tag) =>
        `<a class="tag-pill" href="./index.html#stories" data-story-tag="${escapeAttribute(
          String(tag).toLowerCase()
        )}">${escapeHtml(tag)}</a>`
    )
    .join("");
  const pullquote = quoteIsStoryEnding(item)
    ? ""
    : `<blockquote class="reader-pullquote">“${escapeHtml(item.quote)}”</blockquote>`;

  return `
    <a class="back-link" href="./index.html#stories">Back to stories</a>
    <section class="reader-hero">
      <div>
        <p class="kicker">${escapeHtml(item.theme)} · ${escapeHtml(item.readTime)}</p>
        <h1>${escapeHtml(item.title)}</h1>
        <p class="reader-summary">${escapeHtml(item.summary)}</p>
      </div>
      ${image}
    </section>
    <section class="reader-layout">
      <article class="reader-card">
        <div class="reader-toolbar">
          <button
            class="narration-button"
            type="button"
            data-narration-toggle
            aria-label="Listen to story"
            aria-pressed="false"
          >
            <span class="narration-icon" aria-hidden="true"></span>
            <span data-narration-label>Listen</span>
          </button>
          <button
            class="narration-option"
            type="button"
            data-narration-stop
            hidden
          >
            Stop
          </button>
        </div>
        <p class="kicker">Story</p>
        <div class="reader-note">
          ${story}
        </div>
        ${pullquote}
      </article>
      <aside class="source-card">
        <p class="kicker">Source</p>
        <dl>
          <div><dt>Source</dt><dd>${escapeHtml(sourceLabel(item))}</dd></div>
          <div><dt>By</dt><dd>${escapeHtml(item.author)}</dd></div>
          <div><dt>Work</dt><dd><cite>${escapeHtml(item.book)}</cite></dd></div>
          <div><dt>Chapter</dt><dd>${escapeHtml(item.chapter)}</dd></div>
          ${sourcePages}
        </dl>
        <div class="tag-panel">
          <p class="kicker">Story tags</p>
          <div class="tag-list">${tags}</div>
        </div>
        <a class="button primary" href="${escapeAttribute(
          safeSource
        )}" target="_blank" rel="noopener noreferrer">Open original</a>
      </aside>
    </section>
  `;
}

const narrationState = {
  status: "idle",
  audio: null,
  asset: null,
  chunkIndex: 0,
  activeParagraph: null,
  activeWord: null,
  activeCueIndex: -1,
  animationFrame: 0,
  autoFollow: true,
  highlightMotion: true,
  isAutoScrolling: false,
  autoFollowPausedUntil: 0,
  lastAutoScrollAt: 0
};

function setMediaSessionMetadata(item) {
  if (!("mediaSession" in navigator)) {
    return;
  }

  const asset = narrationState.asset ?? getNarrationAsset(item);
  const artwork = asset?.artwork ?? [
    {
      src: "./icons/icon-512.png",
      sizes: "512x512",
      type: "image/png"
    },
    {
      src: "./icons/icon-192.png",
      sizes: "192x192",
      type: "image/png"
    }
  ];

  navigator.mediaSession.metadata = new MediaMetadata({
    title: asset?.title ?? item.title,
    artist: asset?.artist ?? item.author,
    album: asset?.album ?? item.book,
    artwork
  });
}

function setMediaSessionPlaybackState(state) {
  if (!("mediaSession" in navigator)) {
    return;
  }

  navigator.mediaSession.playbackState = state;
}

function clearMediaSession() {
  if (!("mediaSession" in navigator)) {
    return;
  }

  navigator.mediaSession.playbackState = "none";
}

function updateMediaSessionPositionState() {
  if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) {
    return;
  }

  const audio = narrationState.audio;

  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    return;
  }

  navigator.mediaSession.setPositionState({
    duration: audio.duration,
    playbackRate: audio.playbackRate || 1,
    position: audio.currentTime
  });
}

function getNarrationAsset(item) {
  const key = item.narration?.assetKey ?? item.id;
  return window.ClaraNarrationAssets?.[key] ?? null;
}

function setNarrationButtonState(button, label, state) {
  const labels = {
    idle: "Listen",
    loading: "Loading",
    playing: "Pause",
    paused: "Resume",
    unavailable: "Audio not ready"
  };

  narrationState.status = state;
  button.classList.toggle("is-loading", state === "loading");
  button.classList.toggle("is-paused", state === "paused");
  button.setAttribute("aria-busy", String(state === "loading"));
  button.setAttribute("aria-pressed", String(state === "playing"));
  button.setAttribute(
    "aria-label",
    state === "playing"
      ? "Pause story narration"
      : state === "paused"
        ? "Resume story narration"
        : "Listen to story"
  );
  button.disabled = state === "loading" || state === "unavailable";
  label.textContent = labels[state] ?? labels.idle;
}

function clearNarrationHighlights() {
  narrationState.activeParagraph?.classList.remove("is-narrating");
  narrationState.activeWord?.classList.remove("is-current-word");
  narrationState.activeParagraph = null;
  narrationState.activeWord = null;
}

function activeElementIsComfortablyVisible(element) {
  const rect = element.getBoundingClientRect();
  const topComfort = window.innerHeight * 0.24;
  const bottomComfort = window.innerHeight * 0.76;
  return rect.top >= topComfort && rect.bottom <= bottomComfort;
}

function maybeAutoScrollTo(element) {
  const now = Date.now();
  if (
    !narrationState.autoFollow ||
    now < narrationState.autoFollowPausedUntil ||
    now - narrationState.lastAutoScrollAt < 900 ||
    activeElementIsComfortablyVisible(element)
  ) {
    return;
  }

  narrationState.lastAutoScrollAt = now;
  narrationState.isAutoScrolling = true;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    narrationState.isAutoScrolling = false;
  }, 700);
}

function setActiveNarrationParagraph(paragraph) {
  if (!paragraph) {
    clearNarrationHighlights();
    return;
  }

  if (narrationState.activeParagraph !== paragraph) {
    narrationState.activeParagraph?.classList.remove("is-narrating");
    narrationState.activeWord?.classList.remove("is-current-word");
    narrationState.activeWord = null;
    narrationState.activeParagraph = paragraph;
    paragraph.classList.add("is-narrating");
  }

  maybeAutoScrollTo(paragraph);
}

function setActiveNarrationWord(wordIndex) {
  const activeWord = document.querySelector(`[data-word-index="${wordIndex}"]`);

  if (!activeWord || narrationState.activeWord === activeWord) {
    return;
  }

  narrationState.activeWord?.classList.remove("is-current-word");
  narrationState.activeWord = activeWord;
  activeWord.classList.add("is-current-word");
  setActiveNarrationParagraph(activeWord.closest("[data-narration-paragraph]"));
}

function clearReadState() {
  document.querySelectorAll(".reader-word.is-read").forEach((word) => {
    word.classList.remove("is-read");
  });
}

function markReadThrough(wordIndex) {
  document.querySelectorAll(".reader-word").forEach((word) => {
    const index = Number(word.dataset.wordIndex);
    word.classList.toggle("is-read", Number.isFinite(index) && index < wordIndex);
  });
}

function getChunkStart(chunk) {
  return Number(chunk.start ?? chunk.offset ?? 0);
}

function getCurrentNarrationTime() {
  const chunk = narrationState.asset?.chunks?.[narrationState.chunkIndex];
  return getChunkStart(chunk) + (narrationState.audio?.currentTime ?? 0);
}

function findCueAt(time) {
  const cues = narrationState.asset?.cues ?? [];
  if (!cues.length) {
    return null;
  }

  const current = cues.find((cue) => cue.start <= time && time < cue.end);
  return current ?? cues.findLast?.((cue) => cue.start <= time) ?? null;
}

function syncNarrationFrame() {
  if (narrationState.status !== "playing") {
    return;
  }

  const cue = findCueAt(getCurrentNarrationTime());
  if (cue && cue.index !== narrationState.activeCueIndex) {
    narrationState.activeCueIndex = cue.index;
    if (narrationState.highlightMotion) {
      setActiveNarrationWord(cue.wordIndex);
      markReadThrough(cue.wordIndex);
    }
  }

  updateMediaSessionPositionState();

  narrationState.animationFrame = window.requestAnimationFrame(syncNarrationFrame);
}

function stopNarration(button, label, stopButton) {
  window.cancelAnimationFrame(narrationState.animationFrame);
  narrationState.audio?.pause();
  if (narrationState.audio) {
    narrationState.audio.currentTime = 0;
  }
  narrationState.audio = null;
  narrationState.chunkIndex = 0;
  narrationState.activeCueIndex = -1;
  clearNarrationHighlights();
  clearReadState();
  clearMediaSession();
  setNarrationButtonState(button, label, "idle");
  if (stopButton) {
    stopButton.hidden = true;
  }
}

function prepareAudioChunk(button, label, stopButton) {
  const chunk = narrationState.asset?.chunks?.[narrationState.chunkIndex];
  if (!chunk) {
    stopNarration(button, label, stopButton);
    return null;
  }

  const audio = new Audio(chunk.src);
  audio.preload = "auto";
  audio.playsInline = true;
  audio.addEventListener("ended", () => {
    narrationState.chunkIndex += 1;
    const nextAudio = prepareAudioChunk(button, label, stopButton);
    if (nextAudio) {
      nextAudio.play().catch(() => stopNarration(button, label, stopButton));
    }
  });
  audio.addEventListener("error", () => {
    clearMediaSession();
    setNarrationButtonState(button, label, "unavailable");
    if (stopButton) {
      stopButton.hidden = true;
    }
  });
  audio.addEventListener("play", () => setMediaSessionPlaybackState("playing"));
  audio.addEventListener("pause", () => {
    if (narrationState.status !== "idle") {
      setMediaSessionPlaybackState("paused");
    }
  });
  audio.addEventListener("loadedmetadata", updateMediaSessionPositionState);
  audio.addEventListener("timeupdate", updateMediaSessionPositionState);

  narrationState.audio = audio;
  return audio;
}

function startNarration(item, button, label, stopButton) {
  setNarrationButtonState(button, label, "loading");
  narrationState.asset = getNarrationAsset(item);

  if (!narrationState.asset?.chunks?.length) {
    setNarrationButtonState(button, label, "unavailable");
    return;
  }

  setMediaSessionMetadata(item);
  clearNarrationHighlights();
  clearReadState();
  narrationState.chunkIndex = 0;
  narrationState.activeCueIndex = -1;
  const audio = prepareAudioChunk(button, label, stopButton);
  if (!audio) {
    setNarrationButtonState(button, label, "unavailable");
    return;
  }

  setNarrationButtonState(button, label, "playing");
  if (stopButton) {
    stopButton.hidden = false;
  }
  syncNarrationFrame();
  audio.play().catch(() => {
    setNarrationButtonState(button, label, "unavailable");
  });
}

function initialiseNarration(item) {
  const button = document.querySelector("[data-narration-toggle]");
  const label = document.querySelector("[data-narration-label]");
  const stopButton = document.querySelector("[data-narration-stop]");

  if (!button || !label) {
    return;
  }

  narrationState.autoFollow = true;
  narrationState.highlightMotion = true;

  button.addEventListener("click", () => {
    if (narrationState.status === "playing") {
      narrationState.audio?.pause();
      window.cancelAnimationFrame(narrationState.animationFrame);
      setNarrationButtonState(button, label, "paused");
      return;
    }

    if (narrationState.status === "paused") {
      narrationState.audio?.play().catch(() => {
        setNarrationButtonState(button, label, "unavailable");
      });
      setNarrationButtonState(button, label, "playing");
      syncNarrationFrame();
      return;
    }

    startNarration(item, button, label, stopButton);
  });

  stopButton?.addEventListener("click", () => stopNarration(button, label, stopButton));

  window.addEventListener(
    "scroll",
    () => {
      if (narrationState.status === "playing" && !narrationState.isAutoScrolling) {
        narrationState.autoFollowPausedUntil = Date.now() + 4200;
      }
    },
    { passive: true }
  );

  if (!item.narration || !getNarrationAsset(item)) {
    setNarrationButtonState(button, label, "unavailable");
  }

  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => {
      if (narrationState.status === "paused") {
        narrationState.audio?.play().catch(() => {});
        setNarrationButtonState(button, label, "playing");
        syncNarrationFrame();
        return;
      }

      if (narrationState.status === "idle") {
        startNarration(item, button, label, stopButton);
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (narrationState.status === "playing") {
        narrationState.audio?.pause();
        window.cancelAnimationFrame(narrationState.animationFrame);
        setNarrationButtonState(button, label, "paused");
      }
    });

    navigator.mediaSession.setActionHandler("stop", () => stopNarration(button, label, stopButton));
  }
}

if (page && story) {
  document.title = `${story.title} | Clara's Stories`;
  page.innerHTML = storyHtml(story);
  initialiseNarration(story);
} else if (page) {
  document.title = "Story unavailable | Clara's Stories";
  page.innerHTML = `
    <a class="back-link" href="./index.html#stories">Back to stories</a>
    <section class="reader-hero">
      <div>
        <p class="kicker">Story unavailable</p>
        <h1>This story is being checked.</h1>
        <p class="reader-summary">It has been removed from the reader while its source text is verified.</p>
      </div>
    </section>
  `;
}

document.addEventListener(
  "error",
  (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) {
      return;
    }

    const imageWrap = target.closest(".reader-image, .hero-image");
    if (imageWrap) {
      imageWrap.remove();
      return;
    }

    target.remove();
  },
  true
);

themeToggle?.addEventListener("click", () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  localStorage.setItem("claraTheme", nextTheme);
  applyTheme(nextTheme);
});

let lastScroll = 0;
let ticking = false;

initialiseTheme();

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        const scrollDelta = currentScroll - lastScroll;

        if (currentScroll < 80) {
          header?.classList.remove("is-hidden");
        } else if (scrollDelta > 8) {
          header?.classList.add("is-hidden");
        } else if (scrollDelta < -8) {
          header?.classList.remove("is-hidden");
        }

        lastScroll = Math.max(currentScroll, 0);
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true }
);
