import assert from 'node:assert/strict';
import test from 'node:test';
import { keyboards } from '../src/data.js';
import { caseLayoutFor } from '../src/layout.js';

test('every keyboard body is recessed behind the front plane with pocket clearance', () => {
  for (const keyboard of keyboards) {
    const layout = caseLayoutFor(keyboard);
    const [keyboardWidth, keyboardHeight, keyboardDepth] = keyboard.dims;
    const bodyFront = layout.keyboardZ + keyboardDepth / 2;
    const bodyBack = layout.keyboardZ - keyboardDepth / 2;
    const pocketInteriorWidth = layout.pocket.w - layout.pocket.wall * 2;
    const pocketInteriorHeight = layout.pocket.h - layout.pocket.wall * 2;

    assert.ok(bodyFront < layout.frontZ, `${keyboard.id} body must sit behind the faceplate`);
    assert.ok(bodyBack > layout.pocket.backZ, `${keyboard.id} body must sit ahead of the pocket back`);
    assert.ok(pocketInteriorWidth >= keyboardWidth + layout.pocket.clearance * 2 - 0.001, `${keyboard.id} needs lateral clearance`);
    assert.ok(pocketInteriorHeight >= keyboardHeight + layout.pocket.clearance * 2 - 0.001, `${keyboard.id} needs vertical clearance`);
    assert.ok(layout.pocket.w <= layout.w - 6 + 0.001, `${keyboard.id} pocket must remain inside the case walls`);
  }
});

test('key faces protrude beyond the enclosure front while the keyboard body stays hidden', () => {
  for (const keyboard of keyboards) {
    const layout = caseLayoutFor(keyboard);
    const keyFaceFront = layout.keyboardZ + keyboard.dims[2] / 2 + 1.6;
    assert.ok(keyFaceFront > layout.faceplateFrontZ, `${keyboard.id} keys must remain accessible above the faceplate`);
  }
});
