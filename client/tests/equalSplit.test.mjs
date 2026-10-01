import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Compile the isolated helper in memory so these tests also run on Node 18+.
const source = readFileSync(
  new URL("../src/lib/equalSplit.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { equalSplit } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("₹100 between three people assigns the extra paisa exactly once", () => {
  assert.deepEqual(equalSplit("100", "3", 2), {
    share: 3333,
    remainder: 1,
    count: 3,
    minor: 10000,
  });
});
test("zero- and three-decimal currencies retain their minor units", () => {
  assert.deepEqual(equalSplit("100", "3", 0), {
    share: 33,
    remainder: 1,
    count: 3,
    minor: 100,
  });
  assert.deepEqual(equalSplit("1.001", "2", 3), {
    share: 500,
    remainder: 1,
    count: 2,
    minor: 1001,
  });
});
test("all displayed shares sum to the bill across supported group sizes", () => {
  for (const decimals of [0, 2, 3])
    for (let people = 1; people <= 100; people++) {
      const result = equalSplit("101", String(people), decimals);
      assert.equal(
        result.share * result.count + result.remainder,
        result.minor,
      );
      assert.ok(result.remainder >= 0 && result.remainder < result.count);
    }
});
test("rejects invalid amounts, excess precision, and unsafe integer totals", () => {
  for (const amount of [
    "",
    "-10",
    "abc",
    "1e3",
    "Infinity",
    "12.345",
    "9007199254740992",
  ])
    assert.equal(equalSplit(amount, "2", 2), null);
  assert.equal(equalSplit("1.1", "2", 0), null);
});
test("rejects empty, zero, fractional, and oversized group sizes", () => {
  for (const people of ["", "0", "-1", "1.5", "101", "NaN"])
    assert.equal(equalSplit("100", people, 2), null);
});
test("accepts a zero bill without division errors", () => {
  assert.deepEqual(equalSplit("0", "4", 2), {
    share: 0,
    remainder: 0,
    count: 4,
    minor: 0,
  });
});
