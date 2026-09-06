import { dmnSummary } from '../dmn.js';

// Replace this plugin to render additional DMN constructs into the report model.
export const dmnDocumentationPlugin = { extract: dmnSummary };
