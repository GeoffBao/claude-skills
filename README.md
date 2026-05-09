# claude-skills

A collection of custom skills for [Claude Code](https://claude.ai/code).

## Skills

### [webup-statusline](./webup-statusline/)

Generate and install a custom Claude Code status line with selectable columns and color themes.

**Features:**
- Model name, thinking mode, context bar with token counts (used/total)
- Input/output token breakdown
- Session cost, reasoning effort level, output style
- 5-hour and 7-day API rate limit progress bars with reset countdowns
- Git branch (dirty detection), directory, worktree
- Two-line layout support via `--line2`
- Themes: Gruvbox Dark, Dracula, Robbyrussell, Minimal

**Install:**
```bash
# Copy skill to Claude Code skills directory
cp -r webup-statusline ~/.claude/skills/

# Generate and install (interactive)
/webup-statusline

# Or with flags directly
npx -y bun ~/.claude/skills/webup-statusline/scripts/generate.mjs \
  --elements model,thinking,context,io,cost,effort,five_hour,week,git,dir \
  --line2 five_hour,week,git,dir \
  --theme gruvbox \
  --install
```

Restart Claude Code after installation.

## Requirements

- [Claude Code](https://claude.ai/code) (CLI or desktop app)
- `jq` — for JSON parsing in the generated status line script
- `bun` or `npx` — to run the generator script
