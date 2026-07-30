## Summary
<!-- 1–3 bullets: why this change exists -->
-

## Changes
<!-- Notable behavior / files -->
-

## Workflows / release impact
- [ ] CI only (no release notes expected)
- [ ] Includes `feat` / `fix` that should appear in CHANGELOG
- [ ] Docs / chore only

## Test plan
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm typecheck`
- [ ] `pnpm build` (or CI)
- [ ] Manual path through `/optimize` if UI changed

## Deploy notes
- Secrets/vars needed: none
- Follows **release-please → deploy** (production deploy only when a release is cut)
