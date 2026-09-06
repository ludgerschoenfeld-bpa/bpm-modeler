import { useEffect, useRef, useState } from 'react';
import packageInfo from '../package.json';
import { extensionPoints } from './core/contracts.js';
import { browserLanguage, languageName, supportedLanguages, translate } from './i18n.js';
import { resolvePlugin } from './plugins/registry.js';
import { emptyProcessScope, formatProcessScope, parseProcessScope, processScopeFields } from './processScope.js';
import { emptyHighLevelActivity, formatHighLevelActivities, highLevelActivityLabels, maxHighLevelActivities, parseHighLevelActivities, replaceDocumentationSection } from './highLevelActivities.js';
import { compareTestCase, createTestSuite, inspectDmnModel, validateTestSuite } from './dmnTestCases.js';
import { includeDmnModels, removeDmnModelImports } from './dmn.js';
import { addCallActivitySvgLinks, filenameBase, pdfExportMetadata, svgExportMetadata } from './pdf.js';
import { helpTopicLinkTarget, helpTopics, searchHelpTopics } from './help.js';

const api = window.desktopFiles;
const appVersion = packageInfo.version;
const download = (content, name, type) => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = name; link.click(); URL.revokeObjectURL(link.href); };
const message = (key, values) => ({ key, values });
const documentationTimestamp = (language, date) => new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
const dmnPdfLabelKeys = ['fallbackTitle', 'modelTitle', 'drd', 'inputs', 'logic', 'type', 'values', 'result', 'source', 'locationUri', 'boxed', 'description', 'question', 'allowedAnswers', 'hitPolicy', 'tableDetails', 'tests', 'test', 'input', 'expected', 'dataTypes', 'isCollection', 'yes', 'no', 'includedModels'];
const bpmnColors = ['red', 'blue', 'green', 'yellow', 'orange'];

function ColorPalette({ disabled, t, onCommand }) {
  return <div className="color-palette" role="group" aria-label={t('menu.color')}>{bpmnColors.map(color => <button key={color} type="button" className={`color-swatch ${color}`} disabled={disabled} title={`${t(`color.${color}`)} — Ctrl/Cmd+Shift+${color[0].toUpperCase()}`} aria-label={`${t(`color.${color}`)} — Ctrl/Cmd+Shift+${color[0].toUpperCase()}`} onClick={() => onCommand(`color:${color}`)}/>) }<button type="button" className="color-swatch default" disabled={disabled} title={`${t('color.default')} — Ctrl/Cmd+Shift+U`} aria-label={`${t('color.default')} — Ctrl/Cmd+Shift+U`} onClick={() => onCommand('restore-color')}>×</button></div>;
}

function BrowserMenu({ tab, simulationEnabled, language, onboardingHintsEnabled, t, onCommand }) {
  const command = value => () => onCommand(value); const close = event => { event.currentTarget.open = false; };
  return <nav className="browser-menu" aria-label={t('aria.applicationMenu')}>
    <details onMouseLeave={close}><summary>{t('menu.file')}</summary><div className="menu-popup"><details onMouseLeave={close}><summary>{t('menu.new')}</summary><div className="menu-popup nested"><button onClick={command('new-bpmn')}>{t('menu.newBpmn')}</button><button onClick={command('new-dmn')}>{t('menu.newDmn')}</button><button onClick={command('new-cmmn')}>{t('menu.newCmmn')}</button></div></details><details onMouseLeave={close}><summary>{t('menu.open')}</summary><div className="menu-popup nested"><button onClick={command('open-bpmn')}>{t('menu.openBpmn')}</button><button onClick={command('open-dmn')}>{t('menu.openDmn')}</button><button onClick={command('open-cmmn')}>{t('menu.openCmmn')}</button></div></details><button onClick={command('save')}>{t('menu.save')}</button><button onClick={command('save-as')}>{t('menu.saveAs')}</button></div></details>
    <details onMouseLeave={close}><summary>{t('menu.exportAs')}</summary><div className="menu-popup"><button disabled={!tab} onClick={command('export-svg')}>SVG</button><button onClick={command('export-pdf')}>{t('menu.pdfDocumentation')}</button></div></details>
    <details onMouseLeave={close}><summary>{t('menu.tools')}</summary><div className="menu-popup"><details onMouseLeave={close}><summary>{t('menu.bpmn')}</summary><div className="menu-popup nested"><div className="menu-palette"><span>{t('menu.color')}</span><ColorPalette disabled={tab !== 'bpmn'} t={t} onCommand={onCommand}/></div><button disabled={tab !== 'bpmn'} onClick={command('define-process-scope')}>{t('menu.defineProcessScope')}</button><button disabled={tab !== 'bpmn'} onClick={command('define-high-level-activities')}>{t('menu.defineHighLevelActivities')}</button><button disabled={tab !== 'bpmn'} onClick={command('toggle-simulation')}>{t(simulationEnabled ? 'menu.tokenSimulationDisable' : 'menu.tokenSimulationEnable')}</button></div></details><details onMouseLeave={close}><summary>{t('menu.dmn')}</summary><div className="menu-popup nested"><button disabled={tab !== 'dmn'} onClick={command('open-dmn-test-cases')}>{t('menu.dmnTestCases')}</button><button disabled={tab !== 'dmn'} onClick={command('manage-dmn-includes')}>{t('menu.dmnIncludes')}</button></div></details><details onMouseLeave={close}><summary>{t('menu.cmmn')}</summary><div className="menu-popup nested"><div className="menu-palette"><span>{t('menu.color')}</span><ColorPalette disabled={tab !== 'cmmn'} t={t} onCommand={onCommand}/></div></div></details></div></details>
    <details onMouseLeave={close}><summary>{t('menu.view')}</summary><div className="menu-popup"><details onMouseLeave={close}><summary>{t('menu.language')}</summary><div className="menu-popup nested">{supportedLanguages.map(code => <button key={code} disabled={code === language} onClick={command(`set-language:${code}`)}>{languageName(code)}</button>)}</div></details></div></details>
    <details onMouseLeave={close}><summary>{t('menu.help')}</summary><div className="menu-popup"><button onClick={command('open-help')}>{t('menu.openHelp')}</button><button onClick={command('toggle-onboarding-hints')}>{t(onboardingHintsEnabled ? 'help.onboardingDisable' : 'help.onboardingEnable')}</button><button onClick={command('about')}>{t('menu.about')}</button></div></details>
  </nav>;
}

function HelpImage({ source, alt, plugin }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let active = true; plugin.image(source).then(value => active && setUrl(value)).catch(() => active && setUrl('')); return () => { active = false; }; }, [source, plugin]);
  return url ? <img className="help-image" src={url} alt={alt}/> : null;
}

function InlineMarkdown({ text, plugin, onHelpLink }) {
  const pattern = /(!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*)/g;
  const parts = []; let cursor = 0; let match; let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    if (match[2] !== undefined) parts.push(<HelpImage key={key++} alt={match[2]} source={match[3]} plugin={plugin}/>);
    else if (match[4] !== undefined) { const topicId = helpTopicLinkTarget(match[5]); parts.push(topicId && onHelpLink ? <button key={key++} className="help-topic-link" type="button" onClick={() => onHelpLink(topicId)}>{match[4]}</button> : <a key={key++} href={match[5]} target="_blank" rel="noreferrer">{match[4]}</a>); }
    else if (match[6] !== undefined) parts.push(<code key={key++}>{match[6]}</code>);
    else if (match[7] !== undefined) parts.push(<strong key={key++}>{match[7]}</strong>);
    else if (match[8] !== undefined) parts.push(<u key={key++}>{match[8]}</u>);
    else parts.push(<em key={key++}>{match[9]}</em>);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function MarkdownHelp({ content, plugin, onHelpLink }) {
  const blocks = []; const lines = String(content || '').split(/\r?\n/); let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith('```')) { const code = []; index += 1; while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]); index += 1; blocks.push(<pre key={blocks.length}><code>{code.join('\n')}</code></pre>); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { const Tag = `h${heading[1].length}`; blocks.push(<Tag key={blocks.length}><InlineMarkdown text={heading[2]} plugin={plugin} onHelpLink={onHelpLink}/></Tag>); index += 1; continue; }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) { const ordered = /^\d+\.\s+/.test(line); const expression = ordered ? /^\d+\.\s+/ : /^[-*]\s+/; const items = []; while (index < lines.length && expression.test(lines[index])) items.push(lines[index++].replace(expression, '')); const List = ordered ? 'ol' : 'ul'; blocks.push(<List key={blocks.length}>{items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown text={item} plugin={plugin} onHelpLink={onHelpLink}/></li>)}</List>); continue; }
    const paragraph = []; while (index < lines.length && lines[index].trim() && !lines[index].startsWith('```') && !/^(#{1,6})\s+/.test(lines[index]) && !/^[-*]\s+/.test(lines[index]) && !/^\d+\.\s+/.test(lines[index])) paragraph.push(lines[index++]); blocks.push(<p key={blocks.length}><InlineMarkdown text={paragraph.join(' ')} plugin={plugin} onHelpLink={onHelpLink}/></p>);
  }
  return <div className="help-markdown">{blocks}</div>;
}

