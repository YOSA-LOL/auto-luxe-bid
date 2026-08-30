#!/usr/bin/env bash
# Usage: bash scripts/push-to-github.sh "optional branch name"
# If no name given, auto-names the branch: replit-agent/session-YYYYMMDD-HHMMSS

set -e

REPO="eng-ahmedwael/auto-luxe-bid"
TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"

if [ -z "$TOKEN" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set"
  exit 1
fi

BRANCH="${1:-replit-agent/session-$(date +%Y%m%d-%H%M%S)}"
echo "Branch: $BRANCH"

# Get current GitHub main SHA
SHA=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "User-Agent: replit-agent" \
  "https://api.github.com/repos/$REPO/git/refs/heads/main" | \
  bun -e "const d=await Bun.stdin.json(); process.stdout.write(d.object.sha)")

echo "GitHub main SHA: $SHA"

# Create the branch on GitHub from main
CREATE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "User-Agent: replit-agent" \
  "https://api.github.com/repos/$REPO/git/refs" \
  -d "{\"ref\": \"refs/heads/$BRANCH\", \"sha\": \"$SHA\"}")

CREATED_REF=$(echo "$CREATE" | bun -e "const d=await Bun.stdin.json(); process.stdout.write(d.ref || d.message || 'unknown')")
echo "Created ref: $CREATED_REF"

# Push local commits to that branch
git --no-optional-locks push \
  "https://replit-agent:${TOKEN}@github.com/${REPO}.git" \
  "HEAD:refs/heads/$BRANCH"

echo ""
echo "Pushed to: https://github.com/$REPO/tree/$BRANCH"
