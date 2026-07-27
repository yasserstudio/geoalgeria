# OpenSky licence check: the observe-later phase is blocked

Checked 2026-07-27 against <https://opensky-network.org/about/terms-of-use> and
<https://openskynetwork.github.io/opensky-api/>.

**Verdict: OpenSky cannot be used for this project as it stands.** Not "attribution
needed", not "rate-limited". Three independent clauses each block it on their own, and
the third blocks even a derived layer.

## The three blockers

**1. The licence is non-profit research and education only.**

> "OpenSky Network's authorization to access the data grants You a limited,
> non-exclusive, non-transferable, non-assignable, and terminable license to copy,
> modify, and use the data in accordance with this AGREEMENT solely for the purpose of
> non-profit research and non-profit education. [...] Any use by a for-profit or
> commercial entity requires written permission and a license granted by the OpenSky
> Network."

GeoAlgeria is published by Yasser's Studio. That is a for-profit entity, so this applies
regardless of the fact that the site is free to read.

**2. Operational API use requires a written licence even for non-profits.**

> "Operational use of the REST API in any live product, service, or automated system also
> requires a written license, regardless of the entity's non-profit status."

A scheduled job that pulls state vectors to keep a public map current is exactly the
"automated system" this names. The non-profit route does not get around it.

**3. Redistribution is prohibited outright.**

> "(iii) You will not distribute, disclose, transfer or otherwise make available the data
> set(s) to any person other than those employed by your institute who are assisting or
> collaborating with You using the data set(s)."
>
> "(iv) All conditions, restrictions and obligations attached to this data shall accompany
> any and all subsequent uses and disclosures of this data set by You."

This is the decisive one. Publishing an observation layer on geoalgeria.com, or shipping
observed legs inside an npm package, is making the data available to the public. Clause
(iv) means the restriction travels with anything derived from it, so "we only ship a
summary" does not escape it either.

The API documentation makes the posture unmistakable, pre-empting the request directly:
"Note that we may block AWS and other hyperscalers due to generalized abuse from these
IPs. Do not contact us because you want your AI dashboard whitelisted."

## What this means for the roadmap

The plan's sequencing was "published schedules first, live observation later". The later
half is now **gated on a written licence from OpenSky**
(`contact[at]opensky-network.org`), not on engineering. Nothing about the v1 arcs map
changes: it is built from published schedules and citable sources and never touched
OpenSky.

If the observation phase is wanted, the options are, in order of how much they ask of the
project:

1. Request a commercial licence from OpenSky and see what it costs.
2. Use a feed whose terms permit public redistribution. This needs its own check, at the
   same standard: a permissive-sounding banner is not a licence grant, and any candidate
   has to survive the same three questions asked here, commercial use, operational API
   use, and redistribution of derived data.
3. Drop live observation and keep the map structural, which is what the locked scope
   already says it is.

Option 3 costs nothing and loses nothing that v1 promised. Options 1 and 2 are decisions
for later, not blockers on anything currently in flight.
