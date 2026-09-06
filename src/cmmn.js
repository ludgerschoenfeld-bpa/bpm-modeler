const local = element => element.localName;
const label = element => element.getAttribute('name') || element.getAttribute('id') || 'Untitled';
const documentation = element => [...element.children].filter(child => local(child) === 'documentation').map(child => child.textContent.trim()).filter(Boolean).join('\n');
const link = element => {
  const extensions = [...element.children].find(child => local(child) === 'extensionElements');
  return [...(extensions?.children || [])].find(child => local(child) === 'modelLink')?.getAttribute('path') || '';
};

// CMMN report data is intentionally XML based. This preserves documentation
// and optional vendor-neutral BPM Modeler navigation extensions.
export function readCmmnDocumentation(xml) {
  const document = new DOMParser().parseFromString(xml, 'text/xml');
  const elements = [...document.querySelectorAll('*')];
  const definitions = elements.find(element => local(element) === 'definitions');
  const tasksById = new Map(elements.filter(element => /^(processTask|decisionTask|caseTask)$/i.test(local(element))).map(element => [element.getAttribute('id'), element]));
  const cases = elements.filter(element => local(element) === 'case');
  const casePlanModels = elements.filter(element => local(element) === 'casePlanModel');
  const tasks = elements.filter(element => local(element) === 'planItem').map((item, index) => {
    const task = tasksById.get(item.getAttribute('definitionRef'));
    if (!task) return null;
    const path = link(task);
    return { order: index + 1, type: local(task), name: label(task), documentation: documentation(task), ...(path ? { callActivityFile: path.split(/[\\/]/).pop() } : {}) };
  }).filter(Boolean);
  return { title: casePlanModels[0]?.getAttribute('name') || definitions?.getAttribute('name') || label(cases[0] || definitions || { getAttribute: () => '' }) || 'CMMN Documentation', scope: cases.map(item => ({ type: 'Case', name: label(item), documentation: documentation(item) })), tasks, messages: [] };
}
