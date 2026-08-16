import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as bundle } from 'esbuild';
import { assertNoPlaceholders, sha256, validateArtifact } from './lib/artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputDir = process.env.HACKERDECK_OUTPUT_DIR
  ? path.resolve(root, process.env.HACKERDECK_OUTPUT_DIR)
  : path.join(root, 'site');

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

const appJs = result.outputFiles[0].text;
const assetFilename = `app-${sha256(appJs).slice(0, 32)}.js`;
const style = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
const indexHtml = fs
  .readFileSync(path.join(root, 'src/app.html'), 'utf8')
  .replace('__STYLE__', () => style)
  .replace('__APP_SCRIPT__', () => `./assets/${assetFilename}`);
assertNoPlaceholders('Generated index', indexHtml);

fs.mkdirSync(path.dirname(outputDir), { recursive: true });
const stagingDir = fs.mkdtempSync(path.join(path.dirname(outputDir), '.hackerdeck-site-build-'));
try {
  fs.mkdirSync(path.join(stagingDir, 'assets'));
  fs.writeFileSync(path.join(stagingDir, 'index.html'), indexHtml);
  fs.writeFileSync(path.join(stagingDir, 'assets', assetFilename), appJs);
  fs.writeFileSync(path.join(stagingDir, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  fs.writeFileSync(path.join(stagingDir, '.nojekyll'), '\n');
  validateArtifact(stagingDir);
  promoteDirectory(stagingDir, outputDir);
  console.log(`Built passwordless static site with ${assetFilename}.`);
} catch (error) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
  throw error;
}
