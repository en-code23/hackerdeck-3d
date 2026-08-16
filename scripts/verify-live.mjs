import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMetadata, sha256, validateArtifact } from './lib/artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const artifactDir = process.env.HACKERDECK_OUTPUT_DIR
  ? path.resolve(root, process.env.HACKERDECK_OUTPUT_DIR)
  : path.join(root, 'site');
const liveBase = new URL(process.env.HACKERDECK_LIVE_URL || 'https://en-code23.github.io/hackerdeck-3d-pages/');
const attempts = Number.parseInt(process.env.HACKERDECK_VERIFY_ATTEMPTS || '1', 10);
const retryDelayMs = Number.parseInt(process.env.HACKERDECK_VERIFY_DELAY_MS || '5000', 10);

if (!Number.isInteger(attempts) || attempts < 1 || attempts > 120) throw new Error('HACKERDECK_VERIFY_ATTEMPTS must be between 1 and 120.');
if (!Number.isInteger(retryDelayMs) || retryDelayMs < 250 || retryDelayMs > 60000) throw new Error('HACKERDECK_VERIFY_DELAY_MS must be between 250 and 60000.');

validateArtifact(artifactDir);
const metadata = readMetadata(artifactDir);
const files = ['.nojekyll', 'index.html', 'robots.txt', 'protected/payload-meta.json', ...metadata.chunks.map(filename => `protected/${filename}`)];
async function compareLiveArtifact() {
  const mismatches = [];
  for (const filename of files) {
    const localBytes = fs.readFileSync(path.join(artifactDir, filename));
    const response = await fetch(new URL(filename, liveBase), { cache: 'no-store' });
    if (!response.ok) {
      mismatches.push(`${filename}: HTTP ${response.status}`);
      continue;
    }
    const liveBytes = Buffer.from(await response.arrayBuffer());
    if (sha256(liveBytes) !== sha256(localBytes)) mismatches.push(`${filename}: hash mismatch`);
  }
  return mismatches;
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const mismatches = await compareLiveArtifact();
  if (!mismatches.length) {
    console.log(`Live deployment matches artifact ${metadata.buildId} at ${liveBase.href}`);
    process.exit(0);
  }
  if (attempt === attempts) throw new Error(`Live deployment does not match local artifact:\n${mismatches.join('\n')}`);
  console.log(`Live deployment not updated yet (${attempt}/${attempts}); retrying in ${retryDelayMs} ms.`);
  await new Promise(resolve => setTimeout(resolve, retryDelayMs));
}
