#!/usr/bin/env bun
// Generate a custom Claude Code status line shell script
//
// Usage: bun generate.mjs --elements model,thinking,context,io,cost,effort,five_hour,week,git,dir \
//                         --line2 five_hour,week,git,dir --theme gruvbox --install

import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const args = process.argv.slice(2)
function getArg(name, def) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def
}
const hasFlag = (name) => args.includes(`--${name}`)

const elements = getArg('elements', 'model,context,cost,effort,style,git,dir').split(',').map(s => s.trim())
const theme = getArg('theme', 'gruvbox')
const effortIconFlag = getArg('effort-icon', '')
const install = hasFlag('install')

// Elements that appear on line 2 (empty = single-line layout)
const line2Elements = new Set(
  getArg('line2', '').split(',').map(s => s.trim()).filter(Boolean)
)
const multiLine = line2Elements.size > 0

// Returns which parts array a given element belongs to
function partsArr(elementName) {
  return (multiLine && line2Elements.has(elementName)) ? 'line2_parts' : 'line1_parts'
}

// ── Theme definitions ──────────────────────────────────────────────
const themes = {
  gruvbox: {
    name: 'Gruvbox Dark',
    model:     '\\033[38;2;86;182;194m',
    ctx_ok:    '\\033[38;2;142;192;124m',
    ctx_warn:  '\\033[38;2;250;189;47m',
    ctx_low:   '\\033[38;2;251;73;52m',
    bar_empty: '\\033[38;2;80;73;69m',
    pct:       '\\033[38;2;251;241;199m',
    dir:       '\\033[38;2;152;195;121m',
    git:       '\\033[38;2;143;175;209m',
    git_dirty: '\\033[38;2;224;175;104m',
    vim:       '\\033[38;2;214;93;14m',
    worktree:  '\\033[38;2;211;134;155m',
    style:     '\\033[38;2;177;98;134m',
    cost:      '\\033[38;2;215;153;33m',
    effort_high: '\\033[1;38;2;251;73;52m',
    effort_med:  '\\033[38;2;250;189;47m',
    effort_low:  '\\033[38;2;142;192;124m',
    effort_off:  '\\033[2;38;2;168;153;132m',
    thinking:  '\\033[38;2;86;182;194m',
    io:        '\\033[38;2;168;153;132m',
    rate_ok:   '\\033[38;2;142;192;124m',
    rate_warn: '\\033[38;2;250;189;47m',
    rate_full: '\\033[38;2;251;73;52m',
    sep:       '\\033[38;2;102;92;84m',
    separator: ' | ',
    bar_chars: ['■', '□'],
  },
  robbyrussell: {
    name: 'Robbyrussell',
    model:     '\\033[38;5;45m',
    ctx_ok:    '\\033[38;5;32m',
    ctx_warn:  '\\033[38;5;220m',
    ctx_low:   '\\033[38;5;196m',
    bar_empty: '\\033[2m',
    pct:       '\\033[38;5;220m',
    dir:       '\\033[38;5;39m',
    git:       '\\033[38;5;32m',
    git_dirty: '\\033[38;5;220m',
    vim:       '\\033[38;5;45m',
    worktree:  '\\033[38;5;170m',
    style:     '\\033[38;5;135m',
    cost:      '\\033[38;5;172m',
    effort_high: '\\033[1;38;5;196m',
    effort_med:  '\\033[38;5;220m',
    effort_low:  '\\033[38;5;32m',
    effort_off:  '\\033[2m',
    thinking:  '\\033[38;5;45m',
    io:        '\\033[2m',
    rate_ok:   '\\033[38;5;32m',
    rate_warn: '\\033[38;5;220m',
    rate_full: '\\033[38;5;196m',
    sep:       '\\033[2m',
    separator: ' · ',
    bar_chars: ['━', '─'],
  },
  minimal: {
    name: 'Minimal',
    model:     '\\033[0m',
    ctx_ok:    '\\033[32m',
    ctx_warn:  '\\033[33m',
    ctx_low:   '\\033[31m',
    bar_empty: '\\033[2m',
    pct:       '\\033[0m',
    dir:       '\\033[2m',
    git:       '\\033[0m',
    git_dirty: '\\033[33m',
    vim:       '\\033[0m',
    worktree:  '\\033[2m',
    style:     '\\033[0m',
    cost:      '\\033[33m',
    effort_high: '\\033[1;31m',
    effort_med:  '\\033[33m',
    effort_low:  '\\033[32m',
    effort_off:  '\\033[2m',
    thinking:  '\\033[36m',
    io:        '\\033[2m',
    rate_ok:   '\\033[32m',
    rate_warn: '\\033[33m',
    rate_full: '\\033[31m',
    sep:       '\\033[2m',
    separator: ' · ',
    bar_chars: ['▰', '▱'],
  },
  dracula: {
    name: 'Dracula',
    model:     '\\033[38;2;189;147;249m',
    ctx_ok:    '\\033[38;2;80;250;123m',
    ctx_warn:  '\\033[38;2;241;250;140m',
    ctx_low:   '\\033[38;2;255;85;85m',
    bar_empty: '\\033[38;2;68;71;90m',
    pct:       '\\033[38;2;248;248;242m',
    dir:       '\\033[38;2;139;233;253m',
    git:       '\\033[38;2;255;184;108m',
    git_dirty: '\\033[38;2;241;250;140m',
    vim:       '\\033[38;2;241;250;140m',
    worktree:  '\\033[38;2;255;121;198m',
    style:     '\\033[38;2;189;147;249m',
    cost:      '\\033[38;2;255;215;0m',
    effort_high: '\\033[1;38;2;255;85;85m',
    effort_med:  '\\033[38;2;241;250;140m',
    effort_low:  '\\033[38;2;80;250;123m',
    effort_off:  '\\033[2;38;2;98;114;164m',
    thinking:  '\\033[38;2;139;233;253m',
    io:        '\\033[38;2;98;114;164m',
    rate_ok:   '\\033[38;2;80;250;123m',
    rate_warn: '\\033[38;2;241;250;140m',
    rate_full: '\\033[38;2;255;85;85m',
    sep:       '\\033[38;2;98;114;164m',
    separator: ' | ',
    bar_chars: ['■', '□'],
  },
}

