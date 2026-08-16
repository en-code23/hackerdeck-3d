import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readMetadata, validateArtifact } from './lib/artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const artifactDir = process.env.HACKERDECK_OUTPUT_DIR
  ? path.resolve(root, process.env.HACKERDECK_OUTPUT_DIR)
  : path.join(root, 'site');
let publicDir = process.env.HACKERDECK_PUBLIC_DIR
  ? path.resolve(root, process.env.HACKERDECK_PUBLIC_DIR)
  : path.resolve(root, '../../public-pages/hackerdeck-3d-pages');
let temporaryCheckoutRoot = null;

function run(command, args, { cwd = root, capture = false, env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...env, GIT_TERMINAL_PROMPT: '0' },
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit'
  });
  if (result.status !== 0) {
    const detail = capture ? result.stderr || result.stdout : '';
    throw new Error(`${command} ${args.join(' ')} failed.${detail ? `\n${detail.trim()}` : ''}`);
  }
  return capture ? result.stdout.trim() : '';
}

if (!process.env.HACKERDECK_PASSWORD) throw new Error('HACKERDECK_PASSWORD is required for a production release.');
try {
  if (!fs.existsSync(path.join(publicDir, '.git'))) {
    if (process.env.HACKERDECK_PUBLIC_DIR) throw new Error(`Public Git checkout not found: ${publicDir}`);
    temporaryCheckoutRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hackerdeck-public-release-'));
    publicDir = path.join(temporaryCheckoutRoot, 'hackerdeck-3d-pages');
    run('git', ['clone', '--quiet', '--branch', 'main', '--single-branch', 'https://github.com/en-code23/hackerdeck-3d-pages.git', publicDir]);
  }
  if (run('git', ['branch', '--show-current'], { cwd: publicDir, capture: true }) !== 'main') {
    throw new Error('Public deployment checkout must be on the main branch.');
  }
  const origin = run('git', ['remote', 'get-url', 'origin'], { cwd: publicDir, capture: true });
  if (!/en-code23\/hackerdeck-3d-pages(?:\.git)?$/.test(origin)) throw new Error(`Unexpected public deployment remote: ${origin}`);
  if (run('git', ['status', '--porcelain'], { cwd: publicDir, capture: true })) {
    throw new Error('Public deployment checkout must be clean before release.');
  }

  run(process.execPath, ['scripts/build.mjs']);
  run(process.execPath, ['scripts/verify.mjs']);
  validateArtifact(artifactDir);
  run(process.execPath, ['scripts/sync-public.mjs'], { env: { ...process.env, HACKERDECK_PUBLIC_DIR: publicDir } });
  validateArtifact(publicDir, { allowRepositoryDocs: true });

  run('git', ['add', '-A', '--', '.nojekyll', 'index.html', 'robots.txt', 'protected'], { cwd: publicDir });
  const stagedChanges = run('git', ['diff', '--cached', '--name-status', '--no-renames'], { cwd: publicDir, capture: true })
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const separator = line.indexOf('\t');
      return { status: line.slice(0, separator), filename: line.slice(separator + 1) };
    });
  if (!stagedChanges.length) {
    console.log('The validated artifact already matches the public deployment checkout; no commit created.');
  } else {
    const allowed = /^(?:\.nojekyll|index\.html|robots\.txt|protected\/payload-meta\.json|protected\/payload-[a-f0-9]{32}\.txt)$/;
    const legacyDeletion = /^protected\/payload-\d{2}\.txt$/;
    const unexpected = stagedChanges.filter(change => !allowed.test(change.filename) && !(change.status === 'D' && legacyDeletion.test(change.filename)));
    if (unexpected.length) throw new Error(`Refusing to commit unexpected public paths: ${unexpected.map(change => `${change.status} ${change.filename}`).join(', ')}`);
    const metadata = readMetadata(artifactDir);
    run('git', ['commit', '-m', `Deploy encrypted HackerDeck ${metadata.buildId.slice(0, 12)}`], { cwd: publicDir });
    run('git', ['push', 'origin', 'main'], { cwd: publicDir });
  }

  run(process.execPath, ['scripts/verify-live.mjs'], {
    env: { ...process.env, HACKERDECK_VERIFY_ATTEMPTS: process.env.HACKERDECK_VERIFY_ATTEMPTS || '60' }
  });
} finally {
  if (temporaryCheckoutRoot) fs.rmSync(temporaryCheckoutRoot, { recursive: true, force: true });
}