function HelpDialog({ entries, language, t, onClose }) {
  const plugin = resolvePlugin(extensionPoints.HELP_CONTENT); const [query, setQuery] = useState(''); const [selectedId, setSelectedId] = useState();
  const allTopics = helpTopics(entries, language); const topics = searchHelpTopics(entries, language, query); const selected = allTopics.find(topic => topic.id === selectedId);
  useEffect(() => { setSelectedId(undefined); setQuery(''); }, [language]);
  const openHelpTopic = topicId => { if (allTopics.some(topic => topic.id === topicId)) setSelectedId(topicId); };
  return <div className="dialog-backdrop" role="presentation"><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><header><h1 id="help-title">{selected ? selected.title : t('help.title')}</h1></header><div className="help-content">{selected ? <><button className="help-back" type="button" onClick={() => setSelectedId(undefined)}>← {t('help.back')}</button><MarkdownHelp content={selected.content} plugin={plugin} onHelpLink={openHelpTopic}/><div className="help-keywords">{selected.keywords.map(keyword => <button key={keyword} type="button" onClick={() => { setSelectedId(undefined); setQuery(keyword); }}>{keyword}</button>)}</div></> : <><label className="help-search">{t('help.search')}<input autoFocus type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('help.searchPlaceholder')}/><span>{t('help.searchHint')}</span></label>{allTopics.length ? <><h2 className="help-overview">{t('help.overview', { count: topics.length })}</h2><p className="help-intro">{t('help.intro')}</p><ul className="help-topics">{topics.map(topic => <li key={topic.id}><button type="button" onClick={() => setSelectedId(topic.id)}>{topic.title}</button><span>{topic.keywords.join(', ')}</span></li>)}</ul>{!topics.length && <p>{t('help.noResults')}</p>}</> : <p>{t('help.unavailable')}</p>}</>}</div><footer><button type="button" onClick={onClose}>{t('help.close')}</button></footer></section></div>;
}

function OnboardingDialog({ topic, enabled, t, onChangeEnabled, onClose }) {
  const plugin = resolvePlugin(extensionPoints.HELP_CONTENT);
  return <div className="dialog-backdrop" role="presentation"><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><header><h1 id="onboarding-title">{topic.title}</h1></header><div className="help-content"><MarkdownHelp content={topic.content} plugin={plugin}/></div><footer><label className="onboarding-toggle"><input type="checkbox" checked={enabled} onChange={event => onChangeEnabled(event.target.checked)}/>{t('help.onboardingEnabled')}</label><button type="button" onClick={onClose}>{t('help.close')}</button></footer></section></div>;
}

function LicenseDialog({ status, t, onAccept, onDecline }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const accept = async () => { setBusy(true); setError(''); try { await onAccept(); } catch (reason) { setError(reason?.message === 'license.secureStorageUnavailable' ? t('license.secureStorageUnavailable') : t('license.saveFailed')); } finally { setBusy(false); } };
  return <div className="dialog-backdrop license-backdrop"><section className="license-dialog" role="dialog" aria-modal="true" aria-labelledby="license-title"><header><h1 id="license-title">{t('license.title')}</h1></header><div className="license-content"><p>{t('license.intro')}</p><p>{t('license.warning')}</p><pre className="license-text">{status.text}</pre>{!status.secureStorageAvailable && <p className="license-error">{t('license.secureStorageUnavailable')}</p>}{error && <p className="license-error">{error}</p>}</div><footer><button type="button" disabled={busy} onClick={onDecline}>{t('license.decline')}</button><button className="primary-button" type="button" disabled={!status.secureStorageAvailable || busy} onClick={accept}>{busy ? t('license.saving') : t('license.accept')}</button></footer></section></div>;
}

function ModelLinkDialog({ activity, t, onLink, onRemove, onOpen, onClose }) {
  const [path, setPath] = useState(activity.path || ''); const [busy, setBusy] = useState(false); const [modelType, setModelType] = useState(activity.type);
  const prefix = modelType === 'dmn' ? 'businessRuleTask' : modelType === 'cmmn' ? 'caseTask' : 'callActivity';
  const browse = async () => { const file = await api?.open?.(modelType); if (file) setPath(file.path); };
  const link = async () => { if (!path.trim()) return; setBusy(true); try { await onLink(path, modelType); } finally { setBusy(false); } };
  return <div className="dialog-backdrop" role="presentation"><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="model-link-title"><header><h1 id="model-link-title">{t(`${prefix}.linkTitle`)}</h1></header><div className="help-content"><p>{t(`${prefix}.linkHint`, { name: activity.name })}</p>{activity.source === 'bpmn' && activity.type === 'bpmn' && <div className="dialog-actions"><button type="button" className={modelType === 'bpmn' ? 'primary-button' : ''} onClick={() => { setModelType('bpmn'); setPath(''); }}>{t('callActivity.bpmnTarget')}</button><button type="button" className={modelType === 'cmmn' ? 'primary-button' : ''} onClick={() => { setModelType('cmmn'); setPath(''); }}>{t('callActivity.cmmnTarget')}</button></div>}{modelType === 'cmmn' && activity.source === 'bpmn' && <p className="license-error">{t('callActivity.cmmnNotice')}</p>}<label className="help-search">{t(`${prefix}.path`)}<input value={path} readOnly/><span>{t(`${prefix}.pathHint`)}</span></label><button type="button" onClick={browse}>{t(`${prefix}.browse`)}</button></div><footer>{activity.path && onOpen && <button type="button" disabled={busy} onClick={() => onOpen(activity)}>{t('modelLink.open')}</button>}{activity.path && onRemove && <button type="button" onClick={() => onRemove(modelType)}>{t('modelLink.remove')}</button>}<button type="button" onClick={onClose}>{t(`${prefix}.cancel`)}</button><button className="primary-button" type="button" disabled={!path.trim() || busy} onClick={link}>{t(`${prefix}.link`)}</button></footer></section></div>;
}

function AboutDialog({ licenseText, t, onClose }) {
  return <div className="dialog-backdrop" role="presentation"><section className="license-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title"><header><h1 id="about-title">{t('menu.about')}</h1></header><div className="license-content"><p><strong>BPM Modeler</strong><br/>{t('about.version', { version: appVersion })}<br/>{t('about.author')}<br/>{t('about.license')}<br/>{t('about.icon')}</p><p>{t('about.disclaimer')}</p><pre className="license-text">{licenseText}</pre></div><footer><button type="button" onClick={onClose}>{t('help.close')}</button></footer></section></div>;
}

function ProcessScopeDialog({ scope, t, onChange, onApply, onClose }) {
  return <div style={{ position: 'fixed', zIndex: 20, inset: 0, display: 'grid', placeItems: 'center', background: '#13253e88' }} role="presentation"><section style={{ width: 'min(680px, calc(100vw - 32px))', background: '#fff', borderRadius: 7, boxShadow: '0 14px 40px #0005' }} role="dialog" aria-modal="true" aria-labelledby="process-scope-title"><header style={{ height: 'auto', padding: '18px 22px' }}><h1 id="process-scope-title" style={{ margin: 0, fontSize: 18 }}>{t('processScope.title')}</h1></header><div style={{ padding: '20px 22px', display: 'grid', gap: 16 }}>{processScopeFields.map(field => <label key={field} style={{ display: 'grid', gap: 6, fontWeight: 600, color: '#26384d' }}>{t(`processScope.${field}`)}<textarea style={{ minHeight: 70, resize: 'vertical', padding: 8, border: '1px solid #aebdce', borderRadius: 4, font: 'inherit', fontWeight: 400 }} value={scope[field]} onChange={event => onChange(field, event.target.value)} /></label>)}</div><footer style={{ height: 'auto', padding: '12px 22px', justifyContent: 'flex-end', gap: 8 }}><button type="button" onClick={onClose}>{t('processScope.cancel')}</button><button className="primary-button" type="button" onClick={onApply}>{t('processScope.apply')}</button></footer></section></div>;
}

