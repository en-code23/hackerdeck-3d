import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PLACEHOLDERS = ['__STYLE__', '__APP_SCRIPT__'];

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function assertNoPlaceholders(label, value) {
  const survivors = PLACEHOLDERS.filter(placeholder => value.includes(placeholder));
  if (survivors.length) throw new Error(`${label} contains unresolved build placeholders: ${survivors.join(', ')}`);
}

export function listFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlinks are forbidden in deploy artifacts: ${absolute}`);
      if (entry.isDirectory()) visit(absolute);
      if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  visit(root);
  return files.sort();
}

export function validateArtifact(artifactDir) {
  const indexPath = path.join(artifactDir, 'index.html');
  const index = fs.readFileSync(indexPath, 'utf8');
  assertNoPlaceholders('Generated index', index);

  const scriptMatch = index.match(/<script type="module" src="\.\/assets\/(app-([a-f0-9]{32})\.js)"><\/script>/);
  if (!scriptMatch) throw new Error('Generated index must reference one content-addressed application module.');
  const assetFilename = scriptMatch[1];
  const assetPath = path.join(artifactDir, 'assets', assetFilename);
  const appJs = fs.readFileSync(assetPath, 'utf8');
  if (sha256(appJs).slice(0, 32) !== scriptMatch[2]) throw new Error('Application asset filename hash mismatch.');
  assertNoPlaceholders('Application bundle', appJs);
  if (/cdn\.jsdelivr\.net|https:\/\/.*three/i.test(appJs)) throw new Error('Runtime Three.js CDN dependency found.');

  const expected = ['.nojekyll', 'index.html', 'robots.txt', `assets/${assetFilename}`].sort();
  const actual = listFiles(artifactDir);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Deploy artifact allowlist mismatch. Expected ${expected.join(', ')}; found ${actual.join(', ')}`);
  }
  return { assetFilename, files: actual };
}
