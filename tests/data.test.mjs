import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const data = JSON.parse(await readFile(join(root, "data", "what-to-say.json"), "utf8"));

test("source order and item order are stable", () => {
  const items = data.categories.flatMap((category) => category.items);
  assert.equal(items.length, 110);
  assert.deepEqual(
    items.map((item) => item.globalOrder),
    Array.from({ length: 110 }, (_, index) => index + 1),
  );
});

test("every formula has a suggested reading", () => {
  const items = data.categories.flatMap((category) => category.items);
  assert.ok(
    items.every(
      (item) => typeof item.reading === "string" && item.reading.trim().length > 0,
    ),
  );
});

test("source and display formulas are stored separately", () => {
  const items = data.categories.flatMap((category) => category.items);
  assert.ok(items.every((item) => "sourceFormula" in item && "displayFormula" in item));
  assert.ok(items.some((item) => item.sourceFormula !== item.displayFormula));
});
