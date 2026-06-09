# Delivery Zones

Mapping of communes to delivery company zones. This helps e-commerce platforms calculate shipping costs and delivery times.

## Status

This data is **community-maintained** and may not reflect real-time pricing. Always verify with the carrier's official API or documentation.

## Schema

```json
{
  "provider": "yalidine",
  "last_updated": "2025-05-05",
  "zones": [
    {
      "wilaya_code": 16,
      "wilaya_name_fr": "Alger",
      "zone": "A",
      "home_delivery": true,
      "desk_delivery": true,
      "estimated_days": 1
    }
  ]
}
```

## Providers

| File | Provider | Status |
|------|----------|--------|
| `yalidine.json` | Yalidine | Template (needs community data) |
| `zr_express.json` | ZR Express | Template (needs community data) |
| `maystro.json` | Maystro Delivery | Template (needs community data) |

## Contributing

If you work with these delivery companies and have zone/pricing data:

1. Fill in the zone assignments per wilaya
2. Note the date you collected the data
3. Submit a PR with your source (screenshot, API response, official docs)

Zone assignments change — include `last_updated` so users know how fresh the data is.
