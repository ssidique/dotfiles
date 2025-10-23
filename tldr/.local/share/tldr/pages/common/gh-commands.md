# gh-commands

> GitHub CLI - Manage GitHub from the command line.
> Requires authentication: gh auth login

- Authenticate with GitHub:

`gh auth login`

- Check authentication status:

`gh auth status`

## Pull Requests

- Create a pull request:

`gh pr create`

- Create PR with title and body:

`gh pr create --title "{{title}}" --body "{{description}}"`

- Create draft PR:

`gh pr create --draft`

- List pull requests:

`gh pr list`

- View specific PR:

`gh pr view {{pr-number}}`

- View PR in browser:

`gh pr view {{pr-number}} --web`

- Checkout PR locally:

`gh pr checkout {{pr-number}}`

- Review PR:

`gh pr review {{pr-number}}`

- Approve PR:

`gh pr review {{pr-number}} --approve`

- Request changes on PR:

`gh pr review {{pr-number}} --request-changes --body "{{feedback}}"`

- Merge PR:

`gh pr merge {{pr-number}}`

- Close PR:

`gh pr close {{pr-number}}`

## Issues

- Create an issue:

`gh issue create`

- List issues:

`gh issue list`

- View issue:

`gh issue view {{issue-number}}`

- Close issue:

`gh issue close {{issue-number}}`

- Reopen issue:

`gh issue reopen {{issue-number}}`

## Repository

- Clone repository:

`gh repo clone {{owner/repo}}`

- Create new repository:

`gh repo create {{name}}`

- View repository in browser:

`gh repo view --web`

- Fork repository:

`gh repo fork`

- List repositories:

`gh repo list {{owner}}`

## Workflow/Actions

- List workflow runs:

`gh run list`

- View workflow run:

`gh run view {{run-id}}`

- Watch workflow run:

`gh run watch {{run-id}}`

- Rerun workflow:

`gh run rerun {{run-id}}`

- View workflow logs:

`gh run view {{run-id}} --log`

## Gists

- Create gist from file:

`gh gist create {{file}}`

- List gists:

`gh gist list`

- View gist:

`gh gist view {{gist-id}}`

## General

- View manual for command:

`gh {{command}} --help`

- Set default repository:

`gh repo set-default`
