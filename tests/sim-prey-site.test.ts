// Stage E4f (docs/staging/e4f-prereg.md §4.1): `preyKanyawara` sets the field colobus density to Kanyawara's, the site of
// the encounter and hunting targets. Off, the field map keeps preyMinGroups (Ngogo 1997–99); the compressed map never changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../src/simulation';
import { preyGroupsOf } from '../src/sim/generation';
import { paramsOf } from '../src/sim/params';

test('preyKanyawara: Kanyawara density on the field map, preyMinGroups otherwise, compressed untouched', () => {
  const off = createWorld(48, { profile: 'field' }), on = createWorld(48, { profile: 'field', params: { preyKanyawara: 1 } });
  const P = paramsOf(on);
  assert.equal(off.prey.length, paramsOf(off).preyMinGroups);
  assert.equal(on.prey.length, Math.round(P.colobusDensityKanyawaraPerKm2 * (on.size / 1000) ** 2));
  assert.equal(on.prey.length, 142);
  assert.equal(preyGroupsOf(on), 142);
  const c = createWorld(48, { params: { preyKanyawara: 1 } });
  assert.equal(c.prey.length, paramsOf(c).preyMinGroups);
});

test('preyKanyawara: the respawn floor follows the site density', () => {
  const w = createWorld(7, { profile: 'field', params: { preyKanyawara: 1 } });
  w.prey.splice(0, 5);
  for (let i = 0; i < 5760; i++) tickWorld(w);
  assert.ok(w.prey.length > 137 && w.prey.length <= 142, `${w.prey.length} groups`);
});
