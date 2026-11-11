#!/usr/bin/env bash
# Runs the OpenDollarsCore tests in WSL and prints only diagnostics and the summary.
# Usage (from Windows): wsl -d Ubuntu -- bash -lc "bash /mnt/c/<repo>/ios/scripts/test-core-wsl.sh"
# Pass --verbose to see the full output.
set -o pipefail
cd "$(dirname "$0")/../OpenDollarsCore" || exit 1

if [ "${1:-}" = "--verbose" ]; then
  swift test --scratch-path ~/.build/opendollars-core
  exit $?
fi

swift test --scratch-path ~/.build/opendollars-core 2>&1 \
  | sed -E 's/\x1b\[[0-9;]*m//g' \
  | grep -E '\.swift:[0-9]+:[0-9]+: (error|warning)|✘|recorded an issue|Expectation failed|Test run with|error: (Build|fatal)' \
  | grep -v 'Failed frontend command'
status=${PIPESTATUS[0]}
echo "swift test exit status: $status"
exit "$status"
