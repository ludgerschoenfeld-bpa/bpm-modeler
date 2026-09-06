import { describe, expect, it } from 'vitest';
import { emptyProcessScope, formatProcessScope, parseProcessScope, processScopeFromDocumentation } from '../src/processScope.js';
import { replaceDocumentationSection } from '../src/highLevelActivities.js';

describe('top-level process scope', () => {
  it('stores every German scope field in one Markdown table', () => {
    const scope = { start: 'Antrag eingeht', content: 'Prüfung | Freigabe', instance: 'Ein Antrag', ends: 'Abgelehnt\noder genehmigt' };
    expect(formatProcessScope(scope, 'de')).toBe(`## Top-Level-Prozessumfang
| --- | --- |
| Start des Prozesses | Antrag eingeht |
| Was umfasst der Inhalt des Prozesses? | Prüfung \\| Freigabe |
| Was repräsentiert eine Instanz des Prozesses? | Ein Antrag |
| Auf welche Wege kann der Prozess enden? | Abgelehnt<br>oder genehmigt |`);
  });

  it('uses English labels unless German is explicitly selected and restores escaped values', () => {
    const markdown = formatProcessScope({ start: 'Request', content: 'Validate', instance: 'One case', ends: 'Done' }, 'fr');
    expect(markdown).toContain('## Top-Level Process Scope');
    expect(parseProcessScope(formatProcessScope({ ...emptyProcessScope(), content: 'A | B', ends: 'One\nTwo' }, 'en'))).toEqual({ start: '', content: 'A | B', instance: '', ends: 'One\nTwo' });
  });

  it('makes an existing scope available to BPMN documentation exports', () => {
    const markdown = formatProcessScope({ start: 'Start', content: 'Work', instance: 'Case', ends: 'End' }, 'en');
    expect(processScopeFromDocumentation(markdown)).toEqual({
      title: 'Top-Level Process Scope',
      questions: ['Process start', 'What does the process include?', 'What does one process instance represent?', 'How can the process end?'],
      scope: { start: 'Start', content: 'Work', instance: 'Case', ends: 'End' }
    });
  });

  it('removes a scope section when all fields are empty instead of retaining an empty table', () => {
    const existing = formatProcessScope({ start: 'Start', content: '', instance: '', ends: '' }, 'en');
    expect(replaceDocumentationSection(existing, '(?:Top-Level-Prozessumfang|Top-Level Process Scope)', '')).toBe('');
  });
});
