// The rewritten package.json files stage-publish.js must put back however it
// exits. A `finally` alone missed the signal paths, so the signal wiring is
// exercised for real here: a child process is rewritten, then SIGINT'd.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createManifestRestore, guardWithProcessSignals, SIGNAL_EXIT_CODES } from "../scripts/lib/manifest-restore.mjs";

/** A restore registry whose writes land in a plain object instead of on disk. */
const inMemory = () => {
  const disk = {};
  const warnings = [];
  const restore = createManifestRestore({
    write: (path, contents) => {
      disk[path] = contents;
    },
    warn: (message) => warnings.push(message),
  });
  return { restore, disk, warnings };
};

test("a remembered manifest is put back", () => {
  const { restore, disk } = inMemory();
  restore.remember("packages/telecom/package.json", '{"a":1}\n');
  assert.deepEqual(restore.pending(), ["packages/telecom/package.json"]);
  assert.equal(restore.restore("packages/telecom/package.json"), true);
  assert.equal(disk["packages/telecom/package.json"], '{"a":1}\n');
  assert.deepEqual(restore.pending(), []);
});

test("restoring twice writes once: the finally and the exit handler cannot fight", () => {
  const { restore, disk } = inMemory();
  restore.remember("p/package.json", "original");
  assert.equal(restore.restore("p/package.json"), true);
  // A later rewrite of the same path must not be undone by a stale entry.
  disk["p/package.json"] = "written again";
  assert.equal(restore.restore("p/package.json"), false);
  assert.equal(restore.restoreAll(), 0);
  assert.equal(disk["p/package.json"], "written again");
});

test("the first original wins when one file is remembered twice", () => {
  const { restore, disk } = inMemory();
  restore.remember("p/package.json", "first");
  restore.remember("p/package.json", "second");
  restore.restoreAll();
  assert.equal(disk["p/package.json"], "first");
});

test("restoreAll puts every pending file back and reports the count", () => {
  const { restore, disk } = inMemory();
  restore.remember("a/package.json", "A");
  restore.remember("b/package.json", "B");
  assert.equal(restore.restoreAll(), 2);
  assert.deepEqual(disk, { "a/package.json": "A", "b/package.json": "B" });
  assert.deepEqual(restore.pending(), []);
});

test("a failing write is reported, not thrown, and the rest still go back", () => {
  const disk = {};
  const warnings = [];
  const restore = createManifestRestore({
    write: (path, contents) => {
      if (path === "bad/package.json") throw new Error("EROFS");
      disk[path] = contents;
    },
    warn: (message) => warnings.push(message),
  });
  restore.remember("bad/package.json", "A");
  restore.remember("good/package.json", "B");
  assert.equal(restore.restoreAll(), 1);
  assert.equal(disk["good/package.json"], "B");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /could not restore bad\/package\.json: EROFS/);
  assert.match(warnings[0], /git checkout --/);
});

test("the exit handler and the signal handlers are registered for every signal", () => {
  const handlers = {};
  const fakeProcess = {
    on: (event, fn) => {
      handlers[event] = fn;
    },
    exit: (code) => {
      handlers.exitCode = code;
    },
  };
  const { restore, disk } = inMemory();
  guardWithProcessSignals(restore, { process: fakeProcess, log: () => {} });
  assert.deepEqual(Object.keys(handlers).sort(), ["SIGHUP", "SIGINT", "SIGTERM", "exit"]);

  restore.remember("p/package.json", "original");
  handlers.SIGINT();
  assert.equal(disk["p/package.json"], "original");
  assert.equal(handlers.exitCode, SIGNAL_EXIT_CODES.SIGINT, "SIGINT exits 130");
});

test("SIGINT during a rewrite really does put the file back on disk", async () => {
  // The bug, end to end: a Ctrl-C mid-upload used to leave the rewritten
  // manifest behind, because `finally` does not run on a signal.
  const dir = mkdtempSync(join(tmpdir(), "manifest-restore-"));
  const manifest = join(dir, "package.json");
  const original = `${JSON.stringify({ name: "@geoalgeria/telecom", devDependencies: { "@geoalgeria/schema": "workspace:^" } }, null, 2)}\n`;
  writeFileSync(manifest, original);

  const child = join(dir, "child.mjs");
  writeFileSync(
    child,
    `import { readFileSync, writeFileSync } from "node:fs";
import { createManifestRestore, guardWithProcessSignals } from ${JSON.stringify(
      new URL("../scripts/lib/manifest-restore.mjs", import.meta.url).href,
    )};

const path = ${JSON.stringify(manifest)};
const restore = createManifestRestore();
guardWithProcessSignals(restore);

const original = readFileSync(path, "utf8");
restore.remember(path, original);
writeFileSync(path, JSON.stringify({ name: "@geoalgeria/telecom", devDependencies: { "@geoalgeria/schema": "^1.1.1" } }, null, 2) + "\\n");
process.stdout.write("rewritten\\n");
// Stand in for the slow \`npm stage publish\` upload.
setInterval(() => {}, 1000);
`,
  );

  const proc = spawn(process.execPath, [child], { stdio: ["ignore", "pipe", "inherit"] });
  await new Promise((resolve, reject) => {
    let seen = "";
    proc.stdout.on("data", (chunk) => {
      seen += chunk;
      if (seen.includes("rewritten")) resolve();
    });
    proc.on("error", reject);
    proc.on("exit", () => reject(new Error("child exited before it rewrote the manifest")));
  });

  assert.match(readFileSync(manifest, "utf8"), /\^1\.1\.1/, "the child should have rewritten the manifest first");

  const exited = new Promise((resolve) => proc.on("exit", (code, signal) => resolve({ code, signal })));
  proc.kill("SIGINT");
  const { code } = await exited;

  assert.equal(readFileSync(manifest, "utf8"), original, "SIGINT must leave the workspace: spec back on disk");
  assert.equal(code, SIGNAL_EXIT_CODES.SIGINT, "a Ctrl-C still exits 130");
});
