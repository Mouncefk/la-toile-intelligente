// V28.5 — bridge between current search context and V21 recommendation engine.
// Health/private medical data are deliberately excluded.

import { buildHistoryContext } from './history-recommendation-v28-5.js';

export function buildRecommendationContext({ intent = {}, historyItems = [], trips = [], seasonal = null } = {}) {
  const history = buildHistoryContext({ historyItems, trips, intent });

  return {
    version: '28.5',
    currentIntent: intent,
    season: seasonal,
    travelHistory: {
      available: history.historyAvailable,
      signals: history.signals,
      directions: history.directions
    },
    constraints: {
      healthExcluded: true,
      travelerDecides: true,
      assistNotDecide: true
    }
  };
}
