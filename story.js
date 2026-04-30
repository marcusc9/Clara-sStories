const stories = window.ClaraStories ?? [];
const page = document.querySelector("[data-story-page]");
const header = document.querySelector("[data-header]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const params = new URLSearchParams(window.location.search);
const requestedStoryId = params.get("id");
const story = stories.find((item) => item.id === requestedStoryId);

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

function storyHtml(item) {
  const image = item.image
    ? `<figure class="reader-image"><img src="${item.image}" alt="${item.imageAlt}" /></figure>`
    : "";
  const story = item.story.map((paragraph) => `<p>${paragraph}</p>`).join("");
  const sourcePages = item.sourcePages
    ? `<div><dt>Pages</dt><dd>${item.sourcePages}</dd></div>`
    : "";
  const sourceDetail = item.sourceDetail
    ? `<div><dt>Reference</dt><dd>${item.sourceDetail}</dd></div>`
    : "";
  const tags = (item.tags ?? [item.theme])
    .map(
      (tag) =>
        `<a class="tag-pill" href="./index.html#stories" data-story-tag="${tag.toLowerCase()}">${tag}</a>`
    )
    .join("");
  const pullquote = quoteIsStoryEnding(item)
    ? ""
    : `<blockquote class="reader-pullquote">“${item.quote}”</blockquote>`;

  return `
    <a class="back-link" href="./index.html#stories">Back to stories</a>
    <section class="reader-hero">
      <div>
        <p class="kicker">${item.theme} · ${item.readTime}</p>
        <h1>${item.title}</h1>
        <p class="reader-summary">${item.summary}</p>
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
          <div><dt>Author</dt><dd>${item.author}</dd></div>
          <div><dt>Book</dt><dd><cite>${item.book}</cite></dd></div>
          <div><dt>Chapter</dt><dd>${item.chapter}</dd></div>
          ${sourcePages}
          ${sourceDetail}
        </dl>
        <div class="tag-panel">
          <p class="kicker">Story tags</p>
          <div class="tag-list">${tags}</div>
        </div>
        <a class="button primary" href="${item.source}" target="_blank" rel="noopener noreferrer">Open original</a>
      </aside>
    </section>
  `;
}

const narrationState = {
  isSpeaking: false,
  isPaused: false,
  paragraphs: [],
  index: 0,
  voice: null,
  pauseTimer: 0
};

function isNarrationSupported() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function storyCentresFemaleFigure(item) {
  const text = [item.title, item.summary, item.author, ...(item.tags ?? [])]
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

function scoreNarrationVoice(voice, preferFemale) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  const femaleHints = [
    "samantha",
    "victoria",
    "karen",
    "moira",
    "serena",
    "susan",
    "zira",
    "hazel",
    "ava",
    "allison",
    "joanna",
    "joana",
    "jenny",
    "aria",
    "natasha",
    "shelley",
    "sara",
    "female",
    "woman"
  ];
  const naturalHints = ["enhanced", "premium", "neural", "natural", "siri"];
  const artificialHints = ["novelty", "compact", "whisper", "robot", "bubbles", "bells"];

  let score = 0;
  if (lang.startsWith("en-gb")) score += 16;
  if (lang.startsWith("en")) score += 10;
  if (voice.localService) score += 2;
  if (preferFemale && femaleHints.some((hint) => name.includes(hint))) score += 18;
  if (!preferFemale && femaleHints.some((hint) => name.includes(hint))) score += 5;
  if (naturalHints.some((hint) => name.includes(hint))) score += 7;
  if (artificialHints.some((hint) => name.includes(hint))) score -= 20;

  return score;
}

function chooseNarrationVoice(item) {
  const voices = window.speechSynthesis.getVoices();
  const preferFemale = storyCentresFemaleFigure(item);

  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => scoreNarrationVoice(b, preferFemale) - scoreNarrationVoice(a, preferFemale))[0] ??
    voices.sort((a, b) => scoreNarrationVoice(b, preferFemale) - scoreNarrationVoice(a, preferFemale))[0] ??
    null;
}

function setNarrationButtonState(button, label, state) {
  const isActive = state === "playing";
  const isPaused = state === "paused";

  button.classList.toggle("is-paused", isPaused);
  button.setAttribute("aria-pressed", String(isActive));
  button.setAttribute("aria-label", isActive ? "Pause story narration" : "Listen to story");
  label.textContent = isActive ? "Pause" : isPaused ? "Resume" : "Listen";
}

function stopNarration(button, label) {
  window.clearTimeout(narrationState.pauseTimer);
  window.speechSynthesis.cancel();
  narrationState.isSpeaking = false;
  narrationState.isPaused = false;
  narrationState.index = 0;
  setNarrationButtonState(button, label, "idle");
}

function speakNarrationParagraph(button, label) {
  if (!narrationState.isSpeaking || narrationState.index >= narrationState.paragraphs.length) {
    stopNarration(button, label);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(narrationState.paragraphs[narrationState.index]);
  if (narrationState.voice) {
    utterance.voice = narrationState.voice;
  }
  utterance.rate = 0.82;
  utterance.pitch = storyCentresFemaleFigure(story) ? 1.02 : 0.98;
  utterance.volume = 1;

  utterance.onend = () => {
    if (!narrationState.isSpeaking || narrationState.isPaused) {
      return;
    }

    narrationState.index += 1;
    narrationState.pauseTimer = window.setTimeout(
      () => speakNarrationParagraph(button, label),
      narrationState.index === 1 ? 650 : 850
    );
  };

  utterance.onerror = () => stopNarration(button, label);
  window.speechSynthesis.speak(utterance);
}

function startNarration(item, button, label) {
  window.clearTimeout(narrationState.pauseTimer);
  window.speechSynthesis.cancel();
  narrationState.paragraphs = [
    item.title,
    ...item.story.map((paragraph) => paragraph.trim()).filter(Boolean)
  ];
  narrationState.index = 0;
  narrationState.voice = chooseNarrationVoice(item);
  narrationState.isSpeaking = true;
  narrationState.isPaused = false;
  setNarrationButtonState(button, label, "playing");
  speakNarrationParagraph(button, label);
}

function initialiseNarration(item) {
  const button = document.querySelector("[data-narration-toggle]");
  const label = document.querySelector("[data-narration-label]");

  if (!button || !label) {
    return;
  }

  if (!isNarrationSupported()) {
    button.disabled = true;
    button.setAttribute("aria-label", "Story narration is not available in this browser");
    label.textContent = "Unavailable";
    return;
  }

  window.speechSynthesis.onvoiceschanged = () => {
    if (narrationState.isSpeaking) {
      return;
    }
    narrationState.voice = chooseNarrationVoice(item);
  };

  button.addEventListener("click", () => {
    if (narrationState.isSpeaking && !narrationState.isPaused) {
      narrationState.isPaused = true;
      window.speechSynthesis.pause();
      setNarrationButtonState(button, label, "paused");
      return;
    }

    if (narrationState.isSpeaking && narrationState.isPaused) {
      narrationState.isPaused = false;
      window.speechSynthesis.resume();
      setNarrationButtonState(button, label, "playing");
      return;
    }

    startNarration(item, button, label);
  });

  window.addEventListener("pagehide", () => stopNarration(button, label));
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
