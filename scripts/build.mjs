import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = join(root, "src");
const outputDirectory = join(root, "dist");
const vendorDirectory = join(outputDirectory, "vendor");
const dataDirectory = join(outputDirectory, "data");
const iconDirectory = join(outputDirectory, "icons");
const fontDirectory = join(vendorDirectory, "fonts");
const katexDirectory = join(root, "node_modules", "katex", "dist");

await rm(iconDirectory, { recursive: true, force: true });
await rm(fontDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await mkdir(vendorDirectory, { recursive: true });
await mkdir(dataDirectory, { recursive: true });
await mkdir(iconDirectory, { recursive: true });

for (const filename of ["index.html", "app.js", "styles.css", "manifest.webmanifest"]) {
  await copyFile(join(sourceDirectory, filename), join(outputDirectory, filename));
}

await cp(join(sourceDirectory, "icons"), iconDirectory, {
  recursive: true,
  force: true,
});

await copyFile(
  join(root, "data", "what-to-say.json"),
  join(dataDirectory, "what-to-say.json"),
);
await copyFile(join(katexDirectory, "katex.mjs"), join(vendorDirectory, "katex.mjs"));
await copyFile(
  join(katexDirectory, "katex.min.css"),
  join(vendorDirectory, "katex.min.css"),
);
await cp(join(katexDirectory, "fonts"), fontDirectory, {
  recursive: true,
  force: true,
});

async function listFiles(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...await listFiles(path));
    } else if (entry.isFile()) {
      paths.push(path);
    }
  }
  return paths;
}

const fixedPrecachePaths = [
  "index.html",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "data/what-to-say.json",
  "vendor/katex.mjs",
  "vendor/katex.min.css",
];
const generatedAssetPaths = [
  ...await listFiles(iconDirectory),
  ...await listFiles(fontDirectory),
].map((path) => relative(outputDirectory, path).split(sep).join("/"));
const precachePaths = [...fixedPrecachePaths, ...generatedAssetPaths].sort();
const serviceWorkerTemplate = await readFile(
  join(sourceDirectory, "service-worker.js"),
  "utf8",
);
const versionHash = createHash("sha256");

for (const path of precachePaths) {
  versionHash.update(path);
  versionHash.update("\0");
  versionHash.update(await readFile(join(outputDirectory, path)));
}
versionHash.update(serviceWorkerTemplate);

const cacheVersion = versionHash.digest("hex").slice(0, 16);
const serviceWorker = serviceWorkerTemplate
  .replace("__CACHE_VERSION__", cacheVersion)
  .replace("__PRECACHE_PATHS__", JSON.stringify([...precachePaths, "service-worker.js"], null, 2));

await writeFile(join(outputDirectory, "service-worker.js"), serviceWorker);

console.log(
  `Built dist/ as an offline PWA with ${precachePaths.length + 1} precached files.`,
);