function HighLevelActivitiesDialog({ activities, t, onChange, onApply, onClose }) {
  const [selected, setSelected] = useState(0); const activity = activities[selected] || emptyHighLevelActivity();
  const update = (field, value) => onChange(selected, { ...activity, [field]: value });
  const updateEnding = (index, field, value) => onChange(selected, { ...activity, endings: activity.endings.map((ending, current) => current === index ? { ...ending, [field]: value } : ending) });
  return <div className="dialog-backdrop" role="presentation" onContextMenu={event => event.preventDefault()}><section className="dmn-tests-dialog" role="dialog" aria-modal="true" aria-labelledby="high-level-activities-title"><header><h1 id="high-level-activities-title">{t('highLevelActivities.title')}</h1></header><div className="dmn-tests-content"><p>{t('highLevelActivities.hint')}</p><div className="dialog-actions">{activities.map((entry, index) => <button type="button" key={index} className={index === selected ? 'primary-button' : ''} onClick={() => setSelected(index)}>{entry.name.trim() || t('highLevelActivities.tab', { number: index + 1 })}</button>)}<button type="button" disabled={activities.length >= maxHighLevelActivities} onClick={() => { onChange(activities.length, emptyHighLevelActivity()); setSelected(activities.length); }}>{t('highLevelActivities.add')}</button>{activities.length > 1 && <button type="button" onClick={() => { onChange(selected, null); setSelected(Math.max(0, selected - 1)); }}>{t('highLevelActivities.remove')}</button>}</div>{activities.length >= maxHighLevelActivities && <p className="license-error">{t('highLevelActivities.maximumReached')}</p>}<label className="help-search">{t('highLevelActivities.name')}<input value={activity.name} onChange={event => update('name', event.target.value)}/></label><label className="help-search">{t('highLevelActivities.description')}<textarea value={activity.description} onChange={event => update('description', event.target.value)}/></label><h2>{t('highLevelActivities.endings')}</h2><div className="dmn-tests-table-wrap"><table className="dmn-tests-table"><thead><tr><th>{t('highLevelActivities.endEvent')}</th><th>{t('highLevelActivities.next')}</th><th>{t('dmnTests.actions')}</th></tr></thead><tbody>{activity.endings.map((ending, index) => <tr key={index}><td><input value={ending.endEvent} onChange={event => updateEnding(index, 'endEvent', event.target.value)}/></td><td><input value={ending.next} onChange={event => updateEnding(index, 'next', event.target.value)}/></td><td><button type="button" disabled={activity.endings.length === 1} onClick={() => onChange(selected, { ...activity, endings: activity.endings.filter((_, current) => current !== index) })}>{t('highLevelActivities.remove')}</button></td></tr>)}</tbody></table></div><button type="button" onClick={() => onChange(selected, { ...activity, endings: [...activity.endings, { endEvent: '', next: '' }] })}>{t('highLevelActivities.addEndEvent')}</button></div><footer><button type="button" onClick={onClose}>{t('highLevelActivities.cancel')}</button><button type="button" className="primary-button" onClick={onApply}>{t('highLevelActivities.apply')}</button></footer></section></div>;
}

function DmnTestCasesDialog({ initialSuite, model, results, t, onSave, onRun, onClose }) {
  const importInput = useRef(); const [suite, setSuite] = useState(initialSuite); const [issues, setIssues] = useState([]);
  const validate = () => { const found = validateTestSuite(suite, model.xml); setIssues(found); return found.length ? null : suite; };
  const save = () => { const valid = validate(); if (valid) onSave(valid); };
  const addTestCase = () => {
    const current = suite; const name = `test-case-${current.testCases.length + 1}`;
    const next = { ...current, testCases: [...current.testCases, { name, inputs: Object.fromEntries(model.inputs.map(input => [input.name, null])), expectedOutputs: Object.fromEntries(model.decisions.map(decision => [decision.name, null])) }] };
    setSuite(next); setIssues([]);
  };
  const importSuite = async event => { const file = event.target.files?.[0]; if (!file) return; try { const imported = JSON.parse(await file.text()); const found = validateTestSuite(imported, model.xml); setIssues(found); if (!found.length) setSuite(imported); } catch { setIssues([{ path: '$', key: 'dmnTests.error.invalidJson' }]); } finally { event.target.value = ''; } };
  const exportSuite = () => download(JSON.stringify(suite, null, 2), 'dmn-test-cases.json', 'application/json');
  const update = (index, section, criterion, value, type) => setSuite(current => ({ ...current, testCases: current.testCases.map((testCase, currentIndex) => currentIndex !== index ? testCase : { ...testCase, [section]: { ...testCase[section], [criterion]: parseDmnTestValue(value, type) } }) }));
  const updateName = (index, name) => setSuite(current => ({ ...current, testCases: current.testCases.map((testCase, currentIndex) => currentIndex === index ? { ...testCase, name } : testCase) }));
  const remove = index => setSuite(current => ({ ...current, testCases: current.testCases.filter((_, currentIndex) => currentIndex !== index) }));
  return <div className="dialog-backdrop" role="presentation"><section className="dmn-tests-dialog" role="dialog" aria-modal="true" aria-labelledby="dmn-test-cases-title"><header><h1 id="dmn-test-cases-title">{t('dmnTests.title')}</h1></header><div className="dmn-tests-content"><p>{t('dmnTests.hint')}</p><div className="dialog-actions"><button type="button" onClick={addTestCase}>{t('dmnTests.add')}</button><button type="button" onClick={() => importInput.current?.click()}>{t('dmnTests.import')}</button><button type="button" onClick={exportSuite}>{t('dmnTests.export')}</button><input className="file-input" ref={importInput} type="file" accept="application/json,.json" onChange={importSuite}/></div><div className="dmn-tests-table-wrap"><table className="dmn-tests-table"><thead><tr><th>{t('dmnTests.name')}</th>{model.inputs.map(input => <th key={input.id}>{t('dmnTests.input')}: {input.name}</th>)}{model.decisions.map(decision => <th key={decision.id}>{t('dmnTests.expected')}: {decision.name}</th>)}<th>{t('dmnTests.actions')}</th></tr></thead><tbody>{suite.testCases.map((testCase, index) => <tr key={index}><td><input value={testCase.name} onChange={event => updateName(index, event.target.value)}/></td>{model.inputs.map(input => <td key={input.id}><DmnValueInput value={testCase.inputs[input.name]} type={input.type} onChange={value => update(index, 'inputs', input.name, value, input.type)}/></td>)}{model.decisions.map(decision => <td key={decision.id}><DmnValueInput value={testCase.expectedOutputs[decision.name]} type={decision.type} onChange={value => update(index, 'expectedOutputs', decision.name, value, decision.type)} placeholder={t('dmnTests.notChecked')}/></td>)}<td><button type="button" onClick={() => { const valid = validate(); if (valid) onRun(testCase); }}>{t('dmnTests.run')}</button><button type="button" onClick={() => remove(index)}>{t('dmnTests.remove')}</button></td></tr>)}</tbody></table></div>{issues.length > 0 && <ul className="dmn-tests-issues">{issues.map((entry, index) => <li key={`${entry.path}-${index}`}><code>{entry.path}</code>: {t(entry.key, entry.values)}</li>)}</ul>}{Object.entries(results).map(([name, result]) => <div className="dmn-test-result" key={name}><h3>{name}</h3>{result.error ? <p className="deviating">{t(result.error)}{result.details && <><br/><small>{t('dmnTests.details')}: {result.details}</small></>}</p> : <ul>{result.comparisons.map(comparison => <li key={comparison.decision} className={comparison.status}><strong>{comparison.decision}</strong>: {comparison.status} — {t('dmnTests.expected')}: <code>{JSON.stringify(comparison.expected)}</code>; {t('dmnTests.actual')}: <code>{JSON.stringify(comparison.actual)}</code></li>)}</ul>}</div>)}</div><footer><button type="button" onClick={onClose}>{t('dmnTests.close')}</button><button type="button" className="primary-button" onClick={save}>{t('dmnTests.apply')}</button></footer></section></div>;
}

// Empty expected-output cells intentionally mean “run but do not compare”.
function parseDmnTestValue(value, type) { if (value === '') return null; if (type === 'number') return Number(value); if (type === 'boolean') return value === 'true'; return value; }
function DmnValueInput({ value, type, onChange, placeholder }) { if (type === 'boolean') return <select value={value == null ? '' : String(value)} onChange={event => onChange(event.target.value)}><option value="">{placeholder || ''}</option><option value="true">true</option><option value="false">false</option></select>; return <input type={type === 'number' ? 'number' : 'text'} value={value ?? ''} placeholder={placeholder} onChange={event => onChange(event.target.value)}/>; }

function ProcessIcon() {
  return <svg className="process-icon" viewBox="0 0 180 54" aria-hidden="true"><circle cx="18" cy="27" r="12"/><path d="M31 27h34"/><path d="m59 20 8 7-8 7"/><rect x="70" y="12" width="56" height="30" rx="3"/><path d="M126 27h10"/><path d="m135 20 8 7-8 7"/><circle cx="159" cy="27" r="12" className="process-end"/></svg>;
}

function LearningIcon() {
  return <svg className="learning-icon" viewBox="0 0 64 54" aria-hidden="true"><path d="m32 6 27 13-27 13L5 19 32 6Z"/><path d="M16 25v11c8 8 24 8 32 0V25l-16 8-16-8Z"/><path d="M55 22v14"/><circle cx="55" cy="38" r="3"/></svg>;
}

