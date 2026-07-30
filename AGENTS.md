# AGENTS.md — CVJungle / ats-cv

Guide for humans and AI agents working in this repository.

## What this project is

**CVJungle** is a Next.js app that helps users:

1. Upload a CV (PDF/DOCX)
2. Choose a target role
3. Get an ATS keyword match score
4. Apply AI rewrites to weak bullets
5. Generate LinkedIn headline / About / skills copy
6. Download an ATS-friendly text-based PDF
7. See **before vs after** ATS score percentages

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Vercel AI SDK, Zod, jsPDF.

---

## Quick start

```bash
pnpm install
cp .env.example .env.local
# fill in LLM keys + NEXT_PUBLIC_SITE_URL
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

| Script                              | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `pnpm dev`                          | Dev server                               |
| `pnpm build` / `pnpm start`         | Production                               |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                   |
| `pnpm format` / `pnpm format:check` | Prettier                                 |
| `pnpm typecheck`                    | `tsc --noEmit`                           |
| `pnpm commitlint`                   | Validate the current commit message file |

---

## Environment variables

Copy `.env.example` → `.env.local`.

### Required for AI features

Pick **one** provider via `LLM_PROVIDER`:

| Provider | Env                            | Free?         | Notes                                                                                                                                                               |
| -------- | ------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groq`   | `GROQ_API_KEY`                 | Yes (testing) | Default free option. Model: `llama-3.3-70b-versatile`. Structured JSON uses `lib/ai/generate-structured.ts` (text + parse), so json_schema support is not required. |
| `google` | `GOOGLE_GENERATIVE_AI_API_KEY` | Free tier     | Model: `gemini-2.0-flash`                                                                                                                                           |
| `ollama` | (local)                        | Fully free    | Run `ollama serve`; optional `OLLAMA_BASE_URL`                                                                                                                      |
| `openai` | `OPENAI_API_KEY`               | Paid          | Model: `gpt-4o-mini`                                                                                                                                                |

Optional override: `LLM_MODEL=<model-id>`.

### Site / SEO

| Var                                    | Purpose                                                         |
| -------------------------------------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Canonical URL for sitemap, OG, robots (use real domain in prod) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console HTML tag verification                            |
| `NEXT_PUBLIC_ENABLE_DEMO`              | `true` to show demo CV button (off by default)                  |

---

## LLM provider interface (switch without changing logic)

Business code **must** only call:

```ts
import { getModel } from "@/lib/ai";
```

Do **not** import `@ai-sdk/openai` / groq / google from actions or routes.

### Layout

```
lib/ai/
  index.ts              # getModel(), registry
  types.ts              # LlmProviderAdapter + AiSdkLanguageModel
  providers/
    openai.ts
    groq.ts
    google.ts
    ollama.ts
```

### Add a new provider

1. Implement `LlmProviderAdapter` in `lib/ai/providers/<name>.ts`
2. Register it in `lib/ai/index.ts`
3. Document env vars in `.env.example` and this file

No changes needed in `app/actions.ts` or API routes.

Types use `AiSdkLanguageModel` (derived from `generateObject` params) plus `asAiSdkModel()` so provider SDK major bumps (V2/V3/V4) do not break the interface.

---

## App architecture

| Path                               | Role                                       |
| ---------------------------------- | ------------------------------------------ |
| `app/page.tsx`                     | Server homepage + FAQ (SEO crawlable)      |
| `components/cv-optimizer-app.tsx`  | Client wizard UI                           |
| `lib/cv-context.tsx`               | Wizard state                               |
| `app/api/parse-cv`                 | PDF/DOCX → text                            |
| `app/api/structure-cv`             | Text → structured CV (LLM)                 |
| `app/actions.ts`                   | Keyword analysis, rewrites, LinkedIn (LLM) |
| `lib/optimize-cv.ts`               | Merge rewrites + skills                    |
| `lib/ats-score.ts`                 | Before/after score comparison              |
| `lib/generate-cv-pdf.ts`           | Text-based A4 PDF (jsPDF)                  |
| `lib/seo.ts`                       | Metadata + JSON-LD helpers                 |
| `app/robots.ts` / `app/sitemap.ts` | Crawlability                               |

Flow: Upload → Role → Analyze → Rewrites → LinkedIn → Final PDF.

Demo data lives in `lib/mock-data.ts` and is **only** used when `NEXT_PUBLIC_ENABLE_DEMO=true`. Never use mocks as a silent fallback when API keys are missing.

---

## SEO notes

### In the codebase (technical SEO)

- Metadata title/description/keywords for CV/ATS/resume queries (`lib/seo.ts`)
- Canonical URL, Open Graph, Twitter card, robots index/follow
- Dynamic OG image at `/opengraph-image`
- `robots.txt` + `sitemap.xml`
- JSON-LD: WebSite, Organization, WebPage, SoftwareApplication, HowTo, FAQPage
- Server-rendered intro + how-it-works + FAQ on the homepage (crawlable HTML)

### Required for Google to actually show CVJungle

1. Deploy on a real domain and set `NEXT_PUBLIC_SITE_URL=https://your-domain`
2. Optionally set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` from Search Console
3. Submit `https://your-domain/sitemap.xml` in [Google Search Console](https://search.google.com/search-console)
4. Request indexing for `/` and `/optimize`
5. Build topical content over time and earn backlinks — meta tags alone will not rank for competitive queries against Jobscan/Teal/etc.

