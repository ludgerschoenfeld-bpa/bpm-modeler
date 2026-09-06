import { describe, expect, it } from 'vitest';
import { createLicenseConsent } from '../electron/licenseConsent.cjs';

function setup({ backend = 'kwallet', available = true } = {}) {
  const files = new Map([['/app/LICENSE', 'MIT License']]);
  const app = { getAppPath: () => '/app', getPath: () => '/data', getVersion: () => '0.1.4' };
  const normalized = file => String(file).replace(/\\/g, '/');
  const fs = { readFile: async file => { const key = normalized(file); if (!files.has(key)) throw new Error('missing'); return files.get(key); }, writeFile: async (file, data) => files.set(normalized(file), data), mkdir: async () => {} };
  const safeStorage = { isEncryptionAvailable: () => available, getSelectedStorageBackend: () => backend, encryptString: value => Buffer.from(`encrypted:${value}`), decryptString: value => value.toString().replace(/^encrypted:/, '') };
  return { consent: createLicenseConsent({ app, fs, safeStorage }), files };
}

describe('license consent', () => {
  it('requires acceptance and binds it to the current license text', async () => {
    const { consent, files } = setup();
    expect((await consent.status()).accepted).toBe(false);
    await consent.accept();
    expect((await consent.status()).accepted).toBe(true);
    files.set('/app/LICENSE', 'changed license');
    expect((await consent.status()).accepted).toBe(false);
  });

  it('does not persist consent when secure OS storage is unavailable', async () => {
    const { consent } = setup({ backend: 'basic_text' });
    expect((await consent.status()).secureStorageAvailable).toBe(false);
    await expect(consent.accept()).rejects.toThrow('license.secureStorageUnavailable');
  });
});
