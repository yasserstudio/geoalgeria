# Verification pass, 2026-07-29: silent return legs

Follow-up to the return-leg screen (`soar-return-screen-2026-07-29.json`).
Method: Soar/airlabs live operations as the hypothesis generator (never a
source), then confirmation against citable sources. Result: one leg enters the
dataset, three claims stay out, one existing record is now disputed.

## Entered the dataset

- **LYS -> TLM (AH 1099), verified.** Lyon airport's own Air Algerie page
  (the same URL that verified the outbound TLM -> LYS) lists Tlemcen among the
  cities AH serves from Lyon, with a stated 2h10 flight time. The 2026-07-29
  schedule check showed AH1099 at 17:30 -> 18:40, which across the one-hour
  timezone step is exactly a 2h10 block, matching the page. Days not published,
  so `days` stays null.

## Screened positive, not yet citable (do NOT enter)

- **IST -> ORN**: AH3025 was en-route during the screen (17:20 -> 19:55).
  istairport.com timed out repeatedly, aeroroutes has no Istanbul-Oran 2026
  article, airalgerie.dz does not list the pair. Needs one citable row.
- **ORY -> BLJ**: AH1121 was en-route during the screen. parisaeroport.fr is
  behind an Incapsula bot-check that blocked every automated fetch; a human
  browser session can settle it in a minute.

## Disputed existing record

- **blj-cdg (verified, AH 1120)** claims Batna -> Paris-CDG, cited to
  aeroroutes' HOMEPAGE (not a specific article), which on its own names
  neither Batna nor a Paris airport. Live operations on 2026-07-29 showed
  AH1120 landing at ORY, and AH1121 flying ORY -> BLJ. If Paris Aeroport's
  site (or a dated aeroroutes article) confirms Orly, the record should be
  corrected to blj-ory and the ory-blj return added; until then the record
  stands as shipped but is flagged here and in ROADMAP.md. The one 2023
  third-party paraphrase mentioning "Batna-Paris-CDG" predates the current
  schedule and was not readable at its original source.
