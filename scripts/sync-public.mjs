import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles, validateArtifact } from './lib/artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourceDir = process.env.HACKERDECK_OUTPUT_DIR
  ? path.resolve(root, process.env.HACKERDECK_OUTPUT_DIR)
  : path.join(root, 'site');
const publicDir = process.env.HACKERDECK_PUBLIC_DIR
  ? path.resolve(root, process.env.HACKERDECK_PUBLIC_DIR)
  : path.resolve(root, '../../public-pages/hackerdeck-3d-pages');

validateArtifact(sourceDir);
if (!fs.existsSync(publicDir)) throw new Error(`Public deployment checkout not found: ${publicDir}`);

const allowedExisting = new Set(['.nojekyll', 'LICENSE', 'README.md', 'index.html', 'robots.txt']);
for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
  if (entry.isSymbolicLink()) throw new Error(`Refusing to sync into a checkout containing a symlink: ${entry.name}`);
  if (entry.name === '.git' || entry.name === 'protected' || allowedExisting.has(entry.name)) continue;
  throw new Error(`Refusing to sync into public checkout with unexpected entry: ${entry.name}`);
}

const stagingDir = fs.mkdtempSync(path.join(path.dirname(publicDir), '.hackerdeck-public-stage-'));
try {
  fs.cpSync(sourceDir, stagingDir, { recursive: true });
  validateArtifact(stagingDir);

  const nextProtected = path.join(publicDir, `.protected-next-${process.pid}`);
  const backupProtected = path.join(publicDir, `.protected-backup-${process.pid}`);
  fs.cpSync(path.join(stagingDir, 'protected'), nextProtected, { recursive: true });
  if (fs.existsSync(path.join(publicDir, 'protected'))) fs.renameSync(path.join(publicDir, 'protected'), backupProtected);
  try {
    fs.renameSync(nextProtected, path.join(publicDir, 'protected'));
    fs.rmSync(backupProtected, { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(path.join(publicDir, 'protected'), { recursive: true, force: true });
    if (fs.existsSync(backupProtected)) fs.renameSync(backupProtected, path.join(publicDir, 'protected'));
    throw error;
  }

  for (const filename of ['index.html', 'robots.txt', '.nojekyll']) {
    const next = path.join(publicDir, `.${filename}.next-${process.pid}`);
    fs.copyFileSync(path.join(stagingDir, filename), next);
    fs.renameSync(next, path.join(publicDir, filename));
  }
  validateArtifact(publicDir, { allowRepositoryDocs: true });
  console.log(`Synchronized validated public artifact: ${listFiles(sourceDir).length} generated files. Commit all public changes together.`);
} finally {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
