#!/usr/bin/env python3
"""Exports the screenshot attachments of an .xcresult as readable PNG names.

Usage: python3 -I ci-export-screenshots.py <result.xcresult> <output dir>

Runs `xcrun xcresulttool export attachments` (Xcode 16+), which writes the files under generated
names plus a manifest.json, then copies each attachment to <output dir>/<attachment name>.png.
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


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
        if not manifest_path.exists():
            # Unknown layout: keep whatever was exported.
            for item in Path(raw).iterdir():
                shutil.copy(item, output / item.name)
            print(f"No manifest.json; copied raw files to {output}")
            return

        count = 0
        for test in json.loads(manifest_path.read_text(encoding="utf-8")):
            for attachment in test.get("attachments", []):
                exported = Path(raw) / attachment["exportedFileName"]
                name = attachment.get("suggestedHumanReadableName") or exported.name
                stem = Path(name).stem.split("_0_")[0]  # drop the index suffix xcresulttool appends
                shutil.copy(exported, output / f"{stem}{exported.suffix or '.png'}")
                count += 1
        print(f"Exported {count} screenshots to {output}")
        if count == 0:
            sys.exit("No screenshots found in the result bundle")


if __name__ == "__main__":
    main()
