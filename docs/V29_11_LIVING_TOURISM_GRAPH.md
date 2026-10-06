# V29.11 — Living Tourism Graph / Temporal Intelligence Foundation

## Purpose

V29.11 formalizes the conceptual foundation of La Toile as a **Living Tourism Graph**: a global, temporal, climate-aware and vibration-driven network connecting territories, travelers, professionals, experiences, events, institutions and information.

This document is a design foundation. It does not yet introduce production graph storage or prediction algorithms.

## Core principle

> Le Globe montre le monde. La Toile relie le monde. Les fils vibrent. L’Araignée ressent. L’IA comprend. L’humain décide.

La Toile doit preserve history rather than overwrite state. The system must distinguish:
- observed facts;
- recorded knowledge;
- current state;
- historical state;
- analysis;
- prediction;
- recommendation.

## 1. Global dimensions

Every relevant tourism object can be contextualized by:

### Geography
- hemisphere: North / South
- continent
- sub-region
- country
- administrative region
- territory
- city
- zone
- destination
- point of interest

### Climate
- global climate region
- local climate
- microclimate where relevant
- seasonal conditions
- temperature / precipitation / natural conditions
- tourism compatibility

### Time
- observed_at
- recorded_at
- valid_from
- valid_to
- updated_at
- date / period / season
- recurrence
- expiration
- historical state

The hemisphere is a native dimension. A month must never be interpreted as a universal season: local season depends on hemisphere and territory.

## 2. Graph node families

Initial global node families:
1. Territories
2. Tourism types
3. Experiences
4. Professionals
5. Travelers
6. Events
7. Health & Safety
8. Youth / mobility / human exchanges
9. Institutions
10. Information / knowledge
11. External signals
12. Vibrations

Health information remains separately governed and must not be propagated through ordinary recommendation or professional matching.

## 3. Tourism taxonomy

The taxonomy is extensible and relational, not a flat list.

Major families include:
- Nature & territories: coastal, islands, mountain, desert, forest, rural, lake, river, nature, polar, volcanic, wildlife.
- Culture & heritage: cultural, heritage, historical, architectural, archaeological, museums, arts, crafts, traditions, know-how, festivals.
- Gastronomy: gastronomic, local cuisine, street food, terroir, wine tourism, gastronomic routes.
- Adventure & sport: adventure, hiking, trekking, mountaineering, surf, diving, water sports, skiing, glisse, cycling, golf, fishing, horse riding, motor sports.
- Wellness: wellness, spa, thermal, retreat / disconnection, wellbeing.
- Publics: solo, couple, family, multigenerational, youth, seniors, groups, school, students, companies, associations, accessibility needs.
- Mobility & encounters: youth stays, camps, educational stays, sports stays, language stays, school/university/family/cultural exchanges, international mobility, volunteering.
- Learning: languages, cuisine, crafts, arts, heritage, history, nature, science, technology, local know-how.
- Engagement: ecotourism, responsible, solidarity, community, volunteering, environment, conservation, transmission of know-how.
- Business & events: business travel, MICE, congresses, fairs, conferences, festivals, sports events, cultural events.
- Health & Safety: health services, pharmacies, hospitals, clinics, assistance, emergency and safety services.

### Important semantic separation

The model must distinguish:
- tourism type = how I like to travel;
- experience = what I want to live;
- current intent = what I seek now;
- constraint = what must be respected;
- need = what I concretely need;
- audience = for whom.

## 4. Professional ecosystem

The professional taxonomy must remain open to all tourism and adjacent trades, including:
- accommodation;
- restaurants;
- transport / mobility;
- guides;
- agencies / tour operators;
- rental;
- activities;
- events;
- crafts;
- culture;
- wellness;
- photography;
- interpretation;
- group services;
- health;
- safety;
- education / training;
- digital services;
- other tourism-related trades.

Economic principle:

> Le référencement est ouvert. Le classement pertinent est intelligent.

Subscription must provide visibility capabilities, not artificial relevance. No pay-to-win ranking and no price-based ranking.

