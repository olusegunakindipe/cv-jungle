---
name: ship-cvjungle
description: >-
  Ships CVJungle changes via feature branches, conventional commits, PRs with
  full descriptions, CI checks, release-please, and post-release deploy. Use when
  the user asks to commit, push, open a PR, release, deploy, protect main, or
  follow the repo GitHub Actions / branching workflow.
disable-model-invocation: false
---

# Ship CVJungle

## Hard rules

- Never push directly to `main` / `master` (Husky `pre-push` blocks it).
- Always: feature branch → PR → merge → release-please → (optional) deploy.
- Commits and PR titles must be Conventional Commits.
- Do not commit secrets (`.env.local`, API keys, Vercel tokens).

## Workflows (what runs where)

| Workflow | Trigger | Does |
|----------|---------|------|
| `ci.yml` | PR → `main` | lint, format, typecheck, build |
| `conventional-commits.yml` | PR | semantic PR title + commitlint on all commits |
| `release-and-deploy.yml` | push → `main` | quality → release-please → deploy **only if** `release_created` |
| `dependabot.yml` | weekly | bump Actions + npm |

Pipeline after merge to `main`:

1. Quality gates  
2. Release Please opens/updates `chore: release x.y.z` **or** cuts a GitHub Release  
3. Production deploy runs **only** when a release was cut (merge the release PR)

## Agent checklist (every ship)

Copy and track:

```
- [ ] On latest main: git fetch && git switch main && git pull
- [ ] Feature branch: git switch -c <type>/<short-slug>
- [ ] Changes complete; no secrets staged
- [ ] pnpm lint && pnpm format:check && pnpm typecheck (fix if failing)
- [ ] Conventional commit(s) with body (see template)
- [ ] Push feature branch (never main)
- [ ] Open PR with title matching commits + full description (see template)
- [ ] Wait for CI + conventional-commits green
- [ ] Merge PR
- [ ] After merge: Release Please PR appears → merge when ready to release/deploy
```

## Branch naming

```
feat/<slug>     new capability
fix/<slug>      bugfix
chore/<slug>    tooling, CI, deps
docs/<slug>     docs only
ci/<slug>       workflow-only changes
```

Examples: `feat/rate-limits`, `chore/bootstrap-ci`, `fix/linkedin-about`

## Conventional commit

Format: `<type>(optional-scope): <lowercase subject>`

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

```bash
git commit -m "$(cat <<'EOF'
feat(seo): avoid indexing vercel preview deploys

Keep localhost and *.vercel.app noindex unless NEXT_PUBLIC_SEO_INDEX=true.

EOF
)"
```

Version bumps (release-please): `feat` → minor (pre-1.0), `fix` → patch, `BREAKING CHANGE` / `feat!` → major.

## PR title + description (required)

**PR title** = same style as the primary commit (checked by Actions).

**PR body** = summary only:

```markdown
## Summary
- <1–3 bullets summarizing the changes>
```

Create PR:

```bash
git push -u origin HEAD
gh pr create --base main --title "<conventional title>" --body "$(cat <<'EOF'
## Summary
- …

EOF
)"
```

## One-shot local commands

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feat/my-change
# … edit …
pnpm lint && pnpm format:check && pnpm typecheck
git add -A
git status   # verify no .env.local
git commit -m "feat: …"
git push -u origin HEAD
gh pr create --base main --fill   # or use body heredoc above
```

## Protect main (once per repo)

Requires `gh auth login` + admin:

```bash
./scripts/apply-github-main-ruleset.sh
```

Local already blocked via `.husky/pre-push`.

## First-time GitHub setup

```bash
gh auth login -h github.com -p https -w
gh repo create cvjungle --private --source=. --remote=origin
# then feature branch + PR (never push main directly if ruleset applied)
```

Repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, LLM keys, optional `RELEASE_PLEASE_TOKEN`  
Repo vars: `NEXT_PUBLIC_SITE_URL`  
Disable Vercel auto-deploy on `main` so Actions owns production after releases.

## Related files

- Workflows: `.github/workflows/`
- PR template: `.github/pull_request_template.md`
- Release Please: `release-please-config.json`, `.release-please-manifest.json`
- Commitlint: `commitlint.config.cjs`
- Human docs: `AGENTS.md`
