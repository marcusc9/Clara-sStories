const stories = window.ClaraStories ?? [];
const page = document.querySelector("[data-story-page]");
const params = new URLSearchParams(window.location.search);
const story = stories.find((item) => item.id === params.get("id")) ?? stories[0];

function storyHtml(item) {
  const image = item.image
    ? `<figure class="reader-image"><img src="${item.image}" alt="${item.imageAlt}" /></figure>`
    : "";
  const notes = item.reflection.map((paragraph) => `<p>${paragraph}</p>`).join("");

  return `
    <a class="back-link" href="./index.html#stories">Back to stories</a>
    <section class="reader-hero">
      <div>
        <p class="kicker">${item.theme}</p>
        <h1>${item.title}</h1>
        <p class="reader-summary">${item.summary}</p>
      </div>
      ${image}
    </section>
    <section class="reader-layout">
      <article class="reader-card">
        <p class="kicker">Quoted passage</p>
        <blockquote>“${item.quote}”</blockquote>
        <div class="reader-note">
          ${notes}
        </div>
      </article>
      <aside class="source-card">
        <p class="kicker">Source</p>
        <dl>
          <div><dt>Author</dt><dd>${item.author}</dd></div>
          <div><dt>Book</dt><dd><cite>${item.book}</cite></dd></div>
          <div><dt>Chapter</dt><dd>${item.chapter}</dd></div>
        </dl>
        <a class="button primary" href="${item.source}" target="_blank" rel="noopener noreferrer">Open original</a>
      </aside>
    </section>
  `;
}

if (page && story) {
  document.title = `${story.title} | Clara's Stories`;
  page.innerHTML = storyHtml(story);
}
