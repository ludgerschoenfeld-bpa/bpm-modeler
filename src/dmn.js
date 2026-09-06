// Extract PDF-report data from DMN XML independently from the visual Kogito editor.
// The expression tree keeps nested boxed expressions intact for renderer adapters.
const expressionNames = new Set(['literalExpression', 'context', 'relation', 'invocation', 'decisionTable', 'functionDefinition', 'list']);
const isExpressionElement = element => expressionNames.has(element?.localName) || element?.localName === 'encapsulatedLogic';
const children = element => element ? [...element.children] : [];
const child = (element, name) => children(element).find(candidate => candidate.localName === name);
const directText = (element, name) => child(element, name)?.textContent.trim() || '';
const descendants = (element, name) => element ? [...element.querySelectorAll('*')].filter(candidate => candidate.localName === name) : [];
const text = element => directText(element, 'text');
const escapeXmlAttribute = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const importIdBase = filename => `import_${String(filename).replace(/[^A-Za-z0-9_.-]/g, '_')}`;

/**
 * Adds selected sibling models as actual DMN imports instead of relying solely
 * on the transient Kogito Included Models picker. The original XML, including
 * its prefixes and extension elements, stays untouched apart from new imports.
 */
export function includeDmnModels(xml, models) {
  const document = new DOMParser().parseFromString(xml || '', 'text/xml');
  const definitions = document.getElementsByTagNameNS('*', 'definitions')[0];
  if (!definitions) throw new Error('DMN model has no definitions element');
  const rootTag = definitions.tagName;
  const prefix = rootTag.includes(':') ? rootTag.slice(0, rootTag.indexOf(':') + 1) : '';
  const rootStart = new RegExp(`<${rootTag}\\b[^>]*>`).exec(xml);
  if (!rootStart) throw new Error('DMN definitions start tag is unavailable');
  const existingLocations = new Set(children(definitions).filter(element => element.localName === 'import').map(element => element.getAttribute('locationURI')).filter(Boolean));
  const usedIds = new Set([...document.querySelectorAll('*')].map(element => element.getAttribute('id')).filter(Boolean));
  const imports = [];
  for (const model of models || []) {
    if (!model?.name || typeof model.content !== 'string' || existingLocations.has(model.name)) continue;
    const external = new DOMParser().parseFromString(model.content, 'text/xml').getElementsByTagNameNS('*', 'definitions')[0];
    if (!external) continue;
    const namespace = external.getAttribute('namespace');
    if (!namespace) continue;
    const name = external.getAttribute('name') || model.name.replace(/\.dmn$/i, '');
    let id = importIdBase(model.name); let suffix = 2;
    while (usedIds.has(id)) id = `${importIdBase(model.name)}_${suffix++}`;
    usedIds.add(id);
    imports.push(`<${prefix}import id="${escapeXmlAttribute(id)}" name="${escapeXmlAttribute(name)}" namespace="${escapeXmlAttribute(namespace)}" locationURI="${escapeXmlAttribute(model.name)}" importType="${escapeXmlAttribute(external.namespaceURI || definitions.namespaceURI || '')}"/>`);
  }
  if (!imports.length) return xml;
  return `${xml.slice(0, rootStart.index + rootStart[0].length)}${imports.join('')}${xml.slice(rootStart.index + rootStart[0].length)}`;
}

