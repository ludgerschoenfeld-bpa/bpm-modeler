[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$runnerRoot = $PSScriptRoot
$outputDirectory = Join-Path $runnerRoot 'dist'
$libraryDirectory = Join-Path $outputDirectory 'lib'
$runtimeDirectory = Join-Path $outputDirectory 'runtime'

# This script is a release-build step. It creates everything the desktop
# application needs at runtime: the runner, the complete Drools dependency
# closure and a private Java runtime. No user-time download is involved.
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
  throw 'Maven 3.8.6 or later is required to build the bundled DMN runner.'
}
if (-not $env:JAVA_HOME) {
  throw 'JAVA_HOME must point to a JDK 17 installation that includes jdeps and jlink.'
}

$jdeps = Join-Path $env:JAVA_HOME 'bin\jdeps.exe'
$jlink = Join-Path $env:JAVA_HOME 'bin\jlink.exe'
if (-not (Test-Path -LiteralPath $jdeps) -or -not (Test-Path -LiteralPath $jlink)) {
  throw 'JAVA_HOME must point to a full JDK 17 installation that includes jdeps and jlink.'
}

& mvn -B -f (Join-Path $runnerRoot 'pom.xml') clean package
if ($LASTEXITCODE -ne 0) { throw 'Maven could not build the DMN runner.' }

$runnerJar = Get-ChildItem -LiteralPath (Join-Path $runnerRoot 'target') -Filter 'dmn-runner-*.jar' |
  Where-Object { $_.Name -notmatch '(sources|javadoc)' } |
  Select-Object -First 1
if (-not $runnerJar) { throw 'The DMN runner JAR was not produced by Maven.' }

New-Item -ItemType Directory -Force -Path $libraryDirectory | Out-Null
Copy-Item -LiteralPath $runnerJar.FullName -Destination (Join-Path $libraryDirectory $runnerJar.Name) -Force

# jdeps determines the smallest standard-Java module set required by the runner
# and all bundled libraries. --bind-services keeps Java service providers used
# by Drools available in the private runtime.
$moduleList = (& $jdeps --multi-release 17 --ignore-missing-deps --print-module-deps --class-path "$libraryDirectory\*" $runnerJar.FullName).Trim()
if (-not $moduleList) { throw 'jdeps could not determine the Java modules required by the DMN runner.' }
if (Test-Path -LiteralPath $runtimeDirectory) { Remove-Item -LiteralPath $runtimeDirectory -Recurse -Force }
& $jlink --add-modules $moduleList --bind-services --strip-debug --no-man-pages --no-header-files --compress=2 --output $runtimeDirectory
if ($LASTEXITCODE -ne 0) { throw 'jlink could not create the private Java runtime.' }

Write-Host "Bundled DMN runner created in $outputDirectory"
