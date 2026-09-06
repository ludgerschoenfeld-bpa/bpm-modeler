// The adapter hides the Electron preload API from UI components.  Browser
// development uses the same static JSON files served by Vite.
export const helpContentPlugin = {
  async load() {
    if (window.desktopFiles?.loadHelp) return window.desktopFiles.loadHelp();
    const index = await fetch('/help/index.json').then(response => response.ok ? response.json() : []);
    const documents = await Promise.all(index.map(async file => ({ language: file.split('/')[0], entries: await fetch(`/help/${file}`).then(response => response.ok ? response.json() : []) })));
    return documents.flatMap(document => (Array.isArray(document.entries) ? document.entries : []).map(entry => ({ ...entry, language: entry.language || document.language })));
  },
  async image(source) {
    return window.desktopFiles?.loadHelpImage?.(source) || `/help/${source}`;
  },
  async loadExamples() {
    if (window.desktopFiles?.loadHelpExamples) return window.desktopFiles.loadHelpExamples();
    const files = await fetch('/help/examples-index.json').then(response => response.ok ? response.json() : []);
    return (await Promise.all((Array.isArray(files) ? files : []).map(async name => {
      const match = String(name).match(/^(.*)\.(bpmn|dmn|cmmn)$/i);
      if (!match) return null;
      const response = await fetch(`/help/examples/${name}`);
      return response.ok ? { type: match[2].toLowerCase(), title: match[1].split('/').pop(), name, content: await response.text() } : null;
    }))).filter(Boolean);
  },
  async openExample(example) {
    if (window.desktopFiles?.openHelpExample) return window.desktopFiles.openHelpExample({ type: example?.type, name: example?.name });
    if (example?.type === 'external') window.open(`/help/examples/${encodeURIComponent(example?.name || '')}`, '_blank', 'noopener,noreferrer');
    return ['bpmn', 'dmn', 'cmmn'].includes(example?.type) ? example : null;
  }
};
