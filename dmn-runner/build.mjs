import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const runnerRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDirectory = join(runnerRoot, 'dist');
const libraryDirectory = join(outputDirectory, 'lib');
const javaHome = process.env.JAVA_HOME;
const executable = name => process.platform === 'win32' ? `${name}.exe` : name;
const command = name => process.platform === 'win32' ? `${name}.cmd` : name;

function run(commandName, arguments_, captureOutput = false) {
  const isWindowsCommandScript = process.platform === 'win32' && commandName.endsWith('.cmd');
  const result = spawnSync(isWindowsCommandScript ? process.env.ComSpec : commandName, isWindowsCommandScript ? ['/d', '/s', '/c', commandName, ...arguments_] : arguments_, {
    cwd: runnerRoot,
    encoding: captureOutput ? 'utf8' : undefined,
    stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
  if (result.status === 0) return captureOutput ? result.stdout.trim() : '';
  if (captureOutput) process.stderr.write(result.stderr || result.stdout || '');
  throw new Error(`${commandName} failed.`);
}

if (!javaHome) throw new Error('JAVA_HOME must point to an OpenJDK 17 installation with GPLv2 and the Classpath Exception that includes jdeps and jlink.');
const jdeps = join(javaHome, 'bin', executable('jdeps'));
const jlink = join(javaHome, 'bin', executable('jlink'));
if (!existsSync(jdeps) || !existsSync(jlink)) throw new Error('JAVA_HOME must point to a full JDK 17 installation that includes jdeps and jlink.');

// This output is generated for the target operating system. It contains the
// complete Drools closure plus a small, private OpenJDK runtime.
rmSync(outputDirectory, { recursive: true, force: true });
run(command('mvn'), ['-B', 'clean', 'package']);
const runnerJar = join(runnerRoot, 'target', 'dmn-runner-1.0.0.jar');
if (!existsSync(runnerJar)) throw new Error('The DMN runner JAR was not produced by Maven.');
copyFileSync(runnerJar, join(libraryDirectory, 'dmn-runner-1.0.0.jar'));
const classPath = join(libraryDirectory, '*');
const moduleList = run(jdeps, ['--multi-release', '17', '--ignore-missing-deps', '--print-module-deps', '--class-path', classPath, runnerJar], true);
if (!moduleList) throw new Error('jdeps could not determine the Java modules required by the runner.');
run(jlink, ['--add-modules', moduleList, '--bind-services', '--strip-debug', '--no-man-pages', '--no-header-files', '--compress=2', '--output', join(outputDirectory, 'runtime')]);
console.log(`Bundled DMN runner created in ${outputDirectory}`);
