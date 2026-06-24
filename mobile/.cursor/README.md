# 2lakes mobile — Cursor AI setup

Adapted from [talemail](https://github.com/alienfacepalm/talemail) / Projocalypse Cursor configuration.

## Slash commands (`.cursor/commands/`)

| Command | Purpose |
|---------|---------|
| `/full-review` | Plan + code review, fix gaps, tests, commit/push/PR — loads `mobile-full-review` skill |
| `/mobile-full-review-do-not-fuck-me` | Alias of `/full-review` — same workflow |

## Project rules (`.cursor/rules/`)

| Rule | Always apply |
|------|----------------|
| `mobile-feature-ship.mdc` | **yes** |
| `mobile-branch-commit-pr.mdc` | **yes** |
| `mobile-feature-branches.mdc` | **yes** |
| `mobile-karpathy-guidelines.mdc` | **yes** |
| `mobile-tests.mdc` | **yes** |
| `mobile-dev-server.mdc` | **yes** |
| `mobile-filenames.mdc` | **yes** |
| `mobile-pnpm.mdc` | no (globs: package.json, TS) |

## Skills matrix

| Skill | Use when |
|-------|----------|
| `mobile-full-review` | End-to-end plan + code review on a feature branch: gaps, fixes, tests, commit/push/PR |
| `mobile-full-review-do-not-fuck-me` | Alias of `mobile-full-review` |
| `mobile-karpathy-guidelines` | Expanded narrative for the always-on Karpathy rule |

## Quick start for agents

1. Read [README.md](../README.md) for stack and deploy.
2. `mobile-feature-ship` + `mobile-branch-commit-pr` are always on.
3. `mobile-pnpm` + `mobile-filenames` when editing `src/**` or `package.json`.
4. `/full-review` before large PRs.