function StartScreen({ recentModels, exampleModels, t, onCreate, onOpen, onOpenRecent, onOpenExample }) {
  const helpPlugin = resolvePlugin(extensionPoints.HELP_CONTENT);
  const card = (type, icon, title) => <section className="start-card"><div className="start-icon" aria-hidden="true">{icon}</div><h2>{title}</h2><div className="start-actions"><button className="primary-button" type="button" onClick={() => onCreate(type)}>{t(`start.create${type[0].toUpperCase()}${type.slice(1)}`)}</button><button type="button" onClick={() => onOpen(type)}>{t(`start.open${type[0].toUpperCase()}${type.slice(1)}`)}</button></div><h3>{t('start.recent')}</h3>{recentModels.filter(model => model.type === type).length ? <ul>{recentModels.filter(model => model.type === type).slice(0, 5).map(model => <li key={model.path}><button type="button" onClick={() => onOpenRecent(model)} title={model.path}>{model.title}</button></li>)}</ul> : <p>{t('start.noRecent')}</p>}</section>;
  const examples = type => exampleModels.filter(example => example.type === type);
  const exampleGroup = type => <section className="example-group" key={type}><h4>{t(`start.examples.${type}`)}</h4>{examples(type).length ? <ul>{examples(type).map(example => <li key={`${example.type}:${example.title}`}><button type="button" onClick={() => onOpenExample(example)}>{example.title}</button></li>)}</ul> : <p>{t('start.noExamples')}</p>}</section>;
  return <section className="start-screen"><h1>{t('start.title')}</h1><p>{t('start.intro')}</p><div className="start-cards">{card('bpmn', <ProcessIcon/>, t('start.bpmnTitle'))}{card('dmn', '◇', t('start.dmnTitle'))}{card('cmmn', '▣', <>{t('start.cmmnTitle')}<br/>(CMMN)</>)}<aside className="start-card learning-card"><div className="start-icon" aria-hidden="true"><LearningIcon/></div><h2>{t('start.learningTitle')}</h2><h3>{t('start.readingRecommendation')}</h3><a className="book-recommendation" href="https://www.rheinwerk-verlag.de/5716" target="_blank" rel="noreferrer"><HelpImage source="images/book_bpa_schoenfeld_cover.jpg" alt={t('start.bookAlt')} plugin={helpPlugin}/><span>{t('start.bookRecommendation')}</span></a><a className="book-recommendation cmmn-book-recommendation" href="https://www.amazon.de/CMMN-Method-Style-Management-Documentation/dp/0982368194" target="_blank" rel="noreferrer"><HelpImage source="images/cmmn-method-and-style-book.png" alt={t('start.cmmnBookAlt')} plugin={helpPlugin}/><span>{t('start.cmmnBookRecommendation')}</span></a><h3>{t('start.examples')}</h3>{['bpmn', 'dmn', 'cmmn', 'external'].map(exampleGroup)}</aside></div></section>;
}

