import Mustache from 'mustache';
import type { CommandDef } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface RunEnv {
  JIG_MODEL: string;
  OPENROUTER_API_KEY: string;
}

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

function buildTemplateVars(cmd: CommandDef, argv: Record<string, unknown>, input: string): Record<string, unknown> {
  const vars: Record<string, unknown> = { input };
  for (const arg of cmd.args) {
    if (argv[arg.name] !== undefined) vars[arg.name] = argv[arg.name];
    else if (arg.default !== undefined) vars[arg.name] = arg.default;
  }
  if (argv.explain !== undefined) vars.explain = argv.explain;
  return vars;
}

export function buildPrompt(cmd: CommandDef, argv: Record<string, unknown>, input: string): string {
  const vars = buildTemplateVars(cmd, argv, input);
  return Mustache.render(cmd.promptBody, vars);
}

export interface RunResult {
  text: string;
}

export async function runCommand(
  cmd: CommandDef,
  argv: Record<string, unknown>,
  input: string,
  env: RunEnv,
  fetchFn: FetchFn = fetch
): Promise<RunResult> {
  const prompt = buildPrompt(cmd, argv, input);
  const res = await fetchFn(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.JIG_MODEL,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let errMsg = `OpenRouter API error: ${res.status} ${res.statusText}`;
    try {
      const j = JSON.parse(body);
      if (j.error?.message) errMsg += ` - ${j.error.message}`;
      else if (typeof j.message === 'string') errMsg += ` - ${j.message}`;
    } catch {
      if (body) errMsg += ` - ${body.slice(0, 200)}`;
    }
    throw new Error(errMsg);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? '';
  return { text: content.trim() };
}
