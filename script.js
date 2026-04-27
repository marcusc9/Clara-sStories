const stories = window.ClaraStories ?? [];
const grid = document.querySelector("[data-story-grid]");
const filterList = document.querySelector("[data-story-filters]");
const header = document.querySelector("[data-header]");
const hero = document.querySelector(".hero");
const searchInput = document.querySelector("[data-story-search]");
const storyCount = document.querySelector("[data-story-count]");
const bahaiDate = document.querySelector("[data-bahai-date]");

let activeFilter = "all";
let lastScroll = 0;
let ticking = false;

function normalise(value) {
  return String(value ?? "").toLowerCase();
}

const bahaiDateOverride = "18 Jalál, 183 BE";

function getBahaiDateLabel(date = new Date()) {
  return bahaiDateOverride;
}

function applyBahaiDate() {
  if (bahaiDate) {
    bahaiDate.textContent = getBahaiDateLabel();
  }
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
            <span>${story.readTime}</span>
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

function formatTheme(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderFilters() {
  if (!filterList) {
    return;
  }

  const themes = ["all", ...new Set(stories.map((story) => story.theme))];

  filterList.innerHTML = themes
    .map((theme) => {
      const activeClass = theme === activeFilter ? " is-active" : "";
      const label = theme === "all" ? "All" : formatTheme(theme);
      return `<button class="filter${activeClass}" type="button" data-filter="${theme}">${label}</button>`;
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

filterList?.addEventListener("click", (event) => {
  const filter = event.target.closest("[data-filter]");

  if (filter) {
    activeFilter = filter.dataset.filter ?? "all";

    Array.from(document.querySelectorAll("[data-filter]")).forEach((item) =>
      item.classList.toggle("is-active", item === filter)
    );
    updateStories();
  }
});

searchInput?.addEventListener("input", updateStories);

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        const scrollingDown = currentScroll > lastScroll;

        header?.classList.toggle("is-hidden", scrollingDown && currentScroll > 120);
        hero?.style.setProperty("--hero-shift", `${Math.min(currentScroll, 360)}px`);
        lastScroll = Math.max(currentScroll, 0);
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true }
);

renderStories();
renderFilters();
observeReveals();
applyBahaiDate();
updateStories();
