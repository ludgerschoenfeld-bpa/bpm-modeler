import BpmnModeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel/dist/bpmn-js-properties-panel.umd.js';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import '@bpmn-io/properties-panel/assets/properties-panel.css';

// This adapter is the only location coupled to bpmn.io APIs.
const emptyBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpm-modeler.local">
  <bpmn:process id="Process_1" name="Neuer Prozess" isExecutable="false"><bpmn:startEvent id="StartEvent_1" name="Start" /></bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_1"><bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_1"><bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="170" y="100" width="36" height="36" /></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export const bpmnElementColors = Object.freeze({
  red: { fill: '#F8D7DA', stroke: '#C62828' },
  blue: { fill: '#DCEEFF', stroke: '#1565C0' },
  green: { fill: '#DDF3E4', stroke: '#2E7D32' },
  yellow: { fill: '#FFF5C2', stroke: '#B8860B' },
  orange: { fill: '#FFE2C2', stroke: '#E65100' }
});

// Colors are kept in standard BPMN extensionElements. BPMN tools that do not
// know this optional namespace ignore it while still loading the complete model.
const colorModdleExtension = {
  name: 'BPM Modeler color extension',
  uri: 'https://bpm-modeler.local/schema/bpmn-color/1.0',
  prefix: 'bpmc',
  xml: { tagAlias: 'lowerCase' },
  types: [{ name: 'Color', superClass: ['Element'], properties: [{ name: 'value', isBody: true, type: 'String' }] }]
};
// This optional extension stores local desktop navigation only.  Standard BPMN
// editors ignore unknown extension elements and retain the original process.
const callLinkModdleExtension = {
  // Keep the URI stable: BPMN files created before 0.1.8 already contain it.
  // `bpml` remains the general BPM Modeler prefix for optional extensions.
  name: 'BPM Modeler extension', uri: 'https://bpm-modeler.local/schema/call-link/1.0', prefix: 'bpml', xml: { tagAlias: 'lowerCase' },
  types: [
    { name: 'CallActivityLink', superClass: ['Element'], properties: [{ name: 'path', type: 'String', isAttr: true }, { name: 'type', type: 'String', isAttr: true }] },
    { name: 'BusinessRuleTaskLink', superClass: ['Element'], properties: [{ name: 'path', type: 'String', isAttr: true }] }
  ]
};

