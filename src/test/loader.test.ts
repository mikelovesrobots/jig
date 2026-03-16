import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadCommands } from '../commands/loader';

describe('loader', () => {
  describe('loadCommands (bundled)', () => {
    it('loads rate command with correct structure', () => {
      const commands = loadCommands();
      assert(commands.has('rate'), 'should have rate command');
      const rate = commands.get('rate')!;
      assert.strictEqual(rate.name, 'rate');
      assert(rate.description.length > 0);
      assert(Array.isArray(rate.args));
      const minArg = rate.args.find((a) => a.name === 'min');
      assert(minArg, 'should have min arg');
      assert.strictEqual(minArg!.type, 'number');
      assert.strictEqual(minArg!.default, 1);
      assert(rate.promptBody.includes('{{input}}'));
      assert(rate.promptBody.includes('{{min}}'));
      assert(rate.promptBody.includes('{{metric}}'));
    });

    it('returns a Map keyed by command name', () => {
      const commands = loadCommands();
      assert(commands instanceof Map);
      for (const [name, cmd] of commands) {
        assert.strictEqual(cmd.name, name);
      }
    });

    it('loads decimate and grammar-fix commands', () => {
      const commands = loadCommands();
      assert(commands.has('decimate'), 'should have decimate');
      assert(commands.has('grammar-fix'), 'should have grammar-fix');
      const decimate = commands.get('decimate')!;
      assert(decimate.description.length > 0);
      const percentArg = decimate.args.find((a) => a.name === 'percent');
      assert(percentArg, 'decimate should have percent arg');
      assert.strictEqual(percentArg!.type, 'number');
      assert(decimate.promptBody.includes('{{percent}}'));
      assert(decimate.promptBody.includes('{{input}}'));
      const grammarFix = commands.get('grammar-fix')!;
      assert(grammarFix.promptBody.includes('{{percent}}'));
      assert(grammarFix.promptBody.includes('{{input}}'));
    });
  });

  describe('loadCommands (user dir override)', () => {
    let tempDir: string;
    let originalHome: string | undefined;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jig-loader-test-'));
      originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      const userCommandsDir = path.join(tempDir, '.jig', 'commands');
      fs.mkdirSync(userCommandsDir, { recursive: true });
    });

    afterEach(() => {
      process.env.HOME = originalHome;
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('includes user command when user dir has a new .yaml', () => {
      const userCmdPath = path.join(tempDir, '.jig', 'commands', 'custom.yaml');
      fs.writeFileSync(
        userCmdPath,
        `---
name: custom
description: A user command
args: []
---
Hello {{input}}
`,
        'utf-8'
      );
      const commands = loadCommands();
      assert(commands.has('custom'));
      assert.strictEqual(commands.get('custom')!.description, 'A user command');
      assert(commands.get('custom')!.promptBody.includes('{{input}}'));
    });

    it('user command overrides bundled command with same name', () => {
      const ratePath = path.join(tempDir, '.jig', 'commands', 'rate.yaml');
      fs.writeFileSync(
        ratePath,
        `---
name: rate
description: Overridden by user
args:
  - name: score
    type: number
    default: 10
---
User rate prompt.
`,
        'utf-8'
      );
      const commands = loadCommands();
      assert(commands.has('rate'));
      assert.strictEqual(commands.get('rate')!.description, 'Overridden by user');
      assert.strictEqual(commands.get('rate')!.args.length, 1);
      assert.strictEqual(commands.get('rate')!.args[0].name, 'score');
    });

    it('skips file that produces no valid command (empty name) without throwing', () => {
      const badPath = path.join(tempDir, '.jig', 'commands', 'bad.yaml');
      fs.writeFileSync(badPath, '---\nname: \ndescription: no name\n---\nbody', 'utf-8');
      const commands = loadCommands();
      assert(!commands.has('bad'), 'empty name should not be added');
      assert(commands.has('rate'), 'bundled commands still loaded');
    });

    it('skips non-.yaml files', () => {
      const txtPath = path.join(tempDir, '.jig', 'commands', 'foo.txt');
      fs.writeFileSync(txtPath, '---\nname: foo\n---\nbody', 'utf-8');
      const commands = loadCommands();
      assert(!commands.has('foo'));
    });
  });

  describe('loadCommands (user dir missing)', () => {
    it('returns only bundled commands when .jig/commands does not exist', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jig-loader-no-user-'));
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      try {
        const commands = loadCommands();
        assert(commands.has('rate'));
        assert(commands.size >= 1);
      } finally {
        process.env.HOME = originalHome;
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
