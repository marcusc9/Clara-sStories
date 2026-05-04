const stories = window.ClaraStories ?? [];
const grid = document.querySelector("[data-story-grid]");
const filterList = document.querySelector("[data-story-filters]");
const header = document.querySelector("[data-header]");
const hero = document.querySelector(".hero");
const searchInput = document.querySelector("[data-story-search]");
const storyCount = document.querySelector("[data-story-count]");
const bahaiDate = document.querySelector("[data-bahai-date]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const MAX_SEARCH_QUERY_LENGTH = 120;

const activeFilters = new Set();
let lastScroll = 0;
let ticking = false;
let programmaticScroll = false;
let scrollAnimationFrame = null;

function normalise(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
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

function sanitiseSearchInput(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_QUERY_LENGTH);
}

function safeStoryHref(id) {
  const safeId = String(id ?? "").trim();
  return `./story.html?id=${encodeURIComponent(safeId)}`;
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

function filterKey(value) {
  return normalise(value);
}

function storyFilterValues(story) {
  return [
    story.theme,
    ...(story.collectionTags ?? [])
  ]
    .map(filterKey)
    .filter(Boolean);
}

function isAnecdote(story) {
  return (story.collectionTags ?? []).some((tag) => filterKey(tag) === "anecdotes");
}

function storySearchText(story) {
  return [
    story.theme,
    story.title,
    story.quote,
    story.summary,
    story.author,
    story.book,
    story.chapter,
    story.readTime,
    ...(story.tags ?? []),
    ...(story.collectionTags ?? []),
    ...(story.story ?? [])
  ].join(" ");
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

const bahaiMonths183 = [
  { name: "Bahá", starts: "2026-03-21" },
  { name: "Jalál", starts: "2026-04-09" },
  { name: "Jamál", starts: "2026-04-28" },
  { name: "‘Aẓamat", starts: "2026-05-17" },
  { name: "Núr", starts: "2026-06-05" },
  { name: "Raḥmat", starts: "2026-06-24" },
  { name: "Kalimát", starts: "2026-07-13" },
  { name: "Kamál", starts: "2026-08-01" },
  { name: "Asmá’", starts: "2026-08-20" },
  { name: "‘Izzat", starts: "2026-09-08" },
  { name: "Mashíyyat", starts: "2026-09-27" },
  { name: "‘Ilm", starts: "2026-10-16" },
  { name: "Qudrat", starts: "2026-11-04" },
  { name: "Qawl", starts: "2026-11-23" },
  { name: "Masá’il", starts: "2026-12-12" },
  { name: "Sharaf", starts: "2026-12-31" },
  { name: "Sulṭán", starts: "2027-01-19" },
  { name: "Mulk", starts: "2027-02-07" },
  { name: "Ayyám-i-Há", starts: "2027-02-26", days: 4 },
  { name: "‘Alá’", starts: "2027-03-02" }
];

const dayMs = 24 * 60 * 60 * 1000;

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function localSunset(date) {
  const londonLatitude = 51.5072;
  const londonLongitude = -0.1276;
  const zenith = 90.833;
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / dayMs);
  const longitudeHour = londonLongitude / 15;
  const approximateTime = dayOfYear + (18 - longitudeHour) / 24;
  const meanAnomaly = 0.9856 * approximateTime - 3.289;
  const trueLongitude =
    meanAnomaly +
    1.916 * Math.sin((Math.PI / 180) * meanAnomaly) +
    0.02 * Math.sin((Math.PI / 180) * 2 * meanAnomaly) +
    282.634;
  const normalizedLongitude = (trueLongitude + 360) % 360;
  let rightAscension =
    (180 / Math.PI) *
    Math.atan(0.91764 * Math.tan((Math.PI / 180) * normalizedLongitude));
  rightAscension = (rightAscension + 360) % 360;
  rightAscension +=
    Math.floor(normalizedLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;

  const sinDeclination = 0.39782 * Math.sin((Math.PI / 180) * normalizedLongitude);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHour =
    (Math.cos((Math.PI / 180) * zenith) -
      sinDeclination * Math.sin((Math.PI / 180) * londonLatitude)) /
    (cosDeclination * Math.cos((Math.PI / 180) * londonLatitude));

  if (cosHour < -1 || cosHour > 1) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0);
  }

  const hourAngle = (180 / Math.PI) * Math.acos(cosHour);
  const localMeanTime = hourAngle / 15 + rightAscension - 0.06571 * approximateTime - 6.622;
  const utcHour = (localMeanTime - longitudeHour + 24) % 24;
  const localSunsetDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0)
  );
  localSunsetDate.setUTCMinutes(Math.round(utcHour * 60));
  return localSunsetDate;
}

