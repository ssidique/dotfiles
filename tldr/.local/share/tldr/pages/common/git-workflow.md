# git-workflow

> Common git workflows and shortcuts.
> Custom page for frequently used git patterns.

- Create feature branch and push with upstream:

`git checkout -b {{feature-name}} && git push -u origin {{feature-name}}`

- Amend last commit without changing message:

`git commit --amend --no-edit`

- Undo last commit but keep changes staged:

`git reset --soft HEAD~1`

- Undo last commit and keep changes unstaged:

`git reset HEAD~1`

- Delete all merged branches except master/main:

`git branch --merged | grep -v "^\*" | grep -v "master" | grep -v "main" | xargs git branch -d`

- Interactive rebase last N commits:

`git rebase -i HEAD~{{N}}`

- Pull with rebase instead of merge:

`git pull --rebase`

- Force push safely (only if no one else pushed):

`git push --force-with-lease`

- Stash with a descriptive message:

`git stash push -m "{{description}}"`

- Apply specific stash by index:

`git stash apply stash@{{{index}}}`

- View diff of stashed changes:

`git stash show -p stash@{{{index}}}`

- Cherry-pick a commit from another branch:

`git cherry-pick {{commit-hash}}`

- Create and switch to new branch from specific commit:

`git checkout -b {{branch-name}} {{commit-hash}}`
