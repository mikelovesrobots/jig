import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getJigDir, getEnvPath, isConfigured } from '../config';

describe('config', () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jig-config-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getJigDir', () => {
    it('returns path under home', () => {
      const dir = getJigDir();
      assert.strictEqual(path.basename(dir), '.jig');
      assert(dir.startsWith(tempDir), 'should be under test home');
    });
  });

  describe('getEnvPath', () => {
    it('returns env file path under .jig', () => {
      const envPath = getEnvPath();
      assert.strictEqual(path.basename(envPath), 'env');
      assert(envPath.includes('.jig'), 'path should include .jig');
    });
  });

  describe('isConfigured', () => {
    it('returns false when env file does not exist', () => {
      assert.strictEqual(isConfigured(), false);
    });

    it('returns false when env file is empty', () => {
      fs.mkdirSync(path.join(tempDir, '.jig'), { recursive: true });
      fs.writeFileSync(getEnvPath(), '', 'utf-8');
      assert.strictEqual(isConfigured(), false);
    });

    it('returns false when only JIG_MODEL is set', () => {
      fs.mkdirSync(path.join(tempDir, '.jig'), { recursive: true });
      fs.writeFileSync(getEnvPath(), 'JIG_MODEL=openai/gpt-4o\n', 'utf-8');
      assert.strictEqual(isConfigured(), false);
    });

    it('returns false when only OPENROUTER_API_KEY is set', () => {
      fs.mkdirSync(path.join(tempDir, '.jig'), { recursive: true });
      fs.writeFileSync(getEnvPath(), 'OPENROUTER_API_KEY=sk-x\n', 'utf-8');
      assert.strictEqual(isConfigured(), false);
    });

    it('returns false when JIG_MODEL has no value', () => {
      fs.mkdirSync(path.join(tempDir, '.jig'), { recursive: true });
      fs.writeFileSync(
        getEnvPath(),
        'JIG_MODEL=\nOPENROUTER_API_KEY=sk-x\n',
        'utf-8'
      );
      assert.strictEqual(isConfigured(), false);
    });

    it('returns true when both keys have values', () => {
      fs.mkdirSync(path.join(tempDir, '.jig'), { recursive: true });
      fs.writeFileSync(
        getEnvPath(),
        'JIG_MODEL=anthropic/claude-3.5-sonnet\nOPENROUTER_API_KEY=sk-secret\n',
        'utf-8'
      );
      assert.strictEqual(isConfigured(), true);
    });

    it('returns true when keys have spaces around =', () => {
      fs.mkdirSync(path.join(tempDir, '.jig'), { recursive: true });
      fs.writeFileSync(
        getEnvPath(),
        'JIG_MODEL = openai/gpt-4o\nOPENROUTER_API_KEY = sk-x\n',
        'utf-8'
      );
      assert.strictEqual(isConfigured(), true);
    });
  });
});
