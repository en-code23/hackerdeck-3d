import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PBKDF2_ITERATIONS, validateArtifact } from '../scripts/lib/artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hackerdeck-build-test-'));
const artifactDir = path.join(testRoot, 'site');
const disposablePassword = 'hackerdeck-disposable-ci-2026';

test.after(() => fs.rmSync(testRoot, { recursive: true, force: true }));

test('builds and decrypts a strict content-addressed public artifact', () => {
  const build = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    env: { ...process.env, HACKERDECK_PASSWORD: disposablePassword, HACKERDECK_OUTPUT_DIR: artifactDir },
    encoding: 'utf8'
  });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  const { metadata, files } = validateArtifact(artifactDir);
  assert.equal(metadata.iterations, PBKDF2_ITERATIONS);
  assert.ok(metadata.chunks.every(filename => /^payload-[a-f0-9]{32}\.txt$/.test(filename)));
  assert.ok(files.every(filename => !filename.startsWith('src/') && !filename.startsWith('scripts/')));

  const verify = spawnSync(process.execPath, ['scripts/verify.mjs'], {
    cwd: root,
    env: { ...process.env, HACKERDECK_PASSWORD: disposablePassword, HACKERDECK_OUTPUT_DIR: artifactDir },
    encoding: 'utf8'
  });
  assert.equal(verify.status, 0, verify.stderr || verify.stdout);
  assert.match(verify.stdout, /Verified encrypted round trip/);
});

test('accepts repository metadata without weakening the public file allowlist', () => {
  const checkoutDir = path.join(testRoot, 'checkout');
  fs.cpSync(artifactDir, checkoutDir, { recursive: true });
  fs.mkdirSync(path.join(checkoutDir, '.git'));
  fs.writeFileSync(path.join(checkoutDir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(checkoutDir, 'README.md'), 'Encrypted public deployment only.\n');
  assert.doesNotThrow(() => validateArtifact(checkoutDir, { allowRepositoryDocs: true }));
  fs.writeFileSync(path.join(checkoutDir, 'src.js'), 'plaintext');
  assert.throws(() => validateArtifact(checkoutDir, { allowRepositoryDocs: true }), /allowlist mismatch/);
});

test('rejects public example passwords before writing output', () => {
  const rejectedDir = path.join(testRoot, 'rejected-site');
  const build = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    env: { ...process.env, HACKERDECK_PASSWORD: 'replace-with-a-strong-password', HACKERDECK_OUTPUT_DIR: rejectedDir },
    encoding: 'utf8'
  });
  assert.notEqual(build.status, 0);
  assert.match(build.stderr, /known example\/default password/);
  assert.equal(fs.existsSync(rejectedDir), false);
});
