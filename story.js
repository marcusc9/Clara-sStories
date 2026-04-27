const stories = window.ClaraStories ?? [];
const page = document.querySelector("[data-story-page]");
const header = document.querySelector("[data-header]");
const params = new URLSearchParams(window.location.search);
const story = stories.find((item) => item.id === params.get("id")) ?? stories[0];

function storyHtml(item) {
  const image = item.image
    ? `<figure class="reader-image"><img src="${item.image}" alt="${item.imageAlt}" /></figure>`
    : "";
  const story = item.story.map((paragraph) => `<p>${paragraph}</p>`).join("");
  const tags = (item.tags ?? [item.theme])
    .map(
      (tag) =>
        `<a class="tag-pill" href="./index.html#stories" data-story-tag="${tag.toLowerCase()}">${tag}</a>`
    )
    .join("");

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
        <blockquote class="reader-pullquote">“${item.quote}”</blockquote>
      </article>
      <aside class="source-card">
        <p class="kicker">Source</p>
        <dl>
          <div><dt>Author</dt><dd>${item.author}</dd></div>
          <div><dt>Book</dt><dd><cite>${item.book}</cite></dd></div>
          <div><dt>Chapter</dt><dd>${item.chapter}</dd></div>
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
}

let lastScroll = 0;
let ticking = false;

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
