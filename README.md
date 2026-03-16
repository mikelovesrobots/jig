# jig

CLI for LLM tasks via prompts and pipes. Uses OpenRouter as the provider.

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

Input is read from stdin unless you pass `--input-file <path>`.

User-defined commands: add `.yaml` files under `~/.jig/commands/`. Same format as the bundled commands (YAML frontmatter + prompt body).

## Config

Config is stored in `~/.jig/env` (created by `jig init`). Two variables:

- **JIG_MODEL** – OpenRouter model id (e.g. `anthropic/claude-3.5-sonnet`).
- **OPENROUTER_API_KEY** – OpenRouter API key.

You can edit `~/.jig/env` to change model or key.
