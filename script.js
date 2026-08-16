const stories = window.ClaraStories ?? [];
const grid = document.querySelector("[data-story-grid]");
const filterList = document.querySelector("[data-story-filters]");
const header = document.querySelector("[data-header]");
const hero = document.querySelector(".hero");
const heroVideo = document.querySelector("[data-hero-video]");
const heroMedia = document.querySelector("[data-hero-media]");
const mobileLibrary = document.querySelector(".home-mobile-library");
const searchInput = document.querySelector("[data-story-search]");
const storyCount = document.querySelector("[data-story-count]");
const bahaiDate = document.querySelector("[data-bahai-date]");
const themeToggles = document.querySelectorAll("[data-theme-toggle]");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const isHomePage = document.body.classList.contains("home-page");
const mobileHomeQuery = window.matchMedia("(max-width: 620px)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const MAX_SEARCH_QUERY_LENGTH = 120;
const taxonomy = window.ClaraTaxonomy ?? { shelves: [], themeShelves: {} };
const shelves = Array.isArray(taxonomy.shelves) ? taxonomy.shelves : [];
const shelfById = new Map(shelves.map((shelf) => [filterKey(shelf.id), shelf]));

const activeFormatFilters = new Set();
let activeShelf = "";
let filtersExpanded = false;
let lastScroll = 0;
let ticking = false;
let programmaticScroll = false;
let scrollAnimationFrame = null;
let scrollDirectionDistance = 0;
let heroVideoDuration = 0;
let heroVideoActive = false;
let heroVideoSeekReady = false;
let lastHeroVideoTime = -1;
let heroVideoTargetTime = 0;
let heroVideoRenderedTime = 0;

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

function safeImagePosition(value) {
  const position = String(value ?? "").trim();

  if (!position) {
    return "";
  }

  const tokens = position.split(/\s+/);
  const keywords = new Set(["left", "center", "right", "top", "bottom"]);
  const isSafeToken = (token) => {
    if (keywords.has(token)) {
      return true;
    }

    const percentage = token.match(/^(\d+(?:\.\d+)?)%$/);
    return Boolean(percentage && Number(percentage[1]) <= 100);
  };

  return tokens.length <= 2 && tokens.every(isSafeToken) ? tokens.join(" ") : "";
}

function filterKey(value) {
  return normalise(value);
}

function storyShelf(story) {
  return filterKey(taxonomy.themeShelves?.[filterKey(story.theme)]);
}

function isAnecdote(story) {
  return (story.collectionTags ?? []).some((tag) => filterKey(tag) === "anecdotes");
}

function hasNarration(story) {
  return Boolean(story.narration?.status === "ready");
}

function storySearchText(story) {
  const shelf = shelfById.get(storyShelf(story));

  return [
    shelf?.label,
    shelf?.description,
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
    themeColorMeta.setAttribute("content", isDark ? "#09131a" : (isHomePage ? "#09131a" : "#fbf6e8"));
  }

  themeToggles.forEach((toggle) => {
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  });
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

  return libraryOrder;
}

function applyBahaiDate() {
  if (bahaiDate) {
    bahaiDate.textContent = getBahaiDateLabel();
  }
}

function getHeroProgress(currentScroll = window.scrollY) {
  const heroHeight = Math.max(hero?.offsetHeight ?? 620, 1);

  if (isHomePage && mobileHomeQuery.matches) {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const scrollRunway = Math.max(heroHeight - viewportHeight, 1);
    return Math.min(1, Math.max(0, currentScroll / scrollRunway));
  }

  return Math.min(1, Math.max(0, currentScroll / heroHeight));
}

function clampProgress(value) {
  return Math.min(1, Math.max(0, value));
}

function progressBetween(progress, start, end) {
  const phase = clampProgress((progress - start) / Math.max(end - start, 0.001));
  return phase * phase * (3 - 2 * phase);
}

function mapHeroVideoProgress(progress) {
  return clampProgress((progress - 0.045) / 0.91);
}

function setHeroVideoTime(time) {
  if (!heroVideo) {
    return false;
  }

  try {
    heroVideo.currentTime = time;
    lastHeroVideoTime = time;
    return true;
  } catch {
    heroMedia?.classList.remove("has-scroll-video");
    return false;
  }
}

function syncHeroVideo(progress = getHeroProgress()) {
  if (
    !heroVideo ||
    !heroVideoActive ||
    !heroVideoDuration ||
    heroVideo.readyState < 1
  ) {
    return;
  }

  heroVideoTargetTime = Math.min(
    Math.max(heroVideoDuration - 1 / 30, 0),
    mapHeroVideoProgress(progress) * heroVideoDuration
  );

  if (Math.abs(heroVideoTargetTime - lastHeroVideoTime) < 1 / 30) {
    return;
  }

  heroVideoRenderedTime = heroVideoTargetTime;
  setHeroVideoTime(heroVideoTargetTime);
}

function setHeroVideoMode() {
  if (!heroVideo || !heroMedia) {
    return;
  }

  const saveData = Boolean(navigator.connection?.saveData);
  const wasActive = heroVideoActive;
  heroVideoActive = Boolean(
    isHomePage && mobileHomeQuery.matches && !reducedMotionQuery.matches && !saveData
  );

  if (!heroVideoActive) {
    heroVideo.pause();
    heroVideo.preload = "none";
    heroVideoSeekReady = false;
    heroMedia.classList.remove("has-scroll-video");
    lastHeroVideoTime = -1;
    heroVideoTargetTime = 0;
    heroVideoRenderedTime = 0;
    return;
  }

  heroVideo.preload = "auto";

  if (heroVideo.readyState === 0) {
    heroVideo.load();
  } else if (heroVideo.readyState >= 4) {
    heroVideoSeekReady = true;
    heroMedia.classList.add("has-scroll-video");
    heroVideoRenderedTime = Number.isFinite(heroVideo.currentTime) ? heroVideo.currentTime : 0;
    syncHeroVideo(getHeroProgress(), !wasActive);
  } else {
    heroVideo.load();
  }
}

function updateHeroMotion(currentScroll = window.scrollY) {
  if (!hero) {
    return;
  }

  const heroHeight = Math.max(hero.offsetHeight, 1);
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const isMobileCinematic = isHomePage && mobileHomeQuery.matches;
  const scrollRunway = isMobileCinematic
    ? Math.max(heroHeight - viewportHeight, 1)
    : heroHeight;
  const heroProgress = Math.min(1, Math.max(0, currentScroll / scrollRunway));
  const heroShift = Math.min(currentScroll, viewportHeight * 0.62);
  const copyProgress = isMobileCinematic
    ? progressBetween(heroProgress, 0.08, 0.43)
    : progressBetween(heroProgress, 0, 0.72);
  const glowProgress = isMobileCinematic
    ? Math.sin(Math.PI * progressBetween(heroProgress, 0.1, 0.88))
    : 0;
  const handoffProgress = isMobileCinematic
    ? progressBetween(heroProgress, 0.76, 1)
    : 0;
  const heroFade = 1 - copyProgress;

  hero.style.setProperty("--hero-shift", `${heroShift}px`);
  hero.style.setProperty("--hero-image-opacity", heroFade.toFixed(3));
  hero.style.setProperty("--hero-progress", heroProgress.toFixed(3));
  hero.style.setProperty("--hero-copy-progress", copyProgress.toFixed(3));
  hero.style.setProperty("--hero-glow-progress", glowProgress.toFixed(3));
  hero.style.setProperty("--hero-handoff-progress", handoffProgress.toFixed(3));
  mobileLibrary?.style.setProperty("--hero-handoff-progress", handoffProgress.toFixed(3));
  header?.classList.toggle(
    "is-cinematic-away",
    isMobileCinematic && heroProgress > 0.14 && heroProgress < 0.91
  );
  syncHeroVideo(heroProgress);
  syncHeaderSurface(currentScroll);
}

function syncHeaderSurface(currentScroll = window.scrollY) {
  if (!header || !hero) {
    return;
  }

  const headerTop = header.getBoundingClientRect().top;
  const heroBottom = hero.offsetTop + hero.offsetHeight;
  header.classList.toggle("is-over-content", currentScroll + headerTop > heroBottom - 16);
}

function easeInOutCubic(progress) {
  return progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
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

  const duration = Math.min(1700, Math.max(860, Math.abs(distance) * 0.72));
  const startedAt = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    window.scrollTo(0, start + distance * easeInOutCubic(progress));

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

  if (isHomePage && !mobileHomeQuery.matches) {
    grid.replaceChildren();
    return;
  }

  grid.innerHTML = getDailyStoryOrder()
    .map((story, index) => {
      const featureImage = index === 0 ? story.featureImage || story.image : "";
      const featureImageAlt = index === 0 ? story.featureImageAlt || story.imageAlt : "";
      const featureImagePosition = index === 0 ? safeImagePosition(story.featureImagePosition) : "";
      const safeImage = safeResourceUrl(featureImage);
      const imagePositionAttribute = featureImagePosition
        ? ` style="object-position: ${escapeAttribute(featureImagePosition)}"`
        : "";
      const imageLoading = isHomePage
        ? 'loading="lazy" decoding="async" fetchpriority="low"'
        : 'loading="eager" decoding="async" fetchpriority="high"';
      const image = safeImage
        ? `<img src="${escapeAttribute(safeImage)}" alt="${escapeAttribute(
            featureImageAlt
          )}"${imagePositionAttribute} ${imageLoading} />`
        : "";
      const imageClass = safeImage ? " image-card" : "";
      const featureClass = index === 0 ? " feature" : "";
      const revealClass = isHomePage ? " reveal is-visible" : " reveal";
      const shelf = storyShelf(story);
      const searchText = normalise(storySearchText(story));
      return `
        <a class="story-card${featureClass}${imageClass}${revealClass}" href="${safeStoryHref(
          story.id
        )}" data-story-id="${escapeAttribute(story.id)}" data-theme="${escapeAttribute(
          story.theme
        )}" data-story-shelf="${escapeAttribute(shelf)}" data-story-listen="${String(
          hasNarration(story)
        )}" data-story-anecdote="${String(isAnecdote(story))}" data-search="${escapeAttribute(
          searchText
        )}">
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

function renderFilters() {
  if (!filterList) {
    return;
  }

  const shelfCounts = new Map(shelves.map((shelf) => [filterKey(shelf.id), 0]));
  const listenCount = stories.filter(hasNarration).length;
  const anecdoteCount = stories.filter(isAnecdote).length;

  stories.forEach((story) => {
    const shelf = storyShelf(story);
    shelfCounts.set(shelf, (shelfCounts.get(shelf) ?? 0) + 1);
  });

  const shelfButtons = shelves
    .map((shelf) => {
      const id = filterKey(shelf.id);
      const count = shelfCounts.get(id) ?? 0;
      return `
        <button class="filter-shelf" type="button" data-shelf-filter="${escapeAttribute(
          id
        )}" aria-pressed="false">
          <span class="filter-shelf-copy">
            <strong>${escapeHtml(shelf.label)}</strong>
            <small>${escapeHtml(shelf.description)}</small>
          </span>
          <span class="filter-shelf-count" aria-label="${count} ${
            count === 1 ? "story" : "stories"
          }">${count}</span>
        </button>
      `;
    })
    .join("");

  filterList.innerHTML = `
    <div class="filter-toolbar" role="group" aria-label="Story formats and qualities">
      <button class="filter" type="button" data-filter-clear aria-pressed="true">All</button>
      <button class="filter filter-listen" type="button" data-format-filter="listen" aria-pressed="false">
        <span>Listen</span><span class="filter-count" aria-hidden="true">${listenCount}</span>
      </button>
      <button class="filter" type="button" data-format-filter="anecdotes" aria-pressed="false">
        <span>Anecdotes</span><span class="filter-count" aria-hidden="true">${anecdoteCount}</span>
      </button>
      <button class="filter filter-disclosure" type="button" data-filter-toggle aria-expanded="false" aria-controls="story-quality-filters">
        <span data-filter-label>Browse qualities</span><span class="filter-chevron" aria-hidden="true"></span>
      </button>
    </div>
    <section class="filter-panel" id="story-quality-filters" aria-label="Story qualities" hidden>
      <div class="filter-panel-heading">
        <div>
          <p class="filter-panel-kicker">Browse by quality</p>
          <p class="filter-panel-note">Choose one. Combine it with Listen or Anecdotes.</p>
        </div>
        <button class="filter-panel-close" type="button" data-filter-collapse aria-label="Close quality filters">Close</button>
      </div>
      <div class="filter-shelf-grid">${shelfButtons}</div>
    </section>
  `;
  syncFilterControls();
}

function expandFilterMenu() {
  if (!filterList) {
    return;
  }

  filtersExpanded = true;
  const panel = filterList.querySelector(".filter-panel");
  panel?.removeAttribute("hidden");
  window.requestAnimationFrame(() => panel?.classList.add("is-open"));
  syncFilterControls();
}

function collapseFilterMenu() {
  if (!filterList || !filtersExpanded) {
    return;
  }

  filtersExpanded = false;
  const panel = filterList.querySelector(".filter-panel");
  panel?.classList.remove("is-open");
  panel?.setAttribute("hidden", "");
  syncFilterControls();
}

function updateStories() {
  const cards = Array.from(document.querySelectorAll(".story-card[data-story-shelf]"));
  const cleanSearch = sanitiseSearchInput(searchInput?.value);
  const query = normalise(cleanSearch).trim();
  let visibleCount = 0;

  if (searchInput && searchInput.value !== cleanSearch) {
    searchInput.value = cleanSearch;
  }

  cards.forEach((card) => {
    const matchesShelf = !activeShelf || card.dataset.storyShelf === activeShelf;
    const matchesListen =
      !activeFormatFilters.has("listen") || card.dataset.storyListen === "true";
    const matchesAnecdotes =
      !activeFormatFilters.has("anecdotes") || card.dataset.storyAnecdote === "true";
    const matchesSearch = !query || (card.dataset.search ?? normalise(card.textContent)).includes(query);
    const isVisible = matchesShelf && matchesListen && matchesAnecdotes && matchesSearch;

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
  if (!filterList) {
    return;
  }

  const hasActiveFilters = Boolean(activeShelf || activeFormatFilters.size);
  const allFilter = filterList.querySelector("[data-filter-clear]");
  allFilter?.classList.toggle("is-active", !hasActiveFilters);
  allFilter?.setAttribute("aria-pressed", String(!hasActiveFilters));

  Array.from(filterList.querySelectorAll("[data-format-filter]")).forEach((item) => {
    const isActive = activeFormatFilters.has(item.dataset.formatFilter ?? "");
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  Array.from(filterList.querySelectorAll("[data-shelf-filter]")).forEach((item) => {
    const isActive = item.dataset.shelfFilter === activeShelf;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  const filterToggle = filterList.querySelector("[data-filter-toggle]");
  const selectedShelf = shelfById.get(activeShelf);
  filterToggle?.classList.toggle("has-active", Boolean(selectedShelf));
  filterToggle?.setAttribute("aria-expanded", String(filtersExpanded));
  const filterLabel = filterToggle?.querySelector("[data-filter-label]");

  if (filterLabel) {
    filterLabel.textContent = selectedShelf?.label ?? "Browse qualities";
  }
}

function initialiseLibraryState() {
  if (!filterList) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedShelf = filterKey(params.get("shelf"));

  if (shelfById.has(requestedShelf)) {
    activeShelf = requestedShelf;
  }

  if (params.get("listen") === "1") {
    activeFormatFilters.add("listen");
  }

  if (filterKey(params.get("collection")) === "anecdotes") {
    activeFormatFilters.add("anecdotes");
  }

  const initialSearch = sanitiseSearchInput(params.get("tag") ?? params.get("q"));

  if (searchInput && initialSearch) {
    searchInput.value = initialSearch;
  }
}

function syncLibraryUrl(searchChanged = false) {
  if (!filterList) {
    return;
  }

  const url = new URL(window.location.href);

  if (activeShelf) {
    url.searchParams.set("shelf", activeShelf);
  } else {
    url.searchParams.delete("shelf");
  }

  if (activeFormatFilters.has("listen")) {
    url.searchParams.set("listen", "1");
  } else {
    url.searchParams.delete("listen");
  }

  if (activeFormatFilters.has("anecdotes")) {
    url.searchParams.set("collection", "anecdotes");
  } else {
    url.searchParams.delete("collection");
  }

  const cleanSearch = sanitiseSearchInput(searchInput?.value);

  if (cleanSearch) {
    if (searchChanged || !url.searchParams.has("tag")) {
      url.searchParams.set("q", cleanSearch);
      url.searchParams.delete("tag");
    } else {
      url.searchParams.set("tag", cleanSearch);
      url.searchParams.delete("q");
    }
  } else {
    url.searchParams.delete("q");
    url.searchParams.delete("tag");
  }

  window.history.replaceState(window.history.state, "", url);
}

function observeReveals() {
  const revealTargets = Array.from(document.querySelectorAll(".reveal"));

  if (!("IntersectionObserver" in window)) {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

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

function initialiseFloatingGallery() {
  const gallery = document.querySelector("[data-floating-gallery]");

  if (!gallery) {
    return;
  }

  const floatingItems = Array.from(gallery.querySelectorAll("[data-float-depth]")).map((item) => ({
    item,
    depth: Number(item.dataset.floatDepth) || 0,
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0
  }));

  if (!floatingItems.length) {
    return;
  }

  let frame = null;

  function animate() {
    let needsNextFrame = false;

    floatingItems.forEach((float) => {
      float.currentX += (float.targetX - float.currentX) * 0.08;
      float.currentY += (float.targetY - float.currentY) * 0.08;

      if (Math.abs(float.currentX - float.targetX) > 0.1 || Math.abs(float.currentY - float.targetY) > 0.1) {
        needsNextFrame = true;
      }

      float.item.style.setProperty("--float-x", `${float.currentX.toFixed(2)}px`);
      float.item.style.setProperty("--float-y", `${float.currentY.toFixed(2)}px`);
    });

    frame = needsNextFrame ? window.requestAnimationFrame(animate) : null;
  }

  function setTargets(clientX, clientY) {
    const rect = gallery.getBoundingClientRect();
    const relativeX = (clientX - rect.left) / rect.width - 0.5;
    const relativeY = (clientY - rect.top) / rect.height - 0.5;

    floatingItems.forEach((float) => {
      const strength = float.depth * 26;
      float.targetX = relativeX * strength;
      float.targetY = relativeY * strength;
    });

    if (!frame) {
      frame = window.requestAnimationFrame(animate);
    }
  }

  function resetTargets() {
    floatingItems.forEach((float) => {
      float.targetX = 0;
      float.targetY = 0;
    });

    if (!frame) {
      frame = window.requestAnimationFrame(animate);
    }
  }

  gallery.addEventListener("pointermove", (event) => setTargets(event.clientX, event.clientY));
  gallery.addEventListener("pointerleave", resetTargets);
  gallery.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.touches[0];

      if (touch) {
        setTargets(touch.clientX, touch.clientY);
      }
    },
    { passive: true }
  );
  gallery.addEventListener("touchend", resetTargets, { passive: true });
}

function initialiseScrollBoard() {
  const board = document.querySelector("[data-scroll-board]");
  const cards = Array.from(document.querySelectorAll("[data-scroll-card]"));

  if (!board || !cards.length) {
    return;
  }

  let boardFrame = null;

  function updateCards() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const midpoint = rect.top + rect.height * 0.52;
      const progress = 1 - Math.min(1, Math.max(0, Math.abs(midpoint - viewportHeight * 0.52) / (viewportHeight * 0.62)));
      const stagger = Math.min(1, Math.max(0, progress + index * 0.04));

      card.style.setProperty("--card-progress", stagger.toFixed(3));
    });

    boardFrame = null;
  }

  function requestUpdate() {
    if (!boardFrame) {
      boardFrame = window.requestAnimationFrame(updateCards);
    }
  }

  updateCards();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
}

function initialiseHomeSectionScroll() {
  const sections = Array.from(document.querySelectorAll(".home-intro, .home-path, .home-close"));

  if (!sections.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    sections.forEach((section) => section.style.setProperty("--section-progress", "1"));
    return;
  }

  let sectionFrame = null;

  function updateSections() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const midpoint = rect.top + rect.height * 0.5;
      const distance = Math.abs(midpoint - viewportHeight * 0.52);
      const range = Math.max(viewportHeight * 0.72, rect.height * 0.72);
      const progress = 1 - Math.min(1, Math.max(0, distance / range));

      section.style.setProperty("--section-progress", progress.toFixed(3));
    });

    sectionFrame = null;
  }

  function requestUpdate() {
    if (!sectionFrame) {
      sectionFrame = window.requestAnimationFrame(updateSections);
    }
  }

  updateSections();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
}

filterList?.addEventListener("click", (event) => {
  const toggleControl = event.target.closest("[data-filter-toggle]");
  const clearControl = event.target.closest("[data-filter-clear]");
  const formatControl = event.target.closest("[data-format-filter]");
  const shelfControl = event.target.closest("[data-shelf-filter]");

  if (event.target.closest("[data-filter-collapse]")) {
    event.preventDefault();
    collapseFilterMenu();
    return;
  }

  if (toggleControl) {
    event.preventDefault();
    if (filtersExpanded) {
      collapseFilterMenu();
    } else {
      expandFilterMenu();
    }
    return;
  }

  if (clearControl) {
    activeShelf = "";
    activeFormatFilters.clear();
  } else if (formatControl) {
    const format = formatControl.dataset.formatFilter ?? "";

    if (activeFormatFilters.has(format)) {
      activeFormatFilters.delete(format);
    } else {
      activeFormatFilters.add(format);
    }
  } else if (shelfControl) {
    const shelf = shelfControl.dataset.shelfFilter ?? "";
    activeShelf = activeShelf === shelf ? "" : shelf;
  } else {
    return;
  }

  syncFilterControls();
  updateStories();
  syncLibraryUrl();
});

filterList?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !filtersExpanded) {
    return;
  }

  event.preventDefault();
  collapseFilterMenu();
  filterList.querySelector("[data-filter-toggle]")?.focus();
});

searchInput?.addEventListener("input", () => {
  searchInput.value = sanitiseSearchInput(searchInput.value);
  updateStories();
  syncLibraryUrl(true);
});

if (heroVideo) {
  heroVideo.addEventListener("loadedmetadata", () => {
    heroVideoDuration = Number.isFinite(heroVideo.duration) ? heroVideo.duration : 0;

    if (heroVideoActive && heroVideoDuration) {
      heroVideoSeekReady = true;
      heroVideoRenderedTime = Number.isFinite(heroVideo.currentTime) ? heroVideo.currentTime : 0;
      syncHeroVideo(getHeroProgress(), true);
    }
  });

  heroVideo.addEventListener("loadeddata", () => {
    if (!heroVideoActive) {
      return;
    }

    heroVideoSeekReady = true;
    heroMedia?.classList.add("has-scroll-video");
    heroVideoRenderedTime = Number.isFinite(heroVideo.currentTime) ? heroVideo.currentTime : 0;
    heroVideoTargetTime = heroVideoRenderedTime;
    lastHeroVideoTime = heroVideoRenderedTime;
    syncHeroVideo(getHeroProgress(), true);
  });

  const markHeroVideoReady = () => {
    if (!heroVideoActive) {
      return;
    }

    const wasReady = heroVideoSeekReady;
    heroVideoSeekReady = true;
    heroMedia?.classList.add("has-scroll-video");
    heroVideoRenderedTime = Number.isFinite(heroVideo.currentTime) ? heroVideo.currentTime : 0;
    syncHeroVideo(getHeroProgress(), !wasReady);
  };

  heroVideo.addEventListener("canplaythrough", markHeroVideoReady);
  heroVideo.addEventListener("progress", () => {
    if (!heroVideoDuration || !heroVideo.buffered.length) {
      return;
    }

    const bufferedEnd = heroVideo.buffered.end(heroVideo.buffered.length - 1);

    if (bufferedEnd >= heroVideoDuration - 0.12) {
      markHeroVideoReady();
    }
  });

  heroVideo.addEventListener("seeked", () => {
    if (heroVideoActive) {
      heroMedia?.classList.add("has-scroll-video");
    }
  });

  heroVideo.addEventListener("error", () => {
    heroVideoActive = false;
    heroVideoSeekReady = false;
    heroMedia?.classList.remove("has-scroll-video");
  });
}

mobileHomeQuery.addEventListener?.("change", () => {
  if (!isHomePage) {
    return;
  }

  renderStories();
  applyImageFallbacks();
  updateStories();
  setHeroVideoMode();
  updateHeroMotion();
});

reducedMotionQuery.addEventListener?.("change", () => {
  setHeroVideoMode();
  updateHeroMotion();
});

themeToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme === "dark";
    const nextTheme = isDark ? "light" : "dark";
    localStorage.setItem("claraTheme", nextTheme);
    applyTheme(nextTheme);
    toggle.closest("details")?.removeAttribute("open");
  });
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
  link.closest("details")?.removeAttribute("open");
  header?.classList.remove("is-hidden");
  window.setTimeout(scrollToStories, 120);
});

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        const scrollDelta = currentScroll - lastScroll;
        const isSameDirection =
          (scrollDelta > 0 && scrollDirectionDistance >= 0) ||
          (scrollDelta < 0 && scrollDirectionDistance <= 0);
        scrollDirectionDistance = isSameDirection
          ? scrollDirectionDistance + scrollDelta
          : scrollDelta;

        const isMobileCinematic = isHomePage && mobileHomeQuery.matches;

        if (isMobileCinematic) {
          header?.classList.remove("is-hidden");
          scrollDirectionDistance = 0;
        } else if (programmaticScroll) {
          header?.classList.remove("is-hidden");
          scrollDirectionDistance = 0;
        } else if (currentScroll < 80) {
          header?.classList.remove("is-hidden");
          scrollDirectionDistance = 0;
        } else if (scrollDirectionDistance > 72 && currentScroll > 220) {
          header?.classList.add("is-hidden");
          scrollDirectionDistance = 0;
        } else if (scrollDirectionDistance < -32) {
          header?.classList.remove("is-hidden");
          scrollDirectionDistance = 0;
        }

        updateHeroMotion(currentScroll);
        lastScroll = Math.max(currentScroll, 0);
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true }
);

window.addEventListener(
  "resize",
  () => {
    setHeroVideoMode();
    updateHeroMotion();
  },
  { passive: true }
);

initialiseTheme();
initialiseLibraryState();
renderStories();
applyImageFallbacks();
renderFilters();
observeReveals();
initialiseFloatingGallery();
initialiseScrollBoard();
initialiseHomeSectionScroll();
applyBahaiDate();
setHeroVideoMode();
updateHeroMotion();
updateStories();

if (window.location.hash === "#stories") {
  window.requestAnimationFrame(() => {
    jumpToStories();
    window.setTimeout(jumpToStories, 140);
  });
}
