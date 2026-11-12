import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

# The script name is not a valid module name, so it is loaded by path.
_SCRIPT = Path(__file__).resolve().parent.parent / "extractTranslations.py"
_spec = importlib.util.spec_from_file_location("extract_translations", _SCRIPT)
et = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(et)

I18N_DIR = Path(__file__).resolve().parents[2] / "src" / "assets" / "i18n"

DESCRIPTION = ["<b>Scales</b>", "Added the Futula scale", "", "<b>Other</b>", "Fixes &amp; improvements"]


def write_i18n(directory: Path, lang: str, versions: dict):
    data = {"UPDATE_TEXT_TITLE_TITLE": {v: {"TITLE": v, "DESCRIPTION": d} for v, d in versions.items()}}
    (directory / f"{lang}.json").write_text(json.dumps(data), encoding="utf-8")


class StoreLocalesTest(unittest.TestCase):
    def test_every_app_language_has_an_entry(self):
        app_languages = {path.stem for path in I18N_DIR.glob("*.json")}
        self.assertEqual(app_languages, set(et.STORE_LOCALES))

    def test_store_specific_codes(self):
        self.assertEqual(et.STORE_LOCALES["he"], ("he", "iw-IL"))
        self.assertEqual(et.STORE_LOCALES["no"], ("no", "no-NO"))
        self.assertEqual(et.STORE_LOCALES["zh"], ("zh-Hans", "zh-CN"))
        self.assertEqual(et.STORE_LOCALES["zh_TW"], ("zh-Hant", "zh-TW"))
        self.assertEqual(et.STORE_LOCALES["en"], ("en-US", "en-US"))

    def test_store_locales_are_unique(self):
        ios = [ios for ios, _ in et.STORE_LOCALES.values() if ios]
        play = [play for _, play in et.STORE_LOCALES.values() if play]
        self.assertEqual(len(ios), len(set(ios)))
        self.assertEqual(len(play), len(set(play)))


class FormatTest(unittest.TestCase):
    def test_headings_plain_items_bulleted_html_removed(self):
        self.assertEqual(
            et.format_store_text(DESCRIPTION),
            "Scales\n• Added the Futula scale\n\nOther\n• Fixes & improvements",
        )

    def test_repeated_and_trailing_blank_lines_collapse(self):
        self.assertEqual(et.format_store_text(["", "<b>A</b>", "", "", "x", ""]), "A\n\n• x")

    def test_headings_only(self):
        self.assertEqual(et.headings_only(DESCRIPTION), "• Scales\n• Other")


class FastlaneMetadataTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        root = Path(self._tmp.name)
        self.i18n = root / "i18n"
        self.i18n.mkdir()
        self.out = root / "metadata"

    def tearDown(self):
        self._tmp.cleanup()

    def run_write(self, **kwargs):
        with contextlib.redirect_stderr(io.StringIO()):
            return et.write_fastlane_metadata(self.i18n, self.out, "9.0.0", "90000", **kwargs)

    def test_writes_ios_and_android_files_per_locale(self):
        write_i18n(self.i18n, "en", {"9.0.0": DESCRIPTION})
        write_i18n(self.i18n, "he", {"9.0.0": DESCRIPTION})

        self.assertEqual(self.run_write(), [])

        expected = "Scales\n• Added the Futula scale\n\nOther\n• Fixes & improvements\n"
        for path in ("en-US/release_notes.txt", "he/release_notes.txt",
                     "android/en-US/changelogs/90000.txt", "android/iw-IL/changelogs/90000.txt"):
            self.assertEqual((self.out / path).read_text(encoding="utf-8"), expected, path)

    def test_missing_translation_warns_and_removes_stale_ios_notes(self):
        write_i18n(self.i18n, "de", {"8.8.0": DESCRIPTION})
        stale = self.out / "de-DE" / "release_notes.txt"
        stale.parent.mkdir(parents=True)
        stale.write_text("old", encoding="utf-8")

        warnings = self.run_write()

        self.assertEqual(len(warnings), 1)
        self.assertIn("de", warnings[0])
        self.assertFalse(stale.exists())
        self.assertFalse((self.out / "android" / "de-DE").exists())

    def test_fallback_language_fills_missing_translation(self):
        write_i18n(self.i18n, "en", {"9.0.0": DESCRIPTION})
        write_i18n(self.i18n, "ko", {"8.8.0": ["old"]})

        warnings = self.run_write(fallback="en")

        self.assertEqual(len(warnings), 1)
        self.assertIn("Futula", (self.out / "ko" / "release_notes.txt").read_text(encoding="utf-8"))

    def test_unconfigured_language_is_skipped_and_unknown_language_warns(self):
        write_i18n(self.i18n, "pt", {"9.0.0": DESCRIPTION})
        write_i18n(self.i18n, "xx", {"9.0.0": DESCRIPTION})

        warnings = self.run_write()

        self.assertEqual(len(warnings), 1)
        self.assertIn("xx", warnings[0])
        self.assertFalse(self.out.exists())

    def test_long_text_uses_headings_on_google_play_and_warns_over_app_store_limit(self):
        long_description = ["<b>Brews</b>", "x" * 4100]
        write_i18n(self.i18n, "en", {"9.0.0": long_description})

        warnings = self.run_write()

        self.assertEqual(len(warnings), 1)
        self.assertIn("App Store", warnings[0])
        play = (self.out / "android" / "en-US" / "changelogs" / "90000.txt").read_text(encoding="utf-8")
        self.assertEqual(play, "• Brews\n")

    def test_warns_when_headings_still_exceed_google_play_limit(self):
        write_i18n(self.i18n, "en", {"9.0.0": [f"<b>{'h' * 300}</b>", f"<b>{'h' * 300}</b>"]})

        warnings = self.run_write()

        self.assertEqual(len(warnings), 1)
        self.assertIn("Google Play", warnings[0])


class CommandLineTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        write_i18n(self.root, "en", {"8.8.0": DESCRIPTION})

    def tearDown(self):
        self._tmp.cleanup()

    def test_legacy_mode_still_writes_translationtext(self):
        self.assertEqual(et.main([str(self.root), str(self.root)]), 0)
        text = (self.root / "translationtext.txt").read_text(encoding="utf-8")
        self.assertEqual(text, "=== en ===\nScales\nAdded the Futula scale\n\nOther\nFixes &amp; improvements\n\n")

    def test_fastlane_mode_requires_version(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            et.main([str(self.root), "--fastlane", str(self.root / "metadata")])

    def test_strict_fails_on_warnings(self):
        args = [str(self.root), "--fastlane", str(self.root / "metadata"), "--version", "9.0.0",
                "--version-code", "90000"]
        with contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(et.main(args), 0)
            self.assertEqual(et.main(args + ["--strict"]), 1)

    def test_version_code_is_read_from_build_gradle(self):
        gradle = self.root / "build.gradle"
        gradle.write_text('defaultConfig {\n        versionCode 80801\n        versionName "8.8.1"\n}\n')
        self.assertEqual(et.read_version_code(gradle), "80801")


if __name__ == "__main__":
    unittest.main()
