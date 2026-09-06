import { describe, expect, it } from 'vitest';
import { emptyHighLevelActivity, formatHighLevelActivities, parseHighLevelActivities, replaceDocumentationSection } from '../src/highLevelActivities.js';

describe('top-level main activities', () => {
  it('stores main activities and every end-event continuation as localized Markdown', () => {
    const markdown = formatHighLevelActivities([{ name: 'Prüfen', description: 'Antrag fachlich prüfen', endings: [{ endEvent: 'Freigabe', next: 'Entscheiden' }, { endEvent: 'Ablehnung', next: 'Ende' }] }], 'de');
    expect(markdown).toContain('## Hauptaktivitäten im Top-Level');
    expect(markdown).toContain('| Endereignis | Nächste Top-Level-Aktivität/Endereignis |');
    expect(parseHighLevelActivities(markdown)).toEqual([{ name: 'Prüfen', description: 'Antrag fachlich prüfen', endings: [{ endEvent: 'Freigabe', next: 'Entscheiden' }, { endEvent: 'Ablehnung', next: 'Ende' }] }]);
  });

  it('preserves paragraph breaks in descriptions, including maps stored before line-break escaping', () => {
    const activity = { name: 'dfg', description: 'sgdfgdddf\n\nEN: zzzz', endings: [{ endEvent: '', next: '' }] };
    const markdown = formatHighLevelActivities([activity], 'de');
    expect(markdown).toContain('Kurze Inhaltsbeschreibung: sgdfgdddf<br><br>EN: zzzz');
    expect(parseHighLevelActivities(markdown)).toEqual([activity]);

    const legacyMarkdown = markdown.replace('<br><br>', '\n\n');
    expect(parseHighLevelActivities(legacyMarkdown)).toEqual([activity]);
  });

  it('keeps the process scope section when adding or replacing the activity map', () => {
    const scope = '## Top-Level Process Scope\n| --- | --- |\n| Process start | Request |';
    const map = formatHighLevelActivities([{ ...emptyHighLevelActivity(), name: 'Validate' }], 'en');
    expect(replaceDocumentationSection(scope, '(?:Top-Level Main Activities|Hauptaktivitäten im Top-Level)', map)).toContain(scope);
  });
});
