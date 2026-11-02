import assert from 'node:assert/strict';
import { classify } from '../server/v30-platform.js';

const cases = [
  ['Nous voulons découvrir le désert à Merzouga en famille, 7 jours en avril 2027, budget économique.', 'MERZOUGA', 'Désert', 'Famille'],
  ['Un séjour culturel à Fès avec mes parents, 6 nuits en octobre, mobilité réduite.', 'FES', 'Culture & patrimoine', 'Tourisme senior'],
  ['La mer à Agadir pour 2 personnes pendant 8 jours en septembre 2027, confort.', 'AGADIR', 'Balnéaire & nautique', 'Couple']
];
for (const [raw, territory, activity, profile] of cases) {
  const result = classify(raw);
  assert.equal(result.territoryKey, territory);
  assert.equal(result.activity, activity);
  if (profile !== 'Couple') assert.equal(result.travelerProfile, profile);
  assert.equal(result.travelerDecides, true);
}
console.log('V36 deterministic fallback contract: PASS');
