import { afterEach, describe, expect, it, vi } from 'vitest';
import { droolsDmnEvaluatorPlugin } from '../src/plugins/droolsDmnEvaluatorPlugin.js';

describe('DMN evaluator plugin', () => {
  afterEach(() => { delete window.desktopFiles; });

  it('activates the bundled runner before the test-case dialog is used', async () => {
    const activateDmnRunner = vi.fn().mockResolvedValue();
    window.desktopFiles = { activateDmnRunner };
    await droolsDmnEvaluatorPlugin.activate();
    expect(activateDmnRunner).toHaveBeenCalledOnce();
  });
});