export const bpmnIoPlugin = {
  createEmptyModel: () => emptyBpmn,
  async createEditor(container, { featureSessions = [], propertiesContainer, onContentChanged, onSelectionChanged, onLinkedElementSelected } = {}) {
    // Feature sessions are technology-neutral to the UI. This adapter translates
    // their optional modules into the bpmn-js construction configuration.
    const additionalModules = [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, ...featureSessions.flatMap(session => session.getAdditionalModules?.() || [])];
    const modeler = new BpmnModeler({
      container,
      additionalModules,
      moddleExtensions: { bpmModelerColor: colorModdleExtension, bpmModelerCallLink: callLinkModdleExtension },
      ...(propertiesContainer ? { propertiesPanel: { parent: propertiesContainer } } : {})
    });
    const eventBus = modeler.get('eventBus');
    const notifyContentChanged = () => onContentChanged?.();
    eventBus.on('commandStack.changed', notifyContentChanged);
    const linkFor = businessObject => businessObject?.extensionElements?.values?.find(value => value.$type === (businessObject?.$type === 'bpmn:BusinessRuleTask' ? 'bpml:BusinessRuleTaskLink' : 'bpml:CallActivityLink'));
    const notifySelectionChanged = event => {
      const selected = event.newSelection || []; onSelectionChanged?.(selected.length > 0);
      const element = selected.length === 1 && selected[0];
      const businessObject = element?.businessObject;
      if (['bpmn:CallActivity', 'bpmn:BusinessRuleTask'].includes(businessObject?.$type)) onLinkedElementSelected?.({ id: businessObject.id, name: businessObject.name || businessObject.id, path: linkFor(businessObject)?.path || '', type: businessObject.$type === 'bpmn:BusinessRuleTask' ? 'dmn' : linkFor(businessObject)?.type === 'cmmn' ? 'cmmn' : 'bpmn', source: 'bpmn' });
    };
    eventBus.on('selection.changed', notifySelectionChanged);
    const process = () => modeler.getDefinitions().rootElements.find(element => element.$type === 'bpmn:Process');
    const previewDocumentationSvgs = async () => {
      const canvas = modeler.get('canvas');
      const activeRoot = canvas.getRootElement();
      const roots = canvas.getRootElements();
      const topLevelRoot = roots.find(root => ['bpmn:Process', 'bpmn:Collaboration'].includes(root.businessObject?.$type));
      const subprocessRoots = roots.filter(root => root.businessObject?.$type === 'bpmn:SubProcess' && root.businessObject.flowElements?.length);
      const preview = async root => {
        canvas.setRootElement(root);
        return (await modeler.saveSVG()).svg;
      };
      try {
        const processSvg = topLevelRoot ? await preview(topLevelRoot) : (await modeler.saveSVG()).svg;
        const subprocesses = [];
        for (const root of subprocessRoots) {
          subprocesses.push({
            name: root.businessObject.name || root.businessObject.id,
            svg: await preview(root)
          });
        }
        return {
          process: processSvg,
          subprocesses
        };
      } finally {
        canvas.setRootElement(activeRoot);
      }
    };
    const transientColorDiagramIds = new Set();
    const colorExtension = element => element?.extensionElements?.values?.find(value => value.$type === 'bpmc:Color');
    const stripTransientDiagramColors = xml => {
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      transientColorDiagramIds.forEach(id => {
        const diagramElement = document.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`);
        diagramElement?.removeAttributeNS('http://bpmn.io/schema/bpmn/biocolor/1.0', 'fill');
        diagramElement?.removeAttributeNS('http://bpmn.io/schema/bpmn/biocolor/1.0', 'stroke');
        diagramElement?.removeAttributeNS('http://www.omg.org/spec/BPMN/20100524/DI', 'background-color');
        diagramElement?.removeAttributeNS('http://www.omg.org/spec/BPMN/20100524/DI', 'border-color');
      });
      return new XMLSerializer().serializeToString(document);
    };
    const applyColor = (element, color) => {
      if (!element || !color) return;
      modeler.get('modeling').setColor(element, color);
      if (element.di?.id) transientColorDiagramIds.add(element.di.id);
    };
    const restoreExtensionColors = () => {
      modeler.get('elementRegistry').getAll().filter(element => !element.labelTarget).forEach(element => {
        const color = colorExtension(element.businessObject);
        applyColor(element, bpmnElementColors[color?.value]);
      });
      modeler.get('commandStack').clear();
    };
    return {
      load: async xml => { transientColorDiagramIds.clear(); await modeler.importXML(xml); restoreExtensionColors(); },
      serialize: async () => stripTransientDiagramColors((await modeler.saveXML({ format: true })).xml),
      previewSvg: async () => (await modeler.saveSVG()).svg,
      previewDocumentationSvgs,
      getCallActivityLinks: () => modeler.get('elementRegistry').getAll().filter(element => element.businessObject?.$type === 'bpmn:CallActivity').map(element => ({ id: element.businessObject.id, path: linkFor(element.businessObject)?.path || '' })).filter(link => link.path),
      setCallActivityLink: async (id, path, type) => {
        const element = modeler.get('elementRegistry').get(id); const businessObject = element?.businessObject;
        if (!businessObject || !['bpmn:CallActivity', 'bpmn:BusinessRuleTask'].includes(businessObject.$type)) return;
        const moddle = modeler.get('moddle'); const modeling = modeler.get('modeling'); const previous = linkFor(businessObject);
        const extensionElements = businessObject.extensionElements || moddle.create('bpmn:ExtensionElements', { values: [] });
        if (!businessObject.extensionElements) modeling.updateModdleProperties(businessObject, businessObject, { extensionElements });
        const next = String(path || '').trim() ? moddle.create(businessObject.$type === 'bpmn:BusinessRuleTask' ? 'bpml:BusinessRuleTaskLink' : 'bpml:CallActivityLink', { path: String(path).trim(), ...(type ? { type } : {}) }) : null;
        modeling.updateModdleProperties(businessObject, extensionElements, { values: [...extensionElements.values.filter(value => value !== previous), ...(next ? [next] : [])] });
      },
      // Loading the simulator module and entering its simulation mode are two
      // separate bpmn-js-token-simulation operations. Keep that detail inside
      // this adapter so the UI can request the expected user-visible state.
      activateSimulation: () => modeler.get('toggleMode').toggleMode(true),
      fitViewport: () => modeler.get('canvas').zoom('fit-viewport'),
      hasElements: () => modeler.get('elementRegistry').getAll().some(element => element.type !== 'bpmn:Process' && !element.labelTarget),
      colorSelected: async colorName => {
        const color = bpmnElementColors[colorName];
        if (!color) return false;
        const moddle = modeler.get('moddle'); const modeling = modeler.get('modeling');
        const elements = modeler.get('selection').get().filter(element => element.businessObject);
        elements.forEach(element => {
          const businessObject = element.businessObject;
          const previous = colorExtension(businessObject);
          const extensionElements = businessObject.extensionElements || moddle.create('bpmn:ExtensionElements', { values: [] });
          const nextColor = moddle.create('bpmc:Color', { value: colorName });
          if (!businessObject.extensionElements) modeling.updateModdleProperties(businessObject, businessObject, { extensionElements });
          modeling.updateModdleProperties(businessObject, extensionElements, {
            values: [...extensionElements.values.filter(value => value !== previous), nextColor]
          });
          applyColor(element, color);
        });
        return elements.length > 0;
      },
      restoreSelectedColor: async () => {
        const modeling = modeler.get('modeling'); let restored = false;
        modeler.get('selection').get().forEach(element => {
          const businessObject = element.businessObject;
          const extensionElements = businessObject?.extensionElements;
          const previous = colorExtension(businessObject);
          if (!previous || !extensionElements) return;
          modeling.updateModdleProperties(businessObject, extensionElements, {
            values: extensionElements.values.filter(value => value !== previous)
          });
          applyColor(element, { fill: undefined, stroke: undefined }); restored = true;
        });
        return restored;
      },
      // bpmn-js owns its internal clipboard, so elements cannot cross the
      // BPMN/DMN adapter boundary.
      copySelected: () => modeler.get('copyPaste').copy(modeler.get('selection').get()),
      cutSelected: () => {
        const selected = modeler.get('selection').get();
        modeler.get('copyPaste').copy(selected);
        modeler.get('modeling').removeElements(selected);
      },
      paste: () => modeler.get('copyPaste').paste(),
      getProcessDocumentation: async () => process()?.documentation?.map(item => item.text || '').filter(Boolean).join('\n') || '',
      setProcessDocumentation: async documentation => {
        const target = process();
        if (!target) throw new Error('Top-level BPMN process is unavailable.');
        const entry = modeler.get('moddle').create('bpmn:Documentation', { text: documentation });
        modeler.get('modeling').updateModdleProperties(target, target, { documentation: [entry] });
      },
      destroy: () => { eventBus.off('commandStack.changed', notifyContentChanged); eventBus.off('selection.changed', notifySelectionChanged); modeler.destroy(); }
    };
  }
};
