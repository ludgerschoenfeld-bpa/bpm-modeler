const { contextBridge, ipcRenderer } = require('electron');
const menuCommandListeners = new Set();
const pendingMenuCommands = [];

// The native menu can be used while React is still mounting. Keep early commands
// until the renderer has registered its handler instead of silently losing them.
ipcRenderer.on('menu:command', (_, command) => {
  if (menuCommandListeners.size === 0) { pendingMenuCommands.push(command); return; }
  menuCommandListeners.forEach(listener => listener(command));
});

// This is the deliberately small, audited API surface available to renderer code.
contextBridge.exposeInMainWorld('desktopFiles', {
  open: (extension) => ipcRenderer.invoke('file:open', extension),
  save: (data) => ipcRenderer.invoke('file:save', data),
  confirmClose: (name) => ipcRenderer.invoke('document:confirm-close', name),
  getLicenseStatus: () => ipcRenderer.invoke('license:status'),
  acceptLicense: () => ipcRenderer.invoke('license:accept'),
  declineLicense: () => ipcRenderer.invoke('license:decline'),
  openLinkedBpmn: (source) => ipcRenderer.invoke('file:open-linked-bpmn', source),
  openLinkedDmn: (source) => ipcRenderer.invoke('file:open-linked-dmn', source),
  openLinkedCmmn: (source) => ipcRenderer.invoke('file:open-linked-cmmn', source),
  getRecentModels: () => ipcRenderer.invoke('recent-models:get'),
  recordRecentModel: (model) => ipcRenderer.invoke('recent-models:record', model),
  loadDmnResources: (source) => ipcRenderer.invoke('file:load-dmn-resources', source),
  selectDmnResources: (source) => ipcRenderer.invoke('file:select-dmn-resources', source),
  linkedSvgExists: (source) => ipcRenderer.invoke('file:linked-svg-exists', source),
  activateDmnRunner: () => ipcRenderer.invoke('dmn:activate'),
  evaluateDmn: (input) => ipcRenderer.invoke('dmn:evaluate', input),
  getLanguage: () => ipcRenderer.invoke('language:get'),
  setLanguage: (language) => ipcRenderer.send('language:set', language),
  loadHelp: () => ipcRenderer.invoke('help:load'),
  loadHelpImage: (source) => ipcRenderer.invoke('help:image', source),
  loadHelpExamples: () => ipcRenderer.invoke('help:examples'),
  openHelpExample: (example) => ipcRenderer.invoke('help:open-example', example),
  getOnboardingHintsEnabled: () => ipcRenderer.invoke('onboarding:get'),
  setOnboardingHintsEnabled: (enabled) => ipcRenderer.invoke('onboarding:set', enabled),
  setMenuState: (state) => ipcRenderer.send('menu:state', state),
  showBpmnContextMenu: (position) => ipcRenderer.send('bpmn:context-menu', position),
  showCmmnContextMenu: (position) => ipcRenderer.send('cmmn:context-menu', position),
  onMenuCommand: (handler) => {
    menuCommandListeners.add(handler);
    pendingMenuCommands.splice(0).forEach(command => handler(command));
    return () => menuCommandListeners.delete(handler);
  }
});
