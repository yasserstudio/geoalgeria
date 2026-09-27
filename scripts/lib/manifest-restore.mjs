/**
 * Manifest rewrites that are put back however the process ends.
 *
 * `scripts/stage-publish.js` rewrites a package.json's `workspace:` specs to real
 * semver for the upload and restores the original afterwards. It did that in a
 * `finally`, which covers a throw and a normal return but NOT a signal: Ctrl-C
 * during `npm stage publish` (the upload is the slow step, so it is the likely
 * moment) left `"@geoalgeria/schema": "^1.1.1"` committed-looking on disk. The
 * next `pnpm install` then resolves the data contract from npm, which never
 * publishes it, and a `git commit -a` would ship the rewrite.
 *
 * So the rewrites are registered here and replayed from `process.on("exit")` and
 * from SIGINT/SIGTERM/SIGHUP as well. Every restore is idempotent: it drops its
 * own entry, so the `finally`, the signal handler and the exit handler cannot
 * fight over the same file.
 *
 * The writer is injectable and there is no other I/O, so a test drives it in
 * memory.
 */

import { writeFileSync } from "node:fs";

/** The conventional exit code for a process killed by each signal (128 + signum). */
export const SIGNAL_EXIT_CODES = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 };

/**
 * A registry of pending manifest restores.
 *
 * @param {{write?: (path: string, contents: string) => void, warn?: (message: string) => void}} [io]
 */
export function createManifestRestore(io = {}) {
  const write = io.write ?? ((path, contents) => writeFileSync(path, contents));
  const warn = io.warn ?? ((message) => console.error(message));
  const originals = new Map();

  return {
    /**
     * Record a file's original contents before it is rewritten. The FIRST
     * original wins: a second rewrite of the same file must still restore what
     * was on disk to begin with.
     */
    remember(path, original) {
      if (!originals.has(path)) originals.set(path, original);
    },

    /** Paths still waiting to be put back. */
    pending() {
      return [...originals.keys()];
    },

    /**
     * Put one file back, if it is still pending. Returns whether it wrote.
     * A failing write is reported, never thrown: this runs on the way out, where
     * a throw would mask the real exit reason and skip the remaining files.
     */
    restore(path) {
      if (!originals.has(path)) return false;
      const original = originals.get(path);
      originals.delete(path);
      try {
        write(path, original);
        return true;
      } catch (err) {
        warn(`WARNING: could not restore ${path}: ${err.message}\nPut it back with: git checkout -- ${path}`);
        return false;
      }
    },

    /** Put every pending file back. Returns how many were written. */
    restoreAll() {
      let restored = 0;
      for (const path of [...originals.keys()]) if (this.restore(path)) restored++;
      return restored;
    },
  };
}

/**
 * Replay `restore` on the way out, whatever the way out is: a normal exit, a
 * throw, or SIGINT/SIGTERM/SIGHUP. A signal handler restores first and then
 * exits with that signal's conventional code, so a Ctrl-C still looks like a
 * Ctrl-C to the shell and to CI.
 *
 * @param {ReturnType<typeof createManifestRestore>} restore
 * @param {{process?: NodeJS.Process, log?: (message: string) => void}} [io]
 */
export function guardWithProcessSignals(restore, io = {}) {
  const proc = io.process ?? process;
  const log = io.log ?? ((message) => console.error(message));

  proc.on("exit", () => restore.restoreAll());

  for (const [signal, code] of Object.entries(SIGNAL_EXIT_CODES)) {
    proc.on(signal, () => {
      const waiting = restore.pending().length;
      if (waiting > 0) log(`\n${signal}: restoring ${waiting} rewritten package.json file(s) before exit.`);
      restore.restoreAll();
      proc.exit(code);
    });
  }
}
