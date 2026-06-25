import test from 'node:test';
import assert from 'node:assert/strict';
import {
  achievementLabel,
  calculatedTier,
  defaultPeriod,
  evidenceChecklist,
  formatRule,
  ruleMatches,
} from '../../frontend/lib/kpi.js';

test('ruleMatches supports every formula operator', () => {
  assert.equal(ruleMatches(10, { operator: 'gte', value: 10 }), true);
  assert.equal(ruleMatches(10, { operator: 'gt', value: 10 }), false);
  assert.equal(ruleMatches(10, { operator: 'lte', value: 10 }), true);
  assert.equal(ruleMatches(10, { operator: 'lt', value: 10 }), false);
  assert.equal(ruleMatches(10, { operator: 'eq', value: 10 }), true);
  assert.equal(ruleMatches(10, { operator: 'between', value: 5, max: 10 }), true);
});

test('calculatedTier gives priority to the highest score', () => {
  const kpi = {
    tiers: [
      { skor: 0, rule: { operator: 'gte', value: 0 } },
      { skor: 2, rule: { operator: 'gte', value: 100 } },
      { skor: 1, rule: { operator: 'gte', value: 80 } },
    ],
  };
  assert.equal(calculatedTier(kpi, 110).skor, 2);
  assert.equal(calculatedTier(kpi, 90).skor, 1);
});

test('format and labels are deterministic', () => {
  assert.equal(formatRule({ operator: 'between', value: 80, max: 99 }, '%'), '80 % <= nilai <= 99 %');
  assert.deepEqual(achievementLabel(90), ['Sangat Baik', 'ach-sangat-baik']);
  assert.equal(defaultPeriod(new Date(2026, 5, 1)), 'Juni 2026');
});

test('evidenceChecklist ignores empty legacy values', () => {
  assert.deepEqual(evidenceChecklist({ evidenceChecklist: ['Dashboard', ' ', null] }), ['Dashboard']);
  assert.deepEqual(evidenceChecklist({}), []);
});
