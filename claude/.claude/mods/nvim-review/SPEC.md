# nvim-review — design

2026-10-03

## Goal

Review Claude's changes in nvim by typing `CLAUDE:` comments into the code,
then have Claude address them in one step — no copying comments into the
prompt. Success: leave markers, see the count above the prompt, run `/nvim-review`,
Claude fixes each one and deletes its marker, nothing is committed, repeat.

## Marker format

- A comment containing `CLAUDE:` (uppercase only) after a common comment
  leader: `#`, `//`, `--`, `;`, `/*`, `<!--`, `*`.
- Own-line or trailing code: `return x  # CLAUDE: handle empty`.
- Consecutive own-line marker lines (adjacent line numbers, same file) merge
  into one comment, joined with spaces.
- The text is everything after `CLAUDE:`, with a closing `*/` or `-->`
  stripped and whitespace trimmed. An empty text is not a marker.

## Scanner

One function, `scan(cwd) -> Marker[]`, `Marker = {file, line, text, code}`:
`line` is the line number in the working-tree file, `code` the code on that
line with the marker removed (empty for own-line markers; for a run, the next
non-marker line below it).

Every git call runs from the repo root (`git rev-parse --show-toplevel`), so
all paths are repo-relative.

1. **Base.** Default branch = `git symbolic-ref --short refs/remotes/origin/HEAD`
   (strip `origin/`), else `main`, else `master`. Base = `git merge-base HEAD
   origin/<default>`, falling back to `<default>`, then `HEAD`. This covers
   every commit on the branch, and unpushed commits on the default branch.
2. **Tracked changes.** `git diff <base> -U1 --no-color --no-ext-diff`: markers
   come only from `+` lines; the one context line lets an own-line marker
   quote the code below it. Lines are numbered from the `@@ … +start` hunk
   headers; the working-tree side is the new side, so the numbers are
   current-file numbers.
3. **Untracked files.** `git ls-files --others --exclude-standard -z`, then
   `git grep -n -z -I -A1 --untracked -e CLAUDE: -- <those files>` (binary
   files skipped by `-I`); every line it prints counts as added.
4. Not a git repo, or any git call fails → `[]`.

Parsing (steps 2–3, given text) is a pure function separate from the git
calls, so tests can feed it diff text directly.

**Known limitation:** code the branch legitimately adds that contains the
literal `# CLAUDE: …` shape (e.g. tests for this very tool) is reported as a
marker. Accepted; uppercase-only plus requiring a comment leader keeps this
rare.

## Band (above the prompt)

- No timer: nothing scans while a session is idle, so many open sessions cost
  nothing. An interactive session rescans at session start, on every
  submitted prompt and when each turn ends (deferred a tick, so the scan
  never holds the event up). Non-interactive sessions (`-p`, SDK) never
  rescan in the background. Chosen 2026-10-03 over fixed and backoff polling
  because the user runs many sessions at once.
- The branch base is cached per HEAD and dropped on each of those rescans.
- The result is stored in `$.state`; the band redraws only when it changes.
- 0 markers → draw nothing (band hidden).
- Otherwise: `review: N comments in M files — /nvim-review`, with a
  "Send to Claude" button that does what the command does. After commenting
  in nvim the count updates on your next interaction; `/nvim-review` always
  rescans, so it never acts on a stale count.

## `/nvim-review` command

Named after the mod rather than `/review`, which Claude Code already uses.
Rescans (never trusts the cached count). With no markers, the command's
output says "No CLAUDE: comments found in changed files." Otherwise it calls `$.prompt.submit` with:

> Address these review comments I left in the code as `CLAUDE:` markers. For
> each: make the change — or if it's a question, answer it in chat instead of
> in code — then delete the marker (the whole line if it stands alone, just
> the trailing comment otherwise). Do not commit; I'll re-review the diff.
>
> - `src/foo.py:42` — this should use model_loader (on: `data = open(path).read()`)
> - …

## Commit guard

`tool.call` hook on `Bash`: if the command contains `git` followed by
`commit` (this covers `git commit`, `git -C x commit` and chained `&& git commit`),
run `scan`. If it finds markers, return `{ deny }` with "N CLAUDE: review
comments unaddressed (file:line, …) — address them or ask the user before
committing." Otherwise call `next(e)`. Applies to Claude's tool calls only;
the user committing from their own shell is not affected.

## Files

```
nvim-review/
  .claude-plugin/plugin.json
  types/index.d.ts        # PluginState: nvim-review markers
  hooks/hooks.json
  hooks/register.tsx      # band, /nvim-review, commit guard, timer
  hooks/markers.ts        # pure: diff/grep parsing, marker rules, prompt text
  hooks/scan.ts           # the git calls
  tests/markers.test.ts
  tests/register.test.ts
```

Developed in this session's dev-mods folder; once stable, move it to a
permanent folder and load it via `CLAUDE_CODE_PLUGIN_DIRS` in
`~/.claude/settings.json`.

## Testing

- `markers.test.ts` (`claude plugin test`): each comment leader; trailing
  markers; lowercase `claude:` ignored; empty text ignored; `*/` and `-->`
  stripped; adjacent-line merging; line numbers across several hunks and
  files; untracked-file parsing.
- Guard matcher: `git commit -m`, `git -C . commit`, `foo && git commit`
  match; `git log --grep commit`? Matches too: accepted false positive (it
  only triggers when markers exist and is cheap to retry).
- `claude plugin validate` + `tsc -p`.
- Manual check in this session: add a marker in baby-fund, see the band,
  run `/nvim-review`, have Claude try `git commit` with a marker present → denied.
