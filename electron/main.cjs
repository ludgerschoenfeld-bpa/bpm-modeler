const { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { loadDmnRunnerConfig } = require('./dmnRunnerConfig.cjs');
const { createLicenseConsent } = require('./licenseConsent.cjs');
const { appIconPath } = require('./appIcon.cjs');

// Use the Vite development server locally and the bundled renderer in packaged apps.
const isDev = !app.isPackaged;
const propertiesDirectory = path.join(__dirname, '../src/lang');
let menuState = { activeModel: 'bpmn', hasDocument: false, simulationEnabled: false, bpmnSelection: false, cmmnSelection: false, bpmnClipboard: false, cmmnClipboard: false, onboardingHintsEnabled: true, licenseAccepted: false, language: 'en' };
let dmnRunner;
const licenseConsent = createLicenseConsent({ app, fs, safeStorage });

function parseProperties(source) {
  return Object.fromEntries(source.split(/\r?\n/).filter(line => line && !line.trimStart().startsWith('#')).map(line => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }));
}
const translations = Object.fromEntries(fsSync.readdirSync(propertiesDirectory)
  .filter(filename => filename.endsWith('.properties'))
  .map(filename => [path.basename(filename, '.properties').toLowerCase(), parseProperties(fsSync.readFileSync(path.join(propertiesDirectory, filename), 'utf8'))]));
const supportedLanguages = Object.keys(translations).sort();
function resolveLanguage(language) {
  const normalized = String(language || '').toLowerCase().replace('_', '-');
  return supportedLanguages.includes(normalized) ? normalized : supportedLanguages.find(code => code === normalized.split('-')[0]) || 'en';
}
function t(key, values = {}) {
  const translation = translations[menuState.language][key] || translations.en[key] || key;
  return translation.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}

