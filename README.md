# Math English Reading Drill

A static, installable offline drill for practising how to read mathematical formulas aloud in English. It contains 110 formulas in the source site's original categories and order, with a concise suggested reading for every formula.

## Project layout

- `data/source/what-say.html`: reviewed HTML source snapshot. Linked PDFs are not downloaded or read.
- `data/what-to-say.json`: generated drill data.
- `scripts/fetch_what_to_say.py`: source snapshot downloader.
- `scripts/extract_what_to_say.py`: deterministic category, link, and formula extractor.
- `src/`: the static application source.
- `dist/`: the built PWA with the application, manifest, icons, service worker, local KaTeX assets, and fonts.
- `reports/steps-1-5.md`: migration and validation report.

Pre-existing files under `dist/audio/` stay local and are excluded from Git and deployment.

## Data format

Each category stores its source title, display title, source order, declared example count, and ordered items. Each item stores:

- stable item and order identifiers;
- the extracted source formula and a separate display formula;
- the shared source-link formula, PDF URL, link order, and part order;
- source attribution and normalization notes;
- a concise suggested spoken-English reading.

One independent exercise becomes one item. Coordinates, a point and its plane, or a matrix with its requested operations stay together as one exercise.

## Commands

```sh
npm install
npm run extract
npm test
python3 -m http.server 8000 --directory dist
```

Open `http://127.0.0.1:8000` after starting the local server.

Load the app once while online to install its offline cache. It can then be installed from a supporting browser and opened without a network connection. Service workers require HTTPS in production; `localhost` and `127.0.0.1` are allowed for local testing.

All application URLs and manifest paths are relative, so the contents of `dist/` can be published at a GitHub Pages repository subpath without configuration changes.

To refresh the reviewed HTML snapshot later:

```sh
npm run fetch
npm run extract
npm test
```

Review source changes before accepting a refreshed snapshot. Existing reviewed readings are retained when an item's identifier and source formula are unchanged.

## Source

Formula index: [What to say…](https://cm.pg.edu.pl/en/mathematics/vocabulary/what-say), Mathematics Centre, Gdańsk University of Technology. This build is intended for personal study and redistribution is not assumed.
