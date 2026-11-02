# V36 — Adaptateur conversationnel IA du parcours voyageur

## Principe

Le moteur de règles V35 reste le comportement par défaut. L'appel à un modèle externe est **désactivé par défaut** et ne se déclenche que si les quatre paramètres ci-dessous sont définis explicitement.

```env
TRAVEL_ASSISTANT_PROVIDER=compatible
TRAVEL_ASSISTANT_API_URL=https://api.example.com/v1/chat/completions
TRAVEL_ASSISTANT_API_KEY=replace-me
TRAVEL_ASSISTANT_MODEL=your-model
```

Le serveur attend une API compatible avec le format de requête Chat Completions et une réponse JSON dans `choices[0].message.content`.

## Protection et repli

- Sans configuration complète, seul le moteur local V35 est utilisé.
- Le récit est transmis au fournisseur externe uniquement lorsque le mode `compatible` et les paramètres nécessaires sont explicitement configurés.
- Le modèle reçoit une instruction d'extraction factuelle : ne pas inventer les préférences ou contraintes absentes.
- Les champs structurés sont filtrés et bornés avant utilisation.
- Délai d'attente maximal : 12 secondes.
- En cas d'erreur HTTP, de délai dépassé ou de réponse JSON invalide, le moteur revient au résultat déterministe V35.
- La réponse de l'API indique le fournisseur effectif, le repli éventuel et un avertissement technique non sensible.

## Données personnelles

Les récits peuvent contenir des données personnelles ou de santé. Avant d'activer un fournisseur externe en production, l'exploitant doit choisir un fournisseur et une région d'hébergement appropriés, vérifier ses conditions de conservation et de traitement, informer le voyageur et définir une base légale et une durée de conservation. Ne pas activer ce mode par défaut. Les informations de santé ou de mobilité sensibles ne doivent pas être demandées si elles ne sont pas nécessaires au service.

## Limites fonctionnelles

V36 est un adaptateur d'extraction structurée, pas un agent autonome. Il ne réserve rien, ne choisit pas à la place du voyageur, ne garantit pas la disponibilité des offres et ne remplace pas les contrôles de vérité des données de destination, climat, sécurité ou professionnels. La qualification et les propositions restent soumises aux données réellement présentes dans La Toile.
