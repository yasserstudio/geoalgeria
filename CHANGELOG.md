# Changelog

All notable changes to this dataset will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versioning rules for datasets:
- **MAJOR**: breaking schema changes (renamed fields, removed fields)
- **MINOR**: new data added (new communes, new fields, new formats)
- **PATCH**: corrections to existing data (typos, wrong coordinates, postal codes)

## [1.0.0] - 2025-05-05

### Added
- 69 wilayas (original 48 + 2019 reform wilayas 49–58 + 2025 reform wilayas 59–69)
- 1,657 communes with bilingual names (FR/AR), postal codes, daira assignments
- 1,637 commune coordinates (98.7% coverage)
- 597 dairas as first-class entities
- Multiple export formats: JSON, CSV, GeoJSON, SQL
- E-commerce optimized flat dataset
- TypeScript type definitions
- npm package with helper functions
- Validation script + GitHub Actions CI
- Contributing guide with issue/PR templates
