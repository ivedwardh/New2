# New2

This repository holds four Claude Code skills in `.claude/skills/`.

## How to use the skills

1. Open this repository in Claude Code (CLI, desktop, web, or IDE extension).
2. Claude Code loads the skills in `.claude/skills/` automatically.
3. Type the slash command, or describe the task and Claude selects the skill.

| Skill | Command | Function | Source (commit) |
|---|---|---|---|
| chief-of-staff | `/chief-of-staff` | Routes a founder question to C-suite advisor roles and synthesizes the answers. | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) (`08cd8a9`) |
| marketing-psychology | `/marketing-psychology` | Applies 70+ mental models to pricing, persuasion, and conversion work. | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (`1f83744`) |
| anatomy | `/anatomy` | Builds interactive isometric SVG figures that explain a technical system. | [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy) (`1482e84`) |
| last30days | `/last30days <topic>` | Researches a topic across Reddit, X, Hacker News, Polymarket, GitHub, and the web for the last 30 days. | [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) (`2c38a54`, v3.37.1) |

All four skills have an MIT license. Each skill folder contains the license file.

## Requirements

- `anatomy`: Node.js 20.10 or newer, and Chrome or Chromium for the checks.
- `last30days`: Python 3 and Node.js. Reddit, Hacker News, Polymarket, and GitHub work without keys. Other sources need API keys.

## Notes on the installed copies

- `chief-of-staff` refers to other skills from its source repository (C-suite roles, `context-engine`, `agent-protocol`). These skills are not installed. The skill operates without them, with Claude filling the advisor roles directly.
- `anatomy` omits the built example pages and PDFs. Run `node .claude/skills/anatomy/examples/<name>/build.mjs` to build an example page.
- `last30days` omits the `assets/` folder (README media). Read `.claude/skills/last30days/SECURITY.md` before you run its setup or add keys.

## Not in this repository

The `Teach Me` plugin is an account-level plugin from the Anthropic Directory. Install it from the plugin card in Claude, not from this repository.
