#!/usr/bin/env bash
# Deploy basharaf-app to the VPS (the same Parspack server as meeez.me), from this Mac.
# Usage: ops/server/deploy.sh                 → https://basharaf.me
#        SITE=https://vps.basharaf.me ops/server/deploy.sh   → while testing on the staging name
#
# Ships the committed HEAD only (git archive): uncommitted or untracked work never leaves the Mac.
# The server builds it (see basharaf-release), switches atomically and rolls back if the health check fails.
set -euo pipefail

HOST=94.184.45.140
SITE=${SITE:-https://basharaf.me}
SSH=(ssh -i "$HOME/.ssh/meeez_deploy" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=30)

fail() { echo "✗ $*" >&2; exit 1; }

for tool in ssh rsync curl openssl git npm; do
  command -v "$tool" >/dev/null 2>&1 || fail "missing tool: $tool"
done

cd "$(dirname "$0")/../.."

LOCK="${TMPDIR:-/tmp}/basharaf-deploy.lock"
mkdir "$LOCK" 2>/dev/null || fail "another deploy is running (remove $LOCK if it is stale)"
TARBALL=""
trap 'rmdir "$LOCK"; [ -n "$TARBALL" ] && rm -f "$TARBALL"' EXIT

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "! uncommitted changes to tracked files are NOT deployed; only HEAD $(git rev-parse --short HEAD) is"
fi

echo "› checks"
npx tsc --noEmit >/dev/null || fail "type errors (npx tsc --noEmit)"
npx next lint --quiet >/dev/null || fail "lint errors (npx next lint)"
npx vitest run >/dev/null || fail "unit tests failed (npx vitest run)"

REL="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short=6 HEAD)"
[[ "$REL" =~ ^[0-9]{8}-[0-9]{6}-[0-9a-f]{6}$ ]] || REL="$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 3)"
TARBALL="${TMPDIR:-/tmp}/basharaf-$REL.tar.gz"
git archive --format=tar.gz -o "$TARBALL" HEAD

echo "› upload $REL ($(du -h "$TARBALL" | cut -f1))"
rsync -az -e "${SSH[*]}" "$TARBALL" "deploy@$HOST:/srv/basharaf/incoming/$REL.tar.gz"

echo "› build and install on the server (several minutes)"
set +e
"${SSH[@]}" "deploy@$HOST" "basharaf-release install $REL"
code=$?
set -e
case $code in
  0) ;;
  2) fail "release $REL failed its health check; the previous release is live again" ;;
  3) fail "release $REL failed AND the rollback failed; the app is down. Check: journalctl -u basharaf" ;;
  4) fail "another deploy or rollback is running on the server" ;;
  5) fail "build failed on the server; nothing changed (logs are under /srv/basharaf/build/)" ;;
  *) fail "install refused (exit $code)" ;;
esac

echo "› public check"
for i in 1 2 3; do
  if curl -fsS --max-time 10 -o /dev/null "$SITE/login"; then
    echo "✓ release $REL is live at $SITE"
    exit 0
  fi
  sleep 3
done
fail "the server reports $REL live, but $SITE/login does not answer. Roll back with: ${SSH[*]} deploy@$HOST basharaf-release rollback"
