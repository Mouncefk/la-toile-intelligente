// V28.5 — Adapter for the V21 recommendation API.
// Keeps the V21 contract intact while enriching its session context.

import { buildRecommendationContext } from './recommendation-bridge-v28-5.js';

export function enrichV21SessionContext(input = {}) {
  const context = buildRecommendationContext({
    intent: input.intent || {},
    historyItems: input.historyItems || [],
    trips: input.trips || [],
    seasonal: input.seasonal || null
  });

  return {
    ...input,
    recommendationContext: context,
    principle: 'assist_not_decide'
  };
}
