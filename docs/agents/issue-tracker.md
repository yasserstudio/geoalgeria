# Issue tracker: Private GitHub

The canonical internal issue tracker for both GeoAlgeria repositories is GitHub
Issues in the private `yasserstudio/geoalgeria.com` repository.

This public repository's issue tracker is a community intake surface for
user-submitted bug reports, data corrections and dataset requests. Never publish
maintainer-generated audits, implementation backlog or internal research here.

## Routing

- Data-repository work goes to the private tracker with a `Data:` title prefix;
  name the affected package or path in the body.
- App and cross-repository work also goes to the private tracker.
- Keep a community-authored public issue public. If it needs internal follow-up,
  create a private issue that references the public report without copying
  sensitive context back into the public thread.
- If an internal issue is accidentally created here, transfer it to
  `yasserstudio/geoalgeria.com` instead of duplicating it.
- Specs and short-lived execution maps may live under `.scratch/<feature-slug>/`,
  but `.scratch/` is ignored and is not the durable backlog.

## When a skill says "publish to the issue tracker"

Create a GitHub issue in `yasserstudio/geoalgeria.com`. Include acceptance
criteria, the owning repository (`app` or `data`), relevant paths and links to
any public report or pull request.

## When a skill says "fetch the relevant ticket"

Read the issue from `yasserstudio/geoalgeria.com`. Treat a bare issue number as
belonging to that private repository unless the user explicitly provides a
different repository or URL.

## Wayfinding operations

Used by `/wayfinder` for temporary execution coordination. The **map** is a file
with one **child** file per work item; any unresolved durable work must be
published to the private tracker before the effort ends.

- **Map**: `.scratch/<effort>/map.md` – the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
