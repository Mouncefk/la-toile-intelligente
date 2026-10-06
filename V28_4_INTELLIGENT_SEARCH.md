# V28.4 — Recherche intelligente, anticipation et ajustement

## Objectif

Faire évoluer la recherche voyageur d'un formulaire classique vers une **proposition intelligente progressive**.

Principe directeur :

> **La Toile anticipe, propose, explique et félicite. Le voyageur choisit.**

L'utilisateur peut exprimer son besoin en langage naturel, utiliser des listes déroulantes incitatives ou combiner les deux. Les deux chemins alimentent le même moteur d'intention.

## 1. Deux portes d'entrée

### A. Je sais où je veux aller

Globe → pays → territoire → expérience / service.

Le pays ou territoire déjà sélectionné devient automatiquement du contexte. La Toile ne redemande pas une information qu'elle connaît déjà.

### B. Je sais ce que je recherche

Texte libre + listes incitatives.

Exemples de listes :
- Quand ?
- Où ?
- Quel climat ?
- Quel environnement ?
- Que souhaitez-vous vivre ?
- Avec qui ?
- Besoins particuliers ?
- Je ne sais pas encore — guidez-moi
- Surprenez-moi

La destination peut rester inconnue : le moteur peut rechercher des destinations compatibles avec les critères.

## 2. États de recherche

L'état est déduit automatiquement, il n'est pas demandé à l'utilisateur.

- **Précise** : destination, type de professionnel ou service et période connus.
- **Semi-précise** : une partie des critères est connue.
- **Exploratoire** : l'utilisateur cherche une destination à partir de critères.
- **Évolutive** : l'utilisateur ajuste progressivement une proposition.
- **Anticipative** : La Toile identifie les besoins qui découleront naturellement du voyage.

Ces états ne sont pas des écrans obligatoires.

## 3. Ordre logique du moteur

L'interface ne doit pas imposer un formulaire séquentiel, mais le moteur doit raisonner selon le contexte disponible :

1. contexte déjà connu ;
2. date / période ;
3. destination ou recherche de destination ;
4. climat et conditions ;
5. expériences pertinentes ;
6. profil du voyageur ;
7. besoins particuliers ;
8. lieux / territoires ;
9. professionnels et solutions ;
10. anticipation des besoins futurs.

La prochaine question ou liste affichée est celle qui apporte le plus de valeur compte tenu de ce qui est déjà connu.

## 4. Moteur des Expériences Saisonnières

Toute expérience sensible au temps doit être évaluée selon :

**lieu + date + saison + climat/conditions + calendrier de l'activité.**

Domaines notamment concernés :
- balnéaire ;
- ski ;
- snowboard ;
- sports de glisse ;
- surf ;
- kitesurf ;
- windsurf ;
- plongée ;
- randonnée ;
- montagne ;
- désert ;
- nature ;
- observation de la faune ;
- festivals et événements ;
- artisanat et activités saisonnières ;
- gastronomie et activités liées aux saisons.

Règle :

> Une expérience moins adaptée à la période ne doit pas être poussée comme recommandation principale.

Message UX validé :

> **Cette expérience est moins adaptée à votre période.**  
> **Voici d'autres possibilités correspondant mieux aux conditions prévues.**

La Toile informe sans interdire. Le voyageur peut néanmoins choisir l'expérience initiale.

## 5. Proposition intelligente en amont

Dès que les informations disponibles sont suffisantes, La Toile prépare une première proposition sans attendre que l'utilisateur remplisse tous les champs.

Exemple :
- destination ;
- dates ;
- voyageurs ;
- expériences ;
- climat ;
- hébergement ;
- transport ;
- santé & sécurité ;
- événements ;
- déplacements ;
- besoins liés au profil.

La proposition est ajustable.

Principe :

> **Proposer d'abord, ajuster ensuite.**

## 6. Ajustement manuel

Chaque élément important doit pouvoir être modifié directement.

Exemples :
- dates ;
- destination ;
- territoire ;
- climat ;
- expérience ;
- rythme ;
- hébergement ;
- transport ;
- santé & sécurité ;
- profil.

L'utilisateur ne repart jamais de zéro.

## 7. Avis de l'IA sur l'ajustement

L'utilisateur n'a pas à commenter son propre ajustement.

**C'est l'IA qui commente le choix de l'utilisateur.**

Après une modification, l'IA peut :
- féliciter le choix ;
- expliquer ce qu'il améliore ;
- signaler un compromis ;
- expliquer une conséquence ;
- proposer une alternative.

Exemples :

> **👏 Excellent choix !**  
> Ce changement correspond très bien à votre recherche.

> **✨ Très bon choix !**  
> Cette modification ouvre davantage de possibilités pour la période choisie.

> **ℹ️ À savoir :** ce choix augmente légèrement les temps de déplacement.

L'IA ne doit jamais donner l'impression qu'elle valide ou invalide la décision.

Éviter les formulations :
- « mauvais choix » ;
- « erreur » ;
- « déconseillé » ;
- « vous devriez » ;
- « je préfère ».

Principe :

> **L'IA conseille. Le voyageur décide.**

## 8. Recherche professionnelle : portée selon le besoin

