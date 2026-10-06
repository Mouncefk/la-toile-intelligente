import { enrichV21SessionContext } from '../server/ai-v21-history-adapter.js';

const result = enrichV21SessionContext({
  sessionId: 'demo-v28-5',
  intent: { activity: 'Balnéaire', travelerProfile: 'Tourisme senior' },
  historyItems: [
    { title: 'Agadir', summary: 'Balnéaire', country_iso3: 'MAR', metadata: { experience: 'Balnéaire' } }
  ],
  trips: [],
  seasonal: { period: 'octobre' }
});

if (!result.recommendationContext) throw new Error('Recommendation context missing');
if (!result.recommendationContext.travelHistory.available) throw new Error('History not available');
if (!result.recommendationContext.constraints.healthExcluded) throw new Error('Health exclusion missing');
if (result.principle !== 'assist_not_decide') throw new Error('V21 principle missing');

console.log('V28.5 V21 adapter checks passed.');
