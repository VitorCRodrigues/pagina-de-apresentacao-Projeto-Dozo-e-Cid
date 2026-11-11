#!/usr/bin/env bash
# Creates the two screenshot simulators (iPhone 15 and iPhone SE 3rd generation, 375 pt wide) on
# the newest installed iOS runtime, boots them with a clean status bar, and writes their UDIDs to
# $GITHUB_OUTPUT as iphone15 and iphonese. The runner image does not ship these two devices
# pre-created, so they are made here from their device types.
#
# The first boot of a fresh device takes about 6 minutes (data migration of the runtime), so both
# boot at the same time instead of one after the other.
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
  if ! udid=$(xcrun simctl create "$name" "$type" "$RUNTIME"); then
    echo "::error::Could not create $name ($type) on $RUNTIME. Device types available:" >&2
    xcrun simctl list devicetypes | grep -i iphone >&2
    exit 1
  fi
  echo "$udid"
}

IPHONE15=$(create "OD iPhone 15" "com.apple.CoreSimulator.SimDeviceType.iPhone-15")
IPHONESE=$(create "OD iPhone SE" "com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation")
echo "iPhone 15: $IPHONE15"
echo "iPhone SE: $IPHONESE"

# Boot both, then wait for both in parallel; fail if either does not finish booting.
xcrun simctl boot "$IPHONE15"
xcrun simctl boot "$IPHONESE"
xcrun simctl bootstatus "$IPHONE15" -b > /tmp/bootstatus-iphone15.log 2>&1 &
WAIT15=$!
xcrun simctl bootstatus "$IPHONESE" -b > /tmp/bootstatus-iphonese.log 2>&1 &
WAITSE=$!
STATUS=0
wait "$WAIT15" || { echo "::error::OD iPhone 15 did not boot"; tail -20 /tmp/bootstatus-iphone15.log; STATUS=1; }
wait "$WAITSE" || { echo "::error::OD iPhone SE did not boot"; tail -20 /tmp/bootstatus-iphonese.log; STATUS=1; }
[ "$STATUS" -eq 0 ] || exit 1
echo "Both simulators booted."

for udid in "$IPHONE15" "$IPHONESE"; do
  xcrun simctl status_bar "$udid" override --time "9:41" --batteryState charged --batteryLevel 100 \
    --cellularMode active --cellularBars 4 --wifiBars 3
done

{
  echo "iphone15=$IPHONE15"
  echo "iphonese=$IPHONESE"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"