function sendMenuCommand(command, window) {
  const target = window || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  target?.webContents.send('menu:command', command);
}
function onboardingSettingsFile() {
  return path.join(app.getPath('userData'), 'onboarding.json');
}
async function readOnboardingHintsEnabled() {
  try {
    const settings = JSON.parse(await fs.readFile(onboardingSettingsFile(), 'utf8'));
    return typeof settings.enabled === 'boolean' ? settings.enabled : true;
  } catch { return true; }
}
async function writeOnboardingHintsEnabled(enabled) {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(onboardingSettingsFile(), JSON.stringify({ enabled: Boolean(enabled) }, null, 2), 'utf8');
}
function installApplicationMenu() {
  const licenseAccepted = Boolean(menuState.licenseAccepted);
  const isBpmn = menuState.activeModel === 'bpmn';
  const isDmn = menuState.activeModel === 'dmn';
  const isCmmn = menuState.activeModel === 'cmmn';
  const hasDocument = Boolean(menuState.hasDocument && licenseAccepted);
  const hasBpmnSelection = isBpmn && Boolean(menuState.bpmnSelection);
  const hasCmmnSelection = isCmmn && Boolean(menuState.cmmnSelection);
  const languageAccelerator = index => `CmdOrCtrl+Alt+${index + 1}`;
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: t('menu.file'), submenu: [
      { label: t('menu.new'), enabled: licenseAccepted, submenu: [{ label: t('menu.newBpmn'), accelerator: 'CmdOrCtrl+N', click: (_, window) => sendMenuCommand('new-bpmn', window) }, { label: t('menu.newDmn'), accelerator: 'CmdOrCtrl+Shift+N', click: (_, window) => sendMenuCommand('new-dmn', window) }, { label: t('menu.newCmmn'), accelerator: 'CmdOrCtrl+Alt+N', click: (_, window) => sendMenuCommand('new-cmmn', window) }] },
      { label: t('menu.open'), enabled: licenseAccepted, submenu: [{ label: t('menu.openBpmn'), accelerator: 'CmdOrCtrl+O', click: (_, window) => sendMenuCommand('open-bpmn', window) }, { label: t('menu.openDmn'), accelerator: 'CmdOrCtrl+Shift+O', click: (_, window) => sendMenuCommand('open-dmn', window) }, { label: t('menu.openCmmn'), accelerator: 'CmdOrCtrl+Alt+O', click: (_, window) => sendMenuCommand('open-cmmn', window) }] },
      { type: 'separator' },
      { label: t('menu.save'), accelerator: 'CmdOrCtrl+S', enabled: hasDocument, click: (_, window) => sendMenuCommand('save', window) },
      { label: t('menu.saveAs'), accelerator: 'CmdOrCtrl+Shift+S', enabled: hasDocument, click: (_, window) => sendMenuCommand('save-as', window) },
      { type: 'separator' }, { label: t('menu.quit'), accelerator: 'CmdOrCtrl+Q', role: 'quit' }
    ] },
    { label: t('menu.exportAs'), enabled: hasDocument, submenu: [{ label: 'SVG', accelerator: 'CmdOrCtrl+Alt+S', enabled: isBpmn || isDmn || isCmmn, click: (_, window) => sendMenuCommand('export-svg', window) }, { label: t('menu.pdfDocumentation'), accelerator: 'CmdOrCtrl+Alt+P', enabled: hasDocument, click: (_, window) => sendMenuCommand('export-pdf', window) }] },
    { label: t('menu.tools'), enabled: hasDocument, submenu: [{ label: t('menu.bpmn'), enabled: isBpmn, submenu: [
      { label: t('menu.color'), enabled: hasBpmnSelection, submenu: [...['red', 'blue', 'green', 'yellow', 'orange'].map(color => ({ label: t(`color.${color}`), accelerator: `CmdOrCtrl+Shift+${color[0].toUpperCase()}`, enabled: hasBpmnSelection, click: (_, window) => sendMenuCommand(`color:${color}`, window) })), { type: 'separator' }, { label: t('color.default'), accelerator: 'CmdOrCtrl+Shift+U', enabled: hasBpmnSelection, click: (_, window) => sendMenuCommand('restore-color', window) }] },
      { label: t('menu.defineProcessScope'), accelerator: 'CmdOrCtrl+Alt+R', enabled: isBpmn, click: (_, window) => sendMenuCommand('define-process-scope', window) },
      { label: t('menu.defineHighLevelActivities'), accelerator: 'CmdOrCtrl+Alt+A', enabled: isBpmn, click: (_, window) => sendMenuCommand('define-high-level-activities', window) },
      { label: t(menuState.simulationEnabled ? 'menu.tokenSimulationDisable' : 'menu.tokenSimulationEnable'), accelerator: 'CmdOrCtrl+Alt+T', enabled: isBpmn, click: (_, window) => sendMenuCommand('toggle-simulation', window) }
    ] }, { label: t('menu.dmn'), enabled: isDmn, submenu: [{ label: t('menu.dmnTestCases'), accelerator: 'CmdOrCtrl+Alt+D', enabled: isDmn, click: (_, window) => sendMenuCommand('open-dmn-test-cases', window) }, { label: t('menu.dmnIncludes'), accelerator: 'CmdOrCtrl+Alt+I', enabled: isDmn, click: (_, window) => sendMenuCommand('manage-dmn-includes', window) }] }, { label: t('menu.cmmn'), enabled: isCmmn, submenu: [{ label: t('menu.color'), enabled: hasCmmnSelection, submenu: [...['red', 'blue', 'green', 'yellow', 'orange'].map(color => ({ label: t(`color.${color}`), accelerator: `CmdOrCtrl+Shift+${color[0].toUpperCase()}`, enabled: hasCmmnSelection, click: (_, window) => sendMenuCommand(`color:${color}`, window) })), { type: 'separator' }, { label: t('color.default'), accelerator: 'CmdOrCtrl+Shift+U', enabled: hasCmmnSelection, click: (_, window) => sendMenuCommand('restore-color', window) }] }] }] },
    { label: t('menu.view'), enabled: licenseAccepted, submenu: [{ label: t('menu.language'), submenu: supportedLanguages.map((language, index) => ({ label: translations[language]['language.name'] || language, accelerator: languageAccelerator(index), enabled: language !== menuState.language, click: (_, window) => { menuState.language = resolveLanguage(language); installApplicationMenu(); sendMenuCommand(`set-language:${language}`, window); } })) }] },
    { label: t('menu.help'), submenu: [{ label: t('menu.openHelp'), accelerator: 'F1', enabled: licenseAccepted, click: (_, window) => sendMenuCommand('open-help', window) }, { type: 'checkbox', label: t('help.onboardingEnabled'), enabled: licenseAccepted, checked: menuState.onboardingHintsEnabled, click: item => sendMenuCommand(`set-onboarding-hints:${item.checked}`) }, { label: t('menu.about'), accelerator: 'CmdOrCtrl+Alt+H', click: (_, window) => sendMenuCommand('about', window) }] }
  ]));
}
function createWindow() {
  const window = new BrowserWindow({ width: 1440, height: 900, minWidth: 1050, minHeight: 650, icon: appIconPath(app),
    // Keep renderer code isolated from Node.js; native access is exposed only via preload.cjs.
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: false } });
  // Kogito can consume Ctrl/Cmd shortcuts inside its embedded editor before
  // the renderer or application menu sees them. Handle shortcuts that must
  // remain available while it owns focus before they reach the editor.
  window.webContents.on('before-input-event', (event, input) => {
    const key = String(input.key).toLowerCase();
    if (input.type !== 'keyDown' || input.alt || !(input.control || input.meta) || !menuState.licenseAccepted) return;
    if (key === 'o' && input.shift) {
      event.preventDefault();
      sendMenuCommand('open-dmn', window);
      return;
    }
    if (key === 's' && menuState.hasDocument) {
      event.preventDefault();
      sendMenuCommand(input.shift ? 'save-as' : 'save', window);
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.loadURL(isDev ? 'http://127.0.0.1:5173' : `file://${path.join(__dirname, '../dist/index.html')}`);
}
app.whenReady().then(async () => { menuState.language = resolveLanguage(app.getLocale()); menuState.onboardingHintsEnabled = await readOnboardingHintsEnabled(); menuState.licenseAccepted = (await licenseConsent.status()).accepted; installApplicationMenu(); createWindow(); app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow()); });
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
app.on('before-quit', () => dmnRunner?.then(runner => runner.process.kill()).catch(() => {}));

// File operations stay in the main process. Never accept arbitrary paths from the renderer.
ipcMain.handle('file:open', async (_, extension) => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: t(`file.${extension}`), extensions: [extension] }] });
  if (result.canceled) return null;
  return { path: result.filePaths[0], content: await fs.readFile(result.filePaths[0], 'utf8') };
});
ipcMain.handle('file:save', async (_, { content, extension, currentPath, saveAs = false, defaultFilename }) => {
  const options = { filters: [{ name: t(`file.${extension}`), extensions: [extension] }] };
  if (defaultFilename) options.defaultPath = path.basename(defaultFilename);
  const result = currentPath && !saveAs ? { canceled: false, filePath: currentPath } : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return null;
  const target = result.filePath.endsWith(`.${extension}`) ? result.filePath : `${result.filePath}.${extension}`;
  await fs.writeFile(target, content, 'utf8'); return target;
});
ipcMain.handle('document:confirm-close', async (_, name) => {
  const result = await dialog.showMessageBox({
    type: 'question', title: t('dialog.unsavedTitle'),
    message: t('dialog.unsavedMessage', { name: name || t('dialog.untitled') }),
    buttons: [t('dialog.save'), t('dialog.discard')], defaultId: 0, cancelId: 1, noLink: true
  });
  return result.response === 0;
});
ipcMain.handle('license:status', () => licenseConsent.status());
ipcMain.handle('license:accept', async () => {
  const status = await licenseConsent.accept();
  menuState.licenseAccepted = status.accepted;
  installApplicationMenu();
  return status;
});
ipcMain.handle('license:decline', async () => {
  await dialog.showMessageBox({ type: 'info', title: t('license.declineTitle'), message: t('license.declineMessage'), buttons: [t('license.declineClose')], defaultId: 0, noLink: true });
  app.quit();
});
// Linked Call Activities may only open BPMN XML files.  The renderer receives
// file content, never unrestricted filesystem access.
ipcMain.handle('file:open-linked-bpmn', async (_, source) => {
  const target = String(source || '');
  if (!/\.(bpmn|xml)$/i.test(target)) return { error: 'invalid' };
  try {
    const content = await fs.readFile(target, 'utf8');
    if (!/<(?:[\w.-]+:)?definitions\b/.test(content)) return { error: 'invalid' };
    return { path: target, content };
  } catch { return { error: 'missing' }; }
});
ipcMain.handle('file:open-linked-dmn', async (_, source) => {
  const target = String(source || '');
  if (!/\.dmn$/i.test(target)) return { error: 'invalid' };
  try {
    const content = await fs.readFile(target, 'utf8');
    if (!/<(?:[\w.-]+:)?definitions\b/.test(content)) return { error: 'invalid' };
    return { path: target, content };
  } catch { return { error: 'missing' }; }
});
ipcMain.handle('file:open-linked-cmmn', async (_, source) => {
  const target = String(source || '');
  if (!/\.cmmn$/i.test(target)) return { error: 'invalid' };
  try { const content = await fs.readFile(target, 'utf8'); return /<(?:[\w.-]+:)?definitions\b/.test(content) ? { path: target, content } : { error: 'invalid' }; } catch { return { error: 'missing' }; }
});
function recentModelsFile() { return path.join(app.getPath('userData'), 'recent-models.json'); }
ipcMain.handle('recent-models:get', async () => {
  try { const models = JSON.parse(await fs.readFile(recentModelsFile(), 'utf8')); return Array.isArray(models) ? models.filter(model => model && ['bpmn', 'dmn', 'cmmn'].includes(model.type) && typeof model.path === 'string').slice(0, 12) : []; } catch { return []; }
});
ipcMain.handle('recent-models:record', async (_, model) => {
  if (!model || !['bpmn', 'dmn', 'cmmn'].includes(model.type) || typeof model.path !== 'string' || !path.isAbsolute(model.path)) return [];
  let models = []; try { models = JSON.parse(await fs.readFile(recentModelsFile(), 'utf8')); } catch { /* Start with an empty history. */ }
  const entry = { type: model.type, path: model.path, title: path.basename(model.path) };
  const next = [entry, ...(Array.isArray(models) ? models : []).filter(item => item?.path !== entry.path)].slice(0, 12);
  await fs.mkdir(app.getPath('userData'), { recursive: true }); await fs.writeFile(recentModelsFile(), JSON.stringify(next, null, 2), 'utf8'); return next;
});
// Kogito only lists included models that were supplied as editor resources.
// Limit this API to sibling DMN files of the opened model; the renderer never
// receives directory access or arbitrary file content.
const isDmnDefinitions = content => /<(?:[\w.-]+:)?definitions\b[^>]*\bnamespace\s*=/.test(content);
ipcMain.handle('file:load-dmn-resources', async (_, source) => {
  const target = String(source || '');
  if (!path.isAbsolute(target) || !/\.dmn$/i.test(target)) return [];
  try {
    const directory = path.dirname(target); const active = path.resolve(target);
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const candidates = entries.filter(entry => entry.isFile() && /\.dmn$/i.test(entry.name) && path.resolve(directory, entry.name) !== active).sort((left, right) => left.name.localeCompare(right.name));
    return (await Promise.all(candidates.map(async entry => {
      const content = await fs.readFile(path.join(directory, entry.name), 'utf8');
      return isDmnDefinitions(content) ? { name: entry.name, content } : null;
    }))).filter(Boolean);
  } catch { return []; }
});
ipcMain.handle('file:select-dmn-resources', async (event, source) => {
  const active = String(source || '');
  if (!path.isAbsolute(active) || !/\.dmn$/i.test(active)) return { models: [], error: 'dmnIncludes.saveModelFirst' };
  const owner = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(owner, { defaultPath: path.dirname(active), properties: ['openFile', 'multiSelections'], filters: [{ name: t('file.dmn'), extensions: ['dmn'] }] });
  if (result.canceled) return { models: [] };
  if (result.filePaths.some(file => path.dirname(file) !== path.dirname(active))) return { models: [], error: 'dmnIncludes.sameDirectory' };
  const selected = [...new Map(result.filePaths.filter(file => path.resolve(file) !== path.resolve(active)).map(file => [path.basename(file).toLocaleLowerCase(), file])).values()];
  const models = await Promise.all(selected.map(async file => ({ name: path.basename(file), content: await fs.readFile(file, 'utf8') })));
  if (models.some(model => !isDmnDefinitions(model.content))) return { models: [], error: 'dmnIncludes.invalidModel' };
  return { models };
});
ipcMain.handle('file:linked-svg-exists', async (_, source) => {
  const target = String(source || '').replace(/\.(bpmn|xml)$/i, '.svg');
  try { await fs.access(target); return true; } catch { return false; }
});

