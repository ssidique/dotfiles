# tmuxinator-commands

> Manage complex tmux sessions with YAML configuration files.
> Session configs stored in ~/.config/tmuxinator/

- Create new project configuration:

`tmuxinator new {{project-name}}`

- Edit existing project:

`tmuxinator edit {{project-name}}`

- Start a project session:

`tmuxinator start {{project-name}}`

- Start project with custom session name:

`tmuxinator start {{project-name}} -n {{session-name}}`

- Stop a running project:

`tmuxinator stop {{project-name}}`

- List all projects:

`tmuxinator list`

- Delete project configuration:

`tmuxinator delete {{project-name}}`

- Copy existing project to new project:

`tmuxinator copy {{source}} {{destination}}`

- Debug project configuration:

`tmuxinator debug {{project-name}}`

- Display project configuration path:

`tmuxinator doctor {{project-name}}`

- Start project locally (in current directory):

`tmuxinator local`

## Example Project Configuration

- Create development environment with multiple panes:

`tmuxinator new dev`

```yaml
name: dev
root: ~/projects/myapp

windows:
  - editor:
      layout: main-vertical
      panes:
        - nvim
        -
  - server:
      panes:
        - npm run dev
  - git:
      panes:
        - lazygit
  - shell:
```

## Common Project Patterns

- Web development (editor, server, logs):

`tmuxinator new web`

- Backend development (editor, API, DB, tests):

`tmuxinator new backend`

- Full-stack (frontend, backend, DB, redis):

`tmuxinator new fullstack`

## Aliases

- Short form for start:

`mux {{project-name}}`

- Short form for list:

`mux list`
