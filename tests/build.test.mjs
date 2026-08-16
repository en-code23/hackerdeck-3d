import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateArtifact } from '../scripts/lib/artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hackerdeck-build-test-'));
const artifactDir = path.join(testRoot, 'site');

test.after(() => fs.rmSync(testRoot, { recursive: true, force: true }));

test('builds and verifies a strict passwordless static artifact', () => {
  const build = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    env: { ...process.env, HACKERDECK_OUTPUT_DIR: artifactDir },
    encoding: 'utf8'
  });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  const { assetFilename, files } = validateArtifact(artifactDir);
  assert.match(assetFilename, /^app-[a-f0-9]{32}\.js$/);
  assert.deepEqual(files, ['.nojekyll', `assets/${assetFilename}`, 'index.html', 'robots.txt'].sort());
  const index = fs.readFileSync(path.join(artifactDir, 'index.html'), 'utf8');
  assert.doesNotMatch(index, /Passwort|password|protected\/payload/i);

  const verify = spawnSync(process.execPath, ['scripts/verify.mjs'], {
    cwd: root,
    env: { ...process.env, HACKERDECK_OUTPUT_DIR: artifactDir },
    encoding: 'utf8'
  });
  assert.equal(verify.status, 0, verify.stderr || verify.stdout);
  assert.match(verify.stdout, /Verified passwordless static artifact/);
});

test('build output is deterministic for unchanged source', () => {
  const secondArtifact = path.join(testRoot, 'site-second');
  const secondBuild = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    env: { ...process.env, HACKERDECK_OUTPUT_DIR: secondArtifact },
    encoding: 'utf8'
  });
  assert.equal(secondBuild.status, 0, secondBuild.stderr || secondBuild.stdout);
  const first = validateArtifact(artifactDir);
  const second = validateArtifact(secondArtifact);
  assert.equal(second.assetFilename, first.assetFilename);
  for (const filename of first.files) {
    assert.deepEqual(fs.readFileSync(path.join(secondArtifact, filename)), fs.readFileSync(path.join(artifactDir, filename)));
  }
});
