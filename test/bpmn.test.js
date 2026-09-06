import { describe, expect, it } from 'vitest';
import { readBpmnDocumentation } from '../src/bpmn.js';
import { formatProcessScope } from '../src/processScope.js';
import { formatHighLevelActivities } from '../src/highLevelActivities.js';

const xml = `<?xml version="1.0"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="P1" name="Antrag"><documentation>Gesamtdokumentation</documentation>
    <startEvent id="start"/><sequenceFlow id="f1" sourceRef="start" targetRef="review"/>
    <userTask id="review" name="Antrag prüfen"><documentation>Prüfung durchführen</documentation></userTask>
    <sequenceFlow id="f2" sourceRef="review" targetRef="approve"/>
    <serviceTask id="approve" name="Freigabe"><documentation>Freigabe automatisieren</documentation></serviceTask>
    <task id="orphan" name="Nacharbeit"><documentation>Fallback-Reihenfolge</documentation></task>
  </process>
  <collaboration id="C1" name="Antragsteller"><participant id="pool1" name="Antragsteller" processRef="P1"/><documentation>Zusammenarbeit</documentation></collaboration>
  <messageFlow id="m1" name="Status" sourceRef="review" targetRef="approve"><documentation>Status melden</documentation></messageFlow>
</definitions>`;

describe('BPMN report extraction', () => {
  it('exports process and collaboration documentation', () => {
    const report = readBpmnDocumentation(xml);
    expect(report.title).toBe('Antrag');
    expect(report.scope).toEqual([
      { type: 'Prozess', name: 'Antrag', documentation: 'Gesamtdokumentation' },
      { type: 'Collaboration', name: 'Antragsteller', documentation: 'Zusammenarbeit' }
    ]);
  });

  it('orders reachable tasks by sequence flow and keeps remaining tasks deterministic', () => {
    const report = readBpmnDocumentation(xml);
    expect(report.tasks.map(x => x.name)).toEqual(['Antrag prüfen', 'Freigabe', 'Nacharbeit']);
    expect(report.tasks.map(x => x.order)).toEqual([1, 2, 3]);
    expect(report.tasks[0].documentation).toBe('Prüfung durchführen');
  });

  it('exports message-flow endpoints and documentation', () => {
    expect(readBpmnDocumentation(xml).messages).toEqual([{
      name: 'Status', source: 'Antrag prüfen', target: 'Freigabe', sourcePool: 'Antragsteller', documentation: 'Status melden'
    }]);
  });

  it('extracts a stored top-level process scope for the PDF introduction', () => {
    const scopedXml = xml.replace('Gesamtdokumentation', formatProcessScope({ start: 'Eingang', content: 'Bearbeitung', instance: 'Antrag', ends: 'Entscheidung' }, 'de'));
    expect(readBpmnDocumentation(scopedXml).processScope).toMatchObject({
      title: 'Top-Level-Prozessumfang',
      scope: { start: 'Eingang', content: 'Bearbeitung', instance: 'Antrag', ends: 'Entscheidung' }
    });
  });

  it('extracts a stored main-activity map for the PDF only when it is present', () => {
    const activityMap = formatHighLevelActivities([{ name: 'Validate', description: 'Check request', endings: [{ endEvent: 'Validated', next: 'Approve' }] }], 'en');
    expect(readBpmnDocumentation(xml.replace('Gesamtdokumentation', activityMap)).highLevelActivities).toEqual([{ name: 'Validate', description: 'Check request', endings: [{ endEvent: 'Validated', next: 'Approve' }] }]);
    expect(readBpmnDocumentation(xml).highLevelActivities).toBeUndefined();
  });

  it('documents a linked Call Activity with its file name but not its local path', () => {
    const linked = xml.replace('<serviceTask id="approve"', '<callActivity id="call" name="Unterprozess"><extensionElements><bpml:callActivityLink xmlns:bpml="https://bpm-modeler.local/schema/call-link/1.0" path="C:\\models\\unterprozess.bpmn"/></extensionElements></callActivity><serviceTask id="approve"');
    const task = readBpmnDocumentation(linked).tasks.find(item => item.type === 'callActivity');
    expect(task).toMatchObject({ name: 'Unterprozess', callActivityFile: 'unterprozess.bpmn' });
  });

  it('extracts documentation from namespaced BPMN with legacy bpml links', () => {
    const namespacedExample = `<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpml="https://bpm-modeler.local/schema/call-link/1.0"><bpmn:process id="Process_1" name="PDA Seminaranmeldung abwickeln"><bpmn:documentation>## Hauptaktivitäten im Top-Level
### 1. Seminaranmeldung prüfen
Kurze Inhaltsbeschreibung: Anmeldung prüfen
| Endereignis | Nächste Top-Level-Aktivität/Endereignis |
| --- | --- |
| Geprüft | Verbuchen |</bpmn:documentation><bpmn:callActivity id="Call_1" name="Seminaranmeldung prüfen"><bpmn:extensionElements><bpml:callActivityLink path="C:\\models\\PDA_SeminaranmeldungAbwickeln_DetailLevel-1.bpmn"/></bpmn:extensionElements></bpmn:callActivity></bpmn:process></bpmn:definitions>`;
    const report = readBpmnDocumentation(namespacedExample);

    expect(report.title).toBe('PDA Seminaranmeldung abwickeln');
    expect(report.highLevelActivities).toHaveLength(1);
    expect(report.tasks).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Seminaranmeldung prüfen', callActivityFile: 'PDA_SeminaranmeldungAbwickeln_DetailLevel-1.bpmn' })]));
  });
});