Marketing homepage (`/`) is server-rendered. The interactive wizard is at `/optimize` (client provider scoped to that route).

Ranking on Google page one needs content, backlinks, and time — not code alone.

---

## Formatting & lint (on save)

### Editor (human saves)

Workspace settings in `.vscode/settings.json`:

- `editor.formatOnSave`: Prettier
- `source.fixAll.eslint`: ESLint fix on save

Install recommended extensions (`.vscode/extensions.json`):

- Prettier (`esbenp.prettier-vscode`)
- ESLint (`dbaeumer.vscode-eslint`)

### Agent edits (Cursor hooks)

`.cursor/hooks.json` runs `afterFileEdit` → `.cursor/hooks/format-on-edit.sh`, which:

1. Runs Prettier on the edited file
2. Runs `eslint --fix` for JS/TS files

Config: `.prettierrc.json`, `.prettierignore`, `eslint.config.mjs` (includes `eslint-config-prettier`).

---

## CI / Conventional Commits / Releases

### Branching (required)

- **Do not push to `main`.** Work on a feature branch, push that branch, then **open the PR yourself on GitHub** (agents must not create PRs).
- Local guard: Husky `.husky/pre-push` rejects pushes to `main` / `master`.
- Remote guard (needs `gh` + admin), run once:

```bash
./scripts/apply-github-main-ruleset.sh
```

Flow:

```
feature branch → PR → main
                 ↓
        Release Please (always after quality)
                 ↓
   release PR opened/updated  OR  release cut (tag)
                 ↓
     Deploy production (only when a release is cut)
```

1. Conventional commits on a feature branch
2. PR into `main` (CI + conventional commits must pass)
3. Merge PR → quality → **release-please**
4. Release Please opens/updates `chore: release x.y.z`
5. Merge that release PR → tag + GitHub Release → **then** production deploy

Disable Vercel “deploy on push to main” so only this workflow deploys production after a release.

### GitHub Actions

| Workflow                                     | When          | What                                          |
| -------------------------------------------- | ------------- | --------------------------------------------- |
| `.github/workflows/ci.yml`                   | PRs → `main`  | lint, format, typecheck, build                |
| `.github/workflows/conventional-commits.yml` | PRs           | Semantic PR title + commitlint                |
| `.github/workflows/release-and-deploy.yml`   | push → `main` | quality → release-please → deploy if released |

### Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(optional-scope): <lowercase subject>

feat: add session persistence for wizard
fix(seo): avoid indexing vercel previews
chore: bump rate limit defaults
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Version bumps (release-please):

- `feat:` → minor (while pre-1.0, also bumps with `bump-minor-pre-major`)
- `fix:` → patch
- `feat!:` / `BREAKING CHANGE:` → major (or minor while pre-1.0 depending on config)

Locally, Husky:

- `pre-commit` → Prettier on staged files (`lint-staged`)
- `commit-msg` → commitlint (conventional commits)
- `pre-push` → blocks pushes to `main`

### Release Please files

- `release-please-config.json` — package release type (`node`), changelog sections
- `.release-please-manifest.json` — current released version (keep in sync with `package.json`)
- `CHANGELOG.md` — maintained by Release Please

### Deploy secrets / vars

**Secrets:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, LLM keys, optional `RELEASE_PLEASE_TOKEN`  
**Vars:** `NEXT_PUBLIC_SITE_URL`, optional `LLM_PROVIDER`, `NEXT_PUBLIC_SEO_INDEX`  
**Environment:** `production` (deploy job)

### Release Please: "not permitted to create pull requests"

GitHub blocks `GITHUB_TOKEN` from opening PRs until you enable:

1. Open [Actions workflow permissions](https://github.com/olusegunakindipe/cv-jungle/settings/actions)
2. Under **Workflow permissions**:
   - Select **Read and write permissions**
   - Check **Allow GitHub Actions to create and approve pull requests**
3. Save, then re-run the failed **Release and Deploy** workflow (or push an empty commit to `main`)

Alternative: create a classic PAT with `repo` scope, add it as secret `RELEASE_PLEASE_TOKEN` (workflow already uses it when set).

---

## Conventions for agents

- Prefer editing existing files over creating new ones unless needed
- Keep LLM calls behind `@/lib/ai`
- Keep ATS PDF text-based (jsPDF), not canvas/html2pdf
- Do not invent testimonials or fake metrics in UI copy
- Do not commit secrets (`.env.local`)
- Match existing UI patterns (Tailwind, shadcn/ui components under `components/ui`)
- Use Conventional Commit messages (`feat:`, `fix:`, `chore:`, …)
- Never push directly to `main` — feature branch + PR only

---

## Deploy checklist

1. Apply main ruleset: `./scripts/apply-github-main-ruleset.sh`
2. Set GitHub secrets/vars (Vercel + LLM + `NEXT_PUBLIC_SITE_URL`)
3. Disable Vercel auto-deploy on `main` (Actions deploy after release)
4. `pnpm typecheck && pnpm lint && pnpm build` locally before PRs
5. Merge feature PR → merge release PR → confirm production deploy
6. Verify `/robots.txt` and `/sitemap.xml`
7. Register site + sitemap in Google Search Console
