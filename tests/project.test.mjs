import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProject, projectFilename, PROJECT_SCHEMA_VERSION } from '../src/project.js';

test('project snapshots normalize bounded view state and valid transforms', () => {
  const project = normalizeProject({
    version: PROJECT_SCHEMA_VERSION,
    id: 'deck-1',
    name: '  Field Deck  ',
    updatedAt: '2026-08-16T00:00:00.000Z',
    keyboard: 'cardkb',
    caseSize: [140.04, 210.06, 45],
    transforms: {
      'cardkb:breadboard': { position: [5, -2, 8], rotation: [0, 0.2, 0] },
      invalid: { position: [1, 2], rotation: [0, 0, 0] }
    },
    view: { mode: 'exploded', explode: 4, xray: true }
  });

  assert.equal(project.name, 'Field Deck');
  assert.deepEqual(project.caseSize, [140, 210.1, 45]);
  assert.equal(project.view.explode, 1);
  assert.deepEqual(Object.keys(project.transforms), ['cardkb:breadboard']);
});

test('project files reject incompatible schema and generate safe download names', () => {
  assert.throws(() => normalizeProject({ version: 99, id: 'x', keyboard: 'cardkb' }), /nicht unterstützt/);
  assert.equal(projectFilename('Öffentliche Field Deck / v2'), 'offentliche-field-deck-v2.hackerdeck.json');
});
