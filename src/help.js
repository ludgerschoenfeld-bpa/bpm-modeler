// Help files stay deliberately small and editable.  The native adapter reads
// every JSON file below the configured help directory, so deployments can add
// files without rebuilding the renderer.
export function normalizeHelpEntries(entries) {
  return (Array.isArray(entries) ? entries : []).flatMap(entry => {
    if (!entry || typeof entry !== 'object' || typeof entry.title !== 'string' || typeof entry.content !== 'string' || !Array.isArray(entry.keywords)) return [];
    const keywords = entry.keywords.filter(keyword => typeof keyword === 'string' && keyword.trim()).map(keyword => keyword.trim());
    const onboarding = ['bpmn', 'dmn', 'cmmn'].includes(entry.onboarding) ? entry.onboarding : undefined;
    return keywords.length ? [{ id: String(entry.id || entry.title), language: String(entry.language || 'en').toLowerCase(), title: entry.title, content: entry.content, keywords, onboarding }] : [];
  });
}

export function helpTopics(entries, language) {
  const requested = String(language || 'en').toLowerCase();
  const byId = new Map();
  for (const entry of normalizeHelpEntries(entries)) {
    const current = byId.get(entry.id);
    if (!current || entry.language === requested || (entry.language === 'en' && current.language !== requested)) byId.set(entry.id, entry);
  }
  return [...byId.values()].filter(entry => entry.language === requested || entry.language === 'en')
    .sort((left, right) => left.keywords[0].localeCompare(right.keywords[0], requested, { sensitivity: 'base' }) || left.title.localeCompare(right.title, requested));
}

export function searchHelpTopics(entries, language, query) {
  const needle = String(query || '').trim().toLocaleLowerCase(language);
  return helpTopics(entries, language).filter(topic => !needle || [topic.title, topic.content, ...topic.keywords].join('\n').toLocaleLowerCase(language).includes(needle));
}

export function helpTopicLinkTarget(target) {
  const value = String(target || '').trim();
  return /^help:[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) ? value.slice('help:'.length) : undefined;
}
