const stories = window.ClaraStories ?? [];
const grid = document.querySelector("[data-story-grid]");
const filters = Array.from(document.querySelectorAll("[data-filter]"));
const header = document.querySelector("[data-header]");
const hero = document.querySelector(".hero");
const searchInput = document.querySelector("[data-story-search]");
const storyCount = document.querySelector("[data-story-count]");

let activeFilter = "all";

function normalise(value) {
  return String(value ?? "").toLowerCase();
}

function renderStories() {
  if (!grid) {
    return;
  }

  grid.innerHTML = stories
    .map((story, index) => {
      const image = story.image
        ? `<img src="${story.image}" alt="${story.imageAlt}" loading="lazy" />`
        : "";
      const imageClass = story.image ? " image-card" : "";
      const featureClass = index === 0 ? " feature" : "";

      return `
        <a class="story-card${featureClass}${imageClass} reveal" href="./story.html?id=${story.id}" data-theme="${story.theme}">
          ${image}
          <div class="story-meta">
            <span>${story.theme}</span>
            <span>${story.author}</span>
          </div>
          <h3>${story.title}</h3>
          <blockquote>“${story.quote}”</blockquote>
          <p>${story.summary}</p>
          <span class="story-link">Open story</span>
        </a>
      `;
    })
    .join("");
}

function updateStories() {
  const cards = Array.from(document.querySelectorAll("[data-theme]"));
  const query = normalise(searchInput?.value).trim();
  let visibleCount = 0;

  cards.forEach((card) => {
    const matchesFilter = activeFilter === "all" || card.dataset.theme === activeFilter;
    const matchesSearch = !query || normalise(card.textContent).includes(query);
    const isVisible = matchesFilter && matchesSearch;

    card.classList.toggle("is-hidden", !isVisible);
    if (isVisible) {
      visibleCount += 1;
    }
  });

  if (storyCount) {
    storyCount.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? "story" : "stories"}`;
  }
}

function observeReveals() {
  const revealTargets = Array.from(document.querySelectorAll(".reveal"));
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealTargets.forEach((target) => revealObserver.observe(target));
}

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    activeFilter = filter.dataset.filter ?? "all";

    filters.forEach((item) => item.classList.toggle("is-active", item === filter));
    updateStories();
  });
});

searchInput?.addEventListener("input", updateStories);

let lastScroll = 0;

window.addEventListener(
  "scroll",
  () => {
    const currentScroll = window.scrollY;
    header?.classList.toggle("is-compact", currentScroll > 80 && currentScroll > lastScroll);
    hero?.style.setProperty("--hero-shift", `${Math.min(currentScroll, 360)}px`);
    lastScroll = currentScroll;
  },
  { passive: true }
);

renderStories();
observeReveals();
updateStories();
