const header = document.querySelector("[data-header]");
const themeToggles = document.querySelectorAll("[data-theme-toggle]");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const aboutHero = document.querySelector("[data-about-hero]");
const navMenus = document.querySelectorAll(".nav-menu");

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";

  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", isDark ? "#09131a" : "#fbf6e8");
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

themeToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme === "dark";
    const nextTheme = isDark ? "light" : "dark";
    localStorage.setItem("claraTheme", nextTheme);
    applyTheme(nextTheme);
    toggle.closest("details")?.removeAttribute("open");
  });
});

navMenus.forEach((menu) => {
  menu.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (link) {
      menu.removeAttribute("open");
    }
  });
});

window.addEventListener(
  "scroll",
  () => {
    const currentScroll = window.scrollY;
    if (header) {
      header.classList.toggle(
        "is-hidden",
        currentScroll > 120 && currentScroll > (Number(header.dataset.lastScroll) || 0)
      );
      header.dataset.lastScroll = String(Math.max(currentScroll, 0));
    }
    aboutHero?.style.setProperty("--about-shift", `${Math.min(currentScroll, 520)}px`);
  },
  { passive: true }
);

initialiseTheme();
observeReveals();
