const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const localizedPages = [
  { file: "index.html", language: "pt", locale: "pt-BR", url: "https://roqem.github.io/qr-livre/" },
  { file: "en/index.html", language: "en", locale: "en", url: "https://roqem.github.io/qr-livre/en/" },
  { file: "es/index.html", language: "es", locale: "es", url: "https://roqem.github.io/qr-livre/es/" },
  { file: "fr/index.html", language: "fr", locale: "fr", url: "https://roqem.github.io/qr-livre/fr/" }
];

function loadBrowserLibrary() {
  const context = vm.createContext({});
  for (const file of ["vendor/qrcode.js", "vendor/qrcode_UTF8.js"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }
  return context.qrcode;
}

function loadTranslations() {
  const context = vm.createContext({});
  const source = fs.readFileSync(path.join(root, "i18n.js"), "utf8");
  vm.runInContext(source, context, { filename: "i18n.js" });
  return context.QR_LIVRE_I18N;
}

test("gera matrizes válidas nos quatro níveis de correção", () => {
  const qrcode = loadBrowserLibrary();

  for (const level of ["L", "M", "Q", "H"]) {
    const qr = qrcode(0, level);
    qr.addData("https://example.com", "Byte");
    qr.make();

    const count = qr.getModuleCount();
    assert.ok(count >= 21 && count <= 177);
    assert.equal(count % 4, 1);
    assert.equal(typeof qr.isDark(0, 0), "boolean");
  }
});

test("codifica texto Unicode como UTF-8", () => {
  const qrcode = loadBrowserLibrary();
  const text = "Olá, mundo! 🌎";
  const expected = [...Buffer.from(text, "utf8")];

  assert.deepEqual([...qrcode.stringToBytes(text)], expected);

  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  assert.doesNotThrow(() => qr.make());
});

test("mantém PT, EN, ES e FR completos e com as mesmas chaves", () => {
  const { supportedLanguages, localeTags, translations } = loadTranslations();
  assert.deepEqual([...supportedLanguages], ["pt", "en", "es", "fr"]);

  const referenceKeys = Object.keys(translations.pt).sort();
  for (const language of supportedLanguages) {
    assert.ok(localeTags[language]);
    assert.deepEqual(Object.keys(translations[language]).sort(), referenceKeys);
    for (const value of Object.values(translations[language])) {
      assert.equal(typeof value, "string");
      assert.ok(value.trim().length > 0);
    }
  }
});

test("as interfaces localizadas só referenciam traduções existentes", () => {
  const { translations } = loadTranslations();
  for (const page of localizedPages) {
    const html = fs.readFileSync(path.join(root, page.file), "utf8");
    const referencedKeys = [
      ...html.matchAll(/data-i18n(?:-aria-label|-title)?="([^"]+)"/g)
    ].map((match) => match[1]);

    assert.equal((html.match(/class="language-button"/g) ?? []).length, 4);
    assert.equal((html.match(/class="theme-button"/g) ?? []).length, 3);
    assert.match(html, new RegExp(`<html lang="${page.locale}" data-language="${page.language}"`));
    for (const key of referencedKeys) {
      assert.ok(translations[page.language][key], `${page.file}: tradução ausente: ${key}`);
    }
  }
});

test("cada idioma possui URL canônica e alternates hreflang completos", () => {
  const alternateUrls = localizedPages.map((page) => page.url);

  for (const page of localizedPages) {
    const html = fs.readFileSync(path.join(root, page.file), "utf8");
    assert.match(html, new RegExp(`<link rel="canonical" href="${page.url}">`));
    assert.match(html, /<title>[^<]*QR Livre<\/title>/);
    assert.match(html, /<meta id="meta-description" name="description" content="[^"]{80,}">/);
    assert.equal((html.match(/rel="alternate" hreflang=/g) ?? []).length, 5);
    for (const url of alternateUrls) {
      assert.match(html, new RegExp(`rel="alternate" hreflang="[^"]+" href="${url}"`));
    }
    assert.match(html, /rel="alternate" hreflang="x-default"/);
  }
});

test("páginas usam fingerprints atuais para impedir cache incompatível", () => {
  const sharedAssets = ["app.js", "i18n.js", "styles.css", "theme-init.js"];

  for (const asset of sharedAssets) {
    const contents = fs.readFileSync(path.join(root, asset));
    const fingerprint = crypto.createHash("sha256").update(contents).digest("hex").slice(0, 12);
    const expectedReference = `${asset}?v=${fingerprint}`;

    for (const page of localizedPages) {
      const html = fs.readFileSync(path.join(root, page.file), "utf8");
      assert.ok(
        html.includes(expectedReference),
        `${page.file}: atualize o fingerprint de ${asset} para ${fingerprint}`
      );
    }
  }
});

test("sitemap e robots publicam todas as versões localizadas", () => {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");

  assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.equal((sitemap.match(/<url>/g) ?? []).length, localizedPages.length);
  assert.equal((sitemap.match(/hreflang="x-default"/g) ?? []).length, localizedPages.length);
  for (const page of localizedPages) {
    assert.match(sitemap, new RegExp(`<loc>${page.url}<\\/loc>`));
  }
  assert.match(robots, /Sitemap: https:\/\/roqem\.github\.io\/qr-livre\/sitemap\.xml/);
});

test("a aplicação não contém dados pessoais nem mecanismos de envio", () => {
  const publicText = ["README.md", "index.html", "i18n.js", "app.js", "gerar_qr.py"]
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");

  assert.doesNotMatch(publicText, /forms\.gle/i);

  const application = [
    ...localizedPages.map((page) => page.file),
    "i18n.js",
    "theme-init.js",
    "app.js"
  ]
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");

  const forbidden = [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /sendBeacon/,
    /WebSocket/,
    /document\.cookie/,
    /localStorage/,
    /sessionStorage/
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(application, pattern);
  }

  assert.match(application, /connect-src 'none'/);
});