## 5. Semantic relations / fil taxonomy

A **fil** is a semantic relationship between two nodes and is itself a temporal object.

Core relation families:

### Geography
- located_in
- contains
- adjacent_to
- part_of
- belongs_to
- crosses
- near

### Climate
- has_climate
- belongs_to_climate_region
- has_microclimate
- compatible_with_climate
- affected_by_climate
- seasonally_compatible_with

### Time
- occurs_in
- available_during
- recurs_in
- precedes
- follows
- overlaps
- seasonally_active

### Tourism / experience
- supports
- enables
- suitable_for
- belongs_to_tourism_type
- offers_experience
- requires
- enhances
- complements
- available_in
- typical_of
- characteristic_of
- discoverable_in
- practiced_in

### Professional
- professional_offers
- professional_serves
- professional_operates_in
- professional_specializes_in
- professional_supports
- professional_requires
- professional_connects

### Traveler
- traveler_interested_in
- traveler_searched
- traveler_requested
- traveler_experienced
- traveler_selected
- traveler_reacted_to

A search is not automatically a preference. A past action is not automatically a permanent preference.

### Human exchange
- connects_people
- hosts
- exchanges_with
- learns_from
- shares_with
- meets
- participates_in

### Events
- hosts_event
- participates_in
- attracts
- generates_demand
- generates_opportunity
- impacts
- precedes_event
- follows_event

### Institutions
- organizes
- supports
- funds
- promotes
- regulates
- certifies
- partners_with

### Radar / provenance
- detected_by
- reported_by
- confirmed_by
- derived_from
- associated_with

### Propagation
- propagates_to
- influences
- triggers
- amplifies
- reduces
- creates_opportunity
- creates_need

## 6. Fil data model

Conceptual fil object:

```
FIL
├── identity: id, relation_type
├── endpoints: source, target
├── semantic: direction, strength, relevance, confidence
├── temporal: observed_at, valid_from, valid_to, last_updated
├── provenance: source, evidence, inferred
├── dynamics: evolution, intensity, vibration
└── lifecycle: active, emerging, weakening, expired
```

A fil may be:
- explicit;
- inferred;
- emerging;
- strong;
- weak;
- temporary;
- expired.

An inferred fil must never silently become a fact. It must carry confidence and evidence.

## 7. Vibration model

A vibration is:

> Une évolution détectée dans le réseau, suffisamment pertinente pour déclencher une connexion, une information, une décision ou une action.

Conceptual structure:

```
VIBRATION
├── identity: id, type, source
├── time: detected_at, starts_at, expires_at, recurrence
├── geography: country, region, city, territory, coordinates
├── tourism: tourism_types, experiences, activities, categories
├── audience: travelers, professionals, institutions
├── intelligence: relevance, confidence, intensity, novelty, impact
├── network: nodes, connections, propagation
└── lifecycle: status, acknowledged, acted_on, resolved
```

Vibration lifecycle:
DETECTED → QUALIFIED → ACTIVE → PROPAGATED → INTERACTION → CONFIRMED / EVOLVING → RESOLVED → HISTORY

Additional states:
- EMERGING
- RECURRING
- PREDICTIVE
- EXPIRED

A vibration may affect a node or a relationship.

## 8. Temporal intelligence

State must not be overwritten when historical knowledge matters.

For important entities and relations, preserve:
- what was observed;
- when it was observed;
- when it was recorded;
- when it became valid;
- when it stopped being valid;
- what replaced it;
- evidence;
- confidence over time.

This enables:
**real time → history → trends → weak signals → predictions → 2030 simulation.**

Confidence can evolve as evidence accumulates. Strength and confidence are distinct:
- strength = how much the relation moves;
- confidence = how certain the system is.

Relevance is distinct from both.

## 9. Propagation model

A vibration does not propagate everywhere automatically.

Conceptual score:

```
Propagation Score =
Pertinence
× Confiance
× Impact
× Temporalité
× Compatibilité
× Proximité
× Actionnabilité
```

