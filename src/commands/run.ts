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

/** Streams response chunks. Use for live CLI output. */
export async function* runCommandStream(
  cmd: CommandDef,
  argv: Record<string, unknown>,
  input: string,
  env: RunEnv,
  fetchFn: FetchFn = fetch
): AsyncGenerator<string> {
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
      stream: true,
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

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const lineEnd = buffer.indexOf('\n');
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data) as {
              error?: { message?: string };
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            };
            if (parsed.error) {
              throw new Error(parsed.error.message ?? 'Stream error');
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
