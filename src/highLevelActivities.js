const labels = {
  de: { title: 'Hauptaktivitäten im Top-Level', name: 'Name', description: 'Kurze Inhaltsbeschreibung', endEvent: 'Endereignis', next: 'Nächste Top-Level-Aktivität/Endereignis' },
  en: { title: 'Top-Level Main Activities', name: 'Name', description: 'Brief content description', endEvent: 'End event', next: 'Next top-level activity/end event' }
};

export const maxHighLevelActivities = 10;
export const emptyHighLevelActivity = () => ({ name: '', description: '', endings: [{ endEvent: '', next: '' }] });
export const highLevelActivityLabels = language => labels[language === 'de' ? 'de' : 'en'];

const escapeCell = value => String(value || '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const unescapeCell = value => String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/\\\|/g, '|').replace(/\\\\/g, '\\').trim();
const cellValues = row => row.split(/(?<!\\)\|/).slice(1, -1).map(value => value.trim());

export function formatHighLevelActivities(activities, language) {
  const copy = highLevelActivityLabels(language);
  const populated = activities.filter(activity => activity.name.trim() || activity.description.trim() || activity.endings.some(ending => ending.endEvent.trim() || ending.next.trim()));
  if (!populated.length) return '';
  return [`## ${copy.title}`, ...populated.flatMap((activity, index) => [
    `### ${index + 1}. ${escapeCell(activity.name) || '-'}`,
    `${copy.description}: ${escapeCell(activity.description.trim()) || '-'}`,
    `| ${copy.endEvent} | ${copy.next} |`,
    '| --- | --- |',
    ...activity.endings.filter(ending => ending.endEvent.trim() || ending.next.trim()).map(ending => `| ${escapeCell(ending.endEvent)} | ${escapeCell(ending.next)} |`)
  ])].join('\n');
}

export function parseHighLevelActivities(documentation) {
  const lines = String(documentation || '').split(/\r?\n/); const start = lines.findIndex(line => /^##\s+(Hauptaktivitäten im Top-Level|Top-Level Main Activities)\s*$/.test(line));
  if (start < 0) return null;
  const following = lines.slice(start + 1); const end = following.findIndex(line => /^##\s+/.test(line)); const section = (end < 0 ? following : following.slice(0, end));
  const blocks = []; let current;
  for (const line of section) { const heading = line.match(/^###\s+\d+\.\s*(.*)$/); if (heading) { if (current) blocks.push(current); current = { name: heading[1], lines: [] }; } else if (current) current.lines.push(line); }
  if (current) blocks.push(current);
  const activities = blocks.map(block => {
    const descriptionStart = block.lines.findIndex(line => /^(Kurze Inhaltsbeschreibung|Brief content description):/.test(line));
    const descriptionLines = descriptionStart < 0 ? [] : block.lines.slice(descriptionStart);
    const tableStart = descriptionLines.findIndex(line => /^\|/.test(line));
    const description = descriptionLines.slice(0, tableStart < 0 ? undefined : tableStart).join('\n').replace(/^[^:]+:\s*/, '');
    const rows = block.lines.filter(line => /^\|/.test(line)).slice(2).map(cellValues).filter(values => values.length === 2);
    return { name: unescapeCell(block.name).replace(/^-$/, ''), description: unescapeCell(description).replace(/^-$/, ''), endings: rows.map(([endEvent, next]) => ({ endEvent: unescapeCell(endEvent), next: unescapeCell(next) })) };
  });
  return activities.length ? activities.map(activity => ({ ...activity, endings: activity.endings.length ? activity.endings : [{ endEvent: '', next: '' }] })) : null;
}

export function replaceDocumentationSection(documentation, titlePattern, replacement) {
  const source = String(documentation || '').trim();
  const start = new RegExp(`^##\\s+${titlePattern}\\s*$`, 'mi'); const match = start.exec(source);
  if (!match) return [source, replacement].filter(Boolean).join(source && replacement ? '\n\n' : '');
  const after = source.slice(match.index + match[0].length); const next = after.search(/^##\s+/m);
  const before = source.slice(0, match.index).trimEnd(); const tail = next < 0 ? '' : after.slice(next).trimStart();
  return [before, replacement, tail].filter(Boolean).join('\n\n');
}