export function removeDmnModelImports(xml, filenames) {
  const locations = new Set(filenames || []);
  if (!locations.size) return xml;
  return xml.replace(/<(?:[\w.-]+:)?import\b[^>]*\/?>(?:<\/(?:[\w.-]+:)?import>)?/g, tag => {
    const location = /\blocationURI\s*=\s*(["'])(.*?)\1/.exec(tag)?.[2];
    return locations.has(location) ? '' : tag;
  });
}

function decisionTable(element, line) {
  const labels = [...children(element).filter(x => x.localName === 'input').map((input, index) => text(child(input, 'inputExpression')) || `Input ${index + 1}`), ...children(element).filter(x => x.localName === 'output').map((output, index) => output.getAttribute('name') || `Output ${index + 1}`), ...children(element).filter(x => x.localName === 'annotation').map((annotation, index) => annotation.getAttribute('name') || `Annotation ${index + 1}`)];
  const rows = children(element).filter(x => x.localName === 'rule').map(rule => [...children(rule).filter(x => x.localName === 'inputEntry').map(text), ...children(rule).filter(x => x.localName === 'outputEntry').map(text), ...children(rule).filter(x => x.localName === 'annotationEntry').map(text)]);
  return { kind: 'decisionTable', line, hitPolicy: element.getAttribute('hitPolicy') || '', labels, rows };
}

function expressionTree(element, counter = { value: 0 }) {
  if (!element) return undefined;
  const line = ++counter.value;
  if (element.localName === 'literalExpression') return { kind: 'literalExpression', line, text: text(element) };
  if (element.localName === 'decisionTable') return decisionTable(element, line);
  if (element.localName === 'functionDefinition' || element.localName === 'encapsulatedLogic') return { kind: 'functionDefinition', line, functionKind: element.getAttribute('kind') || '', parameters: children(element).filter(x => x.localName === 'formalParameter').map(x => x.getAttribute('name') || '').filter(Boolean), body: expressionTree(children(element).find(isExpressionElement), counter) };
  if (element.localName === 'invocation') return { kind: 'invocation', line, target: text(child(element, 'literalExpression')), bindings: children(element).filter(x => x.localName === 'binding').map(binding => ({ name: child(binding, 'parameter')?.getAttribute('name') || 'parameter', expression: expressionTree(children(binding).find(x => expressionNames.has(x.localName)), counter) })) };
  if (element.localName === 'context') { const entries = children(element).filter(x => x.localName === 'contextEntry'); return { kind: 'context', line, entries: entries.map((entry, index) => ({ name: child(entry, 'variable')?.getAttribute('name') || (index === entries.length - 1 ? '<result>' : `result ${index + 1}`), expression: expressionTree(children(entry).find(x => expressionNames.has(x.localName)), counter) })) }; }
  if (element.localName === 'list') return { kind: 'list', line, items: children(element).filter(x => expressionNames.has(x.localName)).map(x => expressionTree(x, counter)) };
  if (element.localName === 'relation') { const columns = children(element).filter(x => x.localName === 'column'); return { kind: 'relation', line, columns: columns.map((x, i) => x.getAttribute('name') || `Column ${i + 1}`), columnTypes: columns.map(x => x.getAttribute('typeRef') || ''), rows: children(element).filter(x => x.localName === 'row').map(row => children(row).filter(x => x.localName === 'literalExpression').map(text)) }; }
  return { kind: element.localName, line, text: text(element), children: children(element).filter(x => expressionNames.has(x.localName)).map(x => expressionTree(x, counter)) };
}

function expressionText(node, depth = 0) {
  if (!node) return '—'; const indent = '  '.repeat(depth); const marker = `[${node.line}]`;
  if (node.kind === 'literalExpression') return `${marker} ${node.text || '—'}`;
  if (node.kind === 'decisionTable') return `${marker} decisionTable${node.hitPolicy ? ` (${node.hitPolicy})` : ''}\n${node.labels.join(' | ')}\n${node.rows.map(row => row.join(' | ')).join('\n')}`;
  if (node.kind === 'functionDefinition') return `${marker} function(${node.parameters.join(', ')}) ${node.body?.kind === 'literalExpression' ? node.body.text || '—' : expressionText(node.body, depth)}`;
  if (node.kind === 'invocation') return [`${marker} invoke ${node.target || '—'}`, ...node.bindings.map(binding => `${indent}${binding.name} = ${expressionText(binding.expression, depth + 1)}`)].join('\n');
  // A DMN Context is a FEEL structure, so document it like an object rather
  // than leaking the technical "context" node name into the business text.
  if (node.kind === 'context') {
    if (!node.entries.length) return `${marker} {}`;
    const keyWidth = Math.max(...node.entries.map(entry => String(entry.name).length));
    return [
      `${marker} {`,
      ...node.entries.map((entry, index) => {
        const key = String(entry.name);
        const valueIndent = `${indent}  ${' '.repeat(keyWidth + 2)}`;
        const value = expressionText(entry.expression, depth + 1).replace(/\n/g, `\n${valueIndent}`);
        const valueGap = ' '.repeat(keyWidth - key.length + 1);
        return `${indent}  ${key}:${valueGap}${value}${index < node.entries.length - 1 ? ',' : ''}`;
      }),
      `${indent}}`
    ].join('\n');
  }
  if (node.kind === 'list') return `${marker} [${node.items.map(item => item?.kind === 'literalExpression' ? item.text || '—' : expressionText(item, depth + 1)).join(', ')}]`;
  if (node.kind === 'relation') return `${marker} relation\n${node.columns.join(' | ')}\n${node.rows.map(row => row.join(' | ')).join('\n')}`;
  return `${marker} ${node.text || node.kind}`;
}

function findExpression(element) { return children(element).find(isExpressionElement) || descendants(element, 'encapsulatedLogic')[0] || descendants(element, 'decisionTable')[0] || descendants(element, 'functionDefinition')[0] || descendants(element, 'invocation')[0] || descendants(element, 'context')[0] || descendants(element, 'relation')[0] || descendants(element, 'list')[0] || descendants(element, 'literalExpression')[0]; }
function reportElement(element) { const root = findExpression(element); const tree = root ? expressionTree(root) : undefined; const knowledgeSource = element.localName === 'knowledgeSource'; return { id: element.getAttribute('id') || '', name: element.getAttribute('name') || element.getAttribute('id') || '', kind: element.localName, type: knowledgeSource ? '' : (child(element, 'variable')?.getAttribute('typeRef') || directText(element, 'type') || 'any'), source: knowledgeSource ? (directText(element, 'source') || element.getAttribute('source') || '') : '', locationUri: knowledgeSource ? (element.getAttribute('locationURI') || '') : '', description: directText(element, 'description'), question: directText(element, 'question'), allowedAnswers: directText(element, 'allowedAnswers'), expressionKind: tree?.kind || '', expression: tree ? expressionText(tree) : '', expressionTree: tree, decisionTable: tree?.kind === 'decisionTable' ? tree : undefined }; }

export function dmnSummary(xml) {
  const document = new DOMParser().parseFromString(xml || '', 'text/xml'); const definitions = document.getElementsByTagNameNS('*', 'definitions')[0]; const all = [...document.querySelectorAll('*')];
  const dataTypes = children(definitions).filter(x => x.localName === 'itemDefinition').map(item => ({ name: item.getAttribute('name') || item.getAttribute('id') || '', isCollection: item.getAttribute('isCollection') === 'true', type: directText(item, 'typeRef') || 'any', allowed: directText(child(item, 'allowedValues'), 'text') }));
  const includedModels = children(definitions).filter(x => x.localName === 'import').map(item => ({ name: item.getAttribute('name') || item.getAttribute('namespace') || '', filename: item.getAttribute('locationURI') || '' })).filter(item => item.name || item.filename);
  return { title: definitions?.getAttribute('name') || '', description: definitions ? directText(definitions, 'description') : '', inputs: all.filter(x => x.localName === 'inputData').map(x => ({ ...reportElement(x), allowed: directText(x, 'allowedValues') || directText(child(x, 'inputValues') || x, 'text') })), decisions: all.filter(x => ['decision', 'businessKnowledgeModel', 'knowledgeSource', 'decisionService'].includes(x.localName)).map(reportElement), dataTypes, includedModels };
}
