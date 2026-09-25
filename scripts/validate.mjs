import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataPath = join(root, "data", "what-to-say.json");
const data = JSON.parse(await readFile(dataPath, "utf8"));
const sourceDirectory = join(root, "src");
const outputDirectory = join(root, "dist");

const expectedCategories = [
  ["Graph transformations", 27],
  ["Absolute value", 9],
  ["Trigonometric equations", 2],
  ["Sequence and function limits", 6],
  ["Derivatives", 41],
  ["Integrals", 4],
  ["Matrix equations", 2],
  ["Cramer's rule", 2],
  ["Gaussian elimination", 1],
  ["Eigenvalues and eigenvectors", 2],
  ["Distance between a point and a plane", 1],
  ["Series", 13],
];

const failures = [];
const warnings = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(data.schemaVersion === 1, "schemaVersion must be 1.");
assert(data.source.linkedPdfsRead === false, "The dataset must record that PDFs were not read.");
assert(data.categories.length === expectedCategories.length, "Expected 12 categories.");
assert(data.extraction.pdfLinkCount === 67, "Expected 67 PDF links.");
assert(data.extraction.itemCount === 110, "Expected 110 formula items.");

const ids = new Set();
const globalOrders = [];
let renderedFormulaCount = 0;
let normalizationCount = 0;

for (const [index, category] of data.categories.entries()) {
  const [expectedTitle, expectedCount] = expectedCategories[index] ?? [];
  assert(category.title === expectedTitle, `Category ${index + 1} has an unexpected title.`);
  assert(category.sourceOrder === index + 1, `${category.title} has an unexpected source order.`);
  assert(
    category.items.length === expectedCount,
    `${category.title} should contain ${expectedCount} items.`,
  );

  if (
    category.declaredItemCount !== null
    && category.declaredItemCount !== category.items.length
  ) {
    warnings.push(
      `${category.sourceTitle} declares ${category.declaredItemCount} example but splits into ${category.items.length} independent systems.`,
    );
  }

  for (const [itemIndex, item] of category.items.entries()) {
    assert(!ids.has(item.id), `Duplicate item id: ${item.id}`);
    ids.add(item.id);
    globalOrders.push(item.globalOrder);
    assert(item.categoryOrder === itemIndex + 1, `${item.id} has an unexpected category order.`);
    assert(
      typeof item.reading === "string" && item.reading.trim().length > 0,
      `${item.id} should have a suggested reading.`,
    );
    assert(Boolean(item.sourceFormula), `${item.id} has no source formula.`);
    assert(Boolean(item.displayFormula), `${item.id} has no display formula.`);
    assert(item.pdfUrl.startsWith("https://pg.edu.pl/"), `${item.id} has an unexpected PDF URL.`);
    normalizationCount += item.normalizationNotes.length;

    try {
      katex.renderToString(item.displayFormula, {
        displayMode: true,
        throwOnError: true,
        strict: "warn",
        trust: false,
        output: "htmlAndMathml",
      });
      renderedFormulaCount += 1;
    } catch (error) {
      failures.push(`${item.id} does not render with KaTeX: ${error.message}`);
    }
  }
}

assert(
  globalOrders.every((order, index) => order === index + 1),
  "Global formula order is not continuous.",
);
assert(renderedFormulaCount === 110, "Not all 110 formulas rendered successfully.");

const uiFiles = await Promise.all(
  ["index.html", "app.js", "styles.css"].map((filename) =>
    readFile(join(sourceDirectory, filename), "utf8")
  ),
);
const japaneseCharacters = /[\u3040-\u30ff\u3400-\u9fff]/u;
for (const [index, text] of uiFiles.entries()) {
  assert(!japaneseCharacters.test(text), `UI source file ${index + 1} contains Japanese text.`);
}
assert(uiFiles[0].includes('lang="en"'), "The document language must be English.");
assert(uiFiles[0].includes('rel="manifest"'), "The document must link to the web manifest.");
assert(uiFiles[1].includes("Show reading"), "The item control must say Show reading.");
assert(uiFiles[1].includes("Hide all"), "Each category must include a Hide all control.");
assert(
  uiFiles[1].includes("navigator.serviceWorker"),
  "The application must register its service worker.",
);

const manifest = JSON.parse(
  await readFile(join(sourceDirectory, "manifest.webmanifest"), "utf8"),
);
assert(manifest.start_url === "./", "The manifest start URL must support subpath hosting.");
assert(manifest.scope === "./", "The manifest scope must support subpath hosting.");
assert(manifest.display === "standalone", "The PWA must use standalone display mode.");
assert(
  manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"),
  "The manifest must include a 512px maskable icon.",
);
assert(
  manifest.icons.every((icon) => icon.src.startsWith("./")),
  "Manifest icon URLs must be relative for subpath hosting.",
);

const builtServiceWorker = await readFile(
  join(outputDirectory, "service-worker.js"),
  "utf8",
);
assert(
  !builtServiceWorker.includes("__CACHE_VERSION__")
    && !builtServiceWorker.includes("__PRECACHE_PATHS__"),
  "The built service worker still contains build placeholders.",
);
const precacheMatch = builtServiceWorker.match(
  /const PRECACHE_PATHS = (\[[\s\S]*?\]);\nconst CACHE_NAMESPACE/,
);
assert(precacheMatch, "The built service worker has no readable precache list.");

if (precacheMatch) {
  const precachePaths = JSON.parse(precacheMatch[1]);
  const requiredPaths = [
    "index.html",
    "app.js",
    "styles.css",
    "manifest.webmanifest",
    "service-worker.js",
    "data/what-to-say.json",
    "vendor/katex.mjs",
    "vendor/katex.min.css",
    "icons/icon-180.png",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-512.png",
  ];
  const fontNames = await readdir(join(outputDirectory, "vendor", "fonts"));
  const fontPaths = fontNames.map((name) => `vendor/fonts/${name}`);

  for (const path of [...requiredPaths, ...fontPaths]) {
    assert(precachePaths.includes(path), `${path} must be precached.`);
  }
  assert(
    precachePaths.every((path) => !path.startsWith("/")),
    "Precache paths must be relative for subpath hosting.",
  );
  assert(
    precachePaths.every((path) => !path.startsWith("audio/")),
    "Unused local audio files must not be precached.",
  );

  await Promise.all(
    precachePaths.map(async (path) => {
      try {
        await readFile(join(outputDirectory, path));
      } catch {
        failures.push(`Precached file is missing: ${path}`);
      }
    }),
  );
}

if (warnings.length) {
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`Failure: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${data.categories.length} categories, ${data.extraction.pdfLinkCount} PDF links, `
      + `${renderedFormulaCount} rendered formulas, ${normalizationCount} display normalizations, `
      + "and the complete PWA precache.",
  );
}
