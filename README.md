# jig

## Synopsis

CLI for LLM tasks via prompts and pipes. Uses OpenRouter as the provider.

```bash
$ cat RESUME.md | jig rate --max 5 --metric "ruby on rails"
4

$ echo "The meeting covered Q1 goals, the new hire pipeline, and the budget review. Next week we'll dig into engineering priorities." | jig decimate --percent 50
The meeting covered Q1 goals and the budget review.

$ echo "Me and him went to the store and we was looking for a new laptop." | jig grammar-fix --percent 100
He and I went to the store and we were looking for a new laptop.

$ jig summarize --input-file meeting-notes.txt
The team reviewed Q1 goals, hiring, and budget; engineering priorities are next week.
```

## Install (use the published CLI)

```bash
npm i -g @mikelovesrobots/jig
jig init
```

`jig init` prompts for:

- **JIG_MODEL** – OpenRouter model id (e.g. `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`). Default: `anthropic/claude-3.5-sonnet`.
- **OPENROUTER_API_KEY** – Your OpenRouter API key.

Then run commands:

```bash
echo "I have 10 years Ruby on Rails" | jig rate --max 5 --metric "ruby on rails"
echo "Long document here..." | jig decimate --percent 80
echo "Text with errors..." | jig grammar-fix --percent 100
```

## Develop (work on jig locally)

```bash
git clone <repo>
cd ai-pipes
npm install
npm run build
npm link
```

After code changes, run `npm run build` again.

To stop using your local build and use the published package again:

```bash
npm unlink -g @mikelovesrobots/jig
npm i -g @mikelovesrobots/jig
```

## Scripts

- **`npm run build`** – Compile TypeScript to `dist/`.
- **`npm run typecheck`** – Type-check only (`tsc --noEmit`).
- **`npm test`** – Run unit tests.

## Usage

- **`jig`** – List available commands.
- **`jig --help`** – Top-level help.
- **`jig <command> --help`** – Options for a command.
- **`jig init`** – Configure model and API key (interactive).

Bundled commands: **rate** (score input on a metric), **decimate** (shorten to a percentage of length), **grammar-fix** (fix worst N% of grammar errors). Input is read from stdin unless you pass `--input-file <path>`.

## Creating commands

Add a `.yaml` file under **`~/.jig/commands/`** (that directory is created when you run `jig init`). Each file is one command.

**File format:** YAML frontmatter between `---` lines, then the prompt body.

**Frontmatter:**

- **`name`** – Command name (e.g. `summarize`). If omitted, the filename (without `.yaml`) is used.
- **`description`** – Shown in `jig --help` and `jig <command> --help`.
- **`args`** – List of options. Each item can have:
  - **`name`** – Option name (e.g. `max`, `metric`). Becomes `--max`, `--metric`.
  - **`type`** – One of `string`, `number`, `boolean`, `file`.
  - **`default`** – (optional) Default value.
  - **`description`** – (optional) Shown in `jig <command> --help`.

**Prompt body:** Mustache template. You get:

- **`{{input}}`** – Content from stdin or `--input-file`. Always available.
- **`{{explain}}`** – `true` when the user passed `--explain`; you can use it to ask for reasoning in the prompt.
- Any **`{{name}}`** for each arg – Filled from the user’s options or the arg’s default.

Every command automatically gets **`--explain`** and **`--input-file`**; you don’t need to declare them in `args` unless you want a custom description.

**Example** – `~/.jig/commands/summarize.yaml`:

```yaml
---
name: summarize
description: Summarize the input in one short paragraph.
args:
  - name: style
    type: string
    default: neutral
    description: Tone (e.g. neutral, casual, formal)
---
Summarize the following in one short paragraph. Use a {{style}} tone.

{{input}}
```

Then: `echo "Long article..." | jig summarize` or `jig summarize --style formal --input-file doc.txt`.

## Config

Config is stored in `~/.jig/env` (created by `jig init`). Two variables:

- **JIG_MODEL** – OpenRouter model id (e.g. `anthropic/claude-3.5-sonnet`).
- **OPENROUTER_API_KEY** – OpenRouter API key.

You can edit `~/.jig/env` to change model or key.
