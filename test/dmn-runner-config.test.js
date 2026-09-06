import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import configuration from '../electron/dmnRunnerConfig.cjs';

const directories = [];
afterEach(async () => Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))));
const temporaryDirectory = async () => { const directory = await mkdtemp(join(tmpdir(), 'bpm-modeler-')); directories.push(directory); return directory; };

describe('DMN runner configuration', () => {
  it('creates a secure per-user configuration with an automatic port by default', async () => {
    const directory = await temporaryDirectory();
    await expect(configuration.loadDmnRunnerConfig(directory)).resolves.toMatchObject({ port: 0, token: expect.any(String) });
    await expect(readFile(join(directory, 'dmn-runner.json'), 'utf8')).resolves.toContain('"port": 0');
  });

  it('uses a valid user-selected token and port', async () => {
    const directory = await temporaryDirectory();
    await writeFile(join(directory, 'dmn-runner.json'), '{"port":8787,"token":"a-secure-user-token"}', 'utf8');
    await expect(configuration.loadDmnRunnerConfig(directory)).resolves.toEqual({ port: 8787, token: 'a-secure-user-token' });
  });

  it('rejects unsafe runner configuration values', () => {
    expect(() => configuration.validateDmnRunnerConfig({ port: -1, token: 'a-secure-user-token' })).toThrow('dmnTests.error.invalidRunnerConfiguration');
    expect(() => configuration.validateDmnRunnerConfig({ port: 8787, token: 'short' })).toThrow('dmnTests.error.invalidRunnerConfiguration');
  });
});
