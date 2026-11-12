"""Extract the localized "What's new" texts from the app's i18n files.

Default mode writes all languages into one translationtext.txt (unchanged legacy behaviour).
With --fastlane the texts are written as fastlane metadata, so deliver (App Store) and
supply (Google Play) can upload every language in one step instead of pasting them by hand.
"""

import argparse
import html
import json
import re
import sys
from pathlib import Path

LEGACY_DEFAULT_VERSION = "8.8.0"

# App Store Connect limits "What's New" to 4000 characters, Google Play release notes to 500.
APP_STORE_LIMIT = 4000
GOOGLE_PLAY_LIMIT = 500

# App language (file name in src/assets/i18n) -> (App Store Connect locale, Google Play locale).
# Store locales are fixed lists, so this table is the single place to keep them in sync:
# - App Store: fastlane deliver "Available language codes" (docs.fastlane.tools/actions/deliver)
# - Google Play: Play Console "Add translations" list
#   (support.google.com/googleplay/android-developer/answer/9844778)
# None means "do not upload". Portuguese stays None until it is confirmed whether the store
# listings use pt-BR or pt-PT, because deliver activates every language folder it finds.
STORE_LOCALES = {
    "ar": ("ar-SA", "ar"),
    "ca": ("ca", "ca"),
    "cs": ("cs", "cs-CZ"),
    "de": ("de-DE", "de-DE"),
    "el": ("el", "el-GR"),
    "en": ("en-US", "en-US"),
    "es": ("es-ES", "es-ES"),
    "fr": ("fr-FR", "fr-FR"),
    "he": ("he", "iw-IL"),
    "id": ("id", "id"),
    "it": ("it", "it-IT"),
    "ja": ("ja", "ja-JP"),
    "ko": ("ko", "ko-KR"),
    "nl": ("nl-NL", "nl-NL"),
    "no": ("no", "no-NO"),
    "pl": ("pl", "pl-PL"),
    "pt": (None, None),
    "ru": ("ru", "ru-RU"),
    "sk": ("sk", "sk"),
    "tr": ("tr", "tr-TR"),
    "zh": ("zh-Hans", "zh-CN"),
    "zh_TW": ("zh-Hant", "zh-TW"),
}

BULLET = "• "
_HEADING = re.compile(r"^\s*<b>(.*)</b>\s*$", re.IGNORECASE | re.DOTALL)


def clean_text(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).strip()


def read_description(i18n_file: Path, version: str):
    """Return the DESCRIPTION list for a version, or None if that version is not translated."""
    with i18n_file.open(encoding="utf-8") as f:
        data = json.load(f)
    description = data.get("UPDATE_TEXT_TITLE_TITLE", {}).get(version, {}).get("DESCRIPTION")
    if not isinstance(description, list) or not any(str(item).strip() for item in description):
        return None
    return description


def format_store_text(description) -> str:
    """Turn the in-app list into plain store text: headings on their own line, items as bullets.

    Stores render plain text only, so HTML is removed and entities are decoded.
    """
    lines = []
    for item in description:
        raw = str(item)
        text = html.unescape(clean_text(raw))
        if not text:
            if lines and lines[-1] != "":
                lines.append("")
        elif _HEADING.match(raw):
            lines.append(text)
        else:
            lines.append(BULLET + text)
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def headings_only(description) -> str:
    """Section headings as bullets; used when the full text exceeds Google Play's limit."""
    headings = [html.unescape(clean_text(str(item))) for item in description if _HEADING.match(str(item))]
    return "\n".join(BULLET + h for h in headings if h)


def read_version_code(build_gradle: Path) -> str:
    match = re.search(r"^\s*versionCode\s+(\d+)", build_gradle.read_text(encoding="utf-8"), re.MULTILINE)
    if not match:
        raise ValueError(f"No versionCode found in {build_gradle}")
    return match.group(1)