function getBahaiDateLabel(date = new Date()) {
  const bahaiDay = date >= localSunset(date) ? addDays(date, 1) : date;
  const bahaiKey = localDateKey(bahaiDay);
  let month = bahaiMonths183[0];

  bahaiMonths183.forEach((candidate) => {
    if (candidate.starts <= bahaiKey) {
      month = candidate;
    }
  });

  const day = Math.floor((dateFromKey(bahaiKey) - dateFromKey(month.starts)) / dayMs) + 1;
  return `${day} ${month.name}, 183 BE`;
}

function getLibraryOrder() {
  return stories
    .map((story, index) => {
      const addedTime = Date.parse(story.addedOn ?? story.addedAt ?? "");
      return {
        story,
        index,
        addedTime: Number.isNaN(addedTime) ? 0 : addedTime
      };
    })
    .sort((first, second) => second.addedTime - first.addedTime || first.index - second.index)
    .map(({ story }) => story);
}

function getDailyStoryOrder() {
  const libraryOrder = getLibraryOrder();

  if (!libraryOrder.length) {
    return [];
  }

  const todayKey = localDateKey(new Date());
  const explicitlyFeaturedStory = libraryOrder.find((story) => story.featuredOn === todayKey);

  if (explicitlyFeaturedStory) {
    return [
      explicitlyFeaturedStory,
      ...libraryOrder.filter((story) => story !== explicitlyFeaturedStory)
    ];
  }

  const today = Math.floor(dateFromKey(localDateKey(new Date())).getTime() / dayMs);
  const featuredIndex = today % libraryOrder.length;
  const featuredStory = libraryOrder[featuredIndex];
  return [featuredStory, ...libraryOrder.filter((story) => story !== featuredStory)];
}

function applyBahaiDate() {
  if (bahaiDate) {
    bahaiDate.textContent = getBahaiDateLabel();
  }
}

function easeInOutSine(progress) {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

function scrollToStories() {
  const target = document.querySelector("#stories-anchor") ?? document.querySelector("#stories");

  if (!target) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const headerOffset = header ? header.getBoundingClientRect().height + 24 : 0;
  const start = window.scrollY;
  const destination = Math.max(
    0,
    target.getBoundingClientRect().top + window.scrollY - headerOffset
  );
  const distance = destination - start;

  if (scrollAnimationFrame) {
    window.cancelAnimationFrame(scrollAnimationFrame);
  }

  if (reduceMotion || Math.abs(distance) < 2) {
    window.scrollTo(0, destination);
    return;
  }

  programmaticScroll = true;
  header?.classList.remove("is-hidden");

  const duration = Math.min(2400, Math.max(1500, Math.abs(distance) * 1.15));
  const startedAt = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    window.scrollTo(0, start + distance * easeInOutSine(progress));

    if (progress < 1) {
      scrollAnimationFrame = window.requestAnimationFrame(step);
      return;
    }

    window.scrollTo(0, destination);
    programmaticScroll = false;
    scrollAnimationFrame = null;
  }

  scrollAnimationFrame = window.requestAnimationFrame(step);
}

function jumpToStories() {
  const target = document.querySelector("#stories-anchor") ?? document.querySelector("#stories");

  if (!target) {
    return;
  }

  const headerOffset = header ? header.getBoundingClientRect().height + 24 : 0;
  const destination = Math.max(
    0,
    target.getBoundingClientRect().top + window.scrollY - headerOffset
  );

  programmaticScroll = true;
  header?.classList.remove("is-hidden");
  window.scrollTo({ top: destination, behavior: "instant" });
  lastScroll = destination;
  window.requestAnimationFrame(() => {
    programmaticScroll = false;
    header?.classList.remove("is-hidden");
  });
  window.setTimeout(() => header?.classList.remove("is-hidden"), 260);
}

