import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

describe('CMMN shortcuts', () => {
  it('uses the same open and new shortcuts in the native menu and both help translations', () => {
    const menu = readFileSync(resolve(root, 'electron/main.cjs'), 'utf8');
    const germanHelp = readFileSync(resolve(root, 'public/help/de/basics.json'), 'utf8');
    const englishHelp = readFileSync(resolve(root, 'public/help/en/basics.json'), 'utf8');

    expect(menu).toContain("label: t('menu.openCmmn'), accelerator: 'CmdOrCtrl+Alt+O'");
    expect(menu).toContain("label: t('menu.newCmmn'), accelerator: 'CmdOrCtrl+Alt+N'");
    expect(germanHelp).toContain('Strg/Cmd+Alt+O** – CMMN-Modell öffnen');
    expect(germanHelp).toContain('Strg/Cmd+Alt+N** – Neues CMMN-Fallmodell');
    expect(englishHelp).toContain('Ctrl/Cmd+Alt+O** – Open CMMN model');
    expect(englishHelp).toContain('Ctrl/Cmd+Alt+N** – New CMMN case model');
  });
});
