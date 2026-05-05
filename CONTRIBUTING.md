# Contributing to GeoAlgeria

Thank you for your interest in contributing! This project aims to provide the most complete and accurate dataset of Algerian wilayas, dairas, and communes.

## How to Contribute

### 1. Fork & Clone

Fork this repo, then clone your fork:

```bash
git clone https://github.com/YOUR_FORK/geoalgeria.git
cd geoalgeria
```

### 2. Make Your Changes

- Fix incorrect data (names, postal codes, coordinates)
- Add missing communes or dairas
- Improve Arabic transliterations
- Add new data fields with reliable sources

### 3. Validate Your Data

Before submitting, make sure your JSON is valid:

```bash
# Check JSON syntax
python3 -m json.tool data/wilayas.json > /dev/null
python3 -m json.tool data/communes_w1_w23.json > /dev/null
python3 -m json.tool data/communes_w24_w48.json > /dev/null
python3 -m json.tool data/communes_w49_w69.json > /dev/null
```

### 4. Submit a Pull Request

- Create a branch: `git checkout -b fix/commune-name-typo`
- Commit with a clear message describing what you changed and why
- Open a PR against `main`

## Data Guidelines

### Format

- Follow the existing JSON schema (see `data/README.md`)
- Use UTF-8 encoding
- Keep entries sorted by `wilaya_code`, then alphabetically by `name_fr` within each wilaya
- No trailing commas in JSON

### Naming

- **French names**: Use official JORA spelling (e.g., "Oum El Bouaghi" not "Oum el Bouaghi")
- **Arabic names**: Use standard Arabic script without tashkeel (diacritics)
- **Daira names**: Use the French name of the daira seat (chef-lieu)

### Sources

Always cite your source when correcting data. Accepted sources:

- Official Journal (JORA / الجريدة الرسمية)
- Algerie Poste (postal codes)
- ONS (National Statistics Office)
- Interior Ministry publications
- Wikipedia (as secondary reference only)

### What NOT to Submit

- Data from unofficial or unverifiable sources
- Population data (changes frequently — better served by a separate dataset)
- Political or opinion-based content
- Copyrighted material

## Reporting Issues

If you find incorrect data but can't fix it yourself:

1. Open an issue
2. Specify which file and entry is wrong
3. Provide the correct value with a source link

## Code of Conduct

- Be respectful and constructive
- Assume good intentions
- Focus on data accuracy, not personal preferences
- Welcome newcomers — not everyone is familiar with git or JSON

## Questions?

Open an issue with the label `question` and we'll help you out.
