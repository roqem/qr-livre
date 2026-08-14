const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

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

test("a interface só referencia traduções existentes", () => {
  const { translations } = loadTranslations();
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const referencedKeys = [
    ...html.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g)
  ].map((match) => match[1]);

  assert.equal((html.match(/class="language-button"/g) ?? []).length, 4);
  for (const key of referencedKeys) {
    assert.ok(translations.pt[key], `tradução ausente: ${key}`);
  }
});

test("a aplicação não contém dados pessoais nem mecanismos de envio", () => {
  const publicText = ["README.md", "index.html", "i18n.js", "app.js", "gerar_qr.py"]
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");

  assert.doesNotMatch(publicText, /forms\.gle/i);

  const application = ["index.html", "i18n.js", "app.js"]
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
