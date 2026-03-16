#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadCommands } from './commands/loader';
import { runCommand } from './commands/run';
import { getJigDir, getEnvPath, isConfigured, loadEnv } from './config';
import type { CommandDef } from './commands/types';

const NOT_CONFIGURED_MESSAGE =
  'Jig is not configured. Run `jig init` to set your model and API key.';

function runInit(): Promise<void> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const dir = getJigDir();
    const commandsDir = path.join(dir, 'commands');
    const envPath = getEnvPath();

    const ask = (q: string, defaultVal?: string): Promise<string> =>
      new Promise((res) => {
        const prompt = defaultVal !== undefined ? `${q} (${defaultVal}): ` : `${q}: `;
        rl.question(prompt, (answer) => res(answer.trim() || (defaultVal ?? '')));
      });

    (async () => {
      try {
        const model = await ask('JIG_MODEL', 'anthropic/claude-3.5-sonnet');
        const apiKey = await ask('OPENROUTER_API_KEY');
        rl.close();

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(commandsDir)) fs.mkdirSync(commandsDir, { recursive: true });

        const lines = [`JIG_MODEL=${model}`, `OPENROUTER_API_KEY=${apiKey}`];
        fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');

        console.log('Created', envPath);
        console.log('You can run commands like: jig rate');
        resolve();
      } catch (e) {
        rl.close();
        reject(e);
      }
    })();
  });
}

function buildYargs(): yargs.Argv {
  const commands = loadCommands();

  const commandList =
    '  init  Configure jig (model and API key)\n' +
    [...commands.entries()]
      .map(([name, cmd]) => `  ${name}  ${cmd.description || ''}`)
      .join('\n');

  let parser = yargs(hideBin(process.argv))
    .scriptName('jig')
    .usage('Usage: $0 <command> [options]\n\nCommands:\n' + commandList)
    .help('h')
    .alias('h', 'help')
    .demandCommand(1, 'Provide a command. Run with --help for usage.')
    .strictCommands()
    .command(
      'init',
      'Configure jig (model and API key)',
      () => {},
      async () => {
        try {
          await runInit();
          process.exit(0);
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
      }
    );

  for (const [name, cmd] of commands) {
    parser = parser.command(
      name,
      cmd.description,
      (yargsInstance) => buildCommandOptions(yargsInstance, cmd),
      (argv) => handleCommand(name, cmd, argv as Record<string, unknown>)
    );
  }

  return parser;
}

function buildCommandOptions(yargsInstance: yargs.Argv<object>, cmd: CommandDef): yargs.Argv<object> {
  for (const arg of cmd.args) {
    const opt: { type: 'string' | 'number' | 'boolean'; default?: unknown; description?: string } = {
      type: arg.type === 'number' ? 'number' : arg.type === 'boolean' ? 'boolean' : 'string',
      description: arg.description,
    };
    if (arg.default !== undefined) opt.default = arg.default;
    yargsInstance.option(arg.name, opt);
  }
  return yargsInstance
    .option('explain', { type: 'boolean', default: false, description: 'Include a brief explanation of the output' })
    .option('input-file', { type: 'string', description: 'Read from file instead of stdin' });
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}

async function readInput(argv: Record<string, unknown>): Promise<string> {
  const inputFile = argv['input-file'];
  if (typeof inputFile === 'string' && inputFile) {
    return fs.promises.readFile(inputFile, 'utf-8');
  }
  return readStdin();
}

async function handleCommand(commandName: string, cmd: CommandDef, argv: Record<string, unknown>): Promise<void> {
  if (!isConfigured()) {
    console.error(NOT_CONFIGURED_MESSAGE);
    process.exit(1);
  }
  const env = loadEnv();
  if (!env) {
    console.error(NOT_CONFIGURED_MESSAGE);
    process.exit(1);
  }
  try {
    const input = await readInput(argv);
    const result = await runCommand(cmd, argv, input, env);
    process.stdout.write(result.text);
    if (result.text && !result.text.endsWith('\n')) process.stdout.write('\n');
    process.exit(0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await buildYargs().parseAsync();
}

main();
