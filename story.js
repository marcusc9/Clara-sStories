const stories = window.ClaraStories ?? [];
const page = document.querySelector("[data-story-page]");
const header = document.querySelector("[data-header]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const params = new URLSearchParams(window.location.search);
const requestedStoryId = params.get("id");
const story = stories.find((item) => item.id === requestedStoryId);

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    const icon = themeToggle.querySelector("span");
    if (icon) {
      icon.textContent = isDark ? "☀" : "☾";
    }
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

if (page && story) {
  document.title = `${story.title} | Clara's Stories`;
  page.innerHTML = storyHtml(story);
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
