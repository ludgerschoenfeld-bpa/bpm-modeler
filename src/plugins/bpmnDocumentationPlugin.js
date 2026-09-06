import { readBpmnDocumentation } from '../bpmn.js';

// Replace this plugin to apply a different organization-specific task ordering policy.
export const bpmnDocumentationPlugin = { extract: readBpmnDocumentation };