function runnerDirectory() {
  return app.isPackaged ? path.join(process.resourcesPath, 'dmn-runner') : path.join(__dirname, '../dmn-runner/dist');
}

function bundledHelpDirectory() {
  return path.join(app.getAppPath(), isDev ? 'public' : 'dist', 'help');
}

async function helpDirectory() {
  const target = path.join(app.getPath('userData'), 'help');
  try { await fs.access(target); } catch {
    try { await fs.cp(bundledHelpDirectory(), target, { recursive: true }); }
    // Reading bundled help from app.asar remains available when copying it to
    // the user profile is unavailable, for example on a restricted profile.
    catch { await fs.mkdir(target, { recursive: true }).catch(() => {}); }
  }
  return target;
}

async function helpJsonFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => entry.isDirectory() ? helpJsonFiles(path.join(directory, entry.name)) : entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json' ? [path.join(directory, entry.name)] : []));
  return files.flat();
}

async function readHelpEntries(directory) {
  try {
    const files = await helpJsonFiles(directory);
    return (await Promise.all(files.map(async file => {
      try {
        const source = JSON.parse(await fs.readFile(file, 'utf8'));
        return (Array.isArray(source) ? source : []).map(entry => ({ ...entry, language: entry?.language || path.basename(path.dirname(file)) }));
      } catch { return []; }
    }))).flat();
  } catch { return []; }
}