const t = themes[theme]
if (!t) {
  console.error(`Unknown theme: ${theme}. Available: ${Object.keys(themes).join(', ')}`)
  process.exit(1)
}

// ── Element icons per theme ────────────────────────────────────────
const elementIcons = {
  gruvbox:      { model: '✦', context: '', cost: '', dir: '⌂', git: '⎇', vim: '⌨', worktree: '⊕', effort: '↯', style: '❋', thinking: '', io: '⇅', five_hour: '⧗', week: '⊟' },
  robbyrussell: { model: '',  context: '', cost: '', dir: '',  git: '',  vim: '',  worktree: '',  effort: '',  style: '',  thinking: '', io: '',  five_hour: '', week: '' },
  minimal:      { model: '',  context: '', cost: '', dir: '',  git: '',  vim: '',  worktree: '',  effort: '',  style: '',  thinking: '', io: '',  five_hour: '', week: '' },
  dracula:      { model: '◈', context: '', cost: '', dir: '⌂', git: '⎇', vim: '⌨', worktree: '⊕', effort: '↯', style: '❋', thinking: '', io: '⇅', five_hour: '⧗', week: '⊟' },
}

const EFFORT_ICON_PRESETS = {
  arrow:  '↯',
  bolt:   'ϟ',
  flash:  '⚡',
  reason: '∴',
  dot:    '◉',
  none:   '',
}

function resolveEffortIcon(themeIcon) {
  if (!effortIconFlag) return themeIcon
  if (effortIconFlag === 'none') return ''
  if (EFFORT_ICON_PRESETS[effortIconFlag] !== undefined) return EFFORT_ICON_PRESETS[effortIconFlag]
  return effortIconFlag
}
const icons = elementIcons[theme]