function BpmnPane({ registerActions, onSimulationChanged, onSelectionChanged, onTitleChanged, onOpenLinkedModel, language, t, initialContent, initialPath, active }) {
  const host = useRef(); const propertiesHost = useRef(); const fileInput = useRef(); const modeler = useRef(); const scopeRef = useRef(emptyProcessScope()); const activitiesRef = useRef([emptyHighLevelActivity()]); const [path, setPath] = useState(); const [status, setStatus] = useState(message('status.ready')); const [propertiesVisible, setPropertiesVisible] = useState(false); const [dirty, setDirty] = useState(false); const [hasSelection, setHasSelection] = useState(false); const [scopeDialogOpen, setScopeDialogOpen] = useState(false); const [activitiesDialogOpen, setActivitiesDialogOpen] = useState(false); const [callActivity, setCallActivity] = useState(); const [processScope, setProcessScope] = useState(scopeRef.current); const [highLevelActivities, setHighLevelActivities] = useState(activitiesRef.current);
  const modelerPlugin = resolvePlugin(extensionPoints.BPMN_MODELER); const simulationPlugin = resolvePlugin(extensionPoints.BPMN_SIMULATION); const documentationPlugin = resolvePlugin(extensionPoints.BPMN_DOCUMENTATION); const pdfPlugin = resolvePlugin(extensionPoints.PDF_EXPORT);
  const session = useRef(simulationPlugin.createSession()); const [simulationEnabled, setSimulationEnabled] = useState(session.current.isEnabled());
  const selectLinkedElement = async activity => { setCallActivity(activity); setPropertiesVisible(true); if (!activity.path) return; const file = activity.type === 'dmn' ? await api?.openLinkedDmn?.(activity.path) : activity.type === 'cmmn' ? await api?.openLinkedCmmn?.(activity.path) : await api?.openLinkedBpmn?.(activity.path); if (file?.content) onOpenLinkedModel(activity.type, file); else setStatus(message(file?.error === 'missing' ? `${activity.type === 'dmn' ? 'businessRuleTask' : 'callActivity'}.pathMissing` : `${activity.type === 'dmn' ? 'businessRuleTask' : 'callActivity'}.pathInvalid`)); };
  const createEditor = async () => { const instance = await modelerPlugin.createEditor(host.current, { featureSessions: [session.current], propertiesContainer: propertiesHost.current, onContentChanged: () => setDirty(true), onSelectionChanged: setHasSelection, onLinkedElementSelected: selectLinkedElement }); modeler.current = instance; return instance; };
  const fitViewportAfterLayout = () => requestAnimationFrame(() => modeler.current?.fitViewport());
  const load = async content => { await modeler.current.load(content); fitViewportAfterLayout(); setDirty(false); };
  useEffect(() => { let disposed = false; createEditor().then(instance => disposed ? instance.destroy() : load(initialContent || modelerPlugin.createEmptyModel())); return () => { disposed = true; modeler.current?.destroy(); }; }, []);
  useEffect(() => { if (initialPath) setPath(initialPath); }, []);
  useEffect(() => {
    if (!active) return undefined;
    // The canvas needs one rendered frame after a tab becomes visible before
    // bpmn-js can calculate its viewport dimensions correctly.
    const frame = requestAnimationFrame(() => modeler.current?.fitViewport());
    return () => cancelAnimationFrame(frame);
  }, [active]);
  useEffect(() => {
    if (!active || !host.current || !window.ResizeObserver) return undefined;
    const observer = new ResizeObserver(() => fitViewportAfterLayout());
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [active]);
  // Effects must not return the boolean result of the parent callback: React
  // interprets a returned value as a cleanup function during a tab switch.
  useEffect(() => { onSimulationChanged(simulationEnabled); }, [simulationEnabled, onSimulationChanged]);
  useEffect(() => { onSelectionChanged(hasSelection); }, [hasSelection, onSelectionChanged]);
  const xml = async () => modeler.current.serialize();
  const newFile = async () => { await load(modelerPlugin.createEmptyModel()); setPath(null); setStatus(message('status.newBpmn')); };
  const open = async () => { if (!api?.open) return fileInput.current?.click(); const file = await api.open('bpmn'); if (file) { await load(file.content); setPath(file.path); setStatus(message('status.opened', { path: file.path })); onTitleChanged(file.path); } };
  const openBrowserFile = async event => { const file = event.target.files?.[0]; if (!file) return; await load(await file.text()); setPath(file.name); setStatus(message('status.opened', { path: file.name })); onTitleChanged(file.name); event.target.value = ''; };
  const save = async (saveAs = false) => { const content = await xml(); if (!api?.save) { const name = path || 'diagram.bpmn'; download(content, name, 'application/xml'); setDirty(false); setStatus(message('status.bpmnDownloaded')); onTitleChanged(name); return true; } const saved = await api.save({ content, extension: 'bpmn', currentPath: path, saveAs }); if (saved) { setDirty(false); setPath(saved); setStatus(message('status.saved', { path: saved })); onTitleChanged(saved); return true; } return false; };
  const svg = async () => modeler.current.previewSvg();
  // bpmn-js modules are composed at construction time. Recreate the editor with the current XML so switching simulation never changes the BPMN model.
  const toggleSimulation = async () => { const currentXml = modeler.current ? await xml() : modelerPlugin.createEmptyModel(); const nextEnabled = !session.current.isEnabled(); modeler.current?.destroy(); session.current.setEnabled(nextEnabled); await createEditor(); await load(currentXml); if (nextEnabled) modeler.current?.activateSimulation?.(); setSimulationEnabled(nextEnabled); setStatus(message(nextEnabled ? 'status.simulationEnabled' : 'status.simulationDisabled')); };
  const persistProcessScope = async scope => { const documentation = await modeler.current?.getProcessDocumentation(); const hasContent = processScopeFields.some(field => scope[field].trim()); await modeler.current?.setProcessDocumentation(replaceDocumentationSection(documentation, '(?:Top-Level-Prozessumfang|Top-Level Process Scope)', hasContent ? formatProcessScope(scope, language) : '')); };
  const defineProcessScope = async () => { const scope = parseProcessScope(await modeler.current?.getProcessDocumentation()) || emptyProcessScope(); scopeRef.current = scope; setProcessScope(scope); setScopeDialogOpen(true); };
  const updateProcessScope = (field, value) => { const scope = { ...scopeRef.current, [field]: value }; scopeRef.current = scope; setProcessScope(scope); };
  const applyProcessScope = async () => { await persistProcessScope(scopeRef.current); setScopeDialogOpen(false); await save(); };
  const closeProcessScope = () => setScopeDialogOpen(false);
  const defineHighLevelActivities = async () => { const stored = parseHighLevelActivities(await modeler.current?.getProcessDocumentation()); activitiesRef.current = stored || [emptyHighLevelActivity()]; setHighLevelActivities(activitiesRef.current); setActivitiesDialogOpen(true); };
  const updateHighLevelActivities = (index, value) => { const activities = value === null ? activitiesRef.current.filter((_, current) => current !== index) : index === activitiesRef.current.length ? [...activitiesRef.current, value] : activitiesRef.current.map((activity, current) => current === index ? value : activity); activitiesRef.current = activities; setHighLevelActivities(activities); };
  const applyHighLevelActivities = async () => { try { const documentation = await modeler.current?.getProcessDocumentation(); const formatted = formatHighLevelActivities(activitiesRef.current, language); await modeler.current?.setProcessDocumentation(replaceDocumentationSection(documentation, '(?:Hauptaktivitäten im Top-Level|Top-Level Main Activities)', formatted)); const saved = await save(); if (!saved) throw new Error('save-cancelled'); setActivitiesDialogOpen(false); } catch (error) { console.error('Could not save high-level activities', error); window.alert(t('highLevelActivities.saveFailed')); } };
  const colorSelected = color => modeler.current?.colorSelected(color);
  const restoreSelectedColor = () => modeler.current?.restoreSelectedColor();
  const setCallActivityLink = async (target, type) => { await modeler.current?.setCallActivityLink(callActivity.id, target, type); setCallActivity(current => ({ ...current, path: target, type })); setCallActivity(undefined); setDirty(true); };
  const showContextMenu = async event => { event.preventDefault(); if (await modeler.current?.hasElements()) api?.showBpmnContextMenu?.({ x: event.clientX, y: event.clientY }); };
  useEffect(() => registerActions({
    newFile, open, save, saveAs: () => save(true), toggleSimulation, defineProcessScope, defineHighLevelActivities, colorSelected, restoreSelectedColor,
    isDirty: () => dirty,
    copySelected: () => modeler.current?.copySelected(), cutSelected: () => modeler.current?.cutSelected(), paste: () => modeler.current?.paste(),
    exportSvg: async () => { try { const links = modeler.current.getCallActivityLinks(); const available = api?.linkedSvgExists ? (await Promise.all(links.map(async link => (await api.linkedSvgExists(link.path)) ? link : null))).filter(Boolean) : []; let title = path || 'diagram'; try { title = documentationPlugin.extract(await xml()).title || title; } catch { /* A report-data issue must never prevent a valid SVG export. */ } download(addCallActivitySvgLinks(await svg(), available), svgExportMetadata(title).filename, 'image/svg+xml'); } catch (error) { console.error('Could not export BPMN SVG', error); setStatus(message('status.bpmnSvgExportFailed')); } },
    exportPdf: async () => { try { const date = new Date(); const documentation = documentationPlugin.extract(await xml()); const metadata = pdfExportMetadata(documentation.title || path || 'bpmn-documentation', date); const diagrams = await modeler.current.previewDocumentationSvgs(); return await pdfPlugin.exportBpmn({
      svg: diagrams.process, subprocesses: diagrams.subprocesses, documentation, language, footer: t('pdf.footer'), timestamp: documentationTimestamp(language, date), lastUpdateLabel: t('pdf.lastUpdate'), filename: metadata.filename,
      processScopeTitle: t('pdf.processScope.title'), processScopeQuestions: processScopeFields.map(field => t(`pdf.processScope.${field}`)), highLevelActivityLabels: { ...highLevelActivityLabels(language), title: t('pdf.highLevelActivities.title'), unnamed: t('pdf.highLevelActivities.unnamed'), endEvent: t('pdf.highLevelActivities.endEvent'), next: t('pdf.highLevelActivities.next') }, subprocessLabel: t('pdf.bpmn.subprocess')
    }); } catch (error) { console.error('Could not export BPMN PDF documentation', error); setStatus(message('status.bpmnPdfExportFailed')); } }
  }));
  return <section className="workspace"><input ref={fileInput} className="file-input" type="file" accept=".bpmn,.xml,application/xml,text/xml" onChange={openBrowserFile}/>{scopeDialogOpen && <ProcessScopeDialog scope={processScope} t={t} onChange={updateProcessScope} onApply={applyProcessScope} onClose={closeProcessScope}/>} {activitiesDialogOpen && <HighLevelActivitiesDialog activities={highLevelActivities} t={t} onChange={updateHighLevelActivities} onApply={applyHighLevelActivities} onClose={() => setActivitiesDialogOpen(false)}/>} {callActivity && !callActivity.path && <ModelLinkDialog activity={callActivity} t={t} onLink={setCallActivityLink} onClose={() => setCallActivity(undefined)}/>}<div className={`bpmn-editor ${propertiesVisible ? 'properties-visible' : ''}`}><div className="canvas" ref={host} onContextMenu={showContextMenu}/><aside id="bpmn-properties-panel" className="properties-pane" aria-label={t('aria.propertiesPanel')}>{callActivity && <div className="call-activity-property"><strong>{t(`${callActivity.type === 'dmn' ? 'businessRuleTask' : 'callActivity'}.propertyTitle`)}</strong><span>{callActivity.path || t(`${callActivity.type === 'dmn' ? 'businessRuleTask' : 'callActivity'}.noPath`)}</span><button type="button" onClick={() => setCallActivity(current => ({ ...current, path: '' }))}>{t(`${callActivity.type === 'dmn' ? 'businessRuleTask' : 'callActivity'}.changePath`)}</button></div>}<div className="properties-content" ref={propertiesHost}/></aside><button className="properties-toggle" type="button" aria-expanded={propertiesVisible} aria-controls="bpmn-properties-panel" aria-label={t(propertiesVisible ? 'properties.hide' : 'properties.show')} onClick={() => setPropertiesVisible(visible => !visible)}>{propertiesVisible ? '›' : '‹'}</button></div><footer><span>{t(status.key, status.values)}</span><span className={`save-state ${dirty ? 'unsaved' : ''}`}>{t(dirty ? 'status.unsavedChanges' : 'status.allChangesSaved')}</span></footer></section>;
}

function ExternalDmnModelsDialog({ models, importedFilenames, error, t, onAdd, onToggleImport, onClose }) {
  return <div className="dialog-backdrop" role="presentation"><section className="dmn-tests-dialog" role="dialog" aria-modal="true" aria-labelledby="dmn-includes-title"><header><h1 id="dmn-includes-title">{t('dmnIncludes.title')}</h1></header><div className="dmn-tests-content"><p>{t('dmnIncludes.hint')}</p>{error && <p className="dmn-tests-issues">{t(error)}</p>}{models.length ? <ul>{models.map(model => { const imported = importedFilenames.has(model.name); return <li key={model.name}><label><input type="checkbox" checked={imported} onChange={event => onToggleImport(model, event.target.checked)}/> <code>{model.name}</code></label></li>; })}</ul> : <p>{t('dmnIncludes.none')}</p>}<div className="dialog-actions"><button type="button" className="primary-button" onClick={onAdd}>{t('dmnIncludes.add')}</button></div></div><footer><button type="button" onClick={onClose}>{t('dmnIncludes.close')}</button></footer></section></div>;
}

function DmnEditorHost({ modelerPlugin, initialContent, resources, reloadKey, onContentChanged, onReady, onLoading, onError }) {
  const host = useRef(); const instance = useRef(); const queue = useRef(Promise.resolve());
  useEffect(() => {
    let disposed = false;
    const initialize = async () => {
      onLoading();
      const previous = instance.current; instance.current = undefined;
      if (previous) await previous.destroy();
      // Kogito leaves its envelope in the container after close(). Remove that
      // finished envelope before creating the next one, otherwise a resource
      // refresh can leave its Loading overlay permanently on screen.
      host.current?.replaceChildren();
      if (disposed) return;
      const next = await modelerPlugin.createEditor(host.current, { initialContent, resources, onContentChanged: value => !disposed && onContentChanged(value), onError: error => !disposed && onError(error) });
      if (disposed) return next.destroy();
      instance.current = next; onReady(next);
    };
    queue.current = queue.current.then(initialize, initialize).catch(error => !disposed && onError(error));
    return () => { disposed = true; };
  }, [resources, reloadKey]);
  useEffect(() => () => { queue.current = queue.current.then(async () => { const current = instance.current; instance.current = undefined; if (current) await current.destroy(); }).catch(() => {}); }, []);
  return <div className="canvas dmn" ref={host}/>;
}

function CmmnPane({ registerActions, onTitleChanged, onSelectionChanged, onOpenLinkedModel, language, t, initialContent, initialPath, active }) {
  const host = useRef(); const fileInput = useRef(); const modeler = useRef(); const [path, setPath] = useState(); const [dirty, setDirty] = useState(false); const [status, setStatus] = useState(message('status.ready')); const [hasSelection, setHasSelection] = useState(false); const [linkedTask, setLinkedTask] = useState();
  const modelerPlugin = resolvePlugin(extensionPoints.CMMN_MODELER); const documentationPlugin = resolvePlugin(extensionPoints.CMMN_DOCUMENTATION); const pdfPlugin = resolvePlugin(extensionPoints.PDF_EXPORT);
  useEffect(() => { let disposed = false; modelerPlugin.createEditor(host.current, { onContentChanged: () => setDirty(true), onSelectionChanged: selected => { setHasSelection(selected); onSelectionChanged(selected); }, onModelLinkEditRequested: setLinkedTask, linkControlLabel: t('modelLink.edit') }).then(instance => { modeler.current = instance; return instance.load(initialContent || modelerPlugin.createEmptyModel()); }).then(() => { if (disposed) modeler.current?.destroy(); else setDirty(false); }); return () => { disposed = true; modeler.current?.destroy(); }; }, []);
  useEffect(() => { if (initialPath) setPath(initialPath); }, []); useEffect(() => { if (active) requestAnimationFrame(() => modeler.current?.fitViewport()); }, [active]);
  const xml = () => modeler.current.serialize(); const open = async () => { if (!api?.open) return fileInput.current?.click(); const file = await api.open('cmmn'); if (file) { await modeler.current.load(file.content); setPath(file.path); onTitleChanged(file.path); setDirty(false); } }; const browserOpen = async event => { const file = event.target.files?.[0]; if (file) { await modeler.current.load(await file.text()); setPath(file.name); onTitleChanged(file.name); setDirty(false); } event.target.value = ''; };
  const save = async (saveAs = false) => { const content = await xml(); const defaultFilename = `${filenameBase(documentationPlugin.extract(content).title, 'case')}.cmmn`; if (!api?.save) { const name = path || defaultFilename; download(content, name, 'application/xml'); setDirty(false); onTitleChanged(name); return true; } const saved = await api.save({ content, extension: 'cmmn', currentPath: path, saveAs, defaultFilename }); if (saved) { setPath(saved); onTitleChanged(saved); setDirty(false); setStatus(message('status.saved', { path: saved })); return true; } return false; };
  const setLink = async (target, type) => { await modeler.current.setModelLink(linkedTask.id, target, type); setLinkedTask(undefined); setDirty(true); };
  const removeLink = async type => setLink('', type);
  const openLinkedModel = async activity => {
    const file = activity.type === 'dmn' ? await api?.openLinkedDmn?.(activity.path) : activity.type === 'cmmn' ? await api?.openLinkedCmmn?.(activity.path) : await api?.openLinkedBpmn?.(activity.path);
    if (file?.content) { setLinkedTask(undefined); onOpenLinkedModel(activity.type, file); }
    else setStatus(message(file?.error === 'missing' ? 'modelLink.pathMissing' : 'modelLink.pathInvalid'));
  };
  const colorSelected = async color => { const changed = await modeler.current?.colorSelected(color); if (changed) setDirty(true); return changed; };
  const restoreSelectedColor = async () => { const changed = await modeler.current?.restoreSelectedColor(); if (changed) setDirty(true); return changed; };
  useEffect(() => registerActions({ newFile: async () => { await modeler.current.load(modelerPlugin.createEmptyModel()); setPath(null); setDirty(false); }, open, save, saveAs: () => save(true), isDirty: () => dirty, colorSelected, restoreSelectedColor, copySelected: () => modeler.current?.copySelected(), cutSelected: () => modeler.current?.cutSelected(), paste: () => modeler.current?.paste(), exportSvg: async () => { const docs = documentationPlugin.extract(await xml()); download(await modeler.current.previewSvg(), svgExportMetadata(docs.title || path || 'case').filename, 'image/svg+xml'); }, exportPdf: async () => { const date = new Date(); const docs = documentationPlugin.extract(await xml()); return pdfPlugin.exportCmmn({ svg: await modeler.current.previewSvg(), documentation: docs, language, footer: t('pdf.footer'), timestamp: documentationTimestamp(language, date), lastUpdateLabel: t('pdf.lastUpdate'), filename: pdfExportMetadata(docs.title || path || 'cmmn-documentation', date).filename }); } }));
  return <section className="workspace"><input ref={fileInput} className="file-input" type="file" accept=".cmmn,.xml,application/xml,text/xml" onChange={browserOpen}/>{linkedTask && <ModelLinkDialog activity={linkedTask} t={t} onLink={setLink} onRemove={removeLink} onOpen={api ? openLinkedModel : undefined} onClose={() => setLinkedTask(undefined)}/>}<div className="bpmn-editor"><div className="canvas" ref={host} onContextMenu={event => { event.preventDefault(); api?.showCmmnContextMenu?.({ x: event.clientX, y: event.clientY }); }}/></div><footer><span>{t(status.key, status.values)}</span><span className={`save-state ${dirty ? 'unsaved' : ''}`}>{t(dirty ? 'status.unsavedChanges' : 'status.allChangesSaved')}</span></footer></section>;
}

function DmnPane({ registerActions, onTitleChanged, language, t, initialContent, initialPath, active, tabTitle }) {
  const modelerPlugin = resolvePlugin(extensionPoints.DMN_MODELER); const evaluatorPlugin = resolvePlugin(extensionPoints.DMN_EVALUATOR); const documentationPlugin = resolvePlugin(extensionPoints.DMN_DOCUMENTATION); const pdfPlugin = resolvePlugin(extensionPoints.PDF_EXPORT);
  const fileInput = useRef(); const editor = useRef(); const savedContent = useRef(); const contentRef = useRef(initialContent || modelerPlugin.createEmptyModel()); const changeQueue = useRef(Promise.resolve()); const [content, setContent] = useState(() => contentRef.current); const [path, setPath] = useState(initialPath); const [resources, setResources] = useState([]); const [editorReload, setEditorReload] = useState(0); const [resourcesReady, setResourcesReady] = useState(() => !initialPath || !api?.loadDmnResources); const [includesOpen, setIncludesOpen] = useState(false); const [includesError, setIncludesError] = useState(''); const [status, setStatus] = useState(message('status.dmnLoading')); const [pdfExporting, setPdfExporting] = useState(false); const [dirty, setDirty] = useState(false); const [testCasesOpen, setTestCasesOpen] = useState(false); const [testSuite, setTestSuite] = useState(); const [testModel, setTestModel] = useState(); const [testResults, setTestResults] = useState({});
  const loadSiblingResources = async source => {
    if (!api?.loadDmnResources || !source) return [];
    const loaded = await api.loadDmnResources(source);
    setResources(loaded);
    return loaded;
  };
  useEffect(() => {
    let disposed = false;
    if (!initialPath || !api?.loadDmnResources) return undefined;
    // Kogito resolves imports while opening the main document. Do not create it
    // with an empty resource map and add sibling files afterwards.
    loadSiblingResources(initialPath).catch(() => {}).finally(() => { if (!disposed) setResourcesReady(true); });
    return () => { disposed = true; };
  }, []);
  useEffect(() => { if (!active) return undefined; const frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))); return () => cancelAnimationFrame(frame); }, [active]);
  // During a Kogito resource restart no live editor is available. The ref is
  // updated before React schedules its render, so it is the authoritative
  // save buffer for an immediate application-close request.
  const current = async () => editor.current?.serialize() || contentRef.current; const replace = async (value, nextResources = resources) => { contentRef.current = value; setContent(value); const resourcesChanged = nextResources.length !== resources.length || nextResources.some((resource, index) => resource.name !== resources[index]?.name || resource.content !== resources[index]?.content); if (resourcesChanged) setResources(nextResources); else await editor.current?.load(value); savedContent.current = value; setTestSuite(undefined); setTestModel(undefined); setTestResults({}); setDirty(false); };
  const newFile = async () => { await replace(modelerPlugin.createEmptyModel()); setPath(null); setStatus(message('status.newDmn')); };
  const open = async () => { if (!api?.open) return fileInput.current?.click(); const file = await api.open('dmn'); if (file) { const siblingResources = await api.loadDmnResources?.(file.path) || []; await replace(file.content, siblingResources); setPath(file.path); setResourcesReady(true); setStatus(message('status.opened', { path: file.path })); onTitleChanged(file.path); } };
  const openBrowserFile = async event => { const file = event.target.files?.[0]; if (!file) return; await replace(await file.text()); setPath(file.name); setStatus(message('status.opened', { path: file.name })); onTitleChanged(file.name); event.target.value = ''; };
  const replaceImportedModels = async (next, nextResources = resources) => {
    contentRef.current = next; setContent(next); setDirty(next !== savedContent.current);
    const resourcesChanged = nextResources.length !== resources.length || nextResources.some((resource, index) => resource.name !== resources[index]?.name || resource.content !== resources[index]?.content);
    if (resourcesChanged) setResources(nextResources);
    // Imports are resolved when the current KIE editor opens the model.
    setEditorReload(revision => revision + 1);
  };
  const toggleExternalModel = (model, include) => {
    const change = async () => {
      const xml = await current();
      await replaceImportedModels(include ? includeDmnModels(xml, [model]) : removeDmnModelImports(xml, [model.name]));
    };
    changeQueue.current = changeQueue.current.then(change, change);
    return changeQueue.current;
  };
  const addExternalModels = async () => { const result = await api?.selectDmnResources?.(path); if (!result) return; setIncludesError(result.error || ''); if (result.models?.length) { const change = async () => { const xml = await current(); const nextResources = [...new Map([...resources, ...result.models].map(model => [model.name, model])).values()]; await replaceImportedModels(includeDmnModels(xml, result.models), nextResources); }; changeQueue.current = changeQueue.current.then(change, change); await changeQueue.current; } };
  const save = async (saveAs = false) => { const value = await current(); if (!api?.save) { const name = path || 'model.dmn'; download(value, name, 'application/xml'); savedContent.current = value; setDirty(false); setStatus(message('status.dmnDownloaded')); onTitleChanged(name); return true; } const saved = await api.save({ content: value, extension: 'dmn', currentPath: path, saveAs }); if (saved) { editor.current?.markAsSaved?.(); savedContent.current = value; setDirty(false); setPath(saved); await loadSiblingResources(saved); setStatus(message('status.saved', { path: saved })); onTitleChanged(saved); return true; } return false; };
  const exportSvg = async () => {
    try {
      const svg = await editor.current?.previewSvg();
      if (typeof svg !== 'string' || !svg.trim()) throw new Error('DMN SVG preview is unavailable');
      const xml = await current();
      const title = documentationPlugin.extract(xml).title || tabTitle || path || 'diagram';
      download(svg, svgExportMetadata(title).filename, 'image/svg+xml');
    } catch {
      setStatus(message('status.dmnSvgExportFailed'));
    }
  };
  const openTestCases = async () => {
    // Read from the editor at the moment the dialog opens. React state can still
    // contain the initial template while Kogito has already loaded another file.
    const xml = await current(); const model = { xml, ...inspectDmnModel(xml) };
    setTestModel(model);
    setTestSuite(suite => suite ? { ...suite, model: { namespace: model.namespace, name: model.name } } : createTestSuite(xml));
    setTestResults({}); setTestCasesOpen(true);
    // Starting the local runner can take several seconds. The dialog must not
    // appear broken while that independent desktop operation is still pending.
    try { await evaluatorPlugin.activate(); }
    catch (error) { setStatus(message(error.message?.startsWith('dmnTests.error.') ? error.message : 'dmnTests.error.runnerUnavailable')); }
  };
  const runTestCase = async testCase => {
    try { const xml = await current(); const actual = await evaluatorPlugin.evaluate({ dmnXml: xml, inputs: testCase.inputs }); setTestResults(previous => ({ ...previous, [testCase.name]: { comparisons: compareTestCase(testCase, actual.decisions), messages: actual.messages || [] } })); }
    catch (error) { setTestResults(previous => ({ ...previous, [testCase.name]: { error: error.message.startsWith('dmnTests.error.') ? error.message : 'dmnTests.error.executionFailed', details: error.details || error.message } })); }
  };
  const exportPdf = async () => {
    if (pdfExporting) return;
    setPdfExporting(true); setStatus(message('status.dmnPdfExporting'));
    // Let React paint the indicator before rendering a large document.
    await new Promise(resolve => requestAnimationFrame(resolve));
    try {
      const date = new Date(); const documentation = documentationPlugin.extract(await current()); const metadata = pdfExportMetadata(documentation.title || tabTitle || path || 'dmn-documentation', date);
      await pdfPlugin.exportDmn({ svg: await editor.current?.previewSvg(), documentation, language, footer: t('pdf.footer'), timestamp: documentationTimestamp(language, date), lastUpdateLabel: t('pdf.lastUpdate'), filename: metadata.filename, testSuite, labels: Object.fromEntries(dmnPdfLabelKeys.map(key => [key, t(`pdf.dmn.${key}`)])) });
      setStatus(message('status.dmnPdfExported'));
    } catch (error) {
      console.error('Could not export DMN PDF documentation', error);
      const details = typeof error?.message === 'string' && error.message.trim() ? error.message : t('status.errorDetailsUnavailable');
      setStatus(message('status.dmnPdfExportFailed', { message: details }));
    } finally { setPdfExporting(false); }
  };
  useEffect(() => registerActions({ newFile, open, save, saveAs: () => save(true), isDirty: () => dirty, openTestCases, manageIncludes: async () => { setIncludesError(''); await loadSiblingResources(path).catch(() => {}); setIncludesOpen(true); }, exportSvg, exportPdf }));
  const importedFilenames = new Set(documentationPlugin.extract(content).includedModels.map(model => model.filename));
  return <section className="workspace"><input ref={fileInput} className="file-input" type="file" accept=".dmn,.xml,application/xml,text/xml" onChange={openBrowserFile}/>{includesOpen && <ExternalDmnModelsDialog models={resources} importedFilenames={importedFilenames} error={includesError} t={t} onAdd={addExternalModels} onToggleImport={toggleExternalModel} onClose={() => setIncludesOpen(false)}/>} {testCasesOpen && testModel && <DmnTestCasesDialog initialSuite={testSuite || createTestSuite(testModel.xml)} model={testModel} results={testResults} t={t} onSave={suite => { setTestSuite(suite); setTestCasesOpen(false); }} onRun={runTestCase} onClose={() => setTestCasesOpen(false)}/>} {resourcesReady ? <DmnEditorHost modelerPlugin={modelerPlugin} initialContent={contentRef.current} resources={resources} reloadKey={editorReload} onContentChanged={value => { contentRef.current = value; setContent(value); setDirty(value !== savedContent.current); }} onReady={instance => { editor.current = instance; if (savedContent.current === undefined) { savedContent.current = contentRef.current; setDirty(false); } else setDirty(contentRef.current !== savedContent.current); setStatus(message('status.dmnReady')); }} onLoading={() => { editor.current = undefined; setStatus(message('status.dmnLoading')); }} onError={error => setStatus(message('status.dmnLoadFailed', { message: error.message }))}/> : <div className="canvas dmn"/>}<footer><span>{t(status.key, status.values)}</span>{pdfExporting && <span className="pdf-export-progress" role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#24415f', fontWeight: 600 }}><progress aria-label={t('status.dmnPdfExporting')} style={{ width: 100, height: 9, accentColor: '#3f9d91' }}/>{t('status.dmnPdfExporting')}</span>}<span className={`save-state ${dirty ? 'unsaved' : ''}`}>{t(dirty ? 'status.unsavedChanges' : 'status.allChangesSaved')}</span></footer></section>;
}

