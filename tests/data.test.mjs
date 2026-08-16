import assert from 'node:assert/strict';
import test from 'node:test';
import { baseParts, keyboards, PRICE_DATE } from '../src/data.js';

function assertCatalog(items, label) {
  assert.equal(new Set(items.map(item => item.id)).size, items.length, `${label} IDs must be unique`);
  for (const item of items) {
    assert.match(item.id, /^[a-z][A-Za-z0-9-]*$/);
    assert.ok(item.name);
    assert.ok(Number.isFinite(item.price) && item.price >= 0, `${item.id} has an invalid price`);
    assert.equal(item.dims.length, 3, `${item.id} must have three dimensions`);
    assert.ok(item.dims.every(value => Number.isFinite(value) && value > 0), `${item.id} has invalid dimensions`);
    if (/^https?:/.test(item.source)) assert.match(item.source, /^https:\/\//, `${item.id} must use HTTPS`);
  }
}

test('BOM and keyboard catalogs retain their runtime contracts', () => {
  assert.match(PRICE_DATE, /^\d{2}\.\d{2}\.\d{4}$/);
  assertCatalog(baseParts, 'BOM');
  assertCatalog(keyboards, 'keyboard');
  assert.ok(keyboards.some(item => item.id === 'cardkb'));
  assert.equal(baseParts.reduce((sum, item) => sum + item.qty * item.price, 0), 123.22);
});

test('fit-critical corrected dimensions do not regress to vendor listing errors', () => {
  const part = id => baseParts.find(item => item.id === id);
  assert.deepEqual(part('c5').dims, [18, 21.2, 3.3]);
  assert.deepEqual(part('w5500').dims, [23, 29, 24]);
  assert.deepEqual(part('usbC').dims, [22, 22, 5]);
  assert.deepEqual(part('wifiAnt').dims, [9.5, 85, 9.5]);
  assert.deepEqual(part('btAnt').dims, [13, 95, 1]);
  assert.deepEqual(part('breadboard').dims, [47, 35, 8.5]);
  assert.equal(part('batteryShield').dimsType, 'estimate');
});
