# Build and Release Guide

This guide is for maintainers who build BPM Modeler packages or prepare a release. End-user installation and DMN Runner configuration remain in the project README.

## Prerequisites

Build packages on their target operating system. Use Node.js 20 LTS or later, npm, Maven 3.8.6 or later, and a full OpenJDK 17 JDK. `JAVA_HOME` must point to that JDK, including `jdeps` and `jlink`; a JRE is not sufficient. Eclipse Temurin 17 under GPLv2 with the Classpath Exception is recommended.

Install locked Node dependencies before building. On Windows, use `npm.cmd` when PowerShell blocks `npm.ps1`; on Linux and macOS, use `npm`.

## Windows

Build the Windows package on a Windows x64 system:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build:with-runner
```

The installer is created under `release/` as `BPM Modeler <VERSION>.exe`. The `win-unpacked/` directory is only for diagnostics and must not be distributed.

Before rebuilding the Runner, verify the JDK:

```powershell
node --version
mvn.cmd --version
& "$env:JAVA_HOME\bin\jdeps.exe" --version
& "$env:JAVA_HOME\bin\jlink.exe" --version
```

If a verified Windows Runner artifact already exists and no file under `dmn-runner/` changed, package it without rebuilding the Runner:

```powershell
npm.cmd run build
```

## Linux (community support)

Build on a real Linux system or a Linux VM. In WSL 2, keep the repository in the Linux home directory rather than under `/mnt/c/...`.

```bash
npm install
npm test
npm run package:linux:with-runner
```

The generated AppImage and Debian package are placed under `release/`. To reuse an unchanged, verified Linux Runner artifact, run `npm run package:linux`.

## macOS (community support)

Build on a Mac with the current Xcode Command Line Tools, Node.js, Maven, and a full OpenJDK 17 JDK.

```bash
xcode-select --install
npm install
npm test
npm run package:mac:with-runner
```

The generated DMG and ZIP are placed under `release/`. To reuse an unchanged, verified macOS Runner artifact, run `npm run package:mac`.

## Runner and package verification

`build:runner` recreates `dmn-runner/dist/`, compiles the Java Runner, copies its runtime dependencies and JAR to `dmn-runner/dist/lib/`, and creates a private Java runtime in `dmn-runner/dist/runtime/` with `jlink`. Build this runtime on the same operating system and CPU architecture as the package.

After packaging, verify that the unpacked application contains `dmn-runner/lib/dmn-runner-<VERSION>.jar` and `dmn-runner/runtime/bin/java` (`java.exe` on Windows). Run a manual smoke test: open a DMN model, execute a representative DMN test case, and confirm that the Runner process stops when the application exits.

For every distributable package, record its SHA-256 hash. Distribute only the platform package, never an unpacked staging directory.

## Release controls

Before a release package, run the applicable tests, `security:check`, and `notices:generate`. Include `LICENSE`, `CHANGELOG.md`, and `THIRD-PARTY-NOTICES.md` in the package. Public Windows packages must be Authenticode-signed; public macOS packages must be signed and notarized.

Publish only with explicit approval. Create an immutable `v<VERSION>` tag for the tested commit and a GitHub Release draft. Upload the platform packages, `SHA256SUMS.txt`, `CHANGELOG.md`, and `THIRD-PARTY-NOTICES.md`; verify hashes, release notes, asset names, and target commit before publishing.
