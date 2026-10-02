TeX Gyre Adventor
=================

This is the typeface used for the large statements.

It is the free descendant of ITC Avant Garde Gothic: URW produced a metric
clone (URW Gothic), and GUST's TeX Gyre project extended that into TeX Gyre
Adventor. Cap-height measures 0.739 against Avant Garde's published 0.740 —
the same design.

  Source   https://www.gust.org.pl/projects/e-foundry/tex-gyre/adventor
  Licence  GUST Font License (GFL), a LaTeX Project Public License variant.
           Free for any use, including commercial.

The files here are subset to Latin + common punctuation and converted to
WOFF2 (176 kB OTF -> 9 kB each). Regenerate with:

  pyftsubset texgyreadventor-bold.otf \
    --unicodes="U+0020-007E,U+00A0,U+00A9,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+00E0-00FF" \
    --layout-features='kern,liga,calt' --flavor=woff2 \
    --output-file=adventor-bold.woff2 --desubroutinize
