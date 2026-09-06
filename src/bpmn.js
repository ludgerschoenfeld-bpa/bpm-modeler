import { processScopeFromDocumentation } from './processScope.js';
import { parseHighLevelActivities } from './highLevelActivities.js';

// Change this template to set organization-wide BPMN defaults for new diagrams.
export const emptyBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpm-modeler.local">
  <bpmn:process id="Process_1" name="Neuer Prozess" isExecutable="false"><bpmn:startEvent id="StartEvent_1" name="Start" /></bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_1"><bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_1"><bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="170" y="100" width="36" height="36" /></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const local = (el) => el.localName;
const text = (el) => [...el.children].filter(child => local(child) === 'documentation').map(child => child.textContent.trim()).filter(Boolean).join('\n');
const label = (el) => el.getAttribute('name') || el.getAttribute('id') || 'Ohne Bezeichnung';
const callActivityLink = (el) => {
  const extensionElements = [...el.children].find(child => local(child) === 'extensionElements');
  return extensionElements ? [...extensionElements.children].find(item => local(item) === 'callActivityLink')?.getAttribute('path') || '' : '';
};

function parentProcessId(element) {
  let current = element;
  while (current) {
    if (local(current) === 'process') return current.getAttribute('id');
    current = current.parentElement;
  }
  return undefined;
}

// Extract report data directly from BPMN XML so documentation exports do not depend on canvas state.
export function readBpmnDocumentation(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const elements = [...doc.querySelectorAll('*')];
  const process = elements.filter(element => ['process', 'collaboration'].includes(local(element)));
  const byId = new Map(elements.map(x => [x.getAttribute('id'), x]));
  // Extend this list when further BPMN activities must appear in the task report.
  const tasks = elements.filter(x => /^(task|userTask|serviceTask|manualTask|businessRuleTask|sendTask|receiveTask|scriptTask|callActivity)$/.test(local(x)));
  const flows = elements.filter(x => local(x) === 'sequenceFlow');
  const predecessors = new Map(tasks.map(x => [x.id, 0]));
  const next = new Map();
  for (const flow of flows) { const from = flow.getAttribute('sourceRef'), to = flow.getAttribute('targetRef'); if (predecessors.has(to)) predecessors.set(to, predecessors.get(to) + 1); if (!next.has(from)) next.set(from, []); next.get(from).push(to); }
  // Primary order follows paths from start events. Remaining nodes use XML order for deterministic output.
  const ordered = [], seen = new Set();
  const visit = id => { if (seen.has(id)) return; const item = byId.get(id); if (tasks.includes(item)) { seen.add(id); ordered.push(item); } for (const to of next.get(id) || []) visit(to); };
  elements.filter(x => local(x) === 'startEvent').forEach(x => visit(x.id));
  tasks.forEach(x => visit(x.id));
  const scope = process.map(x => ({ type: local(x) === 'collaboration' ? 'Collaboration' : 'Prozess', name: label(x), documentation: text(x) }));
  const processScope = process.find(x => local(x) === 'process');
  const topLevelScope = processScopeFromDocumentation(processScope ? text(processScope) : '');
  const highLevelActivities = parseHighLevelActivities(processScope ? text(processScope) : '');
  // A Message Flow is connected to flow nodes, but the PDF must identify the
  // participant (pool) that owns its source node.
  const poolsByProcessId = new Map(elements.filter(x => local(x) === 'participant')
    .map(x => [x.getAttribute('processRef'), label(x)]));
  const sourcePool = (flow) => {
    const source = byId.get(flow.getAttribute('sourceRef'));
    if (!source) return label(flow);
    if (local(source) === 'participant') return label(source);
    return poolsByProcessId.get(parentProcessId(source)) || label(source);
  };
  return {
    title: scope.find(item => item.type === 'Prozess')?.name || scope.find(item => item.type === 'Collaboration')?.name || 'BPMN-Dokumentation',
    scope,
    ...(topLevelScope ? { processScope: topLevelScope } : {}),
    ...(highLevelActivities ? { highLevelActivities } : {}),
    tasks: ordered.map((x, index) => ({ order: index + 1, type: local(x), name: label(x), documentation: text(x), ...(local(x) === 'callActivity' && callActivityLink(x) ? { callActivityFile: callActivityLink(x).split(/[\\/]/).pop() } : {}) })),
    messages: elements.filter(x => local(x) === 'messageFlow').map(x => ({ name: label(x), source: label(byId.get(x.getAttribute('sourceRef')) || x), target: label(byId.get(x.getAttribute('targetRef')) || x), sourcePool: sourcePool(x), documentation: text(x) }))
  };
}
