import { exportBpmnPdf, exportDmnPdf } from '../pdf.js';

// This adapter contains the concrete jsPDF dependency behind the PDF export port.
export const jsPdfExportPlugin = {
  exportBpmn: ({ svg, subprocesses, documentation, language, footer, timestamp, lastUpdateLabel, filename, processScopeTitle, processScopeQuestions, highLevelActivityLabels, subprocessLabel }) => exportBpmnPdf(svg, documentation, language, footer, processScopeTitle, processScopeQuestions, timestamp, lastUpdateLabel, filename, subprocesses, subprocessLabel, highLevelActivityLabels),
  exportDmn: ({ svg, documentation, language, footer, timestamp, lastUpdateLabel, filename, testSuite, labels }) => exportDmnPdf(svg, documentation, language, footer, timestamp, lastUpdateLabel, filename, testSuite, labels),
  // CMMN has no BPMN collaboration scope. Its case metadata would otherwise
  // be rendered with the misleading "Collaboration" heading in the shared PDF layout.
  exportCmmn: ({ svg, documentation, language, footer, timestamp, lastUpdateLabel, filename }) => exportBpmnPdf(svg, { ...documentation, scope: [] }, language, footer, undefined, undefined, timestamp, lastUpdateLabel, filename)
};
