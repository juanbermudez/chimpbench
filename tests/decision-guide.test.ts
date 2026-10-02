import assert from 'node:assert/strict';
import test from 'node:test';
import { buildData, checkContent, S3 } from '../scripts/decision-guide';

// docs/decision-guide.html draws its statuses from the prescription ledger; its words and boxes live in
// scripts/lib/decision-guide-content.ts. When this fails after a ledger change, regroup the entries there and run
// pnpm exec tsx scripts/decision-guide.ts (then --check).
test('the decision guide puts every counted prescription in one domain and one box, and every box has one status', () => {
  const D = buildData();
  assert.deepEqual(checkContent(D), []);
  assert.equal(D.L3.count.total, D.set3.size);
  assert.equal(Object.keys(S3).length, 29);
});
