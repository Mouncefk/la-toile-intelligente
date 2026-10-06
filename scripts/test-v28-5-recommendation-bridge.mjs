import { buildRecommendationContext } from '../server/recommendation-bridge-v28-5.js';

const ctx = buildRecommendationContext({
  intent: { activity: 'Balnéaire', travelerProfile: 'Tourisme senior' },
  historyItems: [{ title: 'Agadir', summary: 'Balnéaire', country_iso3: 'MAR', metadata: { experience: 'Balnéaire' } }],
  trips: [{ title: 'Voyage Maroc', country_iso3: 'MAR', metadata: { activity: 'Balnéaire' } }],
  seasonal: { period: 'octobre' }
});

if (ctx.version !== '28.5') throw new Error('Invalid bridge version');
if (!ctx.travelHistory.available) throw new Error('History context missing');
if (!ctx.constraints.healthExcluded) throw new Error('Health exclusion missing');
if (!ctx.constraints.travelerDecides) throw new Error('Traveler decision rule missing');
if (!ctx.constraints.assistNotDecide) throw new Error('Assist-not-decide rule missing');
if (!ctx.travelHistory.directions.some(x => x.id === 'discovery')) throw new Error('Discovery direction missing');

console.log('V28.5 recommendation bridge checks passed.');
