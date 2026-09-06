import { describe, expect, it } from 'vitest';
import { languageName, parseProperties, resolveLanguage, supportedLanguages, translate } from '../src/i18n.js';

describe('internationalization', () => {
  it('uses the operating system language when it is supported and English otherwise', () => {
    expect(resolveLanguage('de-DE')).toBe('de');
    expect(resolveLanguage('EN_us')).toBe('en');
    expect(resolveLanguage('fr-FR')).toBe('en');
  });

  it('reads properties files and interpolates localized values', () => {
    expect(parseProperties('title=Example\n# ignored\n')).toEqual({ title: 'Example' });
    expect(translate('de', 'status.opened', { path: 'modell.bpmn' })).toBe('Geöffnet: modell.bpmn');
    expect(translate('de', 'menu.saveAs')).toBe('Speichern unter …');
    expect(translate('de', 'pdf.footer')).toBe('Erstellt mit BPM Modeler');
    expect(translate('de', 'status.dmnPdfExporting')).toBe('DMN-PDF-Dokumentation wird erstellt …');
    expect(translate('de', 'status.dmnPdfExportFailed', { message: 'Testfehler' })).toContain('Details: Testfehler');
    expect(translate('de', 'pdf.processScope.start')).toBe('Start des Prozesses');
    expect(translate('de', 'license.accept')).toBe('Ich akzeptiere die Lizenzbedingungen');
    expect(translate('de', 'start.createCmmn')).toBe('CMMN-Modell anlegen');
    expect(translate('de', 'start.openCmmn')).toBe('CMMN-Modell öffnen');
    expect(translate('de', 'start.readingRecommendation')).toBe('Leseempfehlung');
    expect(translate('de', 'about.icon')).toBe('Bildnachweise: Icons: KI-generiert; Buchcover BPA: RheinWerk Verlag');
    expect(translate('en', 'status.unsavedChanges')).toBe('Unsaved changes');
    expect(translate('en', 'pdf.footer')).toBe('Created with BPM Modeler');
    expect(translate('en', 'status.dmnPdfExporting')).toBe('Creating DMN PDF documentation …');
    expect(translate('en', 'pdf.processScope.start')).toBe('Process start');
    expect(translate('en', 'license.accept')).toBe('I accept the license terms');
    expect(translate('en', 'start.createCmmn')).toBe('Create CMMN model');
    expect(translate('en', 'start.openCmmn')).toBe('Open CMMN model');
    expect(translate('en', 'start.cmmnBookRecommendation')).toBe('CMMN Method and Style');
    expect(translate('en', 'about.icon')).toBe('Image credits: Icons: AI-generated; BPA book cover: RheinWerk Verlag');
    expect(translate('unknown', 'menu.file')).toBe('File');
    expect(supportedLanguages).toEqual(['de', 'en']);
    expect(languageName('de')).toBe('Deutsch');
  });
});
