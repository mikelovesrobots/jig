# jig

CLI for LLM tasks via prompts and pipes. Uses OpenRouter. The philosophy is that unix chains are a great UI for llm tasks and that it should be easy to add your own prompts and commands.

## Synopsis

```bash
$ cat RESUME.md | jig rate --max 5 --metric "ruby on rails"
4

$ echo "The meeting covered Q1 goals, the new hire pipeline, and the budget review. Next week we'll dig into engineering priorities." | jig decimate --percent 50
The meeting covered Q1 goals, new hires, and budget. Next week: priorities.

$ echo "Me and him went to the store and we was looking for a new laptop." | jig grammar-fix --percent 100
He and I went to the store and we were looking for a new laptop.

$ jig summarize --input-file meeting-notes.txt
The team reviewed Q1 goals, hiring, and budget; engineering priorities are next week.
```

## Install

(Note: The first build hasn't been pushed to npm, so this won't work, you'll need to use the develop path for now.)

```bash
npm i -g @mikelovesrobots/jig
jig init
```

`jig init` prompts for your OpenRouter model and API key. Config is saved to `~/.jig/env` (edit there to change later).

## Usage

- **`jig`** – List commands.
- **`jig <command> --help`** – Options for a command.
- **`jig init`** – Configure model and API key.

Bundled commands: **rate** (score input on a metric), **decimate** (shorten by percentage), **grammar-fix** (fix grammar). Input from stdin, or `--input-file <path>`.

## Custom commands

Add a `.yaml` file under `~/.jig/commands/`. YAML frontmatter between `---` lines, then the prompt body as a Mustache template.

- **Frontmatter:** `name`, `description`, and optional `args` (list of options: `name`, `type` (string/number/boolean/file), `default`, `description`).
- **Prompt:** Use `{{input}}` for stdin/`--input-file` content and `{{argName}}` for each arg.

Example `~/.jig/commands/summarize.yaml`:

```yaml
---
name: summarize
description: Summarize the input in one short paragraph.
args:
  - name: style
    type: string
    default: neutral
---
Summarize the following in one short paragraph. Use a {{style}} tone.

{{input}}
```

---

## Develop

```bash
git clone <repo>
cd jig
npm install
npm run build
npm link
```

After changes: `npm run build`. To switch back to the published package: `npm unlink -g @mikelovesrobots/jig` then `npm i -g @mikelovesrobots/jig`.

Scripts: `npm run build`, `npm run typecheck`, `npm test`.
