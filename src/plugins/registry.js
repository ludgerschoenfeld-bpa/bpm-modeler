import { extensionPoints } from '../core/contracts.js';
import { bpmnIoPlugin } from './bpmnIoPlugin.js';
import { tokenSimulationPlugin } from './tokenSimulationPlugin.js';
import { kogitoDmnPlugin } from './kogitoDmnPlugin.js';
import { cmmnIoPlugin } from './cmmnIoPlugin.js';
import { droolsDmnEvaluatorPlugin } from './droolsDmnEvaluatorPlugin.js';
import { bpmnDocumentationPlugin } from './bpmnDocumentationPlugin.js';
import { dmnDocumentationPlugin } from './dmnDocumentationPlugin.js';
import { cmmnDocumentationPlugin } from './cmmnDocumentationPlugin.js';
import { jsPdfExportPlugin } from './jsPdfExportPlugin.js';
import { helpContentPlugin } from './helpContentPlugin.js';

const implementations = new Map();

function assertPluginContract(extensionPoint, plugin) {
  const requires = extensionPoint.startsWith('modeler:') ? ['createEmptyModel', 'createEditor']
    : extensionPoint === extensionPoints.DMN_EVALUATOR ? ['activate', 'evaluate']
    : extensionPoint === extensionPoints.BPMN_SIMULATION ? ['createSession']
    : extensionPoint.startsWith('documentation:') ? ['extract']
      : extensionPoint === extensionPoints.HELP_CONTENT ? ['load', 'image', 'loadExamples', 'openExample']
      : ['exportBpmn', 'exportDmn', 'exportCmmn'];
  const missing = requires.filter(name => typeof plugin[name] !== 'function');
  if (missing.length) throw new Error(`Plugin for ${extensionPoint} is missing: ${missing.join(', ')}`);
}

// Registering happens at application composition time. A deployment can replace a
// component by registering another implementation for the same extension point.
export function registerPlugin(extensionPoint, plugin) {
  if (!Object.values(extensionPoints).includes(extensionPoint)) throw new Error(`Unknown extension point: ${extensionPoint}`);
  if (!plugin) throw new Error(`Missing plugin for ${extensionPoint}`);
  // Fail fast when a replacement adapter does not honor the business port.
  assertPluginContract(extensionPoint, plugin);
  implementations.set(extensionPoint, plugin);
}

export function resolvePlugin(extensionPoint) {
  const plugin = implementations.get(extensionPoint);
  if (!plugin) throw new Error(`No plugin registered for ${extensionPoint}`);
  return plugin;
}

// Default adapters. Replace these registrations in a custom application bootstrap.
registerPlugin(extensionPoints.BPMN_MODELER, bpmnIoPlugin);
registerPlugin(extensionPoints.BPMN_SIMULATION, tokenSimulationPlugin);
registerPlugin(extensionPoints.DMN_MODELER, kogitoDmnPlugin);
registerPlugin(extensionPoints.CMMN_MODELER, cmmnIoPlugin);
registerPlugin(extensionPoints.DMN_EVALUATOR, droolsDmnEvaluatorPlugin);
registerPlugin(extensionPoints.BPMN_DOCUMENTATION, bpmnDocumentationPlugin);
registerPlugin(extensionPoints.DMN_DOCUMENTATION, dmnDocumentationPlugin);
registerPlugin(extensionPoints.CMMN_DOCUMENTATION, cmmnDocumentationPlugin);
registerPlugin(extensionPoints.PDF_EXPORT, jsPdfExportPlugin);
registerPlugin(extensionPoints.HELP_CONTENT, helpContentPlugin);