// Help files are user-owned configuration.  Only JSON entries matching the
// documented minimal shape reach the renderer; invalid additions are ignored.
// Bundled defaults supplement older user directories but never replace an
// entry with the same language and id supplied by the user.
ipcMain.handle('help:load', async () => {
  const directory = await helpDirectory(); const localEntries = await readHelpEntries(directory); const bundledEntries = await readHelpEntries(bundledHelpDirectory());
  const localKeys = new Set(localEntries.map(entry => `${String(entry?.language || '').toLowerCase()}:${String(entry?.id || entry?.title || '')}`));
  const entries = [...localEntries, ...bundledEntries.filter(entry => !localKeys.has(`${String(entry?.language || '').toLowerCase()}:${String(entry?.id || entry?.title || '')}`))];
  return entries.filter(entry => entry && typeof entry === 'object' && typeof entry.title === 'string' && typeof entry.content === 'string' && Array.isArray(entry.keywords) && entry.keywords.some(keyword => typeof keyword === 'string' && keyword.trim()));
});
ipcMain.handle('help:image', async (_, source) => {
  const directory = await helpDirectory(); const relative = String(source || '').replace(/\\/g, '/');
  if (!relative.startsWith('images/') || relative.includes('..')) return '';
  for (const root of [directory, bundledHelpDirectory()]) {
    const target = path.resolve(root, relative); const imageDirectory = `${path.resolve(root, 'images')}${path.sep}`;
    if (!target.startsWith(imageDirectory)) continue;
    try { const data = await fs.readFile(target); const extension = path.extname(target).toLowerCase(); const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[extension]; if (mime) return `data:${mime};base64,${data.toString('base64')}`; } catch { /* Try the bundled image next. */ }
  }
  return '';
});
// Example models stay inside the dedicated help folder. This keeps filesystem
// access in the main process while allowing maintainers to add model examples.
async function readHelpExamples(directory) {
  try {
    const root = path.join(directory, 'examples');
    const collect = async (current, relative = '') => (await Promise.all((await fs.readdir(current, { withFileTypes: true })).map(entry => entry.isDirectory() ? collect(path.join(current, entry.name), path.join(relative, entry.name)) : [path.join(relative, entry.name)]))).flat();
    return (await Promise.all((await collect(root)).map(async name => {
      const match = name.match(/^(.*)\.(bpmn|dmn|cmmn)$/i); const target = path.join(root, name);
      if (!match) return { type: 'external', title: path.basename(name), name };
      const content = await fs.readFile(target, 'utf8');
      return /<(?:[\w.-]+:)?definitions\b/.test(content) ? { type: match[2].toLowerCase(), title: path.basename(match[1]), name, content } : null;
    }))).filter(Boolean);
  } catch { return []; }
}
ipcMain.handle('help:examples', async () => {
  const directory = await helpDirectory(); const local = await readHelpExamples(directory); const names = new Set(local.map(example => `${example.type}:${example.title}`));
  return [...local, ...(await readHelpExamples(bundledHelpDirectory())).filter(example => !names.has(`${example.type}:${example.title}`))];
});
ipcMain.handle('help:open-example', async (_, example) => {
  const name = String(example?.name || '').replace(/\\/g, '/');
  if (!name || name.includes('..') || path.isAbsolute(name)) return null;
  for (const root of [await helpDirectory(), bundledHelpDirectory()]) {
    const examplesRoot = path.resolve(root, 'examples'); const target = path.resolve(examplesRoot, name);
    if (!target.startsWith(`${examplesRoot}${path.sep}`)) continue;
    try {
      if (['bpmn', 'dmn', 'cmmn'].includes(example?.type)) {
        const content = await fs.readFile(target, 'utf8'); const type = path.extname(name).slice(1).toLowerCase();
        if (type === example.type && /<(?:[\w.-]+:)?definitions\b/.test(content)) return { type, title: path.basename(name, path.extname(name)), content };
      } else if (example?.type === 'external') {
        await shell.openPath(target); return null;
      }
    } catch { /* Try the bundled examples directory next. */ }
  }
  return null;
});

