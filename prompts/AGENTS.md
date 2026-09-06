# Agent Instructions – BPM Modeler

## Purpose

Maintain and extend the BPM Modeler desktop application. It is an Electron, React and Vite application for BPMN and DMN modeling, local file handling and PDF documentation.

## First steps

1. Read `docs/build-and-release.md` for build, release and update instructions.
2. Read `docs/bpm-modeler-spec.md` before implementing a functional change.
3. Read `docs/architecture.md` before changing application layers, plugin integrations, Electron boundaries, or the DMN Runner.
4. Inspect the relevant port in `src/core/contracts.js` before modifying a component.
5. Keep existing user changes intact; do not use destructive Git commands such as `git reset --hard`.

## Required validation

Run these commands after any functional or dependency change:

```powershell
npm.cmd test
npm.cmd run build:renderer
```

Use `npm.cmd` on Windows when PowerShell blocks `npm.ps1`. On Linux use `npm`.

### DMN Runner rebuild rule

Rebuild the DMN Runner with `npm.cmd run build:runner` only when files in
`dmn-runner/` (including its source code, `pom.xml`, or runner build script)
have changed, or when the user explicitly requests a runner rebuild. A change
to the Electron application, React renderer, BPMN/DMN editor integration, or
documentation alone does not require rebuilding the runner. For unrelated
application changes, validate the production renderer with `npm.cmd run
build:renderer`; do not run `npm.cmd run build` solely because it would
unnecessarily rebuild the runner.

For a release package without runner changes, use the already validated runner
artifact and invoke Electron Builder separately. Run the complete `npm.cmd run
build` only when the runner rebuild rule applies or when explicitly requested.

For changes to Electron file operations, BPMN/DMN editing, PDF exports or packaging, also perform the relevant manual smoke tests from `docs/build-and-release.md`.

## Build and packaging workflow

Treat a distributable package as a release artifact, not as a renderer build. Follow this sequence for every installer build and update this section and `docs/build-and-release.md` when the sequence, files, tools or checks change.

1. Work on a feature branch and preserve unrelated working-tree changes.
2. On the target operating system, verify Node.js, Maven and an OpenJDK 17 JDK with `jdeps` and `jlink`. `JAVA_HOME` must point to that JDK. Use an OpenJDK distribution licensed under GPLv2 with the Classpath Exception; Eclipse Temurin is the recommended release-build distribution.
3. Install the locked Node dependencies with `npm.cmd install` on Windows or `npm install` on Linux/macOS (use the corresponding `ci` command in CI). Do not change dependencies as an incidental packaging step.
4. Run `npm.cmd test` on Windows or `npm test` on Linux/macOS. Resolve every failure before packaging.
5. Build on the target platform. When the DMN Runner rebuild rule applies, use `npm.cmd run build:with-runner` on Windows, `npm run package:linux:with-runner` on Linux, or `npm run package:mac:with-runner` on macOS. Each command builds the renderer, rebuilds the runner, and invokes Electron Builder for its target. Otherwise use `npm.cmd run build` on Windows, `npm run package:linux` on Linux, or `npm run package:mac` on macOS; these commands package the already validated runner artifact.
6. Do not use `dist/` as Electron Builder's output directory. It is the renderer input and is configured through `build.directories.output = "release"` in `package.json`. Using the same directory for both corrupts or removes packaging inputs.
7. `build:runner` removes and regenerates `dmn-runner/dist/`, runs Maven, copies all runtime dependencies and the project JAR into `dmn-runner/dist/lib/`, determines required Java modules with `jdeps`, then creates `dmn-runner/dist/runtime/` using `jlink`. The JAR copy is required: without it the packaged Java process cannot find `de.bpmmodeler.dmnrunner.Main`.
8. Build the JRE on the same operating system and CPU architecture as the package. `jlink` output is platform-specific; do not reuse a Windows runtime for Linux or macOS.
9. Confirm the expected artifacts for the target platform exist in `release/`: on Windows the NSIS installer `BPM Modeler <VERSION>.exe`, its `.blockmap`, `latest.yml`, and `win-unpacked/`; on Linux the AppImage, Debian package, and `linux-unpacked/`; on macOS the DMG, ZIP, and packaged `.app` bundle.
10. Confirm that the staged or unpacked application contains `dmn-runner/lib/dmn-runner-<VERSION>.jar` and `dmn-runner/runtime/bin/java` (`java.exe` on Windows). The resource root is `resources/` in the Windows/Linux unpacked application and `BPM Modeler.app/Contents/Resources/` in the macOS bundle.
11. Run the manual application smoke tests from `docs/build-and-release.md`, including opening **Tools → DMN → DMN test cases**. This must create/read the user configuration, start the runner, execute a representative test case, and stop the Java process when BPM Modeler exits.
12. Record the SHA-256 hash of every distributable package. Do not distribute a staging or unpacked directory; distribute the platform package: NSIS installer on Windows, AppImage or Debian package on Linux, and DMG or ZIP on macOS.
13. Run `npm.cmd run security:check` on Windows (or `npm run security:check` elsewhere) before every release package. The check audits distributable Node dependencies for every version. The DMN Runner Maven dependency graph becomes release-blocking from application version `1.0.0`; for `0.x` the known runner findings are intentionally deferred while the validated runner artifact is packaged and tested. Do not release `1.0.0` or later on high/critical Java findings without a documented, time-limited risk acceptance.
14. Run `npm.cmd run notices:generate` after building the runner and include `LICENSE`, `CHANGELOG.md`, and `THIRD-PARTY-NOTICES.md` in every package. Preserve license/NOTICE files embedded in the Java runtime and JARs.
15. Sign public Windows releases and sign plus notarize public macOS releases. Keep certificates, private keys, notarization credentials and signing passwords only in secured build/CI secret storage. Verify a signed package on a clean target machine and record its hash and provenance. Until `1.0.0`, an explicitly authorized internal Windows test installer may be built unsigned when no usable Authenticode certificate is available; label it `NotSigned`, record the reason and SHA-256 hash, and do not describe it as a signed or public release. Before preparing `1.0.0`, establish and test a Windows Authenticode signing process in secured CI/build storage: a certificate with the Code Signing EKU and accessible private key, timestamping, Electron Builder configuration, and clean-machine signature verification. A public `1.0.0` Windows release must not disable signing or ship with `NotSigned` status.
16. Publish to GitHub only after the responsible developer explicitly says to release. Then create an immutable `v<VERSION>` tag for the exact tested commit and create a GitHub Release draft. Upload the platform packages, `SHA256SUMS.txt`, `CHANGELOG.md`, and `THIRD-PARTY-NOTICES.md` as release assets; use the version section from `CHANGELOG.md` as the release notes. Publish only after asset names, hashes, release notes, and the target commit have been verified. Never upload installers to the Git repository itself.

