import { describe, expect, it } from 'vitest';
import { readCmmnDocumentation } from '../src/cmmn.js';

const model = `<?xml version="1.0" encoding="UTF-8"?>
<cmmn:definitions xmlns:cmmn="http://www.omg.org/spec/CMMN/20151109/MODEL" xmlns:bpml="https://bpm-modeler.local/schema/cmmn-link/1.0" name="Customer case">
  <cmmn:case id="Case_1" name="Customer case"><cmmn:documentation>Handle the request.</cmmn:documentation><cmmn:casePlanModel id="Plan_1" name="Customer plan">
    <cmmn:planItem id="PlanItem_1" definitionRef="Process_1"/><cmmn:processTask id="Process_1" name="Start process"><cmmn:extensionElements><bpml:modelLink path="C:\\models\\process.bpmn" type="bpmn"/></cmmn:extensionElements></cmmn:processTask>
    <cmmn:planItem id="PlanItem_2" definitionRef="Decision_1"/><cmmn:decisionTask id="Decision_1" name="Assess"/>
    <cmmn:planItem id="PlanItem_3" definitionRef="Case_2"/><cmmn:caseTask id="Case_2" name="Escalate"/>
  </cmmn:casePlanModel></cmmn:case>
</cmmn:definitions>`;

describe('CMMN documentation', () => {
  it('extracts case documentation, task types and optional linked model names', () => {
    const documentation = readCmmnDocumentation(model);
    expect(documentation.title).toBe('Customer plan');
    expect(documentation.scope).toEqual([{ type: 'Case', name: 'Customer case', documentation: 'Handle the request.' }]);
    expect(documentation.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'processTask', name: 'Start process', callActivityFile: 'process.bpmn' }),
      expect.objectContaining({ type: 'decisionTask', name: 'Assess' }),
      expect.objectContaining({ type: 'caseTask', name: 'Escalate' })
    ]));
  });
});
