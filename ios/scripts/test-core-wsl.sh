#!/usr/bin/env bash
# Runs the OpenDollarsCore tests in WSL and prints only diagnostics and the summary, then
# type-checks the generated string accessors (typecheck-strings.sh), the one app file that
# compiles without iOS.
# Usage (from Windows): wsl -d Ubuntu -- bash -lc "bash /mnt/c/<repo>/ios/scripts/test-core-wsl.sh"
# Pass --verbose to see the full output.
set -o pipefail
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPTS/../OpenDollarsCore" || exit 1

if [ "${1:-}" = "--verbose" ]; then
  swift test --scratch-path ~/.build/opendollars-core
  status=$?
else
  swift test --scratch-path ~/.build/opendollars-core 2>&1 \
    | sed -E 's/\x1b\[[0-9;]*m//g' \
    | grep -E '\.swift:[0-9]+:[0-9]+: (error|warning)|✘|recorded an issue|Expectation failed|Test run with|error: (Build|fatal)' \
    | grep -v 'Failed frontend command'
  status=${PIPESTATUS[0]}
fi
echo "swift test exit status: $status"

bash "$SCRIPTS/typecheck-strings.sh"
typecheck=$?
echo "typecheck-strings exit status: $typecheck"

[ "$status" -eq 0 ] && [ "$typecheck" -eq 0 ]