If the runner build fails, run `npm.cmd run build:runner` on Windows or `npm run build:runner` on Linux/macOS by itself first. On Windows, `build.mjs` must invoke Maven through `cmd.exe` because Node cannot directly spawn a `.cmd` file. For JDK 17, use `jlink --compress=2`; `--compress=zip-6` is not accepted by JDK 17. If Electron Builder fails after the runner succeeds, inspect the platform staging output (`win-unpacked/`, `linux-unpacked/`, or the macOS `.app` bundle) and rerun the matching Electron Builder command from step 5 to isolate the packager step. After any correction, rerun the complete platform-specific test and package sequence.

## Git workflow

- Start every new feature or bug fix on its own branch. Do not implement it directly on `main`.
- Use descriptive branch names, for example `feature/dmn-pdf-tables` or `fix/bpmn-task-order`.
- Keep each branch focused on one change and include the relevant tests and documentation updates in the same branch.
- Before requesting integration, run the required automated checks and any applicable manual smoke tests.
- Merge or otherwise transfer changes to `main` only after explicit approval and test acceptance from the responsible reviewer or product owner.
- Do not commit directly to `main`, force-push shared branches, rewrite published history, or use destructive Git commands unless explicitly instructed.

## Architecture rules

The application follows ports-and-adapters principles. UI code must communicate only through the business ports defined in `src/core/contracts.js`.

| Layer | Location | Responsibility |
| --- | --- | --- |
| UI | `src/App.jsx` | User interaction; resolve and call business ports only |
| Business extraction | `src/bpmn.js`, `src/dmn.js` | Convert BPMN/DMN XML into report data |
| Ports | `src/core/contracts.js` | Technology-independent plugin contracts |
| Plugin composition | `src/plugins/registry.js`, `src/plugins/configure.js` | Register defaults and replacements |
| Technical adapters | `src/plugins/` | Isolate bpmn.io, Kogito and jsPDF APIs |
| Native desktop integration | `electron/` | Electron main process and narrow preload API |

Do not import bpmn.io, Kogito or jsPDF in `src/App.jsx`, business extraction modules or tests. Add or change those dependencies only in their dedicated adapters.

## Plugin workflow

Use an existing extension point whenever a component needs to be replaced:

- `modeler:bpmn` and `modeler:dmn`: create and operate on graphical model editors.
- `documentation:bpmn` and `documentation:dmn`: map model XML to technology-neutral report data.
- `export:pdf`: create PDF output from SVG and report data.

