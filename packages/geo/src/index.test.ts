import assert from 'node:assert/strict';
import test from 'node:test';
import { isGeographicPoint } from './index.js';
test('accepts WGS84 longitude latitude', () =>
  assert.equal(isGeographicPoint({ longitude: -7.5, latitude: 33.5 }), true));
