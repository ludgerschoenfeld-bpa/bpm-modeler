// Test case handling is deliberately independent from a concrete DMN runtime.
// The evaluator only supplies actual values; this module owns the portable JSON format,
// compatibility validation and expected/actual comparison.
const own = (object, property) => Object.prototype.hasOwnProperty.call(object, property);

function elements(xml, localName) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('dmnTests.error.invalidDmnXml');
  return [...document.getElementsByTagNameNS('*', localName)];
}

function namedElements(xml, localName) {
  return elements(xml, localName).map(element => {
    const variable = [...element.children].find(child => child.localName === 'variable');
    return { id: element.getAttribute('id') || '', name: variable?.getAttribute('name') || element.getAttribute('name') || '', type: variable?.getAttribute('typeRef') || '' };
  }).filter(element => element.name);
}

export function inspectDmnModel(xml) {
  const definitions = elements(xml, 'definitions')[0];
  if (!definitions) throw new Error('dmnTests.error.missingDefinitions');
  return {
    namespace: definitions.getAttribute('namespace') || '',
    name: definitions.getAttribute('name') || '',
    inputs: namedElements(xml, 'inputData'),
    decisions: namedElements(xml, 'decision')
  };
}

export function createTestSuite(xml) {
  const model = inspectDmnModel(xml);
  return { formatVersion: 1, model: { namespace: model.namespace, name: model.name }, testCases: [] };
}

const issue = (path, key, values) => ({ path, key, values });
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const difference = (expected, actual) => ({ missing: expected.filter(value => !actual.includes(value)), additional: actual.filter(value => !expected.includes(value)) });

export function validateTestSuite(value, xml) {
  const issues = [];
  if (!isRecord(value)) return [issue('$', 'dmnTests.error.testSuiteObject')];
  if (value.formatVersion !== 1) issues.push(issue('formatVersion', 'dmnTests.error.formatVersion'));
  if (!isRecord(value.model)) issues.push(issue('model', 'dmnTests.error.modelObject'));
  const model = inspectDmnModel(xml);
  if (value.model?.namespace !== model.namespace) issues.push(issue('model.namespace', 'dmnTests.error.modelNamespace', { expected: model.namespace }));
  if (value.model?.name !== model.name) issues.push(issue('model.name', 'dmnTests.error.modelName', { expected: model.name }));
  if (!Array.isArray(value.testCases)) return [...issues, issue('testCases', 'dmnTests.error.testCasesArray')];
  const caseNames = new Set(); const inputNames = model.inputs.map(input => input.name); const decisionNames = model.decisions.map(decision => decision.name);
  value.testCases.forEach((testCase, index) => {
    const path = `testCases[${index}]`;
    if (!isRecord(testCase)) { issues.push(issue(path, 'dmnTests.error.testCaseObject')); return; }
    if (typeof testCase.name !== 'string' || !testCase.name.trim()) issues.push(issue(`${path}.name`, 'dmnTests.error.testCaseName'));
    else if (caseNames.has(testCase.name)) issues.push(issue(`${path}.name`, 'dmnTests.error.duplicateName', { name: testCase.name }));
    else caseNames.add(testCase.name);
    for (const [section, expectedNames] of [['inputs', inputNames], ['expectedOutputs', decisionNames]]) {
      if (!isRecord(testCase[section])) { issues.push(issue(`${path}.${section}`, section === 'inputs' ? 'dmnTests.error.inputsObject' : 'dmnTests.error.expectedOutputsObject')); continue; }
      const keys = Object.keys(testCase[section]); const delta = difference(expectedNames, keys);
      delta.missing.forEach(name => issues.push(issue(`${path}.${section}.${name}`, section === 'inputs' ? 'dmnTests.error.missingInput' : 'dmnTests.error.missingDecision', { name })));
      delta.additional.forEach(name => issues.push(issue(`${path}.${section}.${name}`, section === 'inputs' ? 'dmnTests.error.additionalInput' : 'dmnTests.error.additionalDecision', { name })));
    }
  });
  return issues;
}

// The evaluator returns an ordered decision list so a caller can retain the full
// decision-tree result. Expected values remain keyed by the user-facing name.
export function compareTestCase(testCase, actualDecisions) {
  const actualByName = Object.fromEntries(actualDecisions.map(decision => [decision.name, decision.value]));
  return Object.entries(testCase.expectedOutputs).map(([decision, expected]) => {
    const actual = actualByName[decision];
    const checked = expected !== null;
    return { decision, expected, actual, status: checked ? (JSON.stringify(expected) === JSON.stringify(actual) ? 'fulfilled' : 'deviating') : 'notChecked' };
  });
}
