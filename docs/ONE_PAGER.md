# A4 rules reference

Five print-ready pages, one per language, reviewed against Standard Rules 1.0:

- [中文 PDF](shenzhen-flower-rules-a4.zh-CN.pdf)
- [English PDF](shenzhen-flower-rules-a4.en.pdf)
- [日本語 PDF](shenzhen-flower-rules-a4.ja.pdf)
- [한국어 PDF](shenzhen-flower-rules-a4.ko.pdf)
- [Español PDF](shenzhen-flower-rules-a4.es.pdf)

A4 portrait (210 × 297 mm), one page each. Print at actual size. The website's Learn and Rules pages select the PDF matching the current language. The QR opens the full rulebook in that language.

## Build

The layout and Chinese/English copy live in `scripts/build-onepager.py`; Japanese/Korean/Spanish copy lives in `scripts/onepager-locales.json`. It reads the current flat logo from `brand-mark.svg` and the light/card colors from `app/theme-tokens.js`; it does not keep separate artwork or palette copies. Paper stays white for printing. PDF fonts are embedded as subsets.

```sh
python3 -m pip install reportlab
python3 scripts/build-onepager.py --output-dir output/pdf
```

Use `--languages ja ko es` to rebuild only those languages. The default macOS fonts are STHeiti SC (Chinese), Arial (English/Spanish) and Arial Unicode (Japanese/Korean). On other systems, supply installed TrueType fonts with the appropriate glyph coverage. The builder rejects missing glyphs. Font files are not redistributed in this repository:

```sh
python3 scripts/build-onepager.py --output-dir output/pdf \
  --font-zh /path/to/chinese-regular.ttf \
  --font-zh-bold /path/to/chinese-bold.ttf \
  --font-en /path/to/latin-regular.ttf \
  --font-en-bold /path/to/latin-bold.ttf \
  --font-ja /path/to/japanese-regular.ttf \
  --font-ja-bold /path/to/japanese-bold.ttf \
  --font-ko /path/to/korean-regular.ttf \
  --font-ko-bold /path/to/korean-bold.ttf
```

Japanese/Korean bold defaults to the supplied regular font when no separate bold font is available. For a Chinese TrueType collection, also supply `--zh-font-index` (default `1`). Generated PDFs use invariant metadata so an unchanged source, dependency and font set yields stable output.

## Review and publish

1. Check the copy against the matching `RULES*.md` and GameCore, especially swap skips, full damage and the Ace level owner.
2. Build, then render **every changed** PDF with `pdftoppm -png -r 150`. Check text, suits, logo, spacing and QR readability.
3. Confirm each PDF has exactly one A4 page, embedded fonts and working language-specific links.
4. Copy the reviewed PDFs from `output/pdf/` to `docs/`, then run `node scripts/check.cjs`. Commit source and the reviewed PDFs together.

This sheet is a quick reference; the linked rulebook contains the detailed wildcard substitution and tie-break rules. It does not change GameCore, SDK or rules versions.
