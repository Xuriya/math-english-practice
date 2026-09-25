# Steps 1–5 migration report

## Result

- Source snapshot: 2026-09-23, SHA-256 `09cad073b834ccf50713744a681b760af0ba0a9a5cbe280ebe89cb1551863b2e`
- Categories: 12
- PDF reference links: 67
- Independent formula exercises: 110
- Reading fields populated: 0
- Linked PDF bodies read: 0

| Order | Category | PDF links | Extracted items | Declared by source |
| ---: | --- | ---: | ---: | ---: |
| 1 | Graph transformations | 15 | 27 | — |
| 2 | Absolute value | 9 | 9 | 9 |
| 3 | Trigonometric equations | 1 | 2 | 2 |
| 4 | Sequence and function limits | 2 | 6 | 6 |
| 5 | Derivatives | 17 | 41 | 41 |
| 6 | Integrals | 4 | 4 | 4 |
| 7 | Matrix equations | 2 | 2 | 2 |
| 8 | Cramer's rule | 1 | 2 | 1 |
| 9 | Gaussian elimination | 1 | 1 | 1 |
| 10 | Eigenvalues and eigenvectors | 1 | 2 | 2 |
| 11 | Distance between a point and a plane | 1 | 1 | 1 |
| 12 | Series | 13 | 13 | 13 |

## Source-preserving adjustments

The original text remains in `sourceTitle`, `sourceFormula`, and `sourceLinkFormula`. Display-only adjustments are recorded per item.

- Corrected the category label `Cramer fromula` to `Cramer's rule` for display.
- Ignored a stray `l` before the opening math delimiter in `lim02.pdf`.
- Changed the decimal comma in the base of the logarithm from `0,5` to `0.5` for English display.
- Changed the two matrix array declarations in `eigen01.pdf` from one column to two columns so that they render as 2×2 matrices.
- Displayed the lower limit in `series10.pdf` as `n=1` instead of the source's `n+1`; this remains an assumption requiring confirmation.

## Validation performed

- Re-extraction from the saved HTML produces byte-for-byte identical JSON.
- Source category order and item order are continuous and stable.
- All 67 PDF URLs are retained exactly as published in the source HTML.
- All 110 formulas render without a KaTeX error.
- All 110 reading fields remain `null`; their controls are present but disabled.
- The UI source contains no Japanese characters.
- Browser checks at 1440×900, 1024×768, and 390×844 found no page-level horizontal overflow.
- Contents links, direct category hashes, category headings, and `Hide all` controls were checked in the browser.

## Unresolved source questions

1. The source heading says `Cramer fromula (1 example)`, but its single PDF link contains two independent systems. The drill follows the agreed rule and treats them as two questions.
2. The lower limit in `series10.pdf` is published as `n+1`. The display assumes `n=1`, but this cannot be confirmed without another authoritative source or reading the PDF.
3. The first formula linked by `graph14.pdf` appears to be missing a final absolute-value bar. It is preserved rather than silently repaired.
4. One derivative contains `\sin c` together with `\cos x`. It may be intentional or a source typo, so it is preserved.
5. The source includes repeated derivative exercises and an exact repeated series. They are retained because preserving source order and coverage takes precedence over deduplication.

Phrasebook content, reading text, and installable offline caching remain outside steps 1–5.
