import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

describe('CMMN editor controls', () => {
  it('keeps Default inside the CMMN color submenu and exposes clipboard commands', () => {
    const main = readFileSync(resolve(root, 'electron/main.cjs'), 'utf8');

    expect(main).toContain("{ label: t('color.default'), accelerator: 'CmdOrCtrl+Shift+U', enabled: hasCmmnSelection");
    expect(main).toContain("sendMenuCommand('copy-cmmn', window)");
    expect(main).toContain("sendMenuCommand('cut-cmmn', window)");
    expect(main).toContain("sendMenuCommand('paste-cmmn', window)");
  });

  it('uses white as the CMMN default fill and provides a link editor for linked and unlinked tasks', () => {
    const plugin = readFileSync(resolve(root, 'src/plugins/cmmnIoPlugin.js'), 'utf8');

    expect(plugin).toContain("querySelectorAll('.djs-visual > rect')");
    expect(plugin).toContain("color || '#fff'");
    expect(plugin).toContain("className = 'cmmn-link-control'");
    expect(plugin).toContain('if (!details || linkOverlayIds.has(element.id)) return;');
    expect(plugin).toContain("onModelLinkEditRequested?.(details)");
    expect(plugin).toContain('modeling.updateProperties(definition, { extensionElements: extensions }, [item]);');
    expect(plugin).toContain("copyPaste').copy(selectedElements())");
  });

  it('opens a linked CMMN task target from its link dialog without hijacking task selection', () => {
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');

    expect(app).toContain("onOpen={api ? openLinkedModel : undefined}");
    expect(app).toContain("onOpenLinkedModel={(type, file) => createDocument(type, file)}");
    expect(app).toContain("t('modelLink.open')");
    expect(app).toContain("api?.openLinkedCmmn?.(activity.path)");
  });

  it('passes the Case Plan Model title as the safe initial CMMN save name', () => {
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');
    const main = readFileSync(resolve(root, 'electron/main.cjs'), 'utf8');

    expect(app).toContain("filenameBase(documentationPlugin.extract(content).title, 'case')");
    expect(app).toContain('defaultFilename });');
    expect(main).toContain('options.defaultPath = path.basename(defaultFilename)');
  });

  it('does not render CMMN case metadata as a BPMN collaboration section', () => {
    const pdfPlugin = readFileSync(resolve(root, 'src/plugins/jsPdfExportPlugin.js'), 'utf8');

    expect(pdfPlugin).toContain('exportBpmnPdf(svg, { ...documentation, scope: [] }');
  });
});