function renderStories() {
  if (!grid) {
    return;
  }

  grid.innerHTML = getDailyStoryOrder()
    .map((story, index) => {
      const featureImage = index === 0 ? story.featureImage || story.image : "";
      const featureImageAlt = index === 0 ? story.featureImageAlt || story.imageAlt : "";
      const safeImage = safeResourceUrl(featureImage);
      const image = safeImage
        ? `<img src="${escapeAttribute(safeImage)}" alt="${escapeAttribute(
            featureImageAlt
          )}" loading="eager" decoding="async" fetchpriority="high" />`
        : "";
      const imageClass = safeImage ? " image-card" : "";
      const featureClass = index === 0 ? " feature" : "";
      const filterValues = storyFilterValues(story).join(" ");
      const searchText = normalise(storySearchText(story));

      return `
        <a class="story-card${featureClass}${imageClass} reveal" href="${safeStoryHref(
          story.id
        )}" data-theme="${escapeAttribute(story.theme)}" data-filter-values="${escapeAttribute(
          filterValues
        )}" data-search="${escapeAttribute(searchText)}">
          ${image}
          <div class="story-meta">
            <span>${escapeHtml(story.theme)}</span>
            <span>${escapeHtml(story.readTime)}</span>
          </div>
          <h3>${escapeHtml(story.title)}</h3>
          <blockquote>“${escapeHtml(story.quote)}”</blockquote>
          <p>${escapeHtml(story.summary)}</p>
          <span class="story-link">Open story</span>
        </a>
      `;
    })
    .join("");
}

function applyImageFallbacks() {
  Array.from(document.querySelectorAll(".story-card.image-card img")).forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        image.closest(".story-card")?.classList.remove("image-card");
        image.remove();
      },
      { once: true }
    );
  });
}

