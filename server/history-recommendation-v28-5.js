// V28.5 — Travel History Recommendation Context
// This module deliberately excludes traveler_health_v14.
// It prepares a neutral context for the recommendation layer.

export function buildHistoryContext({historyItems=[],trips=[],intent={}}){
  const entries=[...historyItems,...trips];
  const text=entries.map(x=>[
    x.title,
    x.summary,
    x.country_iso3,
    x.metadata?.experience,
    x.metadata?.activity
  ].filter(Boolean).join(' ')).join(' ').toLowerCase();

  const currentActivity=String(intent.activity||'').toLowerCase();
  const profile=String(intent.travelerProfile||'').toLowerCase();
  const signals=[];

  if(currentActivity && text.includes(currentActivity)){
    signals.push({
      type:'continuity',
      label:'Expérience déjà présente dans l’historique',
      weight:1
    });
  }

  if(profile && text.includes(profile)){
    signals.push({
      type:'profile_continuity',
      label:'Contexte de voyage déjà rencontré',
      weight:0.7
    });
  }

  return {
    healthExcluded:true,
    historyAvailable:entries.length>0,
    signals,
    directions:[
      {
        id:'continuity',
        title:'Retrouver une expérience que vous connaissez',
        principle:'L’historique peut ouvrir une possibilité de continuité sans la rendre obligatoire.'
      },
      {
        id:'discovery',
        title:'Découvrir autre chose',
        principle:'La Toile peut aussi proposer des expériences différentes de celles déjà rencontrées.'
      }
    ]
  };
}
