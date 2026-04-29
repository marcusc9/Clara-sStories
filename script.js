if (window.location.hash === "#stories") {
  history.scrollRestoration = "manual";
  history.replaceState(null, "", window.location.href.split("#")[0]);
  window.scrollTo(0, 0);
  window.requestAnimationFrame(() => window.scrollTo(0, 0));
  window.addEventListener("load", () => window.scrollTo(0, 0), { once: true });
}

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

let activeFilter = "all";
let lastScroll = 0;
let ticking = false;
let programmaticScroll = false;
let scrollAnimationFrame = null;

function normalise(value) {
  return String(value ?? "").toLowerCase();
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

function renderStories() {
  if (!grid) {
    return;
  }

  grid.innerHTML = getDailyStoryOrder()
    .map((story, index) => {
      const featureImage = index === 0 ? story.featureImage || story.image : "";
      const featureImageAlt = index === 0 ? story.featureImageAlt || story.imageAlt : "";
      const image = featureImage
        ? `<img src="${featureImage}" alt="${featureImageAlt}" loading="eager" decoding="async" fetchpriority="high" />`
        : "";
      const imageClass = featureImage ? " image-card" : "";
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
  const cards = Array.from(document.querySelectorAll(".story-card[data-theme]"));
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
