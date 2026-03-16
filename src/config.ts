import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function getJigDir(): string {
  return path.join(os.homedir(), '.jig');
}

export function getEnvPath(): string {
  return path.join(getJigDir(), 'env');
}

function parseEnvContent(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      out[key] = val;
    }
  }
  return out;
}

export function loadEnv(): { JIG_MODEL: string; OPENROUTER_API_KEY: string } | null {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf-8');
  const vars = parseEnvContent(content);
  const model = vars.JIG_MODEL?.trim();
  const apiKey = vars.OPENROUTER_API_KEY?.trim();
  if (!model || !apiKey) return null;
  return { JIG_MODEL: model, OPENROUTER_API_KEY: apiKey };
}

export function isConfigured(): boolean {
  return loadEnv() !== null;
}