function formatTheme(value) {
  if (value === "anecdotes") {
    return "Anecdotes";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderFilters() {
  if (!filterList) {
    return;
  }

  const filterMap = new Map([["all", "All"]]);
  const themeCounts = new Map();

  stories.forEach((story) => {
    const theme = filterKey(story.theme);
    const current = themeCounts.get(theme) ?? { label: formatTheme(story.theme), total: 0, anecdotes: 0 };
    current.total += 1;
    current.anecdotes += isAnecdote(story) ? 1 : 0;
    themeCounts.set(theme, current);
  });

  themeCounts.forEach((count, theme) => {
    if (count.total !== count.anecdotes) {
      filterMap.set(theme, count.label);
    }
  });
  stories.forEach((story) => {
    (story.collectionTags ?? []).forEach((tag) => {
      filterMap.set(filterKey(tag), formatTheme(filterKey(tag)));
    });
  });

  const allFilter = filterMap.get("all");
  const anecdotesFilter = filterMap.get("anecdotes");
  const themeFilters = Array.from(filterMap.entries()).filter(
    ([filter]) => filter !== "all" && filter !== "anecdotes"
  );
  const visibleThemeFilters = themeFilters.slice(0, 6);
  const overflowThemeFilters = themeFilters.slice(6);
  const visibleFilters = [
    ["all", allFilter],
    ...visibleThemeFilters,
    ...(anecdotesFilter ? [["anecdotes", anecdotesFilter]] : [])
  ];

  function renderFilterButton([filter, label]) {
    const isActive = filter === "all" ? activeFilters.size === 0 : activeFilters.has(filter);
    const activeClass = isActive ? " is-active" : "";
    return `<button class="filter${activeClass}" type="button" data-filter="${filter}" aria-pressed="${isActive}">${label}</button>`;
  }

  const moreFilters = overflowThemeFilters.length
    ? `
      <details class="filter-menu">
        <summary class="filter filter-more" aria-label="Show more filters">
          <span class="visually-hidden">More filters</span>
        </summary>
        <div class="filter-menu-panel">
          ${overflowThemeFilters.map(renderFilterButton).join("")}
        </div>
      </details>
    `
    : "";

  filterList.innerHTML = `${visibleFilters.map(renderFilterButton).join("")}${moreFilters}`;
  syncFilterControls();
}

function updateStories() {
  const cards = Array.from(document.querySelectorAll(".story-card[data-filter-values]"));
  const cleanSearch = sanitiseSearchInput(searchInput?.value);
  const query = normalise(cleanSearch).trim();
  const selectedFilters = Array.from(activeFilters);
  let visibleCount = 0;

  if (searchInput && searchInput.value !== cleanSearch) {
    searchInput.value = cleanSearch;
  }

  cards.forEach((card) => {
    const filterValues = (card.dataset.filterValues ?? "").split(/\s+/);
    const matchesFilter =
      selectedFilters.length === 0 || selectedFilters.some((filter) => filterValues.includes(filter));
    const matchesSearch = !query || (card.dataset.search ?? normalise(card.textContent)).includes(query);
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

function syncFilterControls() {
  const hasActiveFilters = activeFilters.size > 0;

  Array.from(document.querySelectorAll("[data-filter]")).forEach((item) => {
    const filter = item.dataset.filter ?? "all";
    const isActive = filter === "all" ? !hasActiveFilters : activeFilters.has(filter);
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  Array.from(document.querySelectorAll(".filter-menu")).forEach((menu) => {
    const hasActiveMenuFilter = Array.from(menu.querySelectorAll("[data-filter]")).some((item) =>
      activeFilters.has(item.dataset.filter ?? "")
    );
    menu.classList.toggle("has-active", hasActiveMenuFilter);
  });
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
    const selectedFilter = filter.dataset.filter ?? "all";

    if (selectedFilter === "all") {
      activeFilters.clear();
    } else if (activeFilters.has(selectedFilter)) {
      activeFilters.delete(selectedFilter);
    } else {
      activeFilters.add(selectedFilter);
    }

    syncFilterControls();
    updateStories();
  }
});

searchInput?.addEventListener("input", () => {
  searchInput.value = sanitiseSearchInput(searchInput.value);
  updateStories();
});

themeToggle?.addEventListener("click", () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  localStorage.setItem("claraTheme", nextTheme);
  applyTheme(nextTheme);
});

["wheel", "touchstart", "keydown"].forEach((eventName) => {
  window.addEventListener(
    eventName,
    () => {
      if (scrollAnimationFrame) {
        window.cancelAnimationFrame(scrollAnimationFrame);
        scrollAnimationFrame = null;
        programmaticScroll = false;
      }
    },
    { passive: true }
  );
});

document.addEventListener("click", (event) => {
  const link = event.target.closest('.nav a[href="#stories"]');

  if (!link) {
    return;
  }

  event.preventDefault();
  history.pushState(null, "", "#stories");
  header?.classList.remove("is-hidden");
  scrollToStories();
});

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        const scrollDelta = currentScroll - lastScroll;

        if (programmaticScroll) {
          header?.classList.remove("is-hidden");
        } else if (currentScroll < 80) {
          header?.classList.remove("is-hidden");
        } else if (scrollDelta > 8) {
          header?.classList.add("is-hidden");
        } else if (scrollDelta < -8) {
          header?.classList.remove("is-hidden");
        }

        const heroShift = Math.min(currentScroll, 520);
        const heroFade = Math.max(0, 1 - currentScroll / 620);

        hero?.style.setProperty("--hero-shift", `${heroShift}px`);
        hero?.style.setProperty("--hero-image-opacity", heroFade.toFixed(3));
        lastScroll = Math.max(currentScroll, 0);
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true }
);

initialiseTheme();
renderStories();
applyImageFallbacks();
renderFilters();
observeReveals();
applyBahaiDate();
updateStories();

if (window.location.hash === "#stories") {
  window.requestAnimationFrame(() => {
    jumpToStories();
    window.setTimeout(jumpToStories, 140);
  });
}
