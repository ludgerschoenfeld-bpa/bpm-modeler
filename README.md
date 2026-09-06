# BPM Modeler

The BPM Modeler is for product teams, architects and domain experts who need to transform business‑process knowledge into innovative, maintainable digital products and use these BPMN/DMN/CMMN models seamlessly in common automation tools. It solves the challenge of designing flexible, transparent and standards‑based business process applications for new or adapted business models, enabling users to rapidly define and test process and decision logic, export consistent artifacts, and run them across platforms (Windows, macOS, Linux) while focusing on business‑model creativity rather than methodology;

BPM Modeler is a desktop application. The official Windows installer includes the DMN Runner and a private Java runtime, so normal use does not require Java or Node.js. Locally built Linux and macOS packages include the same components when they are built with the commands documented below.

## Platform status

**Windows is currently the only officially provided and tested platform.** Download the Windows installer from the project's GitHub Releases and follow the Windows installation instructions below.

Linux and macOS are supported as **build-from-source / community-support** platforms. No prebuilt, signed, or release-tested Linux or macOS installers are currently published. Users of these platforms can generate their own packages from the source code using the instructions below; feedback and contributions are welcome.

## System requirements (recommendations)

> **Note on these instructions:** These instructions were prepared with great care. No liability is assumed for errors. We gratefully welcome feedback.

| Area | Recommendation |
| --- | --- |
| Windows | Windows 10 or Windows 11, 64-bit |
| Linux | Current 64-bit desktop distribution; Debian or Ubuntu for the `.deb` |
| macOS | Current macOS version supported by Apple |
| Free storage | 1 GB recommended |
| Display | At least 1280 × 800 pixels |
| Network | Not required for modeling, saving, exports, and local DMN test cases; required only for download and package installation |

To **build from source**, Node.js 20 LTS or later (with npm), Maven 3.8.6 or later, and a full **OpenJDK 17** are required. Eclipse Temurin 17 under GPLv2 with the Classpath Exception is recommended. `JAVA_HOME` must point to this JDK; a JRE alone is not sufficient because `jdeps` and `jlink` are required.

## Installation on Windows (.exe)

> **Note on these instructions:** These instructions were prepared with great care. No liability is assumed for errors. We gratefully welcome feedback.

1. Download `BPM Modeler <VERSION>.exe` from the designated download source.
2. Double-click the file and follow the installation wizard.
3. Start BPM Modeler from the Start menu or the desktop shortcut.

The installer is installed per user and normally does not require administrator rights. Java, Maven, and Node.js do not need to be installed for use.

### Configure the DMN Runner on Windows

> **Note on these instructions:** These instructions were prepared with great care. No liability is assumed for errors. We gratefully welcome feedback.

When **Tools → DMN → DMN test cases** is opened for the first time, BPM Modeler creates `%APPDATA%\bpm-modeler-desktop\dmn-runner.json`. The Runner operates only locally on `127.0.0.1` and is stopped when BPM Modeler is closed.

Close BPM Modeler before changing the file. The secure default configuration is:

```json
{
  "port": 0,
  "token": "a-generated-unique-token"
}
```

`port: 0` automatically selects an available local port. A fixed, available port is useful only for a specific local integration. `token` is a private access token with at least 16 characters. Do not share it or expose the local port through firewall or proxy rules.

Normally, no manual entry of a token is required: when the file is first created, BPM Modeler automatically generates and enters a random UUID. For a specific local integration, you can replace the token with a new random value. Use the output value unchanged as the value of `token` in the JSON file:

```powershell
# Windows PowerShell
[guid]::NewGuid().ToString()
```

```bash
# Linux or macOS
openssl rand -hex 32
```

The configured token is the value that a local integration must use as a Bearer token. If the configuration is invalid, the dialog displays an error; after correcting the file, open the dialog again. If the file is deleted, BPM Modeler recreates it with secure default values the next time the dialog is opened.

## FAQ

### Why does DMN test-case evaluation fail when my model imports an external DMN model?

DMN test-case evaluation currently supports only self-contained DMN models. Although the Kogito editor can load and use external DMN models through **Tools → DMN → External DMN models**, the local DMN Runner receives only the active model during a test-case evaluation. It therefore cannot resolve a `dmn:import` and reports that the required import was not found. Remove the external import before running the test case, or evaluate the model in an environment that provides every imported DMN resource. Support for evaluating imported external DMN models is not yet available.

## Build Linux packages from source (Community support)

Create Linux packages on a real Linux system or in a Linux VM. In WSL 2, keep the repository in the Linux home directory rather than under `/mnt/c/...`. Install Node.js 20 LTS or later, Maven 3.8.6 or later, and a full OpenJDK 17 JDK with `jdeps` and `jlink`.

```bash
npm install
npm test
npm run package:linux:with-runner
```

The generated files are placed in `release/` as an AppImage and a Debian package. If the verified Linux DMN Runner artifact is unchanged, use `npm run package:linux` to package without rebuilding it. The Java runtime created with `jlink` is platform-specific and must not be copied from Windows or macOS.

## Build macOS packages from source (Community support)

Create macOS packages on a Mac. Install Node.js 20 LTS or later, Maven 3.8.6 or later, a full OpenJDK 17 JDK with `jdeps` and `jlink`, and the current Xcode Command Line Tools.

```bash
xcode-select --install
npm install
npm test
npm run package:mac:with-runner
```

The generated files are placed in `release/` as a DMG and ZIP archive. If the verified macOS DMN Runner artifact is unchanged, use `npm run package:mac` to package without rebuilding it. Public macOS distribution additionally requires Apple code signing and notarization.
