# Retour d'expérience : la représentation d'un Either validée trop vite

Date : 2026-11-19. Ce document raconte une erreur de méthode et ce qui a été mis en place pour qu'elle ne se reproduise pas. Les règles qui en découlent sont dans `hackathon-tools/guidelines/generalisation.md`.

## Ce qui s'est passé

La conception de l'exercice 01 recommandait de représenter un Either en Go par une struct générique `Either[R]` : succès typé, échec dynamique. Elle s'appuyait sur des mesures réelles et sur un Go compilé et exécuté. J'ai relu la partie centrale et j'ai écrit « je recommande oui », avec une réserve notée à côté.

L'utilisateur a posé une seule question : que se passe-t-il avec plusieurs successions, a b c d e f ? La réponse a montré trois cas où la solution se dégrade ou n'a pas été examinée :

1. plusieurs succès de types différents : le type devient `Either[any]`, et la solution perd tout ce qui la justifiait ;
2. six variantes à distinguer : la sélection repose sur des assertions que Go ne vérifie pas ;
3. une union qui mêle Either et valeur brute : classée « autre famille » et reportée, alors qu'elle apparaît à l'exercice 02.

Rien n'avait été implémenté. L'erreur a coûté un aller-retour, pas du code à défaire. Elle aurait coûté une réécriture si elle avait été découverte à l'exercice 06.

## Les causes, de la plus profonde à la plus visible

**1. L'échantillon a été pris pour la population.** La consigne donnée à l'expert demandait d'évaluer les options « sur les exercices 01 à 10 ». Les dix exercices n'ont qu'un seul type de succès par fonction. La solution a donc été optimisée pour une propriété de l'échantillon que le langage n'impose pas. La faute est d'abord dans ma consigne.

**2. L'analyse n'était pas symétrique.** Le côté Left a été étudié en détail : nommé, avec valeur, union de deux, traversée d'une chaîne. Le côté Right n'a été étudié que pour un seul type. Aucune étape de la méthode ne demandait de refaire le raisonnement pour l'autre côté.

**3. Les mesures ne couvraient que le cas favorable.** Sept scénarios mesurés, tous avec un succès d'un seul type. Le tableau n'avait pas de ligne « pire cas », donc rien ne signalait son absence.

**4. La frontière de famille a été tracée pour arranger la solution.** L'union Either et valeur brute a été déclarée « famille distincte ». Elle contraint pourtant la même décision : comment représenter une union TypeScript en Go.

**5. Les limites étaient écrites, mais sans poids.** Le document disait « donnera `Either[any]`. Prévu, pas fait. » Une ligne, sans déclencheur précis, sans coût, sans mode de détection. Une limite formulée ainsi se lit comme un détail.

**6. L'auteur était aussi le juge.** Le même agent a proposé les options, les a mesurées et a conclu. Personne n'avait pour rôle de casser la proposition.

**7. J'ai relayé au lieu de juger.** J'ai lu les avantages, constaté que les chiffres étaient réels, et transmis la recommandation. J'ai nommé une réserve sans l'essayer. Une réserve que je sais formuler est un essai que je sais écrire.

## Ce que le code faisait déjà mieux que moi

L'écosystème DuploJS porte les garde-fous qui manquaient à ma méthode. Sources : notes de recherche et base locale.

- **Penser en N.** `pipe` déclare quinze surcharges ; les pipes mesurés dans le code réel vont de une à six étapes. La bibliothèque ne suppose jamais « un ».
- **L'exhaustivité est un contrat.** `matchInformation` impose une callback par information et interdit les clés en trop. La documentation l'explique : ajouter une variante oblige à revoir la sélection à l'endroit qui doit décider. C'est exactement la question « et s'il y en a six ? », posée par le typage.
- **Une garde trop large ment.** Avant le commit `c9fe1ca`, une condition jamais vraie faisait de tout type un `float64`. Le programme fonctionnait sur l'exemple et était faux partout ailleurs. Même structure que mon erreur.
- **Le silence a été remplacé par une erreur.** Dans les outils de génération, une contrainte non prise en charge était ignorée ; elle fait maintenant échouer le rendu, parce qu'en oublier une produit un type faux.
- **Ce qui a marché sur un cas a dû être élargi.** Le commit `4ea71f2` fait passer le résultat d'un transformer de `schema` à `{ schema, isOptional }` après qu'une information s'est perdue derrière une référence.
- **La preuve est un comportement comparé.** Les snapshots valident la stabilité, pas la justesse. Un seul précédent compare réellement la sortie au comportement d'origine.

## Ce qui a été mis en place

| Cause | Parade |
|---|---|
| Échantillon pris pour la population | Règle d'or et axes de variation, chargés à chaque session |
| Analyse non symétrique | Axe « symétrie » : refaire chaque colonne pour l'autre côté |
| Mesures du seul cas favorable | Trois lignes obligatoires par tableau : courant, N = 6, hétérogène |
| Frontière de famille complaisante | Critère : même type Go contraint, donc même famille |
| Limites sans poids | Trois champs obligatoires : déclencheur, coût, détection |
| Auteur et juge confondus | Agent `expert-contradicteur`, qui ne reçoit que le document |
| Relais sans jugement | Conditions préalables à tout « je recommande » |
| Aucune preuve exécutable au-delà des exercices | Corpus `hackathon-tools/verify/epreuves/`, lancé par `verify.sh` |

## Ce que ces parades ne garantissent pas

- Les axes sont une liste. Un axe qui n'y figure pas reste un angle mort ; elle devra s'allonger à chaque nouvelle erreur de ce type.
- Le contradicteur est un modèle du même genre que l'auteur. Il attaque mieux qu'un auteur ne se relit, mais il peut partager les mêmes angles morts.
- Le corpus ne prouve que ce qu'il contient. Trois épreuves pour la famille des unions, aucune encore pour les autres.
