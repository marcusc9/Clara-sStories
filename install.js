const INSTALL_STORAGE_KEY = "claraAppInstalled";
let deferredInstallPrompt = null;
let navMenuScrollY = window.scrollY;

function logInstall(message, detail) {
  console.debug(`[Clara install] ${message}`, detail ?? "");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch((error) => {
      logInstall("service worker registration failed", error);
    });
  });
}

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

function isSafari() {
  return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(window.navigator.userAgent);
}

function isIosSafari() {
  return isIosDevice() && isSafari();
}

function installButtons() {
  return Array.from(document.querySelectorAll("[data-install-app]"));
}

function setInstallVisible(isVisible) {
  document.documentElement.classList.toggle("show-install-action", isVisible);
}

function closeOpenMenu(button) {
  button.closest("details")?.removeAttribute("open");
}

function navMenus() {
  return Array.from(document.querySelectorAll(".nav-menu"));
}

function syncMenuState() {
  document.body.classList.toggle(
    "nav-menu-is-open",
    navMenus().some((menu) => menu.open)
  );
}

function closeNavMenus() {
  navMenus().forEach((menu) => {
    menu.removeAttribute("open");
  });
  syncMenuState();
}

function initialiseNavMenus() {
  navMenus().forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (menu.open) {
        navMenuScrollY = window.scrollY;
        navMenus().forEach((otherMenu) => {
          if (otherMenu !== menu) {
            otherMenu.removeAttribute("open");
          }
        });
      }

      syncMenuState();
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        menu.removeAttribute("open");
        syncMenuState();
      }
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!document.body.classList.contains("nav-menu-is-open")) {
      return;
    }

    if (!event.target.closest(".nav-menu")) {
      closeNavMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNavMenus();
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (document.body.classList.contains("nav-menu-is-open") && Math.abs(window.scrollY - navMenuScrollY) > 12) {
        closeNavMenus();
      }
    },
    { passive: true }
  );
}

function syncInstallVisibility() {
  const isStandalone = isStandaloneApp();
  const isMarkedInstalled = localStorage.getItem(INSTALL_STORAGE_KEY) === "true";
  const canShowIOSInstructions = isIosSafari() && !isStandalone && !isMarkedInstalled;
  const canShowNativePrompt = Boolean(deferredInstallPrompt) && !isStandalone && !isMarkedInstalled;

  if (isStandalone) {
    localStorage.setItem(INSTALL_STORAGE_KEY, "true");
  }

  logInstall("standalone detection result", {
    isStandalone,
    isMarkedInstalled,
    isIosSafari: isIosSafari(),
    hasNativePrompt: Boolean(deferredInstallPrompt)
  });

  setInstallVisible(canShowNativePrompt || canShowIOSInstructions);
}

function createInstallModal() {
  let modal = document.querySelector("[data-ios-install-modal]");

  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.className = "ios-install-modal";
  modal.hidden = true;
  modal.dataset.iosInstallModal = "";
  modal.innerHTML = `
    <section class="ios-install-card" role="dialog" aria-modal="true" aria-labelledby="ios-install-title">
      <button class="ios-install-close" type="button" data-ios-install-close aria-label="Close install instructions"></button>
      <p class="kicker">Home Screen</p>
      <h2 id="ios-install-title">Add Clara's Stories</h2>
      <p class="ios-install-intro">Open Clara's Stories from your Home Screen as a quiet full-screen reader.</p>
      <ol class="ios-install-steps">
        <li><span aria-hidden="true">1</span><p>Tap the Safari Share button.</p></li>
        <li><span aria-hidden="true">2</span><p>Scroll down and tap "Add to Home Screen".</p></li>
        <li><span aria-hidden="true">3</span><p>If shown, enable "Open as Web App".</p></li>
        <li><span aria-hidden="true">4</span><p>Tap "Add".</p></li>
      </ol>
      <button class="button primary ios-install-done" type="button" data-ios-install-close>Got it</button>
    </section>
  `;
  document.body.append(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-ios-install-close]")) {
      hideIosInstallModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!modal.hidden && event.key === "Escape") {
      hideIosInstallModal();
    }
  });

  return modal;
}

function showIosInstallModal() {
  const modal = createInstallModal();
  modal.hidden = false;
  window.requestAnimationFrame(() => modal.classList.add("is-visible"));
  modal.querySelector("[data-ios-install-close]")?.focus();
}

function hideIosInstallModal() {
  const modal = document.querySelector("[data-ios-install-modal]");

  if (!modal) {
    return;
  }

  modal.classList.remove("is-visible");
  window.setTimeout(() => {
    modal.hidden = true;
  }, 180);
}

async function promptNativeInstall() {
  if (!deferredInstallPrompt) {
    return;
  }

  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  syncInstallVisibility();

  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    logInstall(`install ${choice.outcome}`, choice);
  } catch (error) {
    logInstall("native install prompt failed", error);
  }

  syncInstallVisibility();
}

function handleInstallClick(event) {
  const button = event.currentTarget;
  closeOpenMenu(button);

  if (isStandaloneApp() || localStorage.getItem(INSTALL_STORAGE_KEY) === "true") {
    syncInstallVisibility();
    return;
  }

  if (isIosSafari()) {
    showIosInstallModal();
    return;
  }

  if (deferredInstallPrompt) {
    promptNativeInstall();
  }
}

function initialiseInstallFlow() {
  registerServiceWorker();
  initialiseNavMenus();
  installButtons().forEach((button) => {
    button.addEventListener("click", handleInstallClick);
  });
  syncInstallVisibility();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();

  if (isIosSafari()) {
    logInstall("beforeinstallprompt ignored for iOS Safari");
    syncInstallVisibility();
    return;
  }

  deferredInstallPrompt = event;
  logInstall("beforeinstallprompt fired");
  syncInstallVisibility();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  localStorage.setItem(INSTALL_STORAGE_KEY, "true");
  logInstall("appinstalled fired");
  syncInstallVisibility();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialiseInstallFlow, { once: true });
} else {
  initialiseInstallFlow();
}
