import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

describe('DMN includes shortcut', () => {
  it('uses the same shortcut in the native menu and both help translations', () => {
    const menu = readFileSync(resolve(root, 'electron/main.cjs'), 'utf8');
    const germanHelp = readFileSync(resolve(root, 'public/help/de/basics.json'), 'utf8');
    const englishHelp = readFileSync(resolve(root, 'public/help/en/basics.json'), 'utf8');

    expect(menu).toContain("label: t('menu.dmnIncludes'), accelerator: 'CmdOrCtrl+Alt+I'");
    expect(germanHelp).toContain('Strg/Cmd+Alt+I** – Externe DMN-Modelle einbinden');
    expect(englishHelp).toContain('Ctrl/Cmd+Alt+I** – Include external DMN models');
  });
});
