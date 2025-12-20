import argparse
from pathlib import Path
import json
import re

def clean_text(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).strip()

def main():
    parser = argparse.ArgumentParser(description="Extract and clean update text from JSON files.")
    parser.add_argument("input_dir", type=Path, help="Path to the directory containing JSON files.")
    parser.add_argument("output_dir", type=Path, help="Path to the directory where output file will be created.")
    args = parser.parse_args()

    input_dir = args.input_dir
    output_dir = args.output_dir
    output_file = output_dir / "translationtext.txt"

    with output_file.open("w", encoding="utf-8") as out_f:
        for json_file in input_dir.glob("*.json"):
            lang = json_file.stem
            with json_file.open(encoding="utf-8") as f:
                data = json.load(f)

            main_section = data.get("UPDATE_TEXT_TITLE_TITLE", {})
            version_data = main_section.get("8.5.0", {})
            description_list = version_data.get("DESCRIPTION", [])

            out_f.write(f"=== {lang} ===\n")
            for item in description_list:
                if isinstance(item, str):
                    cleaned = clean_text(item)
                    out_f.write(f"{cleaned}\n")
                else:
                    out_f.write(f"{str(item)}\n")
            out_f.write("\n")  # blank line between languages

if __name__ == "__main__":
    main()
