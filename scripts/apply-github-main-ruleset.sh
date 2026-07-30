#!/usr/bin/env bash
# Apply GitHub ruleset: no direct pushes to main — PRs only.
# Requires: gh auth login (repo admin).
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI first: https://cli.github.com/"
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Applying main branch ruleset on $REPO …"

# Delete existing ruleset with the same name (idempotent-ish)
EXISTING_ID="$(gh api "repos/$REPO/rulesets" --jq '.[] | select(.name=="Protect main") | .id' 2>/dev/null || true)"
if [[ -n "${EXISTING_ID:-}" ]]; then
  echo "Updating existing ruleset id=$EXISTING_ID"
  METHOD=(gh api --method PUT "repos/$REPO/rulesets/$EXISTING_ID")
else
  METHOD=(gh api --method POST "repos/$REPO/rulesets")
fi

"${METHOD[@]}" \
  --input - <<'EOF'
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "required_reviewers": [],
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "deletion"
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "Lint · Format · Typecheck · Build" },
          { "context": "PR title" },
          { "context": "Commit messages" }
        ]
      }
    }
  ],
  "bypass_actors": []
}
EOF

echo "Done. main now requires a pull request (no direct pushes)."
echo "Required checks: CI quality job + conventional commit checks."
