import { spawnSync } from 'node:child_process';

const target = process.argv[2];
if (!['win', 'linux', 'mac'].includes(target)) throw new Error('Usage: node scripts/package-release.mjs <win|linux|mac>');
const command = (name, args) => {
  const result = spawnSync(process.platform === 'win32' ? `${name}.cmd` : name, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
};

command('npm', ['run', 'security:check']);
command('npm', ['run', 'build:renderer']);
command('npm', ['run', 'notices:generate']);
command('npx', ['electron-builder', `--${target}`, '--publish', 'never']);
