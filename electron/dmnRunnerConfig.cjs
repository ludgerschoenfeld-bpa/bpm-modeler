const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

function validateDmnRunnerConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('dmnTests.error.invalidRunnerConfiguration');
  if (!Number.isInteger(value.port) || value.port < 0 || value.port > 65535) throw new Error('dmnTests.error.invalidRunnerConfiguration');
  if (typeof value.token !== 'string' || value.token.trim().length < 16) throw new Error('dmnTests.error.invalidRunnerConfiguration');
  return { port: value.port, token: value.token };
}

async function loadDmnRunnerConfig(userDataDirectory) {
  const filePath = path.join(userDataDirectory, 'dmn-runner.json');
  try {
    return validateDmnRunnerConfig(JSON.parse(await fs.readFile(filePath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const configuration = { port: 0, token: randomUUID() };
  await fs.mkdir(userDataDirectory, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(configuration, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  return configuration;
}

module.exports = { loadDmnRunnerConfig, validateDmnRunnerConfig };
