import { buildHistoryContext } from '../server/history-recommendation-v28-5.js';

const context = buildHistoryContext({
  historyItems: [
    { title: 'Séjour à Agadir', summary: 'Expérience balnéaire', country_iso3: 'MAR', metadata: { experience: 'Balnéaire' } }
  ],
  trips: [],
  intent: { activity: 'Balnéaire' }
});

if (!context.healthExcluded) throw new Error('Health data must be excluded');
if (!context.historyAvailable) throw new Error('History should be detected');
if (!context.signals.some(x => x.type === 'continuity')) throw new Error('Continuity signal missing');
if (context.directions.length !== 2) throw new Error('Expected continuity and discovery directions');

console.log('V28.5 history recommendation context checks passed.');
