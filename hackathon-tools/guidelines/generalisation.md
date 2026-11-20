# Généraliser avant de recommander

Ce fichier est chargé à chaque session. Il s'applique à toute conception, à toute recommandation et à toute relecture, pour moi comme pour les agents. Le récit de l'erreur qui l'a motivé est dans `hackathon-tools/guidelines/retour-experience-either.md`.

## 1. L'erreur à ne plus commettre

Recommander une solution qui a été éprouvée sur les exemples disponibles, et pas sur ce que le langage permet d'écrire.

Les onze exercices sont un échantillon. La population, c'est tout ce que TypeScript et DuploJS acceptent. Une conception se juge sur la population.

Formules qui doivent déclencher l'alarme, chez moi comme dans le rapport d'un agent :

- « prévu, pas fait », « à concevoir plus tard », « à revoir si »
- « c'est une autre famille », « hors de portée »
- « ça devient `any` », « cas par défaut », « repli »
- « limite assumée » sans déclencheur, sans coût mesuré, sans mode de détection
- un tableau de mesures sans ligne « pire cas »
- « je recommande » écrit avant d'avoir cherché ce qui casse la solution

## 2. Les axes de variation

Pour toute construction à traduire et toute représentation à choisir, dérouler chaque axe. Un axe non déroulé est un angle mort, pas une hypothèse raisonnable.

| Axe | Ce qu'on fait varier | Valeurs à essayer |
|---|---|---|
| Cardinalité | Tout ce qui peut être plusieurs : variantes, étapes, arguments, éléments, fichiers | 0, 1, 2, puis N avec N = 6 au minimum (« a b c d e f ») |
| Symétrie | Chaque axe sur chaque côté : Left et Right, entrée et sortie, valeur et type, appelant et appelé | Refaire la colonne entière pour l'autre côté |
| Hétérogénéité | Les types des membres | Tous identiques, tous différents, membres mêlés à un non-membre (Either et valeur brute) |
| Profondeur | L'imbrication | Either d'Either, tableau d'unions, union dans un générique, récursion |
| Succession | Une chaîne dont le type change à chaque maillon | 6 maillons, 6 types |
| Forme d'écriture | Ce que le développeur peut taper pour la même chose | Donnée d'abord ou curryfiée, référence nue ou fléchée, alias d'import, type annoté ou inféré |
| Position | L'endroit où la construction apparaît | Premier niveau, corps de fonction, branche rétrécie, argument, valeur de retour, contexte asynchrone |
| Valeurs limites | Les données | Vide, `undefined`, `null`, `NaN`, `-0`, très grand |
| Composition | Avec chaque construction déjà prise en charge | Deux à deux |

N = 6 n'est pas arbitraire : les pipes mesurés dans le code réel vont jusqu'à six étapes, et `pipe` déclare quinze surcharges. La bibliothèque pense en N, pas en 1.

## 2 bis. Échantillon ou inventaire : choisir l'outil

Une recherche par le sens renvoie les k extraits les plus proches. C'est un échantillon. S'en servir pour répondre à « est-ce que tout est géré ? » reproduit l'erreur du §1.

| Question | Outil | Nature |
|---|---|---|
| Pourquoi c'est fait ainsi, quelle est la sémantique | `search`, puis `api` pour la fiche | Échantillon |
| Quelles formes d'appel le typage accepte | `signatures` | Inventaire : toutes les surcharges, lues dans le source |
| Quelles formes sont réellement écrites, et combien | `usages` | Inventaire : décompte par nombre d'arguments, par zone, références nues |
| Quelles fonctions existent dans un domaine | `api_list` | Inventaire |
| Qu'est-ce qui est réellement géré aujourd'hui | `coverage`, `verify` | Inventaire : chaque exercice et chaque épreuve, exécutés |

Ces outils sont exposés par le serveur MCP `hackathon` (`.mcp.json`). Quand il n'est pas chargé, la même chose s'appelle en ligne de commande : `hackathon-tools/mcp/h <outil> <arguments>`, et `hackathon-tools/mcp/h` seul liste les outils.

Une affirmation de couverture (« tous les cas », « toutes les formes ») s'appuie sur un inventaire. Appuyée sur une recherche, c'est une hypothèse.

## 3. L'épreuve, avant toute recommandation

