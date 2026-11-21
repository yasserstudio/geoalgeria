# 0006. Dairas come from the decrees; secondary datasets confirm only

- Status: Accepted (Owner, 2026-10-31)
- Context: spec #357 and the Daira audit #360 on the private tracker, shipped in batch
  2026-17 (Admin geography)

A Daira's list of Communes comes from the decree in the *Journal officiel* that fixes
it: executive decree 26-253 (2026) for wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28, 32 and
59 to 69, decree 21-198 (2021) for the wilayas it tabulates, and decree 91-306 (1991),
as amended by 92-66 (1992), for the rest. We read the decree first and record what it
says. A secondary dataset, such as another project's transcription of the same
decrees, is compared only after that reading, as a check: it is never a source of
values, it is never credited, and a disagreement with it is a reason to read the decree
again, not to copy it. A Daira with no clear decree evidence keeps its current list and
stays in the review queue (`audit.status` null, with an `open_reason` in
`research/_daira-audit/daira-audit.json`); nothing changes on a guess. The Arabic Daira
name follows the same rule: it comes from the decree's Arabic edition or from the seat
Commune's own record, never from a secondary dataset.

## Consequences

- Each graded Daira cites one decree with its article, page and joradp.dz PDF, so
  anyone can check the list against the text.
- A refresh that finds a new disagreement opens it in the audit; it does not edit
  `dairas.json` until a decree settles it, and the change then cites that decree.
- The 13 Algiers rows stay ungraded until the texts of 1997 to 2000 that reorganized
  Algiers are read. Those districts are a Circonscription administrative, not a Daira;
  the `kind` field that will say so is deferred.
- Daira totals stay the dataset's own count, never stated as an official total, since
  no post-2026 national total has been published.

## Considered options

- **Take a published transcription as the source**: faster, and it covers every
  wilaya. Rejected: its errors become ours, and we could not cite an article for a row.
- **Correct every disagreement at once from the best available source**: closes the
  gaps sooner. Rejected: a row changed without its decree is a guess, and a stable
  Daira id would then carry a list nobody can check.
