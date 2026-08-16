import path from 'node:path';
import vm from 'node:vm';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateArtifact } from './lib/artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const artifactDir = process.env.HACKERDECK_OUTPUT_DIR
  ? path.resolve(root, process.env.HACKERDECK_OUTPUT_DIR)
  : path.join(root, 'site');
const { assetFilename } = validateArtifact(artifactDir);
const appJs = fs.readFileSync(path.join(artifactDir, 'assets', assetFilename), 'utf8');
new vm.Script(appJs, { filename: assetFilename });
console.log(`Verified passwordless static artifact ${assetFilename}.`);
