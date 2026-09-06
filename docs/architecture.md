# Architecture

BPM Modeler is an Electron desktop application with a React/Vite renderer. It follows a ports-and-adapters design: application UI and business extraction code depend on technology-neutral contracts, while integrations with bpmn.io, Kogito, jsPDF and Electron are isolated in adapters.

## Component map

| Area | Location | Responsibility |
| --- | --- | --- |
| Application UI and commands | `src/App.jsx` | Model tabs plus open, save, export, and tool actions |
| BPMN business extraction | `src/bpmn.js` | BPMN documentation and order extraction |
| DMN business extraction | `src/dmn.js` | DMN data and boxed-expression extraction |
| Port contracts | `src/core/contracts.js` | Technology-neutral integration contracts |
| Plugin composition | `src/plugins/configure.js`, `src/plugins/registry.js` | Plugin registration and contract validation |
| Technical adapters | `src/plugins/` | bpmn.io, Kogito, token simulation, jsPDF, and help integration |
| Desktop integration | `electron/main.cjs` | Native dialogs, file access, runner lifecycle, and IPC handlers |
| Renderer bridge | `electron/preload.cjs` | Explicit, narrow renderer APIs |
| Local DMN evaluation | `dmn-runner/` | Packaged Drools/KIE evaluation adapter and private Java runtime |
| Tests | `test/` | Business logic and plugin-contract tests |

## Layering and boundaries

`src/App.jsx` communicates through the ports in `src/core/contracts.js`; it must not import bpmn.io, Kogito, or jsPDF directly. Adapters keep library-specific objects inside `src/plugins/` and expose only port methods and plain data.

The renderer has no unrestricted Node.js or filesystem access. `electron/preload.cjs` exposes explicit IPC-backed operations only; `electron/main.cjs` owns filesystem, dialog, and process operations. Keep Electron `contextIsolation` enabled.

The DMN Runner is a separate, local Java process. It is bundled with its Drools/KIE dependencies and a private Java runtime, accepts requests only through its authenticated loopback endpoint, and is started and stopped by the Electron main process.

## Plugin extension points

| Extension point | Required port | Default adapter |
| --- | --- | --- |
| `modeler:bpmn` | `createEmptyModel()`, `createEditor()` | `bpmnIoPlugin` |
| `simulation:bpmn` | `createSession()` | `tokenSimulationPlugin` |
| `modeler:dmn` | `createEmptyModel()`, `createEditor()` | `kogitoDmnPlugin` |
| `documentation:bpmn` / `documentation:dmn` | `extract(xml)` | XML report extractors |
| `export:pdf` | `exportBpmn()`, `exportDmn()` | `jsPdfExportPlugin` |

To replace a component, implement the complete port and register it in `src/plugins/configure.js` before the UI starts. `src/plugins/registry.js` validates required methods at registration time. A plugin must not expose library-specific objects beyond its adapter boundary.

## Architectural constraints

- Preserve BPMN and DMN XML, including namespaces and supported extensions, whenever possible.
- Keep reporting based on XML extraction so nested DMN boxed expressions remain available for documentation.
- Token simulation is an optional local visualization; it does not persist runtime state in BPMN XML and is not a workflow-engine connection.
- Package build inputs (`dist/`) and release outputs (`release/`) are separate. Do not configure Electron Builder to write to `dist/`.
