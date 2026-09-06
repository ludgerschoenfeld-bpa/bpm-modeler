import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const directory = path.resolve('public/help/examples');
const target = path.resolve('public/help/examples-index.json');
async function filesBelow(current, relative = '') {
  const entries = await readdir(current, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesBelow(path.join(current, entry.name), path.join(relative, entry.name)) : [path.join(relative, entry.name)]))).flat();
}
let files = [];
try {
  files = (await filesBelow(directory)).sort((left, right) => left.localeCompare(right));
} catch {
  // An empty index keeps browser development usable before examples are added.
}
await writeFile(target, JSON.stringify(files.map(file => file.split(path.sep).join('/')), null, 2) + '\n', 'utf8');