def write_fastlane_metadata(input_dir: Path, metadata_dir: Path, version: str, version_code: str,
                            fallback: str = None, warn=None):
    """Write release notes for every mapped language and return the list of warnings."""
    warnings = []

    def warning(message):
        warnings.append(message)
        if warn:
            warn(message)

    fallback_description = None
    if fallback:
        fallback_file = input_dir / f"{fallback}.json"
        fallback_description = read_description(fallback_file, version) if fallback_file.exists() else None
        if fallback_description is None:
            warning(f"fallback language '{fallback}' has no text for version {version}")

    for json_file in sorted(input_dir.glob("*.json")):
        lang = json_file.stem
        if lang not in STORE_LOCALES:
            warning(f"{lang}: no store locale mapping, skipped")
            continue
        app_store_locale, play_locale = STORE_LOCALES[lang]
        if not app_store_locale and not play_locale:
            # A deliberate gap in the table, so it must not fail --strict on every run.
            print(f"note: {lang}: no store locale configured, skipped", file=sys.stderr)
            continue

        ios_file = metadata_dir / app_store_locale / "release_notes.txt" if app_store_locale else None
        play_file = (metadata_dir / "android" / play_locale / "changelogs" / f"{version_code}.txt"
                     if play_locale else None)

        description = read_description(json_file, version)
        if description is None and fallback_description is not None and lang != fallback:
            warning(f"{lang}: no text for version {version}, using '{fallback}'")
            description = fallback_description
        if description is None:
            warning(f"{lang}: no text for version {version}, skipped")
            # The iOS file name carries no version, so a stale one would upload old notes.
            if ios_file and ios_file.exists():
                ios_file.unlink()
            continue

        text = format_store_text(description)

        if ios_file:
            if len(text) > APP_STORE_LIMIT:
                warning(f"{lang} ({app_store_locale}): {len(text)} characters exceed "
                        f"the App Store limit of {APP_STORE_LIMIT}")
            ios_file.parent.mkdir(parents=True, exist_ok=True)
            ios_file.write_text(text + "\n", encoding="utf-8")

        if play_file:
            play_text = text
            if len(play_text) > GOOGLE_PLAY_LIMIT:
                # Google rejects longer notes; the section headings still say what changed.
                play_text = headings_only(description)
                print(f"note: {lang} ({play_locale}): full text has {len(text)} characters, "
                      f"Google Play gets the section headings only ({len(play_text)})", file=sys.stderr)
            if len(play_text) > GOOGLE_PLAY_LIMIT:
                warning(f"{lang} ({play_locale}): {len(play_text)} characters exceed "
                        f"the Google Play limit of {GOOGLE_PLAY_LIMIT}")
            play_file.parent.mkdir(parents=True, exist_ok=True)
            play_file.write_text(play_text + "\n", encoding="utf-8")

    return warnings


def write_translation_text(input_dir: Path, output_dir: Path, version: str):
    output_file = output_dir / "translationtext.txt"

    with output_file.open("w", encoding="utf-8") as out_f:
        for json_file in input_dir.glob("*.json"):
            lang = json_file.stem
            with json_file.open(encoding="utf-8") as f:
                data = json.load(f)

            main_section = data.get("UPDATE_TEXT_TITLE_TITLE", {})
            version_data = main_section.get(version, {})
            description_list = version_data.get("DESCRIPTION", [])

            out_f.write(f"=== {lang} ===\n")
            for item in description_list:
                if isinstance(item, str):
                    cleaned = clean_text(item)
                    out_f.write(f"{cleaned}\n")
                else:
                    out_f.write(f"{str(item)}\n")
            out_f.write("\n")  # blank line between languages


def main(argv=None):
    parser = argparse.ArgumentParser(description="Extract and clean update text from JSON files.")
    parser.add_argument("input_dir", type=Path, help="Path to the directory containing JSON files.")
    parser.add_argument("output_dir", type=Path, nargs="?",
                        help="Path to the directory where translationtext.txt will be created.")
    parser.add_argument("--version", help="App version key, e.g. 9.0.0 (required with --fastlane; "
                                          f"default {LEGACY_DEFAULT_VERSION} otherwise).")
    parser.add_argument("--fastlane", type=Path, metavar="METADATA_DIR",
                        help="Write fastlane metadata (e.g. fastlane/metadata) instead of translationtext.txt.")
    parser.add_argument("--version-code", help="Android versionCode for the changelog file name "
                                               "(default: read from android/app/build.gradle).")
    parser.add_argument("--fallback", metavar="LANG",
                        help="Use this language's text where a translation is missing, e.g. en.")
    parser.add_argument("--strict", action="store_true", help="Exit with status 1 if any warning occurred.")
    args = parser.parse_args(argv)

    if not args.fastlane:
        if args.output_dir is None:
            parser.error("output_dir is required unless --fastlane is given")
        write_translation_text(args.input_dir, args.output_dir, args.version or LEGACY_DEFAULT_VERSION)
        return 0

    if not args.version:
        parser.error("--version is required with --fastlane")

    version_code = args.version_code
    if not version_code:
        build_gradle = Path(__file__).resolve().parent.parent / "android" / "app" / "build.gradle"
        version_code = read_version_code(build_gradle)

    warnings = write_fastlane_metadata(
        args.input_dir, args.fastlane, args.version, version_code, args.fallback,
        warn=lambda message: print(f"warning: {message}", file=sys.stderr),
    )
    print(f"Wrote release notes for {args.version} (Android versionCode {version_code}) to {args.fastlane}")
    return 1 if args.strict and warnings else 0


if __name__ == "__main__":
    sys.exit(main())
