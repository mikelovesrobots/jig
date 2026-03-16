import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildPrompt, runCommand } from '../commands/run';
import type { CommandDef } from '../commands/types';

const rateCommand: CommandDef = {
  name: 'rate',
  description: 'Rate the input.',
  args: [
    { name: 'min', type: 'number', default: 1 },
    { name: 'max', type: 'number', default: 5 },
    { name: 'metric', type: 'string', default: 'quality' },
  ],
  promptBody: 'Rate from {{min}} to {{max}} on "{{metric}}".\n\nContent:\n{{input}}',
};

describe('run', () => {
  describe('buildPrompt', () => {
    it('renders prompt with argv and input', () => {
      const argv = { min: 0, max: 10, metric: 'clarity' };
      const input = 'Hello world';
      const out = buildPrompt(rateCommand, argv, input);
      assert(out.includes('0'), 'should include min');
      assert(out.includes('10'), 'should include max');
      assert(out.includes('clarity'), 'should include metric');
      assert(out.includes('Hello world'), 'should include input');
    });

    it('uses defaults for missing args', () => {
      const argv = {};
      const input = 'x';
      const out = buildPrompt(rateCommand, argv, input);
      assert(out.includes('1'), 'should default min');
      assert(out.includes('5'), 'should default max');
      assert(out.includes('quality'), 'should default metric');
    });

    it('includes explain when in argv', () => {
      const cmd: CommandDef = {
        ...rateCommand,
        promptBody: 'Explain: {{explain}}. Content: {{input}}',
      };
      const out = buildPrompt(cmd, { explain: true }, 'hi');
      assert(out.includes('true'), 'should include explain');
    });
  });

  describe('runCommand', () => {
    const env = { JIG_MODEL: 'openai/gpt-4o', OPENROUTER_API_KEY: 'sk-test' };

    it('returns response text on success', async () => {
      const mockFetch = async (_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string);
        assert.strictEqual(body.model, 'openai/gpt-4o');
        assert(Array.isArray(body.messages) && body.messages[0].content);
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '4' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };
      const result = await runCommand(rateCommand, { min: 1, max: 5 }, 'some text', env, mockFetch);
      assert.strictEqual(result.text, '4');
    });

    it('throws on API error with message', async () => {
      const mockFetch = async () =>
        new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      await assert.rejects(
        async () => runCommand(rateCommand, {}, 'x', env, mockFetch),
        /OpenRouter API error.*401|Invalid API key/
      );
    });

    it('returns empty string when choices[0].message.content is missing', async () => {
      const mockFetch = async () =>
        new Response(JSON.stringify({ choices: [{}] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      const result = await runCommand(rateCommand, {}, 'x', env, mockFetch);
      assert.strictEqual(result.text, '');
    });
  });
});
