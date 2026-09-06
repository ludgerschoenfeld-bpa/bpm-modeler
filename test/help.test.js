import { describe, expect, it } from 'vitest';
import { helpTopicLinkTarget, helpTopics, normalizeHelpEntries, searchHelpTopics } from '../src/help.js';

const entries = [
  { id: 'models', language: 'en', title: 'Models', content: 'BPMN content', keywords: ['Models'] },
  { id: 'models', language: 'de', title: 'Modelle', content: 'BPMN Inhalt', keywords: ['Modellieren'] },
  { id: 'shortcuts', language: 'en', title: 'Shortcuts', content: 'Save with Ctrl S', keywords: ['Keyboard'] },
  { id: 'invalid', language: 'de', title: 'Invalid', content: 'No keywords', keywords: [] }
];

describe('help content', () => {
  it('requires a title, Markdown content, and at least one keyword', () => {
    expect(normalizeHelpEntries(entries).map(entry => entry.id)).toEqual(['models', 'models', 'shortcuts']);
  });

  it('uses the selected language and falls back to English per topic', () => {
    expect(helpTopics(entries, 'de').map(entry => entry.title)).toEqual(['Shortcuts', 'Modelle']);
  });

  it('keeps an optional model-specific onboarding marker on a normal help topic', () => {
    const topics = helpTopics([{ id: 'onboarding', language: 'en', title: 'Onboarding', content: 'Start here', keywords: ['Start'], onboarding: 'cmmn' }], 'en');
    expect(topics[0].onboarding).toBe('cmmn');
  });

  it('searches titles, content, and keywords', () => {
    expect(searchHelpTopics(entries, 'de', 'inhalt').map(entry => entry.id)).toEqual(['models']);
    expect(searchHelpTopics(entries, 'de', 'keyboard').map(entry => entry.id)).toEqual(['shortcuts']);
    expect(searchHelpTopics([{ id: 'shortcuts', language: 'de', title: 'Tastenkombinationen', content: 'Alle Befehle', keywords: ['Tastatur'] }], 'de', 'tasten').map(entry => entry.id)).toEqual(['shortcuts']);
    expect(searchHelpTopics([
      { id: 'cmmn-editor', language: 'de', title: 'CMMN-Fallmodelle', content: 'Fallbasierte Arbeit', keywords: ['CMMN'] },
      { id: 'model-onboarding', language: 'de', title: 'Onboarding beim Öffnen von Modellen konfigurieren', content: 'BPMN, DMN und CMMN', keywords: ['Onboarding', 'CMMN'] }
    ], 'de', 'CMMN').map(entry => entry.id)).toEqual(['cmmn-editor', 'model-onboarding']);
  });

  it('recognizes stable help-topic links without mistaking external links for internal navigation', () => {
    expect(helpTopicLinkTarget('help:model-onboarding')).toBe('model-onboarding');
    expect(helpTopicLinkTarget('https://example.com/help:model-onboarding')).toBeUndefined();
    expect(helpTopicLinkTarget('help:missing topic')).toBeUndefined();
  });
});
