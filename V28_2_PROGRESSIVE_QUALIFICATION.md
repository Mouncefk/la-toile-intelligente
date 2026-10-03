# V28.2 — Qualification progressive

V28.2 poursuit V28.1 sans modifier main/V26 ni le contrat V27.

## Objectif

Empêcher la préparation prématurée d'une demande incomplète et guider le voyageur uniquement sur les informations encore nécessaires.

## Parcours

1. Le voyageur exprime librement son besoin.
2. L'Intent Engine identifie l'activité, le profil, le compagnon, le rythme et les besoins de proximité.
3. Si la localisation manque, l'interface propose des choix adaptés au pays actif.
4. Si la période manque, l'interface propose une période simple.
5. Chaque choix est synchronisé avec PATCH /api/experience/v27/session/:id/qualify.
6. Le bouton « Préparer la demande » reste désactivé tant que la qualification obligatoire n'est pas complète.
7. Une demande complète est créée via POST /api/experience/v27/session/:id/request.

## Principe

La Toile qualifie et organise. Le voyageur conserve la décision finale. La diffusion aux professionnels et le matching restent des étapes distinctes et confirmées.

## V28.2 — état

- Globe-first : V28
- Bridge UI → Experience Core : V28.1
- Qualification progressive : V28.2
- Main/V26 : inchangé
