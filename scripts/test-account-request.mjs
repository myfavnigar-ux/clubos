import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
await build({
  entryPoints: ["lib/account-request.ts"],
  outfile: "work/account-request-test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { accountRequest, AccountChangedError } = await import(
  pathToFileURL(resolve("work/account-request-test.mjs"))
);
let uid = "alice",
  send;
const account = {
  currentUid: () => uid,
  headers: async () => ({ Authorization: "Bearer fixture" }),
};
globalThis.fetch = async (_url, init) => {
  assert.equal(init.headers.get("authorization"), "Bearer fixture");
  return new Promise((resolve) => {
    send = resolve;
  });
};
const normal = accountRequest(account);
await new Promise((r) => setImmediate(r));
send(Response.json({ registrations: [{ id: "alice-ticket" }] }));
assert.equal((await normal).data.registrations[0].id, "alice-ticket");
const signout = accountRequest(account);
await new Promise((r) => setImmediate(r));
uid = null;
send(Response.json({ registrations: [{ id: "alice-ticket" }] }));
await assert.rejects(signout, AccountChangedError);
uid = "alice";
const switched = accountRequest(account);
await new Promise((r) => setImmediate(r));
uid = "bob";
send(Response.json({ registrations: [{ id: "alice-ticket" }] }));
await assert.rejects(switched, AccountChangedError);
uid = "alice";
await assert.rejects(
  accountRequest({
    ...account,
    headers: async () => {
      uid = "bob";
      return {};
    },
  }),
  AccountChangedError,
);
console.log(
  "PASS: 4 account-session checks; in-flight responses discarded after logout/account changes.",
);
