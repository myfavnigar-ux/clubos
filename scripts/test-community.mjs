import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
await build({
  entryPoints: ["lib/community-types.ts", "lib/sample-blogs.ts"],
  outdir: "work/community-tests",
  bundle: true,
  platform: "node",
  format: "esm",
  outExtension: { ".js": ".mjs" },
});
const { dialNumber, safeCover, safeTarget, sampleSupport } = await import(
  pathToFileURL(resolve("work/community-tests/community-types.mjs"))
);
const { sampleBlogs } = await import(
  pathToFileURL(resolve("work/community-tests/sample-blogs.mjs"))
);
assert.equal(dialNumber("+880 1XXXXXXXXX"), null);
assert.equal(dialNumber("+880 1700-000000"), "+8801700000000");
assert.equal(dialNumber("javascript:alert(1)"), null);
assert.equal(dialNumber("123"), null);
assert.equal(safeCover("javascript:alert(1)"), false);
assert.equal(safeCover("//untrusted.test/image.webp"), false);
assert.equal(safeCover("https://example.com/art.webp"), true);
assert.equal(safeTarget("https://example.com"), false);
assert.equal(safeTarget("event/ai-web"), true);
assert.equal(safeTarget("blog/web-checklist"), true);
assert.equal(sampleBlogs.length, 10);
assert.equal(new Set(sampleBlogs.map((b) => b.id)).size, 10);
for (const b of sampleBlogs) {
  assert.ok(b.body.length >= 30 && b.body.length <= 12000);
  assert.ok(b.createdAt <= Date.now());
  assert.ok(safeCover(b.cover));
  assert.ok(existsSync("public" + b.cover));
}
for (const s of sampleSupport) assert.equal(dialNumber(s.phone), null);
console.log(
  "PASS: community links, safe dialing, 10 unique articles and their local artwork.",
);
