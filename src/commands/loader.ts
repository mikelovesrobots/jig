import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import matter from 'gray-matter';
import type { CommandDef, ArgDef } from './types';

const VALID_ARG_TYPES: readonly string[] = ['string', 'number', 'boolean', 'file'];

function getBundledCommandsDir(): string {
  return path.join(__dirname, '..', '..', 'commands');
}

function getUserCommandsDir(): string {
  return path.join(os.homedir(), '.jig', 'commands');
}

function parseArgDef(raw: unknown): ArgDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = o.name;
  if (typeof name !== 'string' || !name) return null;
  const type = o.type;
  if (typeof type !== 'string' || !VALID_ARG_TYPES.includes(type)) return null;
  const arg: ArgDef = {
    name: name,
    type: type as ArgDef['type'],
  };
  if (o.default !== undefined) arg.default = o.default as string | number | boolean;
  if (typeof o.description === 'string') arg.description = o.description;
  return arg;
}

function parseCommandFile(filePath: string, content: string): CommandDef | null {
  const parsed = matter(content);
  const data = parsed.data as Record<string, unknown>;
  const rawName = data.name;
  if (rawName === null || rawName === undefined) return null;
  if (typeof rawName === 'string' && rawName.trim() === '') return null;
  const name = (rawName ?? path.basename(filePath, '.yaml')) as string;
  if (!name || !String(name).trim()) return null;
  const description = (data.description ?? '') as string;
  const argsRaw = data.args;
  const args: ArgDef[] = [];
  if (Array.isArray(argsRaw)) {
    for (const a of argsRaw) {
      const arg = parseArgDef(a);
      if (arg) args.push(arg);
    }
  }
  const promptBody = typeof parsed.content === 'string' ? parsed.content.trim() : '';
  return { name, description, args, promptBody };
}

function loadCommandsFromDir(dir: string): Map<string, CommandDef> {
  const map = new Map<string, CommandDef>();
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return map;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.yaml')) continue;
    const filePath = path.join(dir, e.name);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cmd = parseCommandFile(filePath, content);
      if (cmd) map.set(cmd.name, cmd);
    } catch {
      // skip invalid files
    }
  }
  return map;
}

export function loadCommands(): Map<string, CommandDef> {
  const bundled = loadCommandsFromDir(getBundledCommandsDir());
  const userDir = getUserCommandsDir();
  const user = loadCommandsFromDir(userDir);
  const result = new Map(bundled);
  for (const [name, cmd] of user) {
    result.set(name, cmd);
  }
  return result;
}
