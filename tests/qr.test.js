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

test("a aplicação não contém dados pessoais nem mecanismos de envio", () => {
  const publicText = ["README.md", "index.html", "app.js", "gerar_qr.py"]
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");

  assert.doesNotMatch(publicText, /forms\.gle/i);

  const application = ["index.html", "app.js"]
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