function startDmnRunner() {
  if (dmnRunner) return dmnRunner;
  const directory = runnerDirectory(); const java = path.join(directory, 'runtime', 'bin', process.platform === 'win32' ? 'java.exe' : 'java'); const classPath = path.join(directory, 'lib', '*');
  if (!fsSync.existsSync(java)) return Promise.reject(new Error('dmnTests.error.runnerUnavailable'));
  dmnRunner = loadDmnRunnerConfig(app.getPath('userData')).then(({ port, token }) => new Promise((resolve, reject) => {
    const process = spawn(java, ['--add-modules', 'jdk.httpserver', '-cp', classPath, 'de.bpmmodeler.dmnrunner.Main', '--port', String(port), '--token', token], { cwd: directory, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = ''; let runnerReady = false;
    const fail = error => { clearTimeout(timeout); if (!runnerReady) { dmnRunner = undefined; process.kill(); reject(error); } };
    const timeout = setTimeout(() => fail(new Error('dmnTests.error.runnerUnavailable')), 10000);
    process.once('error', fail);
    process.stdout.on('data', chunk => { output += chunk; try { const ready = JSON.parse(output); runnerReady = true; clearTimeout(timeout); resolve({ process, token, endpoint: `http://127.0.0.1:${ready.port}` }); } catch { /* The runner may write the JSON response in more than one chunk. */ } });
    process.once('exit', () => { if (!runnerReady) fail(new Error('dmnTests.error.runnerUnavailable')); dmnRunner = undefined; });
  })).catch(error => { dmnRunner = undefined; throw error; });
  return dmnRunner;
}

// The runner and its JRE are packaged with the application. The renderer never
// gets a process API and cannot select an executable or pass arbitrary arguments.
ipcMain.handle('dmn:activate', () => startDmnRunner());
ipcMain.handle('dmn:evaluate', async (_, input) => {
  if (!input || typeof input.dmnXml !== 'string' || !input.inputs || typeof input.inputs !== 'object' || Array.isArray(input.inputs)) throw new Error('dmnTests.error.invalidRequest');
  const runner = await startDmnRunner();
  const response = await fetch(`${runner.endpoint}/api/dmn/evaluate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${runner.token}` }, body: JSON.stringify(input) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'dmnTests.error.executionFailed');
  return body;
});
ipcMain.on('menu:state', (_, state) => { menuState = { ...menuState, ...state }; installApplicationMenu(); });
ipcMain.on('bpmn:context-menu', (event, position) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || menuState.activeModel !== 'bpmn') return;
  Menu.buildFromTemplate([
    { label: t('menu.color'), enabled: menuState.bpmnSelection, submenu: [
      ...['red', 'blue', 'green', 'yellow', 'orange'].map(color => ({ label: t(`color.${color}`), accelerator: `CmdOrCtrl+Shift+${color[0].toUpperCase()}`, enabled: menuState.bpmnSelection, click: () => sendMenuCommand(`color:${color}`, window) })),
      { type: 'separator' },
      { label: t('color.default'), accelerator: 'CmdOrCtrl+Shift+U', enabled: menuState.bpmnSelection, click: () => sendMenuCommand('restore-color', window) }
    ] },
    { type: 'separator' },
    { label: t('menu.copy'), accelerator: 'CmdOrCtrl+C', click: () => sendMenuCommand('copy-bpmn', window) },
    { label: t('menu.cut'), accelerator: 'CmdOrCtrl+X', click: () => sendMenuCommand('cut-bpmn', window) },
    { label: t('menu.paste'), accelerator: 'CmdOrCtrl+V', enabled: menuState.bpmnClipboard, click: () => sendMenuCommand('paste-bpmn', window) }
  ]).popup({ window, x: Math.round(position?.x || 0), y: Math.round(position?.y || 0) });
});
ipcMain.on('cmmn:context-menu', (event, position) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || menuState.activeModel !== 'cmmn') return;
  Menu.buildFromTemplate([
    { label: t('menu.color'), enabled: menuState.cmmnSelection, submenu: [...['red', 'blue', 'green', 'yellow', 'orange'].map(color => ({ label: t(`color.${color}`), accelerator: `CmdOrCtrl+Shift+${color[0].toUpperCase()}`, enabled: menuState.cmmnSelection, click: () => sendMenuCommand(`color:${color}`, window) })), { type: 'separator' }, { label: t('color.default'), accelerator: 'CmdOrCtrl+Shift+U', enabled: menuState.cmmnSelection, click: () => sendMenuCommand('restore-color', window) }] },
    { type: 'separator' },
    { label: t('menu.copy'), accelerator: 'CmdOrCtrl+C', enabled: menuState.cmmnSelection, click: () => sendMenuCommand('copy-cmmn', window) },
    { label: t('menu.cut'), accelerator: 'CmdOrCtrl+X', enabled: menuState.cmmnSelection, click: () => sendMenuCommand('cut-cmmn', window) },
    { label: t('menu.paste'), accelerator: 'CmdOrCtrl+V', enabled: menuState.cmmnClipboard, click: () => sendMenuCommand('paste-cmmn', window) }
  ]).popup({ window, x: Math.round(position?.x || 0), y: Math.round(position?.y || 0) });
});
ipcMain.handle('language:get', () => menuState.language);
ipcMain.on('language:set', (_, language) => { menuState.language = resolveLanguage(language); installApplicationMenu(); });
ipcMain.handle('onboarding:get', () => menuState.onboardingHintsEnabled);
ipcMain.handle('onboarding:set', async (_, enabled) => {
  menuState.onboardingHintsEnabled = Boolean(enabled);
  try { await writeOnboardingHintsEnabled(menuState.onboardingHintsEnabled); } catch { /* Keep the session setting if a profile is read-only. */ }
  installApplicationMenu();
  return menuState.onboardingHintsEnabled;
});
