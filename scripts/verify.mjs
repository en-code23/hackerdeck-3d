import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { assertNoPlaceholders, sha256, validateArtifact } from './lib/artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const artifactDir = process.env.HACKERDECK_OUTPUT_DIR
  ? path.resolve(root, process.env.HACKERDECK_OUTPUT_DIR)
  : path.join(root, 'site');
const { metadata } = validateArtifact(artifactDir);
const password = process.env.HACKERDECK_PASSWORD;

if (password) {
  const payloadBase64 = metadata.chunks
    .map(filename => fs.readFileSync(path.join(artifactDir, 'protected', filename), 'utf8'))
    .join('');
  const encryptedBytes = Buffer.from(payloadBase64, 'base64');
  const ciphertext = encryptedBytes.subarray(0, -16);
  const tag = encryptedBytes.subarray(-16);
  const key = crypto.pbkdf2Sync(password, Buffer.from(metadata.salt, 'base64'), metadata.iterations, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(metadata.iv, 'base64'));
  decipher.setAAD(Buffer.from(`hackerdeck:v2:${metadata.sourceHash}`, 'utf8'));
  decipher.setAuthTag(tag);
  const payloadText = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  if (sha256(payloadText) !== metadata.sourceHash) throw new Error('Decrypted source hash mismatch.');
  assertNoPlaceholders('Decrypted payload', payloadText);
  const payload = JSON.parse(payloadText);
  if (payload.v !== 2 || typeof payload.html !== 'string' || typeof payload.js !== 'string') {
    throw new Error('Decrypted payload schema is invalid.');
  }
  if (/<script\b/i.test(payload.html)) throw new Error('Decrypted application shell contains a script.');
  if (/cdn\.jsdelivr\.net|https:\/\/.*three/i.test(payload.js)) throw new Error('Decrypted application still has a runtime Three.js CDN dependency.');
  new vm.Script(payload.js, { filename: 'encrypted-app-bundle.js' });
  console.log(`Verified encrypted round trip for artifact ${metadata.buildId}.`);
} else {
  console.log(`Verified public artifact structure ${metadata.buildId}; set HACKERDECK_PASSWORD for decryption verification.`);
}
