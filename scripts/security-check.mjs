import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';

const command = (name, args) => {
  const result = spawnSync(process.platform === 'win32' ? `${name}.cmd` : name, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
};

// Scan distributable Node dependencies and the Java runner dependency graph.
// Releases stop on high/critical findings; documented, time-limited exceptions
// belong in the release record, never in a silently ignored build result.
command('npm', ['audit', '--omit=dev', '--audit-level=high']);
const packageInfo = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
const major = Number.parseInt(packageInfo.version.split('.')[0], 10);
if (major >= 1) {
  command('mvn', ['-f', 'dmn-runner/pom.xml', 'org.owasp:dependency-check-maven:12.1.0:check', '-Dformat=HTML', '-DfailBuildOnCVSS=7']);
} else {
  console.warn(`Java runner vulnerability enforcement is deferred until 1.0.0 (current application version: ${packageInfo.version}).`);
}