// ── Build shell script ─────────────────────────────────────────────
function buildScript() {
  const lines = []
  const p = (s) => lines.push(s)

  p('#!/bin/bash')
  p(`# Claude Code status line — ${t.name} theme`)
  p(`# Generated by webup-statusline skill`)
  p('')

  const jqPathBlock = [
    'if ! command -v jq >/dev/null 2>&1; then',
    '  for _jq_dir in \\',
    '    "/c/Users/$USERNAME/AppData/Local/Microsoft/WinGet/Links" \\',
    '    "/c/Users/$USERNAME/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe" \\',
    '    "$HOME/scoop/shims" \\',
    '  ; do',
    '    if [ -d "$_jq_dir" ] && { [ -x "$_jq_dir/jq" ] || [ -x "$_jq_dir/jq.exe" ]; }; then',
    '      export PATH="$PATH:$_jq_dir"',
    '      break',
    '    fi',
    '  done',
    'fi',
  ]
  for (const line of jqPathBlock) p(line)

  p('# Colors')
  p("readonly RST='\\033[0m'")
  p(`readonly C_MODEL='${t.model}'`)
  p(`readonly C_CTX_OK='${t.ctx_ok}'`)
  p(`readonly C_CTX_WARN='${t.ctx_warn}'`)
  p(`readonly C_CTX_LOW='${t.ctx_low}'`)
  p(`readonly C_BAR_EMPTY='${t.bar_empty}'`)
  p(`readonly C_PCT='${t.pct}'`)
  p(`readonly C_DIR='${t.dir}'`)
  p(`readonly C_GIT='${t.git}'`)
  p(`readonly C_GIT_DIRTY='${t.git_dirty}'`)
  p(`readonly C_VIM='${t.vim}'`)
  p(`readonly C_WORKTREE='${t.worktree}'`)
  p(`readonly C_STYLE='${t.style}'`)
  p(`readonly C_COST='${t.cost}'`)
  p(`readonly C_EFFORT_HIGH='${t.effort_high}'`)
  p(`readonly C_EFFORT_MED='${t.effort_med}'`)
  p(`readonly C_EFFORT_LOW='${t.effort_low}'`)
  p(`readonly C_EFFORT_OFF='${t.effort_off}'`)
  p(`readonly C_THINKING='${t.thinking}'`)
  p(`readonly C_IO='${t.io}'`)
  p(`readonly C_RATE_OK='${t.rate_ok}'`)
  p(`readonly C_RATE_WARN='${t.rate_warn}'`)
  p(`readonly C_RATE_FULL='${t.rate_full}'`)
  p(`readonly C_SEP='${t.sep}'`)
  p('')
  p(`readonly SEP="${t.separator}"`)
  p('')

  // ── Helper functions ─────────────────────────────────────────
  if (elements.includes('five_hour') || elements.includes('week')) {
    p('fmt_countdown() {')
    p('  local s=$1')
    p('  if [ "$s" -le 0 ] 2>/dev/null; then echo "now"; return; fi')
    p('  local h=$(( s / 3600 ))')
    p('  local m=$(( (s % 3600) / 60 ))')
    p('  if [ $h -ge 24 ]; then')
    p('    local d=$(( h / 24 )); local rh=$(( h % 24 ))')
    p('    [ $rh -gt 0 ] && echo "${d}d${rh}h" || echo "${d}d"')
    p('  elif [ $h -gt 0 ]; then')
    p('    [ $m -gt 0 ] && echo "${h}h${m}m" || echo "${h}h"')
    p('  else')
    p('    echo "${m}m"')
    p('  fi')
    p('}')
    p('')
    p('build_rate_bar() {')
    p('  local used=$1 bar=""')
    p('  local filled=$(( used / 5 ))')
    p('  [ $filled -gt 20 ] && filled=20')
    p('  local empty=$(( 20 - filled ))')
    p('  local color')
    p('  if [ $used -ge 80 ]; then color="$C_RATE_FULL"')
    p('  elif [ $used -ge 50 ]; then color="$C_RATE_WARN"')
    p('  else color="$C_RATE_OK"; fi')
    p(`  bar="\${C_SEP}[\${RST}"`)
    p(`  for ((i=0; i<filled; i++)); do bar+="\${color}${t.bar_chars[0]}\${RST}"; done`)
    p(`  for ((i=0; i<empty; i++)); do bar+="\${C_BAR_EMPTY}${t.bar_chars[1]}\${RST}"; done`)
    p(`  bar+="\${C_SEP}]\${RST}"`)
    p('  echo "$bar"')
    p('}')
    p('')
  }

  // ── JSON input ────────────────────────────────────────────────
  p('input=$(cat)')
  p('')

  if (elements.includes('model')) {
    p("model=$(echo \"$input\" | jq -r '.model.display_name // \"\"')")
  }
  if (elements.includes('context') || elements.includes('io')) {
    p("remaining=$(echo \"$input\" | jq -r '.context_window.remaining_percentage // \"\"')")
    p("ctx_input=$(echo \"$input\" | jq -r '.context_window.total_input_tokens // empty')")
    p("ctx_size=$(echo \"$input\" | jq -r '.context_window.context_window_size // empty')")
  }
  if (elements.includes('io')) {
    p("ctx_output=$(echo \"$input\" | jq -r '.context_window.total_output_tokens // empty')")
  }
  if (elements.includes('thinking')) {
    p("thinking_on=$(echo \"$input\" | jq -r '.thinking.enabled // false')")
  }
  if (elements.includes('effort')) {
    p("effort=$(echo \"$input\" | jq -r '.effort.level // empty')")
    p('if [ -z "$effort" ]; then')
    p('  for f in "$HOME/.claude/settings.local.json" "$HOME/.claude/.claude/settings.local.json" "$HOME/.claude/settings.json"; do')
    p('    if [ -z "$effort" ] && [ -f "$f" ]; then')
    p('      effort=$(jq -r \'.effortLevel // empty\' "$f" 2>/dev/null)')
    p('    fi')
    p('  done')
    p('fi')
  }
  if (elements.includes('dir') || elements.includes('git')) {
    p("current_dir=$(echo \"$input\" | jq -r '.workspace.current_dir // \"\"')")
  }
  if (elements.includes('dir')) {
    p("original_repo_dir=$(echo \"$input\" | jq -r '.worktree.original_repo_dir // empty')")
  }
  if (elements.includes('vim')) {
    p("vim_mode=$(echo \"$input\" | jq -r '.vim.mode // empty')")
  }
  if (elements.includes('style')) {
    p("output_style=$(echo \"$input\" | jq -r '.output_style.name // empty')")
  }
  if (elements.includes('cost')) {
    p("cost_usd=$(echo \"$input\" | jq -r '.cost.total_cost_usd // empty')")
  }
  if (elements.includes('worktree') || elements.includes('git')) {
    p("worktree_name=$(echo \"$input\" | jq -r '.worktree.name // empty')")
    p("worktree_branch=$(echo \"$input\" | jq -r '.worktree.branch // empty')")
  }
  if (elements.includes('five_hour')) {
    p("five_used=$(echo \"$input\" | jq -r '.rate_limits.five_hour.used_percentage // empty' | awk '{if ($1 != \"\") printf \"%d\", $1}')")
    p("five_reset=$(echo \"$input\" | jq -r '.rate_limits.five_hour.resets_at // empty')")
  }
  if (elements.includes('week')) {
    p("week_used=$(echo \"$input\" | jq -r '.rate_limits.seven_day.used_percentage // empty' | awk '{if ($1 != \"\") printf \"%d\", $1}')")
    p("week_reset=$(echo \"$input\" | jq -r '.rate_limits.seven_day.resets_at // empty')")
  }
  p('')

  // Worktree detection
  if (elements.includes('worktree')) {
    p('is_worktree=0')
    p('if [ -n "$worktree_name" ]; then')
    p('  is_worktree=1')
    p('elif [ -n "$current_dir" ] && git -C "$current_dir" --no-optional-locks rev-parse --git-dir > /dev/null 2>&1; then')
    p('  _gd=$(git -C "$current_dir" --no-optional-locks rev-parse --git-dir 2>/dev/null)')
    p('  _gcd=$(git -C "$current_dir" --no-optional-locks rev-parse --git-common-dir 2>/dev/null)')
    p('  if [ -n "$_gd" ] && [ -n "$_gcd" ] && [ "$_gd" != "$_gcd" ]; then')
    p('    is_worktree=1')
    p('    if [ -z "$worktree_name" ]; then')
    p('      _parent=$(dirname "$current_dir")')
    p('      worktree_name=$(basename "$_parent")')
    p('      case "$worktree_name" in')
    p('        worktrees|wt|.codex|.claude) worktree_name=$(basename "$current_dir") ;;')
    p('      esac')
    p('    fi')
    p('  fi')
    p('fi')
    p('')
  }

  // Git branch detection
  if (elements.includes('git')) {
    p('git_branch="$worktree_branch"')
    p('git_dirty=0')
    p('if [ -n "$current_dir" ] && git -C "$current_dir" --no-optional-locks rev-parse --git-dir > /dev/null 2>&1; then')
    p('  if [ -z "$git_branch" ]; then')
    p('    git_branch=$(git -C "$current_dir" --no-optional-locks branch --show-current 2>/dev/null)')
    p('  fi')
    p('  if [ -n "$git_branch" ]; then')
    p('    if ! git -C "$current_dir" --no-optional-locks diff --quiet 2>/dev/null || \\')
    p('       ! git -C "$current_dir" --no-optional-locks diff --cached --quiet 2>/dev/null; then')
    p('      git_dirty=1')
    p('    fi')
    p('  fi')
    p('fi')
    p('')
  }

  // Shortened directory
  if (elements.includes('dir')) {
    p('short_dir=""')
    p('if [ -n "$original_repo_dir" ]; then')
    p("  short_dir=$(basename \"$original_repo_dir\")")
    p('elif [ -n "$current_dir" ]; then')
    p("  short_dir=$(basename \"$current_dir\")")
    p('fi')
    p('')
  }

  // Context bar with token counts
  if (elements.includes('context') || elements.includes('io')) {
    p('bar=""')
    p('if [ -n "$remaining" ]; then')
    p('  used=$((100 - remaining))')
    p('  filled=$((used / 5))')
    p('  empty=$((20 - filled))')
    p('  if [ "$remaining" -lt 20 ]; then ctx_color="$C_CTX_LOW"')
    p('  elif [ "$remaining" -lt 50 ]; then ctx_color="$C_CTX_WARN"')
    p('  else ctx_color="$C_CTX_OK"; fi')
    p(`  bar="\${C_SEP}[\${RST}"`)
    p(`  for ((i=0; i<filled; i++)); do bar+="\${ctx_color}${t.bar_chars[0]}\${RST}"; done`)
    p(`  for ((i=0; i<empty; i++)); do bar+="\${C_BAR_EMPTY}${t.bar_chars[1]}\${RST}"; done`)
    p(`  bar+="\${C_SEP}]\${RST} \${ctx_color}\${used}%\${RST}"`)
    p('  if [ -n "$ctx_input" ] && [ -n "$ctx_size" ]; then')
    p("    _used_k=$(awk -v n=\"$ctx_input\" 'BEGIN { if (n>=1000) printf \"%dk\", n/1000; else printf \"%d\", n }')")
    p("    _total_k=$(awk -v n=\"$ctx_size\" 'BEGIN { if (n>=1000) printf \"%dk\", n/1000; else printf \"%d\", n }')")
    p('    bar+=" ${C_SEP}(${RST}${ctx_color}${_used_k}${RST}${C_SEP}/${RST}${C_PCT}${_total_k}${RST}${C_SEP})${RST}"')
    p('  fi')
    p('fi')
    p('')
  }

  // ── Assemble parts into two arrays ────────────────────────────
  p('line1_parts=()')
  if (multiLine) p('line2_parts=()')
  p('')

  if (elements.includes('model')) {
    const mi = icons.model ? `${icons.model} ` : ''
    const arr = partsArr('model')
    p(`if [ -n "$model" ]; then`)
    p(`  ${arr}+=("\${C_MODEL}${mi}\${model}\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('thinking')) {
    const arr = partsArr('thinking')
    p('if [ "$thinking_on" = "true" ]; then')
    p(`  ${arr}+=("\${C_THINKING}think:on\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('context') || elements.includes('io')) {
    const arr = partsArr('context')
    const ci = icons.context ? `${icons.context} ` : ''
    p('if [ -n "$bar" ]; then')
    p(`  ${arr}+=("${ci}\${bar}")`)
    p('fi')
    p('')
  }

  if (elements.includes('io')) {
    const arr = partsArr('io')
    const ioi = icons.io ? `${icons.io} ` : ''
    p('if [ -n "$ctx_input" ] && [ -n "$ctx_output" ]; then')
    p("  _in_k=$(awk -v n=\"$ctx_input\" 'BEGIN { if (n>=1000) printf \"%dk\", n/1000; else printf \"%d\", n }')")
    p("  _out_k=$(awk -v n=\"$ctx_output\" 'BEGIN { if (n>=1000) printf \"%dk\", n/1000; else printf \"%d\", n }')")
    p(`  ${arr}+=("\${C_IO}${ioi}in:\${RST}\${C_PCT}\${_in_k}\${RST}\${C_SEP}·\${RST}\${C_IO}out:\${RST}\${C_PCT}\${_out_k}\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('cost')) {
    const arr = partsArr('cost')
    const costi = icons.cost ? `${icons.cost} ` : ''
    p('if [ -n "$cost_usd" ]; then')
    p('  cost_formatted=$(awk -v v="$cost_usd" \'BEGIN { if (v+0 >= 0.005) printf "$%.2f", v+0 }\')')
    p('  if [ -n "$cost_formatted" ]; then')
    p(`    ${arr}+=("\${C_COST}${costi}\${cost_formatted}\${RST}")`)
    p('  fi')
    p('fi')
    p('')
  }

  if (elements.includes('effort')) {
    const arr = partsArr('effort')
    const rawEi = resolveEffortIcon(icons.effort)
    const ei = rawEi ? `${rawEi} ` : ''
    p('if [ -n "$effort" ]; then')
    p('  case "$effort" in')
    p('    max|MAX|Max|xhigh|XHIGH|XHigh|high|High|HIGH)  effort_color="$C_EFFORT_HIGH" ;;')
    p('    medium|Medium|MEDIUM)                          effort_color="$C_EFFORT_MED" ;;')
    p('    low|Low|LOW|xlow|XLow|XLOW|minimal|Minimal)    effort_color="$C_EFFORT_LOW" ;;')
    p('    *)                                             effort_color="$C_EFFORT_OFF" ;;')
    p('  esac')
    p(`  ${arr}+=("\${effort_color}${ei}\${effort}\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('style')) {
    const arr = partsArr('style')
    const si = icons.style ? `${icons.style} ` : ''
    p('if [ -n "$output_style" ] && [ "$output_style" != "default" ]; then')
    p(`  ${arr}+=("\${C_STYLE}${si}\${output_style}\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('five_hour')) {
    const arr = partsArr('five_hour')
    const fhi = icons.five_hour ? `${icons.five_hour} ` : ''
    p('if [ -n "$five_used" ] && [ -n "$five_reset" ]; then')
    p('  _now=$(date +%s)')
    p('  _rem_sec=$(( five_reset - _now ))')
    p('  [ "$_rem_sec" -lt 0 ] && _rem_sec=0')
    p('  _five_bar=$(build_rate_bar "$five_used")')
    p('  _five_cd=$(fmt_countdown "$_rem_sec")')
    p('  if [ "$five_used" -ge 80 ]; then _five_color="$C_RATE_FULL"')
    p('  elif [ "$five_used" -ge 50 ]; then _five_color="$C_RATE_WARN"')
    p('  else _five_color="$C_RATE_OK"; fi')
    p(`  ${arr}+=("${fhi}\${_five_bar} \${_five_color}\${five_used}%\${RST} \${C_SEP}(\${RST}\${C_PCT}\${_five_cd}\${RST}\${C_SEP})\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('week')) {
    const arr = partsArr('week')
    const wi = icons.week ? `${icons.week} ` : ''
    p('if [ -n "$week_used" ] && [ -n "$week_reset" ]; then')
    p('  _now=$(date +%s)')
    p('  _rem_sec=$(( week_reset - _now ))')
    p('  [ "$_rem_sec" -lt 0 ] && _rem_sec=0')
    p('  _week_bar=$(build_rate_bar "$week_used")')
    p('  _week_cd=$(fmt_countdown "$_rem_sec")')
    p('  if [ "$week_used" -ge 80 ]; then _week_color="$C_RATE_FULL"')
    p('  elif [ "$week_used" -ge 50 ]; then _week_color="$C_RATE_WARN"')
    p('  else _week_color="$C_RATE_OK"; fi')
    p(`  ${arr}+=("${wi}\${_week_bar} \${_week_color}\${week_used}%\${RST} \${C_SEP}(\${RST}\${C_PCT}\${_week_cd}\${RST}\${C_SEP})\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('vim')) {
    const arr = partsArr('vim')
    const vi = icons.vim ? `${icons.vim} ` : ''
    p('if [ -n "$vim_mode" ]; then')
    p(`  ${arr}+=("\${C_VIM}${vi}\${vim_mode}\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('dir')) {
    const arr = partsArr('dir')
    const di = icons.dir ? `${icons.dir} ` : ''
    p('if [ -n "$short_dir" ]; then')
    p(`  ${arr}+=("\${C_DIR}${di}\${short_dir}\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('worktree')) {
    const arr = partsArr('worktree')
    const wti = icons.worktree ? `${icons.worktree} ` : ''
    p('if [ "$is_worktree" -eq 1 ] && [ -n "$worktree_name" ]; then')
    p(`  ${arr}+=("\\033[1m\${C_WORKTREE}${wti}worktree:\${worktree_name}\${RST}")`)
    p('fi')
    p('')
  }

  if (elements.includes('git')) {
    const arr = partsArr('git')
    const gi = icons.git ? `${icons.git} ` : ''
    p('if [ -n "$git_branch" ]; then')
    p('  if [ "$git_dirty" -eq 1 ]; then')
    p(`    ${arr}+=("\${C_GIT_DIRTY}${gi}\${git_branch}\${RST}")`)
    p('  else')
    p(`    ${arr}+=("\${C_GIT}${gi}\${git_branch}\${RST}")`)
    p('  fi')
    p('fi')
    p('')
  }

  // ── Output ────────────────────────────────────────────────────
  p('_out=""')
  p('for _i in "${!line1_parts[@]}"; do')
  p('  [ "$_i" -gt 0 ] && _out+="\${C_SEP}\${SEP}\${RST}"')
  p('  _out+="${line1_parts[$_i]}"')
  p('done')
  p('printf "%b" "$_out"')
  if (multiLine) {
    p('if [ "${#line2_parts[@]}" -gt 0 ]; then')
    p('  printf "\\n"')
    p('  _out=""')
    p('  for _i in "${!line2_parts[@]}"; do')
    p('    [ "$_i" -gt 0 ] && _out+="\${C_SEP}\${SEP}\${RST}"')
    p('    _out+="${line2_parts[$_i]}"')
    p('  done')
    p('  printf "%b" "$_out"')
    p('fi')
  }

  return lines.join('\n') + '\n'
}

const script = buildScript()

if (!install) {
  process.stdout.write(script)
  process.exit(0)
}

// ── Install mode ───────────────────────────────────────────────────
const scriptsDir = join(homedir(), '.claude', 'scripts')
const scriptPath = join(scriptsDir, 'statusline.sh')
const settingsPath = join(homedir(), '.claude', 'settings.json')

mkdirSync(scriptsDir, { recursive: true })
writeFileSync(scriptPath, script)
chmodSync(scriptPath, 0o755)
console.log(`Wrote ${scriptPath}`)

let settings = {}
if (existsSync(settingsPath)) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
  } catch {}
}
settings.statusLine = {
  type: 'command',
  command: '~/.claude/scripts/statusline.sh',
}
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
console.log(`Updated ${settingsPath} → statusLine.command = ~/.claude/scripts/statusline.sh`)
console.log('\nRestart Claude Code to see your new status line!')
