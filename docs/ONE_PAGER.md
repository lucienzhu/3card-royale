# A4 rules reference

Two print-ready pages, one per language, reviewed against Standard Rules 1.0:

- [中文 PDF](shenzhen-flower-rules-a4.zh-CN.pdf)
- [English PDF](shenzhen-flower-rules-a4.en.pdf)

A4 portrait (210 × 297 mm), one page each. Print at actual size. The website's Learn and Rules pages select the PDF matching the current language. The QR opens the full rulebook in that language.

## Build

The copy and layout live in `scripts/build-onepager.py`. It reads the current flat logo from `brand-mark.svg` and the light/card colors from `app/theme-tokens.js`; it does not keep separate artwork or palette copies. Paper stays white for printing. PDF fonts are embedded as subsets.

```sh
python3 -m pip install reportlab
python3 scripts/build-onepager.py --output-dir output/pdf
```

The default font paths use macOS STHeiti SC and Arial. On other systems, supply installed TrueType fonts with Chinese/Latin coverage. Font files are not redistributed in this repository:

```sh
python3 scripts/build-onepager.py --output-dir output/pdf \
  --font-zh /path/to/chinese-regular.ttf \
  --font-zh-bold /path/to/chinese-bold.ttf \
  --font-en /path/to/latin-regular.ttf \
  --font-en-bold /path/to/latin-bold.ttf
```

For a Chinese TrueType collection, also supply `--zh-font-index` (default `1`). Generated PDFs use invariant metadata so an unchanged source, dependency and font set yields stable output.

## Review and publish

1. Check the copy against `RULES.md` and `RULES.zh-CN.md`, especially swap skips, full damage and the Ace level owner.
2. Build, then render **both** PDFs with `pdftoppm -png -r 150`. Check text, suits, logo, spacing and QR readability.
3. Confirm each PDF has exactly one A4 page, embedded fonts and working language-specific links.
4. Copy the reviewed PDFs from `output/pdf/` to `docs/`, then run `node scripts/check.cjs`. Commit source and both PDFs together.

This sheet is a quick reference; the linked rulebook contains the detailed wildcard substitution and tie-break rules. It does not change GameCore, SDK or rules versions.
