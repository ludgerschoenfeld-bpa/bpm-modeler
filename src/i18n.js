const propertyFiles = import.meta.glob('./lang/*.properties', { eager: true, query: '?raw', import: 'default' });

export function parseProperties(source) {
  return Object.fromEntries(source.split(/\r?\n/)
    .filter(line => line && !line.trimStart().startsWith('#'))
    .map(line => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }));
}

const messages = Object.freeze(Object.fromEntries(Object.entries(propertyFiles).map(([filename, source]) => [filename.match(/([^/]+)\.properties$/)[1].toLowerCase(), parseProperties(source)])));
export const supportedLanguages = Object.freeze(Object.keys(messages).sort());

export function resolveLanguage(language) {
  const normalized = String(language || '').toLowerCase().replace('_', '-');
  return supportedLanguages.includes(normalized) ? normalized : supportedLanguages.find(code => code === normalized.split('-')[0]) || 'en';
}

export function translate(language, key, values = {}) {
  const message = messages[resolveLanguage(language)]?.[key] || messages.en?.[key] || key;
  return message.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}

export function languageName(language) {
  return messages[language]?.['language.name'] || language;
}

export function browserLanguage() {
  return resolveLanguage(navigator.language);
}
