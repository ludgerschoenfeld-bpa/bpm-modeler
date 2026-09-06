import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

describe('editor shortcuts', () => {
  it('keeps the DMN open command separate from the orange color command in BPMN and CMMN', () => {
    const menu = readFileSync(resolve(root, 'electron/main.cjs'), 'utf8');
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');
    const germanHelp = readFileSync(resolve(root, 'public/help/de/basics.json'), 'utf8');
    const englishHelp = readFileSync(resolve(root, 'public/help/en/basics.json'), 'utf8');

    expect(menu).toContain("label: t('menu.openDmn'), accelerator: 'CmdOrCtrl+Shift+O'");
    expect(menu).toContain("if (key === 'o' && input.shift)");
    expect(menu).toContain("sendMenuCommand('open-dmn', window);");
    expect(menu.match(/accelerator: `CmdOrCtrl\+Shift\+\$\{color\[0\]\.toUpperCase\(\)\}`/g) || []).toHaveLength(4);
    expect(app).toContain("const shortcuts = { r: 'red', b: 'blue', g: 'green', y: 'yellow', o: 'orange' };");
    expect(app).toContain("event.shiftKey && event.key.toLowerCase() === 'o'");
    expect(germanHelp).toContain('Strg/Cmd+Umschalt+O** – DMN-Datei öffnen');
    expect(englishHelp).toContain('Ctrl/Cmd+Shift+O** – Open DMN file');
  });

  it('does not turn the SVG export shortcut into a regular save operation', () => {
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');
    const menu = readFileSync(resolve(root, 'electron/main.cjs'), 'utf8');

    expect(app).toContain("primaryModifier && !event.altKey && event.key.toLowerCase() === 's'");
    expect(menu).toContain("label: 'SVG', accelerator: 'CmdOrCtrl+Alt+S'");
  });
});
