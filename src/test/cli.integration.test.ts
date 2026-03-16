import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'node:child_process';

const CLI_PATH = path.resolve(process.cwd(), 'dist', 'cli.js');

function ensureBuilt(): void {
  if (!fs.existsSync(CLI_PATH)) {
    throw new Error(`CLI not found at ${CLI_PATH}. Run npm run build first.`);
  }
}

function runJig(args: string[], options: { env?: NodeJS.ProcessEnv; input?: string } = {}): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    env: { ...process.env, ...options.env },
    input: options.input,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('CLI integration', () => {
  let tempDir: string;
  let originalHome: string | undefined;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    ensureBuilt();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jig-cli-test-'));
    originalHome = process.env.HOME;
    env = { ...process.env, HOME: tempDir };
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('jig --help', () => {
    it('exits 0 and prints usage with command list', () => {
      const { status, stdout } = runJig(['--help'], { env });
      assert.strictEqual(status, 0);
      assert(stdout.includes('Usage'), 'should show usage');
      assert(stdout.includes('jig'), 'should mention jig');
      assert(stdout.includes('init'), 'should list init');
      assert(stdout.includes('rate'), 'should list rate');
      assert(stdout.includes('decimate'), 'should list decimate');
      assert(stdout.includes('grammar-fix'), 'should list grammar-fix');
    });

    it('exits 0 for -h', () => {
      const { status, stdout } = runJig(['-h'], { env });
      assert.strictEqual(status, 0);
      assert(stdout.includes('Usage'));
    });
  });

  describe('jig (no args)', () => {
    it('exits 1 and asks for a command', () => {
      const { status, stdout, stderr } = runJig([], { env });
      assert.strictEqual(status, 1);
      const out = stdout + stderr;
      assert(out.includes('Provide a command') || out.includes('command'), 'should ask for command');
    });
  });

  describe('jig rate --help', () => {
    it('exits 0 and prints rate options', () => {
      const { status, stdout } = runJig(['rate', '--help'], { env });
      assert.strictEqual(status, 0);
      assert(stdout.includes('rate'), 'should describe rate');
      assert(stdout.includes('--min'), 'should show --min');
      assert(stdout.includes('--max'), 'should show --max');
      assert(stdout.includes('--metric'), 'should show --metric');
      assert(stdout.includes('--explain'), 'should show --explain');
      assert(stdout.includes('--input-file'), 'should show --input-file');
    });
  });

  describe('jig decimate --help', () => {
    it('exits 0 and prints decimate options', () => {
      const { status, stdout } = runJig(['decimate', '--help'], { env });
      assert.strictEqual(status, 0);
      assert(stdout.includes('decimate'), 'should describe decimate');
      assert(stdout.includes('--percent'), 'should show --percent');
      assert(stdout.includes('--input-file'), 'should show --input-file');
    });
  });

  describe('jig grammar-fix --help', () => {
    it('exits 0 and prints grammar-fix options', () => {
      const { status, stdout } = runJig(['grammar-fix', '--help'], { env });
      assert.strictEqual(status, 0);
      assert(stdout.includes('grammar-fix'), 'should describe grammar-fix');
      assert(stdout.includes('--percent'), 'should show --percent');
      assert(stdout.includes('--input-file'), 'should show --input-file');
    });
  });

  describe('jig rate (not configured)', () => {
    it('exits 1 and tells user to run jig init', () => {
      const { status, stderr } = runJig(['rate'], { env });
      assert.strictEqual(status, 1);
      assert(stderr.includes('not configured') || stderr.includes('jig init'), 'should prompt to run jig init');
    });
  });

  describe('jig unknown-command', () => {
    it('exits 1 and reports unknown command', () => {
      const { status, stdout, stderr } = runJig(['unknown-command'], { env });
      assert.strictEqual(status, 1);
      const out = stdout + stderr;
      assert(out.includes('Unknown command') && out.includes('unknown-command'), 'should report unknown command');
    });
  });

  describe('jig rate (configured)', () => {
    it('when .jig/env exists with both keys, jig rate runs and calls API (fake key yields 401)', () => {
      const jigDir = path.join(tempDir, '.jig');
      const envPath = path.join(jigDir, 'env');
      const commandsDir = path.join(jigDir, 'commands');
      fs.mkdirSync(commandsDir, { recursive: true });
      fs.writeFileSync(
        envPath,
        'JIG_MODEL=openai/gpt-4o\nOPENROUTER_API_KEY=sk-fake\n',
        'utf-8'
      );
      const { status, stderr } = runJig(['rate'], { env, input: 'Sample input to rate.' });
      assert.strictEqual(status, 1, 'rate with invalid key should exit 1');
      assert(
        stderr.includes('OpenRouter') || stderr.includes('401') || stderr.includes('Unauthorized') || stderr.includes('error'),
        'should report API error'
      );
      assert(!stderr.includes('not implemented') && !stderr.includes('Milestone 2'), 'should no longer say not implemented');
    });

    it('reads input from --input-file when provided', () => {
      const jigDir = path.join(tempDir, '.jig');
      const envPath = path.join(jigDir, 'env');
      const commandsDir = path.join(jigDir, 'commands');
      fs.mkdirSync(commandsDir, { recursive: true });
      fs.writeFileSync(envPath, 'JIG_MODEL=openai/gpt-4o\nOPENROUTER_API_KEY=sk-fake\n', 'utf-8');
      const inputFile = path.join(tempDir, 'input.txt');
      fs.writeFileSync(inputFile, 'Content from file.', 'utf-8');
      const { status, stderr } = runJig(['rate', '--input-file', inputFile], { env });
      assert.strictEqual(status, 1, 'should exit 1 on API error');
      assert(stderr.includes('OpenRouter') || stderr.includes('401') || stderr.includes('error'), 'should attempt API call');
    });
  });

});
