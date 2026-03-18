# jig

CLI for LLM tasks via prompts and pipes. The philosophy here is that unix utilities are the best example of composable and reusable tools that anyone could ever find (e.g., `ls -l | grep mike`) , so let's make using llms in a POSIX environment easy. An additional goal of the project is that adding new prompts and commands should take less than five minutes -- let's make it easy to explore!

## Synopsis

```bash
$ cat RESUME.md | jig rate --max 5 --metric "ruby on rails"
4

$ echo "The meeting covered Q1 goals, the new hire pipeline, and the budget review. Next week we'll dig into engineering priorities." | jig shorten --percent 50
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

Bundled commands: **rate** (score input on a metric), **shorten** (shorten to a percentage of length), **sort** (sort by a metric), **summarize**, **grammar-fix** (fix grammar). Input from stdin, or `--input-file <path>`.

Because input is stdin, you can combine jig with normal shell tools. For example, rate every resume in a folder and get filename + score (Don't do this though cause it's unethical):

```bash
for f in resumes/*.md; do printf '%s: ' "$f"; cat "$f" | jig rate --max 5 --metric "ruby on rails"; done
```

Output:

```
resumes/alice.md: 4
resumes/bob.md: 2
resumes/carol.md: 5
```

## Custom commands

Add a `.yaml` file under `~/.jig/commands/`. YAML frontmatter between `---` lines, then the prompt body as a Mustache template.

- **Frontmatter:** `name`, `description`, and optional `args` (list of options: `name`, `type` (string/number/boolean/file), `default`, `description`).
- **Prompt:** Use `{{{input}}}` for stdin/`--input-file` content (triple braces avoid HTML-escaping quotes/apostrophes) and `{{argName}}` for each arg.

Example `~/.jig/commands/summarize.yaml` (summarize is also built-in; this illustrates the format or overrides it):

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

{{{input}}}
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
