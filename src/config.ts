import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function getJigDir(): string {
  return path.join(os.homedir(), '.jig');
}

export function getEnvPath(): string {
  return path.join(getJigDir(), 'env');
}

export function isConfigured(): boolean {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) return false;
  const content = fs.readFileSync(envPath, 'utf-8');
  let hasModel = false;
  let hasKey = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^JIG_MODEL\s*=\s*\S+/.test(trimmed)) hasModel = true;
    if (/^OPENROUTER_API_KEY\s*=\s*\S+/.test(trimmed)) hasKey = true;
  }
  return hasModel && hasKey;
}
