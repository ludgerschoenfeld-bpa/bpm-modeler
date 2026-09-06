/**
 * Plugin extension points used by the application.
 *
 * A modeler plugin owns a concrete editor library and exposes only XML, SVG and
 * lifecycle operations. A documentation plugin maps XML to business report data.
 * An export plugin turns this report data into an output artifact. UI code must
 * never import bpmn.io, Kogito or jsPDF directly.
 */
export const extensionPoints = Object.freeze({
  BPMN_MODELER: 'modeler:bpmn',
  BPMN_SIMULATION: 'simulation:bpmn',
  DMN_MODELER: 'modeler:dmn',
  CMMN_MODELER: 'modeler:cmmn',
  DMN_EVALUATOR: 'evaluation:dmn',
  BPMN_DOCUMENTATION: 'documentation:bpmn',
  DMN_DOCUMENTATION: 'documentation:dmn',
  CMMN_DOCUMENTATION: 'documentation:cmmn',
  PDF_EXPORT: 'export:pdf',
  HELP_CONTENT: 'content:help'
});

/** @typedef {{ load(xml: string): Promise<void>, serialize(): Promise<string>, previewSvg(): Promise<string>, previewDocumentationSvgs(): Promise<{ process: string, subprocesses: { name: string, svg: string }[] }>, getCallActivityLinks(): { id: string, path: string }[], setCallActivityLink(id: string, path: string, type?: string): Promise<void>, setModelLink(id: string, path: string, type: 'bpmn'|'dmn'|'cmmn'): Promise<void>, activateSimulation?(): void, fitViewport(): void, hasElements(): boolean, colorSelected(color: string): Promise<boolean>, restoreSelectedColor(): Promise<boolean>, copySelected(): void, cutSelected(): void, paste(): void, getProcessDocumentation(): Promise<string>, setProcessDocumentation(documentation: string): Promise<void>, destroy(): void }} ModelerPort */
/** @typedef {{ createEmptyModel(): string, createEditor(container: Element, options?: { initialContent?: string, resources?: { name: string, content: string }[], featureSessions?: object[], propertiesContainer?: Element, onContentChanged?: (xml: string) => void, onError?: (error: Error) => void, onSelectionChanged?: (hasSelection: boolean) => void, onLinkedElementSelected?: (link: { id: string, name: string, path: string, type: 'bpmn'|'dmn'|'cmmn' }) => void, onModelLinkEditRequested?: (link: { id: string, name: string, path: string, type: 'bpmn'|'dmn'|'cmmn' }) => void, linkControlLabel?: string }): Promise<ModelerPort> }} ModelerPlugin */
/** @typedef {{ activate(): Promise<void>, evaluate(input: { dmnXml: string, inputs: Record<string, unknown> }): Promise<{ decisions: { id?: string, name: string, value: unknown, status?: string }[], messages?: { severity: 'error'|'warning', decision?: string, message: string }[] }> }} DmnEvaluatorPlugin */
/** @typedef {{ isEnabled(): boolean, setEnabled(enabled: boolean): void, getAdditionalModules(): object[] }} BpmnSimulationSession */
/** @typedef {{ createSession(): BpmnSimulationSession }} BpmnSimulationPlugin */
/** @typedef {{ extract(xml: string): object }} DocumentationPlugin */
/** @typedef {{ exportBpmn(input: { svg: string, documentation: object, subprocesses?: { name: string, svg: string }[], language?: string, footer?: string, timestamp?: string, lastUpdateLabel?: string, filename?: string, processScopeTitle?: string, processScopeQuestions?: string[], highLevelActivityLabels?: object, subprocessLabel?: string }): Promise<void>, exportDmn(input: { svg: string, documentation: object, language?: string, footer?: string, timestamp?: string, lastUpdateLabel?: string, filename?: string, testSuite?: object, labels?: object }): Promise<void>, exportCmmn(input: { svg: string, documentation: object, language?: string, footer?: string, timestamp?: string, lastUpdateLabel?: string, filename?: string }): Promise<void> }} PdfExportPlugin */
/** @typedef {{ load(): Promise<{ id: string, language: string, title: string, content: string, keywords: string[], onboarding?: 'bpmn'|'dmn'|'cmmn' }[]>, image(source: string): Promise<string>, loadExamples(): Promise<{ type: 'bpmn'|'dmn'|'cmmn'|'external', title: string, name: string, content?: string }[]>, openExample(example: { type: string, name: string, content?: string }): Promise<{ type: 'bpmn'|'dmn'|'cmmn', title: string, content: string }|null> }} HelpContentPlugin */
