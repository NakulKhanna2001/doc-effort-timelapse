import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../src/ai/prompt';

describe('buildPrompt', () => {
  it('embeds the payload JSON and asks for the required sections', () => {
    const prompt = buildPrompt({
      metrics: { typedChars: 5, pastedChars: 0, pasteCount: 0, largestPaste: 0, pasteRatio: 0, activeTimeMs: 1000, deletions: 0 },
      effortScore: 80, pasteEvents: [], durationMs: 1000,
    });
    expect(prompt).toContain('"effortScore": 80');
    expect(prompt).toContain('Authenticity assessment');
  });
});
