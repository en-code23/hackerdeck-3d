import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PLACEHOLDERS = ['__STYLE__', '__APPJS__', '__BASE_PARTS__', '__KEYBOARDS__', '__PRICE_DATE__'];
export const PBKDF2_ITERATIONS = 600_000;
export const PUBLIC_FIXED_FILES = ['.nojekyll', 'index.html', 'robots.txt', 'protected/payload-meta.json'];
export const PUBLIC_REPOSITORY_DOCS = ['LICENSE', 'README.md'];

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function assertNoPlaceholders(label, value) {
  const survivors = PLACEHOLDERS.filter(placeholder => value.includes(placeholder));
  if (survivors.length) {
    throw new Error(`${label} contains unresolved build placeholders: ${survivors.join(', ')}`);
  }
}

export function listFiles(root, { ignoreTopLevel = [] } = {}) {
  const ignored = new Set(ignoreTopLevel);
  const files = [];
  function visit(directory, topLevel = false) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (topLevel && ignored.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlinks are forbidden in public artifacts: ${absolute}`);
      if (entry.isDirectory()) visit(absolute);
      if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  visit(root, true);
  return files.sort();
}

export function readMetadata(artifactDir) {
  const metadataPath = path.join(artifactDir, 'protected/payload-meta.json');
  return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
}

export function validateArtifact(artifactDir, { allowRepositoryDocs = false } = {}) {
  const metadata = readMetadata(artifactDir);
  if (metadata.v !== 2) throw new Error('Unsupported payload metadata version.');
  if (metadata.kdf !== 'PBKDF2-SHA-256' || metadata.cipher !== 'AES-256-GCM') {
    throw new Error('Unexpected encryption metadata.');
  }
  if (!Number.isInteger(metadata.iterations) || metadata.iterations < PBKDF2_ITERATIONS) {
    throw new Error(`PBKDF2 work factor must be at least ${PBKDF2_ITERATIONS}.`);
  }
  if (!/^[a-f0-9]{64}$/.test(metadata.buildId) || !/^[a-f0-9]{64}$/.test(metadata.sourceHash)) {
    throw new Error('Artifact hashes are missing or malformed.');
  }
  if (Buffer.from(metadata.salt, 'base64').length !== 16 || Buffer.from(metadata.iv, 'base64').length !== 12) {
    throw new Error('Salt or IV length is invalid.');
  }
  if (!Array.isArray(metadata.chunks) || metadata.chunks.length < 1 || metadata.chunks.length > 256) {
    throw new Error('Payload chunk list is invalid.');
  }
  if (new Set(metadata.chunks).size !== metadata.chunks.length) {
    throw new Error('Payload chunk filenames must be unique.');
  }

  const chunkPattern = /^payload-([a-f0-9]{32})\.txt$/;
  const chunkTexts = metadata.chunks.map(filename => {
    const match = filename.match(chunkPattern);
    if (!match) throw new Error(`Unexpected chunk filename: ${filename}`);
    const text = fs.readFileSync(path.join(artifactDir, 'protected', filename), 'utf8');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text)) throw new Error(`Chunk is not canonical base64: ${filename}`);
    if (sha256(text).slice(0, 32) !== match[1]) throw new Error(`Chunk filename hash mismatch: ${filename}`);
    return text;
  });

  const encryptedBytes = Buffer.from(chunkTexts.join(''), 'base64');
  if (sha256(encryptedBytes) !== metadata.buildId) throw new Error('Encrypted payload build hash mismatch.');
  if (encryptedBytes.length !== metadata.encryptedBytes) throw new Error('Encrypted payload size mismatch.');

  const expected = [...PUBLIC_FIXED_FILES, ...metadata.chunks.map(filename => `protected/${filename}`)];
  if (allowRepositoryDocs) expected.push(...PUBLIC_REPOSITORY_DOCS.filter(file => fs.existsSync(path.join(artifactDir, file))));
  const actual = listFiles(artifactDir, { ignoreTopLevel: allowRepositoryDocs ? ['.git'] : [] });
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) {
    throw new Error(`Public artifact allowlist mismatch. Expected ${expectedSorted.join(', ')}; found ${actual.join(', ')}`);
  }

  const gate = fs.readFileSync(path.join(artifactDir, 'index.html'), 'utf8');
  const metadataText = fs.readFileSync(path.join(artifactDir, 'protected/payload-meta.json'), 'utf8');
  assertNoPlaceholders('Public gate', gate);
  assertNoPlaceholders('Payload metadata', metadataText);
  const forbiddenPlaintext = ['export const baseParts', 'function buildAll', 'ESP32-S3-DevKitC-1U-N8R8', 'HACKERDECK_PASSWORD='];
  for (const marker of forbiddenPlaintext) {
    if (gate.includes(marker) || metadataText.includes(marker)) {
      throw new Error(`Plaintext source marker leaked into public files: ${marker}`);
    }
  }
  return { metadata, files: actual };
}
