#!/usr/bin/env bash
# Runs Prettier + ESLint --fix after the agent edits a file.
# Cursor afterFileEdit hook: reads JSON from stdin with file_path.

set -euo pipefail

INPUT="$(cat)"

FILE_PATH="$(printf '%s' "$INPUT" | node -e '
  let data = "";
  process.stdin.on("data", (c) => (data += c));
  process.stdin.on("end", () => {
    try {
      const json = JSON.parse(data || "{}");
      process.stdout.write(String(json.file_path || json.path || ""));
    } catch {
      process.stdout.write("");
    }
  });
')"

if [[ -z "${FILE_PATH}" || ! -f "${FILE_PATH}" ]]; then
  exit 0
fi

case "${FILE_PATH}" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.css|*.md|*.yml|*.yaml)
    ;;
  *)
    exit 0
    ;;
esac

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PRETTIER="${ROOT}/node_modules/.bin/prettier"
ESLINT="${ROOT}/node_modules/.bin/eslint"

if [[ ! -x "${PRETTIER}" ]]; then
  PRETTIER="pnpm exec prettier"
fi
if [[ ! -x "${ESLINT}" ]]; then
  ESLINT="pnpm exec eslint"
fi

# shellcheck disable=SC2086
${PRETTIER} --write --ignore-unknown "${FILE_PATH}" >/dev/null 2>&1 || true

case "${FILE_PATH}" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    # shellcheck disable=SC2086
    ${ESLINT} --fix "${FILE_PATH}" >/dev/null 2>&1 || true
    ;;
esac

exit 0
