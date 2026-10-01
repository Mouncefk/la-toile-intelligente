# La Toile V18 — Radar Core

V18 ajoute le Radar de La Toile.

Objectif :
- recueillir des informations publiques pertinentes ;
- qualifier les signaux par IA ;
- distinguer événements, opportunités, besoins, appels à collaboration et informations utiles ;
- rattacher les signaux à un pays/territoire ;
- suggérer les professionnels ou institutions concernés ;
- préparer une diffusion ciblée.

Le Radar ne publie pas automatiquement une information comme vérité : la source, la date de découverte et le niveau de confiance doivent rester visibles.

## Flux

Source publique
→ découverte
→ déduplication
→ qualification IA
→ contrôle de pertinence
→ matching
→ suggestion de dispatch
→ action humaine/professionnelle.

## Types initiaux

- event
- opportunity
- partnership
- b2b_need
- public_notice
- tourism_signal
- craft_signal
- senior_tourism_signal
- health_safety_signal

## API

GET  /api/radar/v18/signals
POST /api/radar/v18/signals
POST /api/radar/v18/signals/:id/qualify
POST /api/radar/v18/signals/:id/dispatch
