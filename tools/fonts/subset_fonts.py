#!/usr/bin/env python3
"""Rebuild the bundled app fonts from the upstream releases.

Why self-subset instead of using Google Fonts / Fontsource files: their Inter
subsets drop the stylistic sets (ss04) and symbols the app shows in every
language (U+2264, U+2265, U+2011, U+2192).

Requirements (not a project dependency): Python 3.10+ with fonttools and brotli,
e.g. `python3 -m venv .venv && .venv/bin/pip install 'fonttools[woff]==4.*'`.

Usage: python3 tools/fonts/subset_fonts.py
Writes src/assets/fonts/{inter,noto-sans-arabic,noto-sans-hebrew}/ and checks
that every character of src/assets/i18n/*.json outside CJK is covered.
"""

from __future__ import annotations

import hashlib
import io
import json
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

REPO = Path(__file__).resolve().parents[2]
FONT_DIR = REPO / 'src' / 'assets' / 'fonts'
I18N_DIR = REPO / 'src' / 'assets' / 'i18n'

# Latin incl. extensions (Vietnamese origin names), Greek, Cyrillic, punctuation,
# currency, arrows, maths and geometric shapes. Keep in sync with
# the @font-face unicode-range values in src/theme/bq-tokens.scss.
INTER_UNICODES = (
    'U+0000-00FF,U+0100-024F,U+0259,U+02B0-02FF,U+0300-036F,U+0370-03FF,'
    'U+0400-052F,U+1E00-1EFF,U+2000-206F,U+2070-209F,U+20A0-20CF,U+2100-218F,'
    'U+2190-21FF,U+2200-22FF,U+2300-23FF,U+25A0-25FF,U+2C60-2C7F,U+A720-A7FF,'
    'U+FEFF,U+FFFD'
)
ARABIC_UNICODES = (
    'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,'
    'U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,'
    'U+FE76-FEFC,U+25CC'
)
HEBREW_UNICODES = 'U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F'

# Inter keeps only what the UI uses: kerning/marks, tabular figures for
# timers and scales, ss04 to tell I/l/1 apart, plus fractions and case forms.
INTER_FEATURES = [
    'ccmp', 'locl', 'mark', 'mkmk', 'kern', 'calt', 'case', 'cpsp', 'tnum',
    'pnum', 'ss04', 'zero', 'frac', 'numr', 'dnom', 'sups', 'subs', 'ordn',
]

FONTS = [
    {
        'name': 'Inter 4.1',
        'url': 'https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip',
        'sha256': '9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e',
        'member': 'InterVariable.ttf',
        'license': 'LICENSE.txt',
        # Fixing opsz at text size saves ~65 KB; the app has no display-size copy.
        'axes': {'wght': (400, 700), 'opsz': 14},
        'unicodes': INTER_UNICODES,
        'features': INTER_FEATURES,
        'out': 'inter/InterVariable.woff2',
    },
    {
        'name': 'Noto Sans Arabic 2.013',
        'url': 'https://github.com/notofonts/arabic/releases/download/'
        'NotoSansArabic-v2.013/NotoSansArabic-v2.013.zip',
        'sha256': '1301aceaea84c501cf2e6dcfb3182e2328c8eae5725817fcb239672bda7154f1',
        'member': 'NotoSansArabic/unhinted/slim-variable-ttf/NotoSansArabic[wght].ttf',
        'license': 'OFL.txt',
        'axes': None,
        'unicodes': ARABIC_UNICODES,
        # Arabic shaping needs the full feature set (init/medi/fina, rlig, curs ...).
        'features': ['*'],
        'out': 'noto-sans-arabic/NotoSansArabic.woff2',
    },
    {
        'name': 'Noto Sans Hebrew 3.001',
        'url': 'https://github.com/notofonts/hebrew/releases/download/'
        'NotoSansHebrew-v3.001/NotoSansHebrew-v3.001.zip',
        'sha256': 'df0a71814b4e63644cf40fcc4529111b61266b7a2dafbe95068b29a7520cc3cb',
        'member': 'NotoSansHebrew/unhinted/slim-variable-ttf/NotoSansHebrew[wght].ttf',
        'license': 'OFL.txt',
        'axes': None,
        'unicodes': HEBREW_UNICODES,
        'features': ['*'],
        'out': 'noto-sans-hebrew/NotoSansHebrew.woff2',
    },
]

# Japanese, Korean and Chinese deliberately use the system fonts (bundling would
# add ~17 MB), so their characters are excluded from the coverage check.
SYSTEM_RANGES = [
    (0x1100, 0x11FF), (0x2E80, 0x2FDF), (0x3000, 0x303F), (0x3040, 0x30FF),
    (0x3130, 0x318F), (0x31F0, 0x31FF), (0x3400, 0x4DBF), (0x4E00, 0x9FFF),
    (0xAC00, 0xD7AF), (0xF900, 0xFAFF), (0xFF00, 0xFFEF), (0x20000, 0x3FFFF),
]


def download(url: str, sha256: str) -> zipfile.ZipFile:
    with urllib.request.urlopen(url) as response:
        data = response.read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != sha256:
        sys.exit(f'Checksum mismatch for {url}: {digest}')
    return zipfile.ZipFile(io.BytesIO(data))


def parse_unicodes(spec: str) -> list[int]:
    return subset.parse_unicodes(spec)


def build(font: dict, workdir: Path) -> TTFont:
    archive = download(font['url'], font['sha256'])
    source = workdir / Path(font['member']).name
    source.write_bytes(archive.read(font['member']))

    # Keep the upstream timestamp so reruns produce identical files.
    tt = TTFont(source, recalcTimestamp=False)
    if font['axes']:
        instance = instancer.instantiateVariableFont(tt, font['axes'])
        # Round-trip so the subsetter sees fully compiled tables, not lazy ones.
        buffer = io.BytesIO()
        instance.save(buffer)
        buffer.seek(0)
        tt = TTFont(buffer, recalcTimestamp=False)

    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = font['features']
    options.name_IDs = ['*']
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=parse_unicodes(font['unicodes']))
    subsetter.subset(tt)

    out = FONT_DIR / font['out']
    out.parent.mkdir(parents=True, exist_ok=True)
    tt.flavor = 'woff2'
    tt.save(out)
    (out.parent / 'OFL.txt').write_bytes(archive.read(font['license']))
    print(f"{font['name']}: {out.relative_to(REPO)} {out.stat().st_size / 1024:.1f} KB")
    return tt


def check_coverage(fonts: list[TTFont]) -> None:
    covered: set[int] = set()
    for tt in fonts:
        covered |= set(tt.getBestCmap())
    missing: dict[str, set[str]] = {}
    for path in sorted(I18N_DIR.glob('*.json')):
        text = json.dumps(json.loads(path.read_text('utf-8')), ensure_ascii=False)
        for char in set(text):
            code = ord(char)
            if code < 0x20 or code in covered:
                continue
            if any(lo <= code <= hi for lo, hi in SYSTEM_RANGES):
                continue
            missing.setdefault(path.name, set()).add(f'U+{code:04X}')
    if missing:
        for name, codes in missing.items():
            print(f'not covered in {name}: {" ".join(sorted(codes))}')
        sys.exit(1)
    print('All non-CJK characters of the translations are covered.')


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        built = [build(font, Path(tmp)) for font in FONTS]
    check_coverage(built)


if __name__ == '__main__':
    main()
