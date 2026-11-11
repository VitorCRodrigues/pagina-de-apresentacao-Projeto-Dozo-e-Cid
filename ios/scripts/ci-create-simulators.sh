#!/usr/bin/env bash
# Creates the two screenshot simulators (iPhone 15 and iPhone SE 3rd generation, 375 pt wide) on
# the newest installed iOS runtime, boots them with a clean status bar, and writes their UDIDs to
# $GITHUB_OUTPUT as iphone15 and iphonese. The runner image does not ship these two devices
# pre-created, so they are made here from their device types.
set -euo pipefail

RUNTIME=$(xcrun simctl list runtimes --json | python3 -I -c '
import json, sys
runtimes = [r for r in json.load(sys.stdin)["runtimes"] if r.get("platform") == "iOS" and r.get("isAvailable")]
if not runtimes:
    sys.exit("No available iOS simulator runtime")
runtimes.sort(key=lambda r: [int(p) for p in r["version"].split(".")])
print(runtimes[-1]["identifier"])
')
echo "iOS runtime: $RUNTIME"

create() {
  local name="$1" type="$2" udid
  # Only the UDID goes to stdout (the caller captures it); diagnostics go to stderr.
  if ! udid=$(xcrun simctl create "$name" "$type" "$RUNTIME"); then
    echo "::error::Could not create $name ($type) on $RUNTIME. Device types available:" >&2
    xcrun simctl list devicetypes | grep -i iphone >&2
    exit 1
  fi
  xcrun simctl boot "$udid" >&2
  xcrun simctl bootstatus "$udid" -b >&2
  xcrun simctl status_bar "$udid" override --time "9:41" --batteryState charged --batteryLevel 100 \
    --cellularMode active --cellularBars 4 --wifiBars 3 >&2
  echo "$udid"
}

IPHONE15=$(create "OD iPhone 15" "com.apple.CoreSimulator.SimDeviceType.iPhone-15" | tail -1)
IPHONESE=$(create "OD iPhone SE" "com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation" | tail -1)

echo "iPhone 15: $IPHONE15"
echo "iPhone SE: $IPHONESE"
{
  echo "iphone15=$IPHONE15"
  echo "iphonese=$IPHONESE"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"