Propagation can be:
- local;
- territorial;
- national;
- cross-border;
- regional;
- global.

Propagation follows semantic paths, not geography alone.

Example:
event → territory → demand → trade → professional → opportunity.

A parent vibration can create child vibrations:
event → accommodation / transport / food / guides / crafts / health & safety.

Propagation results must be stored so the system can learn which paths work.

## 10. Fil à créer / ponts

The graph must identify missing or weak connections.

### Fil à créer
A relevant demand exists but supply / connection is insufficient.

### Pont
A strategic connection between ecosystems:
- Morocco ↔ France
- Youth ↔ Crafts
- School ↔ Territory
- Sport ↔ Culture
- Tourism ↔ Education

The Cockpit should eventually expose:
- strong links;
- weak links;
- emerging links;
- links to create;
- strategic bridges.

## 11. Araignée / intelligence engine

The Araignée is the central intelligence layer.

It:
1. observes;
2. understands;
3. connects;
4. evaluates;
5. anticipates;
6. propagates;
7. proposes;
8. learns.

Pipeline:

```
OBSERVATION
→ QUALIFICATION
→ COMPRÉHENSION
→ CONNEXION
→ ÉVALUATION
→ ANTICIPATION
→ DÉCISION SYSTÈME
→ PROPAGATION
→ ACTION HUMAINE
→ RÉSULTAT
→ APPRENTISSAGE
```

The system may decide what to observe, connect, prioritize, propagate and propose. It must not decide for the human when the decision concerns their will, identity, money, safety or relationships.

Principles:
- L’IA conseille. Le voyageur décide.
- L’IA assiste. Le professionnel décide.
- L’IA éclaire. L’institution décide.

## 12. Explainability

Important decisions should preserve:

```
DECISION
├── what
├── why
├── evidence[]
├── confidence
├── alternatives[]
├── expected_impact
├── timestamp
└── model_version
```

The Cockpit must distinguish:
- FACT
- DATA
- ANALYSIS
- PREDICTION
- RECOMMENDATION

## 13. Cockpit

The Cockpit is the intelligent strategic command center.

Core views:
- Globe / world vibrations;
- active and new vibrations;
- network health;
- strong / weak / emerging links;
- tensions between demand and supply;
- professional opportunities;
- territory dynamics;
- weak signals;
- anticipation;
- 2030 trajectory;
- “Ce que voit l’Araignée”.

Natural-language questions:
- Que se passe-t-il actuellement au Maroc ?
- Où la demande augmente-t-elle ?
- Quels métiers sont sous-représentés ?
- Quels fils sont en train de se renforcer ?
- Quels territoires présentent une tension ?
- Quels signaux faibles pourraient devenir importants avant 2030 ?

## 14. Economic loop

Every traveler capability must also create professional value:

traveler intent
→ qualified demand
→ relevant professionals
→ exchange on La Toile
→ opportunity
→ commercial activity
→ professional value
→ La Toile revenue.

The system must preserve open directory access while using intelligent relevance for recommendations.

## 15. 2030 strategic objective

2030 is a strategic horizon, not a hardcoded product constraint.

La Toile should progressively support:
- real-time observation;
- historical comparison;
- trend detection;
- weak-signal detection;
- scenario analysis;
- territorial capacity analysis;
- simulation.

Goal:

> Faire de La Toile une infrastructure numérique touristique suffisamment mature pour être pertinente avant, pendant et après le Mondial 2030.

Morocco is the first fully instrumented territory, while the core remains global.

## 16. Implementation boundary for V29.11

This version is intentionally conceptual/documentary.

Do not yet:
- introduce a production graph database;
- hardcode climate classifications as final authoritative data;
- expose personal health data to the graph;
- turn inferred relations into facts;
- automate irreversible actions;
- claim predictive accuracy without validation.

Next implementation brick:
**V29.12 — Temporal Graph Data Model**, translating these concepts into pragmatic PostgreSQL structures for nodes, relations, observations, vibration history, propagation logs, evidence, confidence history, snapshots and retention.
