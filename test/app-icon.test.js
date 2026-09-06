import { access, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { appIconPath } from '../electron/appIcon.cjs';

describe('application icon', () => {
  it('uses the bundled favicon for development and packaged Electron windows', async () => {
    const developmentApp = { getAppPath: () => process.cwd(), isPackaged: false };
    const packagedApp = { getAppPath: () => '/app.asar', isPackaged: true };

    expect(appIconPath(developmentApp).replace(/\\/g, '/')).toMatch(/\/public\/favicon\.png$/);
    expect(appIconPath(packagedApp).replace(/\\/g, '/')).toBe('/app.asar/dist/favicon.png');

    const icon = await readFile(appIconPath(developmentApp));
    expect(icon.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  });

  it('provides the configured icon assets for Windows, Linux, and macOS packages', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
    const { win, linux, mac } = packageJson.build;

    expect(win.icon).toBe('build-assets/icons/icon.ico');
    expect(linux.icon).toBe('build-assets/icons');
    expect(mac.icon).toBe('build-assets/icons/icon.icns');
    await Promise.all([
      access(win.icon),
      access(linux.icon),
      access(mac.icon),
      access('build-assets/icons/icon-32.png')
    ]);

    expect(await readFile('build-assets/icons/icon-32.png')).toEqual(await readFile('public/favicon.png'));
  });
});