export default function App() {
  const nextDocumentId = useRef(2);
  const initialOnboardingHandled = useRef(false);
  const [documents, setDocuments] = useState([]);
  const [exampleModels, setExampleModels] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(); const [recentModels, setRecentModels] = useState([]); const [simulationEnabled, setSimulationEnabled] = useState(false); const [bpmnSelection, setBpmnSelection] = useState(false); const [cmmnSelection, setCmmnSelection] = useState(false); const [bpmnClipboard, setBpmnClipboard] = useState(false); const [cmmnClipboard, setCmmnClipboard] = useState(false); const [language, setLanguage] = useState(browserLanguage); const [helpOpen, setHelpOpen] = useState(false); const [helpEntries, setHelpEntries] = useState([]); const [onboardingHintsEnabled, setOnboardingHintsEnabled] = useState(() => { try { return localStorage.getItem('bpm-modeler.onboarding-enabled') !== 'false'; } catch { return true; } }); const [onboardingReady, setOnboardingReady] = useState(!api); const [onboardingType, setOnboardingType] = useState(); const [licenseStatus, setLicenseStatus] = useState(() => api ? undefined : { accepted: true, secureStorageAvailable: true, text: '' }); const [aboutOpen, setAboutOpen] = useState(false); const actions = useRef({}); const menuCommandHandler = useRef();
  const activeDocument = documents.find(document => document.id === activeDocumentId) || documents[0]; const tab = activeDocument?.type;
  const t = (key, values) => translate(language, key, values); const registerActions = id => value => { actions.current[id] = value; };
  const run = (command, ...arguments_) => actions.current[activeDocumentId]?.[command]?.(...arguments_);
  const showOnboarding = async type => {
    if (!onboardingReady || !onboardingHintsEnabled) return;
    let entries = helpEntries;
    if (!entries.length) { try { entries = await resolvePlugin(extensionPoints.HELP_CONTENT).load(); setHelpEntries(entries); } catch { return; } }
    if (helpTopics(entries, language).some(topic => topic.onboarding === type)) setOnboardingType(type);
  };
  const createDocument = (type, file) => {
    const id = `document-${nextDocumentId.current++}`; const path = file?.path; const name = path?.split(/[\\/]/).pop();
    setDocuments(current => [...current, { id, type, title: name || `${type.toUpperCase()} ${nextDocumentId.current - 1}`, initialContent: file?.content, initialPath: path }]); setActiveDocumentId(id);
    void showOnboarding(type);
    if (file?.path) api?.recordRecentModel?.({ type, path: file.path }).then(setRecentModels).catch(() => {});
  };
  const openDocument = async type => {
    if (!api?.open) return run('open');
    const file = await api.open(type); if (file) createDocument(type, file);
  };
  const openRecentModel = async model => {
    const file = model.type === 'dmn' ? await api?.openLinkedDmn?.(model.path) : model.type === 'cmmn' ? await api?.openLinkedCmmn?.(model.path) : await api?.openLinkedBpmn?.(model.path);
    if (file?.content) createDocument(model.type, file);
  };
  const updateDocumentTitle = (id, path) => {
    const title = String(path).split(/[\\/]/).pop() || path;
    setDocuments(current => current.map(document => document.id === id ? { ...document, title } : document));
  };
  const closeDocument = async document => {
    const documentActions = actions.current[document.id];
    if (documentActions?.isDirty?.()) {
      const wantsSave = api?.confirmClose ? await api.confirmClose(document.title) : window.confirm(t('dialog.unsavedMessage', { name: document.title }));
      if (wantsSave && !(await documentActions.save?.())) return;
    }
    const index = documents.findIndex(item => item.id === document.id); const remaining = documents.filter(item => item.id !== document.id);
    // Keep the tab order predictable: prefer the open tab immediately to the
    // left; if the first tab is closed, select the next tab to its right.
    const nextActive = remaining[index - 1] || remaining[index];
    setDocuments(remaining); setActiveDocumentId(nextActive?.id);
  };
  const changeLanguage = code => { setLanguage(code); api?.setLanguage?.(code); };
  const changeOnboardingHintsEnabled = async enabled => {
    const next = Boolean(enabled); setOnboardingHintsEnabled(next);
    try { localStorage.setItem('bpm-modeler.onboarding-enabled', String(next)); } catch { /* Browser storage can be unavailable. */ }
    if (api?.setOnboardingHintsEnabled) await api.setOnboardingHintsEnabled(next);
  };
  const openHelp = async () => { try { setHelpEntries(await resolvePlugin(extensionPoints.HELP_CONTENT).load()); } catch { setHelpEntries([]); } setHelpOpen(true); };
  const handleMenuCommand = command => {
    if (!licenseStatus?.accepted) { if (command === 'about') setAboutOpen(true); return; }
    if (command.startsWith('set-language:')) return changeLanguage(command.slice('set-language:'.length));
    if (command.startsWith('set-onboarding-hints:')) return changeOnboardingHintsEnabled(command.endsWith('true'));
    if (command === 'toggle-onboarding-hints') return changeOnboardingHintsEnabled(!onboardingHintsEnabled);
    if (command.startsWith('color:')) return (tab === 'bpmn' || tab === 'cmmn') && run('colorSelected', command.slice('color:'.length));
    if (command === 'copy-bpmn' || command === 'cut-bpmn') { if (tab === 'bpmn') { run(command === 'copy-bpmn' ? 'copySelected' : 'cutSelected'); setBpmnClipboard(true); } return; }
    if (command === 'copy-cmmn' || command === 'cut-cmmn') { if (tab === 'cmmn') { run(command === 'copy-cmmn' ? 'copySelected' : 'cutSelected'); setCmmnClipboard(true); } return; }
    if (command === 'paste-bpmn') return tab === 'bpmn' && bpmnClipboard && run('paste');
    if (command === 'paste-cmmn') return tab === 'cmmn' && cmmnClipboard && run('paste');
    if (command === 'restore-color') return (tab === 'bpmn' || tab === 'cmmn') && run('restoreSelectedColor');
    if (command === 'new-bpmn') return createDocument('bpmn'); if (command === 'new-dmn') return createDocument('dmn'); if (command === 'new-cmmn') return createDocument('cmmn'); if (command === 'open-bpmn') return openDocument('bpmn'); if (command === 'open-dmn') return openDocument('dmn'); if (command === 'open-cmmn') return openDocument('cmmn'); if (command === 'save') return run('save'); if (command === 'save-as') return run('saveAs'); if (command === 'export-svg') return (tab === 'bpmn' || tab === 'dmn' || tab === 'cmmn') && run('exportSvg'); if (command === 'export-pdf') return run('exportPdf'); if (command === 'toggle-simulation') return tab === 'bpmn' && run('toggleSimulation'); if (command === 'define-process-scope') return tab === 'bpmn' && run('defineProcessScope'); if (command === 'define-high-level-activities') return tab === 'bpmn' && run('defineHighLevelActivities'); if (command === 'open-dmn-test-cases') return tab === 'dmn' && run('openTestCases'); if (command === 'manage-dmn-includes') return tab === 'dmn' && run('manageIncludes'); if (command === 'open-help') return openHelp(); if (command === 'about') setAboutOpen(true);
  };
  const acceptLicense = async () => { const status = await api?.acceptLicense?.(); if (status?.accepted) setLicenseStatus(status); };
  const declineLicense = () => api?.declineLicense?.();
  useEffect(() => { api?.getLanguage?.().then(changeLanguage); }, []);
  useEffect(() => { api?.getRecentModels?.().then(setRecentModels).catch(() => {}); }, []);
  useEffect(() => { api?.getLicenseStatus?.().then(setLicenseStatus).catch(() => setLicenseStatus({ accepted: false, secureStorageAvailable: false, text: '' })); }, []);
  useEffect(() => { api?.getOnboardingHintsEnabled?.().then(enabled => setOnboardingHintsEnabled(Boolean(enabled))).catch(() => {}).finally(() => setOnboardingReady(true)); }, []);
  useEffect(() => { resolvePlugin(extensionPoints.HELP_CONTENT).load().then(setHelpEntries).catch(() => setHelpEntries([])); }, []);
  useEffect(() => { resolvePlugin(extensionPoints.HELP_CONTENT).loadExamples().then(setExampleModels).catch(() => setExampleModels([])); }, []);
  useEffect(() => {
    if (initialOnboardingHandled.current || !onboardingReady || !helpEntries.length) return;
    initialOnboardingHandled.current = true;
  }, [onboardingReady, helpEntries]);
  useEffect(() => {
    const shortcuts = { r: 'red', b: 'blue', g: 'green', y: 'yellow', o: 'orange' };
    const onKeyDown = event => {
      const color = shortcuts[event.key.toLowerCase()];
      const primaryModifier = event.ctrlKey || event.metaKey;
      // Keep Save reliable while a graphical editor owns focus. Electron still
      // exposes the same shortcut in its native menu.
      if (event.key === 'F1') { event.preventDefault(); openHelp(); return; }
      if (primaryModifier && !event.altKey && event.shiftKey && event.key.toLowerCase() === 'o') { event.preventDefault(); openDocument('dmn'); return; }
      if (primaryModifier && !event.altKey && event.key.toLowerCase() === 's') { event.preventDefault(); run(event.shiftKey ? 'saveAs' : 'save'); return; }
      if ((tab === 'bpmn' || tab === 'cmmn') && primaryModifier && event.shiftKey && color) { event.preventDefault(); run('colorSelected', color); }
      if ((tab === 'bpmn' || tab === 'cmmn') && primaryModifier && event.shiftKey && event.key.toLowerCase() === 'u') { event.preventDefault(); run('restoreSelectedColor'); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tab, activeDocumentId]);
  menuCommandHandler.current = handleMenuCommand;
  useEffect(() => { if (onboardingReady) api?.setMenuState?.({ activeModel: tab, hasDocument: Boolean(activeDocument), simulationEnabled: tab === 'bpmn' && simulationEnabled, bpmnSelection: tab === 'bpmn' && bpmnSelection, cmmnSelection: tab === 'cmmn' && cmmnSelection, bpmnClipboard, cmmnClipboard, onboardingHintsEnabled, licenseAccepted: Boolean(licenseStatus?.accepted) }); }, [tab, activeDocument, simulationEnabled, bpmnSelection, cmmnSelection, bpmnClipboard, cmmnClipboard, onboardingHintsEnabled, onboardingReady, licenseStatus]);
  useEffect(() => api?.onMenuCommand?.(command => menuCommandHandler.current(command)), []);
  const onboardingTopic = onboardingType && helpTopics(helpEntries, language).find(topic => topic.onboarding === onboardingType);
  if (!licenseStatus) return <main/>;
  return <main>{licenseStatus.accepted && <><header><div><strong>BPM Modeler</strong><small>{t('header.subtitle')}</small></div>{!api && <BrowserMenu tab={tab} simulationEnabled={simulationEnabled} language={language} onboardingHintsEnabled={onboardingHintsEnabled} t={t} onCommand={handleMenuCommand}/>}<div className="tabs">{documents.map(document => <div className={`tab ${document.id === activeDocumentId ? 'active' : ''}`} key={document.id}><button className="tab-select" onClick={() => setActiveDocumentId(document.id)}>{document.title}</button><button className="tab-close" type="button" aria-label={t('aria.closeTab', { name: document.title })} onClick={() => closeDocument(document)}>×</button></div>)}</div></header>{!documents.length && <StartScreen recentModels={recentModels} exampleModels={exampleModels} t={t} onCreate={createDocument} onOpen={openDocument} onOpenRecent={openRecentModel} onOpenExample={async example => { const opened = await resolvePlugin(extensionPoints.HELP_CONTENT).openExample(example); if (opened) createDocument(opened.type, opened); }}/>} {documents.map(document => <div className={document.id === activeDocumentId ? 'document-pane active-document' : 'document-pane'} key={document.id}>{document.type === 'bpmn' ? <BpmnPane registerActions={registerActions(document.id)} onSimulationChanged={enabled => document.id === activeDocumentId && setSimulationEnabled(enabled)} onSelectionChanged={selected => document.id === activeDocumentId && setBpmnSelection(selected)} onTitleChanged={path => updateDocumentTitle(document.id, path)} onOpenLinkedModel={(type, file) => createDocument(type, file)} language={language} t={t} initialContent={document.initialContent} initialPath={document.initialPath} active={document.id === activeDocumentId}/> : document.type === 'cmmn' ? <CmmnPane registerActions={registerActions(document.id)} onTitleChanged={path => updateDocumentTitle(document.id, path)} onSelectionChanged={selected => document.id === activeDocumentId && setCmmnSelection(selected)} onOpenLinkedModel={(type, file) => createDocument(type, file)} language={language} t={t} initialContent={document.initialContent} initialPath={document.initialPath} active={document.id === activeDocumentId}/> : <DmnPane registerActions={registerActions(document.id)} onTitleChanged={path => updateDocumentTitle(document.id, path)} language={language} t={t} initialContent={document.initialContent} initialPath={document.initialPath} active={document.id === activeDocumentId} tabTitle={document.title}/>}</div>)}</>}{helpOpen && <HelpDialog entries={helpEntries} language={language} t={t} onClose={() => setHelpOpen(false)}/>} {onboardingTopic && <OnboardingDialog topic={onboardingTopic} enabled={onboardingHintsEnabled} t={t} onChangeEnabled={changeOnboardingHintsEnabled} onClose={() => setOnboardingType(undefined)}/>} {!licenseStatus.accepted && <LicenseDialog status={licenseStatus} t={t} onAccept={acceptLicense} onDecline={declineLicense}/>} {aboutOpen && <AboutDialog licenseText={licenseStatus.text} t={t} onClose={() => setAboutOpen(false)}/>}</main>;
}
