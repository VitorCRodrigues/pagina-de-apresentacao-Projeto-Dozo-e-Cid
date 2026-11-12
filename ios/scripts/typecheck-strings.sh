#!/usr/bin/env bash
# Type-checks OpenDollars/Generated/Strings.generated.swift with Foundation only, so a generator
# bug (a bad name, label or argument type) shows up on Linux or WSL before the push, not in the
# macOS CI build. The app's L10n needs UIKit-free but iOS-only pieces (os locks, the core module),
# so a stub with the same two signatures stands in for it; the script fails if the real
# signatures change without the stub.
# Usage: bash ios/scripts/typecheck-strings.sh   (test-core-wsl.sh runs it too)
set -euo pipefail
cd "$(dirname "$0")/.."

L10N=OpenDollars/DesignSystem/L10n.swift
TEXT_SIGNATURE='static func text(_ key: String) -> String {'
FORMAT_SIGNATURE='static func format(_ key: String, _ arguments: any CVarArg...) -> String {'
for signature in "$TEXT_SIGNATURE" "$FORMAT_SIGNATURE"; do
  if ! grep -qF "$signature" "$L10N"; then
    echo "typecheck-strings: '$signature' is no longer in $L10N; update the stub in $0" >&2
    exit 1
  fi
done

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cat > "$WORK/L10nStub.swift" <<EOF
import Foundation
enum L10n {
    $TEXT_SIGNATURE key }
    $FORMAT_SIGNATURE key }
}
EOF

swiftc -swift-version 6 -typecheck "$WORK/L10nStub.swift" OpenDollars/Generated/Strings.generated.swift
echo "typecheck-strings: Strings.generated.swift type-checks"
