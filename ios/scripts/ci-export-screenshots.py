#!/usr/bin/env python3
"""Exports the attachments of an .xcresult (screenshots, and what XCTest adds on a failure) under
readable names.

Usage: python3 -I ci-export-screenshots.py <result.xcresult> <output dir>

Runs `xcrun xcresulttool export attachments` (Xcode 16+), which writes the files under generated
names plus a manifest.json, then copies each attachment to <output dir>/<attachment name><ext>.
Names are made safe for actions/upload-artifact first: XCTest names its own attachments after the
query (Debug description for "account.title" Any), and one refused character fails the whole
upload, failure captures included. Tests: test_ci_export_screenshots.py.
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Refused by actions/upload-artifact (NTFS limits): " : < > | * ? CR LF. Path separators too, so a
# name never turns into a folder.
_REFUSED = re.compile(r'[":<>|*?\r\n/\\]')


def safe_name(name: str) -> str:
    """The attachment's name with every refused character replaced by "_"."""
    return _REFUSED.sub("_", name) or "attachment"


def unique_path(output: Path, stem: str, suffix: str, taken: set) -> Path:
    """<output>/<stem><suffix>, numbered when two attachments end up with the same name."""
    candidate, number = output / f"{stem}{suffix}", 2
    while candidate in taken:
        candidate = output / f"{stem}-{number}{suffix}"
        number += 1
    taken.add(candidate)
    return candidate


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    result, output = Path(sys.argv[1]), Path(sys.argv[2])
    output.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as raw:
        subprocess.run(
            ["xcrun", "xcresulttool", "export", "attachments", "--path", str(result), "--output-path", raw],
            check=True)
        manifest_path = Path(raw) / "manifest.json"
        taken = set()
        if not manifest_path.exists():
            # Unknown layout: keep whatever was exported.
            for item in Path(raw).iterdir():
                shutil.copy(item, unique_path(output, safe_name(item.stem), item.suffix, taken))
            print(f"No manifest.json; copied raw files to {output}")
            return

        count = 0
        for test in json.loads(manifest_path.read_text(encoding="utf-8")):
            for attachment in test.get("attachments", []):
                exported = Path(raw) / attachment["exportedFileName"]
                name = attachment.get("suggestedHumanReadableName") or exported.name
                # Drop the index suffix xcresulttool appends. Split on the last dot by hand: a
                # name like 'for "account.title" Any' has dots that are not an extension.
                stem = name.rsplit(".", 1)[0] if "." in name[-6:] else name
                stem = stem.split("_0_")[0]
                shutil.copy(exported, unique_path(output, safe_name(stem), exported.suffix or ".png", taken))
                count += 1
        print(f"Exported {count} attachments to {output}")
        if count == 0:
            sys.exit("No screenshots found in the result bundle")


if __name__ == "__main__":
    main()