La portée n'est pas un rayon unique affiché à l'utilisateur.

Elle dépend de la nature du besoin et de la zone d'intervention du professionnel.

### Recherche locale

À privilégier pour les services physiquement liés au lieu :
- hôtel / hébergement ;
- restaurant ;
- location de voiture ;
- taxi / chauffeur ;
- médecin / clinique / pharmacie ;
- spa / bien-être ;
- école ou centre sportif ;
- plongée ;
- guide local ;
- activités locales.

Ordre :
**ville → zone → environs pertinents**, puis élargissement si nécessaire.

### Recherche nationale

Pour les professionnels pouvant intervenir ou organiser à l'échelle du pays :
- voyagiste ;
- agence ;
- organisateur de circuits ;
- spécialiste d'une destination ;
- opérateur national ;
- certains prestataires spécialisés.

### Recherche internationale

Pour les besoins multi-pays ou lorsqu'une compétence particulière justifie l'ouverture :
**national → international → global**, de manière progressive.

Attribut professionnel à prévoir :
**scope de service** = local / régional / national / international / mondial.

## 9. Aucun résultat exact

Absence d'offre exacte ne doit jamais signifier absence de solution.

Ordre :
1. offre exacte ;
2. professionnels capables de construire la solution ;
3. combinaison de plusieurs professionnels ;
4. appel à propositions ;
5. élargissement géographique si pertinent.

Message possible :

> **Aucun séjour ne correspond actuellement exactement à votre recherche.**  
> **Nous avons cependant trouvé des professionnels capables de construire une solution adaptée.**

Une demande peut générer plusieurs besoins professionnels indépendants :
- hébergement ;
- transport ;
- restauration ;
- activité ;
- guide ;
- santé & sécurité ;
- etc.

## 10. Anticipation

La Toile doit anticiper les besoins découlant naturellement du contexte.

Exemple :
**Marrakech · 10–18 octobre · voyage senior**

La Toile peut proposer en amont :
- hébergement ;
- transport ;
- restaurants ;
- santé & sécurité ;
- activités ;
- événements pendant le séjour ;
- conditions météo/climat ;
- déplacements.

L'anticipation doit rester :
**proactive mais non intrusive**.

## 11. Professionnels et classement

Le classement doit séparer :

### Pertinence
Compatibilité réelle avec la demande.

### Qualité / confiance
Vérification, complétude, actualisation, disponibilité, réactivité, etc.

### Abonnement
Détermine les fonctionnalités et le niveau de visibilité accessibles.

### Règle

> **L'abonnement donne des possibilités de visibilité ; il ne transforme pas un professionnel non pertinent en professionnel pertinent.**

Le niveau de finition du tableau de bord professionnel est lui-même un signal de qualité :
- profil complété ;
- spécialités ;
- territoires couverts ;
- langues ;
- disponibilités ;
- informations de contact ;
- vérification ;
- expériences ;
- annonces ;
- actualisation ;
- traitement des demandes.

## 12. Politique tarifaire d'affichage

La Toile ne doit pas afficher de tarifs de professionnels dans le moteur de recommandation.

La Toile :
- ne fixe pas le prix ;
- ne classe pas sur le prix ;
- ne recommande pas un professionnel parce qu'il est moins cher.

Le voyageur décide après réception des réponses pertinentes.

## 13. Formule UX de référence

**Expression libre**
→ **compréhension**
→ **proposition intelligente**
→ **listes incitatives**
→ **ajustement manuel**
→ **avis positif et explicatif de l'IA**
→ **recalcul**
→ **anticipation**
→ **professionnels / solutions**
→ **choix du voyageur**

### Règle d'or

> **La Toile fait le travail complexe en arrière-plan pour rendre le parcours simple en façade.**



## 14. Interaction rule — positive AI commentary

After every meaningful manual adjustment, the interface must let the AI comment on the choice without judging or directing the traveler.

Preferred tone:
- “👏 Excellent choix !”
- “✨ Très bon choix !”
- “👍 Ce choix correspond très bien à votre recherche.”
- “ℹ️ À savoir : …”

The AI may explain consequences and trade-offs, but must not frame the choice as an error or require the traveler to follow the recommendation.



## V28.5 — Historique de voyage comme signal de personnalisation

L’historique de voyage peut être pris en compte lorsqu’il existe, mais il reste un **signal souple** : il éclaire la personnalisation sans définir le voyageur ni ses préférences actuelles.

### Règle de formulation

La Toile doit rester factuelle et neutre. Formulation de référence :

> « Parmi vos précédentes expériences de voyage, certaines étaient balnéaires. Souhaitez-vous retrouver ce type d’expérience ou découvrir autre chose cette fois-ci ? »

Ne jamais transformer automatiquement une observation historique en préférence actuelle. Une expérience passée, une recherche passée ou un comportement passé ne constitue pas à lui seul une préférence déclarée.

### Principe produit

**L’historique éclaire la conversation, mais ne définit jamais le voyageur.**

Le voyageur peut choisir de ne pas utiliser son historique pour la personnalisation. Les données sensibles de « Ma santé » restent séparées et ne doivent pas être utilisées comme simple signal de recommandation.
