import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

describe('save shortcuts', () => {
  it('handles save before an embedded editor can consume Ctrl/Cmd+S', () => {
    const main = readFileSync(resolve(root, 'electron/main.cjs'), 'utf8');

    expect(main).toContain("window.webContents.on('before-input-event'");
    expect(main).toContain("input.shift ? 'save-as' : 'save'");
    expect(main).toContain("accelerator: 'CmdOrCtrl+S'");
    expect(main).toContain("accelerator: 'CmdOrCtrl+Shift+S'");
  });
});
