# BPM Modeler – Delivery information

## Windows test release 0.1.0

Distribute exactly this file to a Windows user:

```text
release/BPM Modeler Setup 0.1.0.exe
```

The user downloads this one file, double-clicks it, follows the per-user NSIS installer wizard, and starts BPM Modeler from the Start menu or desktop shortcut. The installer already contains the frontend, application logic, DMN runner, Drools/KIE libraries, and private OpenJDK runtime. No additional ZIP archive, Java installation, or dependency file is required.

Verify the downloaded installer before distribution:

```text
SHA-256: 3B7FD417B222E788C09E1A2C993CCA2AE70FE68146E68933C0EF8EE72182BBDD
```

In PowerShell, a recipient can verify it with:

```powershell
Get-FileHash -Algorithm SHA256 ".\BPM Modeler Setup 0.1.0.exe"
```

## Do not distribute these files for a manual test installation

- `release/win-unpacked/` is only for diagnostics and non-installing smoke tests.
- `release/BPM Modeler Setup 0.1.0.exe.blockmap` and `release/latest.yml` are release-update metadata; they are not needed without a configured auto-update service.
- `dist/` is the renderer build input, not an installer.
- `dmn-runner/dist/` is the packaging input, not a separate user download.

## Linux and macOS

This build produced a Windows installer only. Build on Linux to distribute the AppImage or Debian package, and build on macOS to distribute the DMG. See `README.md` for the respective package commands and installation steps.