1. **Remplir la matrice.** Axes en lignes, options en colonnes. Chaque case dit : tient, se dégrade ou casse, et sur quelle preuve (exécuté, lu, hypothèse). Une case vide interdit de recommander.
2. **Chercher le contre-exemple.** Pour chaque option, écrire le plus petit programme TypeScript valide qui la met dans son pire cas, et l'exécuter. Les programmes vont dans `hackathon-tools/verify/epreuves/<famille>/`.
3. **Mesurer le pire cas.** Tout tableau de mesures a trois lignes au moins : cas courant, N = 6, cas hétérogène.
4. **Nommer chaque dégradation.** Trois champs obligatoires :
   - le déclencheur : la forme TypeScript exacte ;
   - le coût : mesuré, ou marqué hypothèse ;
   - la détection : erreur à la transpilation, erreur à la compilation Go, panique à l'exécution, ou silence. Le silence est interdit. Une panique à l'exécution doit être justifiée par une garantie que TypeScript donne déjà.
5. **Tracer la frontière de famille.** Un cas ne peut être déclaré « autre famille » que s'il ne contraint pas le même type Go. S'il le contraint, c'est la même famille et la conception doit le couvrir.
6. **Différer le code, jamais la décision.** Reporter l'implémentation d'un cas est permis si un essai exécuté montre que la représentation choisie ne le bloque pas. Reporter la question elle-même ne l'est pas.

## 4. Qui a le droit de dire « je recommande »

- **L'auteur n'est pas le juge.** Une conception d'`expert-transpileur` passe par deux contrôles avant d'être présentée. `expert-couverture` dresse l'inventaire de la population et dit, cas par cas, ce que le document gère, refuse ou oublie. `expert-contradicteur` cherche ce qui casse la représentation. Aucun des deux ne reçoit mon avis sur le document.
- **Je ne relaie pas une recommandation, je la juge.** Avant de dire oui, je vérifie que la matrice est remplie, que le contre-exemple a été cherché et que le rapport du contradicteur existe.
- **Une réserve est un essai à faire.** Si je peux nommer une réserve, je l'exécute avant de répondre, je ne la mentionne pas à côté d'un « oui ».
- **Je présente d'abord ce qui n'a pas été éprouvé.** Avant les avantages.

## 5. Ce que le code de l'écosystème enseigne

| Fait observé | Règle que j'en tire |
|---|---|
| `matchInformation` exige une callback par information et refuse les clés en trop ; ajouter une variante oblige à revoir chaque sélection | Toute discrimination émise en Go est exhaustive et vérifiée à la transpilation. Une branche oubliée est une erreur du transpileur, pas une panique chez l'utilisateur |
| Le commit `c9fe1ca` du boilerplate corrige une garde trop large qui transformait tout type en `float64` | Une garde reconnaît exactement son cas et refuse bruyamment le reste. Une valeur DuploJS vient toujours par paire : sa valeur et son type |
| Dans `tools`, une contrainte non prise en charge est passée de « ignorée » à une erreur | Aucune information ne disparaît sans trace. Ce qui n'est pas traduit fait échouer la transpilation |
| Le commit `4ea71f2` élargit le résultat d'un transformer parce que l'information se perdait derrière une référence | Ce que le parent doit savoir de l'enfant voyage dans le résultat. Inspecter le Go généré pour deviner signale un champ manquant |
| Le boilerplate distingue `notSupport` (essayer le suivant) de `notfound-transformer` (personne ne sait) | Refuser avant tout effet sur le contexte. Propager tel quel l'échec d'un enfant |
| Les précédents ont un test par transformer et des snapshots, mais aucun ne compile sa sortie ; seul `zod-accelerator` compare le comportement | Un cas est couvert quand `verify.sh` exécute le TypeScript et le Go et que les sorties sont identiques. Rien d'autre ne compte comme preuve |
| Dans le code réel, la garde `if (isLeft(x)) return x` domine ; `rightPipe` et `matchInformation` sont minoritaires | Les exercices ne disent pas ce qui est fréquent. Pondérer avec `hackathon-tools/notes/06-usages-reels-frequences.md` |

## 6. Terminé veut dire

- la matrice des axes est dans le document de conception, sans case vide ;
- chaque famille touchée a ses épreuves dans `hackathon-tools/verify/epreuves/`, et chacune est soit identique en TypeScript et en Go, soit refusée par une erreur explicite du transpileur ;
- chaque dégradation a son déclencheur, son coût et sa détection ;
- le rapport du contradicteur est joint, avec ce qu'il n'a pas réussi à casser et ce qu'il a cassé ;
- ce qui reste une hypothèse est écrit comme tel.
