/* global qrcode, QR_LIVRE_I18N */
(() => {
  "use strict";

  const { supportedLanguages, localeTags, translations } = QR_LIVRE_I18N;
  const form = document.querySelector("#qr-form");
  const contentInput = document.querySelector("#content");
  const correctionInput = document.querySelector("#correction");
  const sizeInput = document.querySelector("#size");
  const canvas = document.querySelector("#qr-canvas");
  const placeholder = document.querySelector("#placeholder");
  const errorBox = document.querySelector("#error");
  const pngButton = document.querySelector("#download-png");
  const svgButton = document.querySelector("#download-svg");
  const details = document.querySelector("#details");
  const encodedValue = document.querySelector("#encoded-value");
  const metaDescription = document.querySelector("#meta-description");
  const themeColor = document.querySelector("#theme-color");
  const languageButtons = document.querySelectorAll(".language-button");
  const themeButtons = document.querySelectorAll(".theme-button");
  const systemDarkTheme = window.matchMedia("(prefers-color-scheme: dark)");

  const QUIET_ZONE_MODULES = 4;
  const THEMES = ["auto", "light", "dark"];
  let currentQr = null;
  let currentLanguage = "pt";
  let currentTheme = "auto";

  function translate(key) {
    return translations[currentLanguage][key] ?? translations.pt[key] ?? key;
  }

  function getPageLanguage() {
    const pageLanguage = document.documentElement.dataset.language
      ?? document.documentElement.lang.toLowerCase().split("-")[0];
    return supportedLanguages.includes(pageLanguage) ? pageLanguage : "pt";
  }

  function setLanguage(language) {
    if (!supportedLanguages.includes(language)) return;
    currentLanguage = language;
    document.documentElement.lang = localeTags[language];
    document.title = translate("documentTitle");
    metaDescription.content = translate("metaDescription");

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = translate(element.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", translate(element.dataset.i18nAriaLabel));
    });

    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      element.setAttribute("title", translate(element.dataset.i18nTitle));
    });

    languageButtons.forEach((button) => {
      if (button.dataset.language === language) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    clearError();
  }

  function updateThemeColor() {
    if (!themeColor) return;
    const isDark = currentTheme === "dark"
      || (currentTheme === "auto" && systemDarkTheme.matches);
    themeColor.content = isDark ? "#101522" : "#f2f5f9";
  }

  function updateLanguageLinks() {
    languageButtons.forEach((button) => {
      const url = new URL(button.href);
      if (currentTheme === "auto") {
        url.searchParams.delete("theme");
      } else {
        url.searchParams.set("theme", currentTheme);
      }
      button.href = url.href;
    });
  }

  function setTheme(theme, updateUrl = false) {
    if (!THEMES.includes(theme)) return;
    currentTheme = theme;
    document.documentElement.dataset.theme = theme;

    themeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.theme === theme));
    });

    updateThemeColor();
    updateLanguageLinks();

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (theme === "auto") {
        url.searchParams.delete("theme");
      } else {
        url.searchParams.set("theme", theme);
      }
      window.history.replaceState({}, "", url);
    }
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function resetResult() {
    currentQr = null;
    canvas.hidden = true;
    placeholder.hidden = false;
    details.hidden = true;
    encodedValue.textContent = "";
    pngButton.disabled = true;
    svgButton.disabled = true;
  }

  function createQr(text, correctionLevel) {
    const qr = qrcode(0, correctionLevel);
    qr.addData(text, "Byte");
    qr.make();
    return qr;
  }

  function renderPng(qr, requestedSize) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error(translate("errorCanvas"));

    const moduleCount = qr.getModuleCount();
    const minimumModules = moduleCount + QUIET_ZONE_MODULES * 2;
    const moduleSize = Math.max(1, Math.floor(requestedSize / minimumModules));
    const qrPixelSize = moduleCount * moduleSize;
    const offset = Math.floor((requestedSize - qrPixelSize) / 2);

    canvas.width = requestedSize;
    canvas.height = requestedSize;
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, requestedSize, requestedSize);
    context.fillStyle = "#000000";

    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        if (!qr.isDark(row, col)) continue;
        context.fillRect(
          offset + col * moduleSize,
          offset + row * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }

  function buildSvg(qr) {
    const moduleCount = qr.getModuleCount();
    const totalSize = moduleCount + QUIET_ZONE_MODULES * 2;
    const pathParts = [];

    for (let row = 0; row < moduleCount; row += 1) {
      let col = 0;
      while (col < moduleCount) {
        if (!qr.isDark(row, col)) {
          col += 1;
          continue;
        }

        const start = col;
        while (col < moduleCount && qr.isDark(row, col)) col += 1;
        const runLength = col - start;
        const x = start + QUIET_ZONE_MODULES;
        const y = row + QUIET_ZONE_MODULES;
        pathParts.push(`M${x} ${y}h${runLength}v1h-${runLength}z`);
      }
    }

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">`,
      `<title>${translate("svgTitle")}</title>`,
      `<rect width="${totalSize}" height="${totalSize}" fill="#fff"/>`,
      `<path d="${pathParts.join("")}" fill="#000"/>`,
      "</svg>"
    ].join("");
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function generate() {
    clearError();
    resetResult();
    const text = contentInput.value;

    if (!text.trim()) {
      showError(translate("errorEmpty"));
      return;
    }

    try {
      currentQr = createQr(text, correctionInput.value);
      renderPng(currentQr, Number(sizeInput.value));

      placeholder.hidden = true;
      canvas.hidden = false;
      details.hidden = false;
      encodedValue.textContent = text;
      pngButton.disabled = false;
      svgButton.disabled = false;
    } catch (error) {
      resetResult();
      const message = error instanceof Error ? error.message : String(error);
      showError(`${translate("errorGenerate")} ${message}`);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    generate();
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.theme, true));
  });

  systemDarkTheme.addEventListener("change", updateThemeColor);

  contentInput.addEventListener("input", () => {
    clearError();
    resetResult();
  });

  correctionInput.addEventListener("change", () => {
    clearError();
    resetResult();
  });

  sizeInput.addEventListener("change", () => {
    if (currentQr) renderPng(currentQr, Number(sizeInput.value));
  });

  pngButton.addEventListener("click", () => {
    if (!currentQr) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        showError(translate("errorPng"));
        return;
      }
      downloadBlob(blob, "qr-livre.png");
    }, "image/png");
  });

  svgButton.addEventListener("click", () => {
    if (!currentQr) return;
    const svg = buildSvg(currentQr);
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "qr-livre.svg");
  });

  setLanguage(getPageLanguage());
  const requestedTheme = new URLSearchParams(window.location.search).get("theme");
  setTheme(THEMES.includes(requestedTheme) ? requestedTheme : "auto");
  resetResult();
})();