To add a replacement:

1. Implement every method required by the corresponding port.
2. Keep library objects inside the adapter; return only the port methods and plain data.
3. Register the replacement in `src/plugins/configure.js` before React mounts.
4. Add a test proving the required behavior and run the complete suite.

If a new category of interchangeable component is needed, define its port and extension-point constant in `src/core/contracts.js`, add registry validation, create a default adapter, and document it in `README.md`.

## BPMN rules

- Preserve BPMN XML whenever possible; do not discard namespaces or extensions during import/export.
- `readBpmnDocumentation()` reads Process/Collaboration, task and Message Flow documentation from BPMN XML.
- Task order is followed from Start Events through `sequenceFlow`; remaining tasks use deterministic XML order.
- For a mandatory order across parallel paths, introduce and document an explicit business order field instead of guessing from diagram geometry.
- Extend the supported task-type list in `src/bpmn.js` and its tests when new activity types must be documented.
- Token simulation is optional and must be enabled only through the `simulation:bpmn` port. Preserve the BPMN XML when switching it on or off, and test both states after updates to bpmn-js or the simulator.

## DMN rules

- The Kogito adapter owns all Kogito API calls such as `open`, `getContent`, `setContent` and `getPreview`.
- Keep DMN reporting XML-based so nested boxed expressions remain available for PDF rendering.
- Extend `dmnSummary()` and its tests when adding DMN constructs such as decision tables, contexts, invocations or functions.

## Electron security rules

- Keep `contextIsolation: true`.
- Expose only minimal, explicit APIs from `electron/preload.cjs`.
- Implement file-system and dialog operations in `electron/main.cjs`, not in renderer code.
- Never expose unrestricted `require`, Node.js, shell or arbitrary file-system access to the renderer.

## Code and documentation rules

- Write important technical, configuration and business-logic code comments in English.
- Update `docs/bpm-modeler-spec.md` when application requirements change. Add every newly agreed or refined functional requirement, observable behavior, omission rule and error-handling rule unless it is already covered. Each addition must state its trigger, expected behavior, optional prerequisites, behavior when data is absent, and verifiable acceptance criteria; refine existing requirements instead of duplicating them. Keep developer-process and workflow rules in this `AGENTS.md`, not in `docs/bpm-modeler-spec.md`.
- For every implemented new or refined application requirement, assess from an end-user perspective whether the local help content needs a new topic or an update to an existing topic. Apply the established help-information architecture: group content by stable functional area (`basics`, `bpmn`, `dmn`, `export`, or `administration`), keep matching DE and EN entries with the same `id`, and update images or keyboard-shortcut guidance when the observable behavior changes.
- Update `docs/build-and-release.md` when build, release, update, plugin or developer workflow changes.
- Update `docs/architecture.md` when application layers, component responsibilities, port contracts, plugin extension points, Electron security boundaries, or DMN Runner integration change.
- Add tests for new business behavior. Prefer XML fixture-based unit tests for BPMN/DMN report extraction.
- Do not modify generated `dist/` output manually.

## Dependency updates

1. Review changes with `npm.cmd outdated`.
2. Update `package.json` intentionally and commit the corresponding `package-lock.json` change.
3. Run tests and production build.
4. Manually test real BPMN and DMN files after updates to bpmn-js or Kogito.
5. Rebuild installers on Windows, Linux and macOS before publishing.
6. Run the security check for every newly added or updated dependency and before every major release (`1.0.0`, `2.0.0`, and so on). Before `1.0.0`, package the validated DMN Runner artifact and retain the Node audit; rebuild the runner only when files in `dmn-runner/` change or when an explicit rebuild is requested. Before `1.0.0`, resolve or formally assess every Java Runner finding. Review the generated third-party notice inventory and the dependency license obligations before publishing.

## Releases, versioning and support

- Agree the release version with the responsible developer before changing `package.json`. Use Semantic Versioning: breaking changes increment MAJOR, backward-compatible features MINOR, and backward-compatible fixes PATCH.
- Keep `CHANGELOG.md` user-facing and cumulative. Add changes under `Unreleased` while work is in progress; move them to the agreed version only during release preparation.
- Publish system requirements, supported operating-system versions, the support window, checksums and release notes with every release. State any security-support end date or unsupported platform clearly.
- GitHub Releases are the public distribution channel. Enable immutable releases when available and publish the SHA-256 manifest beside every installer. Treat tags and uploaded release assets as release records: never retag or replace a published asset.

For Electron major updates, explicitly review preload, sandbox and packaging behavior. For PDF library updates, test multi-page output, special characters, diagrams and nested expressions.
