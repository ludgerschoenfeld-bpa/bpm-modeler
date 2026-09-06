const crypto = require('node:crypto');
const path = require('node:path');

function createLicenseConsent({ app, fs, safeStorage }) {
  const licenseFile = () => path.join(app.getAppPath(), 'LICENSE');
  const thirdPartyNoticeFile = () => path.join(app.getAppPath(), 'THIRD-PARTY-LICENSES.md');
  const acceptanceFile = () => path.join(app.getPath('userData'), 'license-consent.dat');
  const secureStorageAvailable = () => {
    if (!safeStorage.isEncryptionAvailable()) return false;
    return typeof safeStorage.getSelectedStorageBackend !== 'function' || safeStorage.getSelectedStorageBackend() !== 'basic_text';
  };
  const license = async () => {
    const text = await fs.readFile(licenseFile(), 'utf8');
    let thirdPartyNotice = '';
    try { thirdPartyNotice = await fs.readFile(thirdPartyNoticeFile(), 'utf8'); } catch { /* The MIT text remains usable if an old development package has no notice. */ }
    const combinedText = [text, thirdPartyNotice].filter(Boolean).join('\n\n');
    return { text: combinedText, hash: crypto.createHash('sha256').update(combinedText).digest('hex') };
  };
  const status = async () => {
    const current = await license();
    if (!secureStorageAvailable()) return { accepted: false, secureStorageAvailable: false, text: current.text };
    try {
      const encrypted = await fs.readFile(acceptanceFile());
      const record = JSON.parse(safeStorage.decryptString(encrypted));
      return { accepted: record.licenseHash === current.hash, secureStorageAvailable: true, text: current.text };
    } catch {
      return { accepted: false, secureStorageAvailable: true, text: current.text };
    }
  };
  const accept = async () => {
    if (!secureStorageAvailable()) throw new Error('license.secureStorageUnavailable');
    const current = await license();
    const record = JSON.stringify({ licenseHash: current.hash, acceptedAt: new Date().toISOString(), applicationVersion: app.getVersion() });
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(acceptanceFile(), safeStorage.encryptString(record), { mode: 0o600 });
    return { accepted: true, secureStorageAvailable: true, text: current.text };
  };
  return { status, accept };
}

module.exports = { createLicenseConsent };
