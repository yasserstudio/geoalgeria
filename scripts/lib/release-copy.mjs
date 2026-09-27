/**
 * Release copy shared by the release notes and the announcer: pull one version's
 * section out of a CHANGELOG, turn it into entries, and clamp a title.
 *
 * `scripts/release-notes.mjs` (GitHub Release title/body) and
 * `scripts/announce.js` (Discussion + social drafts) both read the same
 * CHANGELOG sections, so the title rules live here once.
 *
 * No dependencies - Node built-ins only, and no side effects, so it is safe to
 * import from a test.
 */

// GitHub rejects a release name or discussion title over 256 characters with a
// bare HTTP 422. For a release that fails the step AFTER packages have been
// staged, leaving the release half done; for an announcement it failed the whole
// Announce run (geoalgeria 2.1.0, 2026-09-26: "Title is too long (maximum is 256
// characters)"). A changeset written as one long paragraph (the cliniques 1.0.0
// one ran past 1,200 characters) hits this, so the title is always clamped here
// rather than trusted to be short.
//
// Clamped well under the hard limit, because a 256-character title is unreadable
// in the releases list or the Discussions feed anyway. Order of preference: the
// first sentence, then a word-boundary cut, then the tag. The full text is never
// lost, it is the first thing in the release body.
export const MAX_TITLE = 120;
export const GITHUB_MAX_TITLE = 256;

export function clampTitle(text, tagFallback) {
  const s = text.trim();
  if (s.length <= MAX_TITLE) return s;

  // A first sentence that fits is the natural title.
  const firstSentence = s.match(/^(.+?[.!?])(?:\s|$)/)?.[1];
  if (firstSentence && firstSentence.length <= MAX_TITLE) return firstSentence;

  // Otherwise cut on a word boundary and mark the truncation.
  const cut = s.slice(0, MAX_TITLE - 1);
  const atSpace = cut.lastIndexOf(" ");
  const trimmed = (atSpace > MAX_TITLE / 2 ? cut.slice(0, atSpace) : cut).replace(/[\s,;:.-]+$/, "");
  const out = trimmed ? `${trimmed}...` : tagFallback;
  return out.length <= GITHUB_MAX_TITLE ? out : tagFallback;
}

/**
 * One version's CHANGELOG section: everything between its `## ` heading and the
 * next one. Matches the version anywhere on the heading, so both changesets
 * (`## 1.1.1`) and keep-a-changelog (`## [1.1.0] - 2026-06-08`) styles work. The
 * non-digit/dot boundaries stop 1.1.0 from matching inside 11.1.0 or a date.
 */
export function sectionFor(markdown, version) {
  const esc = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^0-9.])${esc}([^0-9.]|$)`);
  let grab = false;
  const out = [];
  for (const line of markdown.split("\n")) {
    if (/^##\s/.test(line)) {
      if (grab) break; // next version heading ends the section
      if (re.test(line)) {
        grab = true;
        continue;
      }
    }
    if (grab) out.push(line);
  }
  return out.join("\n").trim();
}

/**
 * The entries of a CHANGELOG section: its bullets, plus each further paragraph of
 * a changeset's bullet body as its own entry.
 *
 * A changeset writes a brief as ONE bullet whose body continues in indented
 * paragraphs. A blank line therefore ends an entry: merging across it collapsed
 * the whole brief into the lead bullet, which is what sent a 2,000-character
 * headline to GitHub for geoalgeria 2.1.0. Within a paragraph, indented lines
 * still merge back (keep-a-changelog wraps long bullets); flush-left prose is
 * left alone.
 */
export function highlights(raw) {
  const entries = [];
  let wrapping = false; // is the last entry still open for wrapped continuation lines?
  for (const line of raw.split("\n")) {
    if (!line.trim()) {
      wrapping = false;
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      entries.push(bullet[1].replace(/^[0-9a-f]{7,}:\s*/i, "").trim());
      wrapping = true;
    } else if (/^\s+\S/.test(line) && entries.length) {
      if (wrapping) entries[entries.length - 1] += " " + line.trim();
      else {
        entries.push(line.trim()); // the next paragraph of a changeset bullet body
        wrapping = true;
      }
    }
  }
  const cleaned = entries.map((e) => e.trim()).filter(Boolean);
  return cleaned.length ? cleaned : ["See the full changelog for details."];
}

/** Strip markdown emphasis for plain-text contexts (titles, social posts). */
export const plain = (s) =>
  s
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The headline: the lead entry's first sentence, clamped. Trailing sentence
 * punctuation goes so it reads as a title, not a sentence (the full entry still
 * carries its period in the body); a truncation marker stays.
 */
export function headlineFrom(entries, tagFallback = "") {
  const lead = entries[0];
  if (!lead) return tagFallback;
  const s = plain(lead);
  const sentence = s.match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? s;
  const clamped = clampTitle(sentence, tagFallback);
  return clamped.endsWith("...") ? clamped : clamped.replace(/[.;,\s]+$/, "");
}
