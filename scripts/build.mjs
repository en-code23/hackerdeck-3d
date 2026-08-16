import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as bundle } from 'esbuild';
import { assertNoPlaceholders, PBKDF2_ITERATIONS, sha256, validateArtifact } from './lib/artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputDir = process.env.HACKERDECK_OUTPUT_DIR
  ? path.resolve(root, process.env.HACKERDECK_OUTPUT_DIR)
  : path.join(root, 'site');
const password = process.env.HACKERDECK_PASSWORD;
const knownExamplePasswords = new Set([
  'your_password',
  'your-password',
  'your-long-password',
  'replace-with-a-strong-password',
  'change-me',
  'changeme',
  'password123456'
]);

function validatePassword(value) {
  if (!value || value.length < 14) throw new Error('Set HACKERDECK_PASSWORD to at least 14 characters.');
  const normalized = value.trim().toLowerCase();
  if (knownExamplePasswords.has(normalized) || normalized.includes('replace-with') || normalized.includes('example-password')) {
    throw new Error('Refusing to build with a known example/default password.');
  }
  if (new Set(value).size < 6) throw new Error('Refusing to build with a low-diversity password.');
}

function promoteDirectory(stagingDir, destinationDir) {
  const backupDir = `${destinationDir}.backup-${process.pid}-${Date.now()}`;
  const hadDestination = fs.existsSync(destinationDir);
  if (hadDestination) fs.renameSync(destinationDir, backupDir);
  try {
    fs.renameSync(stagingDir, destinationDir);
    if (hadDestination) fs.rmSync(backupDir, { recursive: true, force: true });
  } catch (error) {
    if (fs.existsSync(destinationDir)) fs.rmSync(destinationDir, { recursive: true, force: true });
    if (hadDestination && fs.existsSync(backupDir)) fs.renameSync(backupDir, destinationDir);
    throw error;
  }
}

async function buildApplicationBundle() {
  const result = await bundle({
    absWorkingDir: root,
    entryPoints: ['src/app.js'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    write: false,
    minify: true,
    legalComments: 'none',
    sourcemap: false,
    metafile: true,
    logLevel: 'silent'
  });
  if (result.outputFiles.length !== 1) throw new Error('Expected one bundled application module.');
  const externalImports = Object.values(result.metafile.outputs).flatMap(output => output.imports).filter(item => item.external);
  if (externalImports.length) throw new Error(`Application bundle still has external imports: ${externalImports.map(item => item.path).join(', ')}`);
  return result.outputFiles[0].text;
}

validatePassword(password);

const style = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
const appHtml = fs
  .readFileSync(path.join(root, 'src/app.html'), 'utf8')
  .replace('__STYLE__', () => style);
const appJs = await buildApplicationBundle();
const gateHtml = fs.readFileSync(path.join(root, 'src/gate.html'), 'utf8');

assertNoPlaceholders('Application HTML', appHtml);
assertNoPlaceholders('Application bundle', appJs);
assertNoPlaceholders('Password gate', gateHtml);
if (/<script\b/i.test(appHtml)) throw new Error('Application HTML must not contain scripts; the gate loads the encrypted bundle explicitly.');
if (/cdn\.jsdelivr\.net|https:\/\/.*three/i.test(appJs)) throw new Error('Runtime CDN dependency found in bundled application.');

const payloadText = JSON.stringify({ v: 2, html: appHtml, js: appJs });
const sourceHash = sha256(payloadText);
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
cipher.setAAD(Buffer.from(`hackerdeck:v2:${sourceHash}`, 'utf8'));
const encrypted = Buffer.concat([cipher.update(payloadText, 'utf8'), cipher.final()]);
const encryptedBytes = Buffer.concat([encrypted, cipher.getAuthTag()]);
const payloadBase64 = encryptedBytes.toString('base64');

fs.mkdirSync(path.dirname(outputDir), { recursive: true });
const stagingDir = fs.mkdtempSync(path.join(path.dirname(outputDir), '.hackerdeck-site-build-'));
try {
  const protectedDir = path.join(stagingDir, 'protected');
  fs.mkdirSync(protectedDir, { recursive: true });
  fs.writeFileSync(path.join(stagingDir, 'index.html'), gateHtml);
  fs.writeFileSync(path.join(stagingDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  fs.writeFileSync(path.join(stagingDir, '.nojekyll'), '\n');

  const chunkSize = 96_000;
  const chunks = [];
  for (let offset = 0; offset < payloadBase64.length; offset += chunkSize) {
    const chunk = payloadBase64.slice(offset, offset + chunkSize);
    const filename = `payload-${sha256(chunk).slice(0, 32)}.txt`;
    fs.writeFileSync(path.join(protectedDir, filename), chunk);
    chunks.push(filename);
  }

  const metadata = {
    v: 2,
    kdf: 'PBKDF2-SHA-256',
    cipher: 'AES-256-GCM',
    iterations: PBKDF2_ITERATIONS,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    sourceHash,
    buildId: sha256(encryptedBytes),
    encryptedBytes: encryptedBytes.length,
    builtAt: new Date().toISOString(),
    chunks
  };
  fs.writeFileSync(path.join(protectedDir, 'payload-meta.json'), `${JSON.stringify(metadata)}\n`);
  validateArtifact(stagingDir);
  promoteDirectory(stagingDir, outputDir);
  console.log(`Built encrypted artifact ${metadata.buildId.slice(0, 12)}: ${(payloadBase64.length / 1024).toFixed(1)} KiB base64 in ${chunks.length} content-addressed chunks.`);
} catch (error) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
  throw error;
}
