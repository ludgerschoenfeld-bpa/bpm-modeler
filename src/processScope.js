export const processScopeFields = Object.freeze(['start', 'content', 'instance', 'ends']);

const labels = {
  de: {
    title: 'Top-Level-Prozessumfang',
    fields: ['Start des Prozesses', 'Was umfasst der Inhalt des Prozesses?', 'Was repräsentiert eine Instanz des Prozesses?', 'Auf welche Wege kann der Prozess enden?']
  },
  en: {
    title: 'Top-Level Process Scope',
    fields: ['Process start', 'What does the process include?', 'What does one process instance represent?', 'How can the process end?']
  }
};

export const emptyProcessScope = () => ({ start: '', content: '', instance: '', ends: '' });
export const processScopeLabels = language => labels[language === 'de' ? 'de' : 'en'];

const escapeCell = value => String(value || '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const unescapeCell = value => value.replace(/<br\s*\/?>/gi, '\n').replace(/\\\|/g, '|').replace(/\\\\/g, '\\').trim();
const scopeSection = documentation => {
  const lines = String(documentation || '').split(/\r?\n/); const start = lines.findIndex(line => /^##\s+(Top-Level-Prozessumfang|Top-Level Process Scope)\s*$/.test(line));
  if (start < 0) return [];
  const following = lines.slice(start + 1); const end = following.findIndex(line => /^##\s+/.test(line));
  return end < 0 ? following : following.slice(0, end);
};

// The whole Process documentation is intentionally replaced with this portable Markdown table.
export function formatProcessScope(scope, language) {
  const copy = processScopeLabels(language);
  return [`## ${copy.title}`, '| --- | --- |', ...processScopeFields.map((field, index) => `| ${copy.fields[index]} | ${escapeCell(scope[field])} |`)].join('\n');
}

export function parseProcessScope(documentation) {
  const rows = scopeSection(documentation).filter(line => /^\|/.test(line)).slice(1, 5);
  if (rows.length !== processScopeFields.length) return null;
  const values = rows.map(row => row.split(/(?<!\\)\|/).slice(1, -1)[1]);
  if (values.some(value => value === undefined)) return null;
  return Object.fromEntries(processScopeFields.map((field, index) => [field, unescapeCell(values[index])]));
}

export function processScopeFromDocumentation(documentation) {
  const scope = parseProcessScope(documentation);
  const rows = scopeSection(documentation).filter(line => /^\|/.test(line)).slice(1, 5);
  const questions = rows.map(row => row.split(/(?<!\\)\|/).slice(1, -1)[0]?.trim());
  return scope ? { scope, questions, title: String(documentation).match(/^##\s+(.+)$/m)?.[1] || processScopeLabels('en').title } : null;
}
