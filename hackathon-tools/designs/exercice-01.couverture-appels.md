# Couverture — exercice 01, tranche « appels et formes d'appel »

Date : 2026-11-19. Document examiné : `hackathon-tools/designs/exercice-01.md`. Aucun fichier de `src/`, `bin/`, `projects/` ni le README du corpus n'a été modifié.

Classes : **géré** (traité, et une épreuve exécutée par `verify.sh` le montre), **sur parole** (le document dit « fait », sans épreuve transpilée), **refusé** (erreur explicite voulue), **différé** (« prévu »), **oublié** (le document n'en dit rien).

État de départ mesuré (`h coverage`) : aucun exercice ni aucune épreuve ne passe `verify.sh` (00 échoue à la compilation Go, 01 à 10 à la transpilation). La classe « géré » est donc vide par construction : le Go attendu du §8 est écrit à la main et exécuté, ce n'est pas la sortie du transpileur.

## 1. Décomptes

| Classe | Cas |
|---|---|
| géré | 0 |
| sur parole | 9 |
| refusé | 2 |
| différé | 12 |
| oublié | 27 |
| **population** | **50** |

## 2. Ce qui n'est pas géré, par fréquence dans le code réel

Comptages : `h usages` pour les fonctions DuploJS ; `grep` sur `hackathon-tools/sources/ecosystem` (3 638 fichiers `.ts`, hors `node_modules` et `dist`) pour les formes que `usages` ne compte pas.

| Rang | Cas | Fréquence | Classe | Ce que montre l'essai |
|---|---|---|---|---|
| 1 | `await` et fonction `async` (ligne 16) | 3 630 `await` | différé | §11 : `declaration/function.ts` ignore `async` sans erreur, donc silence |
| 2 | Méthodes natives `.map(`, `.then(`, `.push(`, `.filter(`, `.join(`, `.includes(`, `.slice(`, `.toString(` (ligne 14) | 1 262 pour ces huit | oublié | — |
| 3 | Fonction atteinte par un ré-export `export * from` (ligne 5) | 1 251 lignes `export *` | oublié | — |
| 4 | `DCommon.pipe` comme forme d'appel, 2 à 8 arguments réels, 16 surcharges (ligne 48) | 1 082 | oublié | Le document ne cite le pipe que pour refuser une référence nue dedans |
| 5 | Paramètres optionnels, par défaut, rest, vus du site d'appel (ligne 24) | 608 `?:` + 78 défauts | oublié | §11 le signale côté déclaration comme ignoré sans erreur |
| 6 | Constructeurs dont Go ne peut pas inférer le Right : `left(info, v)` 377, `right(info)` 78, `left(info)` 47, `fail()` 14 (ligne 39) | 516 | différé, [HYPOTHÈSE] dans le document | Essai Go exécuté : `Fail()` → `cannot infer R`. La forme Y du §4 ne suffit pas dès l'exercice 04 |
| 7 | Appel optionnel `?.()` (ligne 15) | 146 | oublié | — |
| 8 | Référence nue de bibliothèque en argument : `isRight` 77, `DString.to` 20, `isLeft` 16, `coalescing` 15, `success` 8, `fail` 2, `group` 1 (ligne 45) | 139 | différé avec erreur | Essai Go : `Map(xs, Success)` s'infère ; `WhenIsRight(Coalescing)` non |
| 9 | Forme curryfiée : `map` 67, `whenIsRight` 36, `whenIsRightOtherwise` 12, `matchInformation` 7 (lignes 42 à 44) | 122 | oublié | Essai Go : `WhenIsRight(Coalescing)` → `cannot infer R`. La forme curryfiée est majoritaire pour `whenIsRight` (36 sur 41) |
| 10 | Argument étalé sur une fonction utilisateur (ligne 22) | 64 | oublié | Le refus du document ne vaut que pour `sharedDependencyCallHandler` |

Deux oublis sans fréquence mesurable mais établis par un essai Go exécuté (Docker `golang:1.27`, hors dépôt) :

- **Ordre d'initialisation des modules importés (ligne 8).** TypeScript charge dans l'ordre des `import` (`zulu` puis `alpha`). Go initialise les packages importés dans l'ordre trié des chemins : le même programme affiche `alpha chargé` avant `zulu chargé`. Divergence silencieuse dès qu'un fichier importé a un effet de premier niveau. Le §6 affirme que « l'ordre des effets est celui du module » : vrai dans un fichier, faux entre fichiers.
- **Cycle d'import (ligne 7).** Un fichier TypeScript devient un package Go ; deux fichiers qui s'importent mutuellement donnent `import cycle not allowed`. Détection : compilation Go, pas transpilation.

Contradiction interne à signaler : le §4 retient la forme Y (inférence Go) contre la forme X (instanciation explicite) au motif que le type TypeScript d'une variable rétrécie n'est pas le type Go. Or les lignes 39, 42 et 45 exigent l'instanciation explicite, donc la forme X, dès les exercices 02 à 04. L'objection faite à X s'applique alors telle quelle et le document ne la lève pas.

## 3. Tableau complet

Épreuves : dossiers de `hackathon-tools/verify/epreuves/appels/`, sauf mention. Toutes s'exécutent (`tsx`) et passent le typage (`tsc --noEmit`).

### 3.1 Fonction utilisateur : import et appelé

| # | Cas | Axe | Inventaire | Classe | Épreuve |
|---|---|---|---|---|---|
| 1 | Import nommé, appel à 2 littéraux en initialisation de constante | Forme | 2 306 imports nommés relatifs ; exercices 01 à 10 | sur parole (§8) | `projects/01` |
| 2 | Appel en instruction isolée `add(1, 2);` | Position | exercice 00 | sur parole (§10.1) | `appel-instruction-isolee` |
| 3 | Import nommé avec alias `{ add as plus }`, même fonction sous deux noms | Forme | 12 | oublié | `import-alias-nomme` |
| 4 | Import d'espace de noms d'un fichier utilisateur `Operations.add(…)` | Forme | 25 | oublié | `import-espace-de-noms-utilisateur` |
| 5 | Fonction atteinte par ré-export (`export * from`, `export { add as plus } from`) | Forme, profondeur | 1 251 | oublié | `import-reexport-baril` |
| 6 | Import par défaut | Forme | 28 | oublié | `import-par-defaut` |
| 7 | Cycle d'import entre deux fichiers | Composition | non compté | oublié ; Go refuse (essai) | `import-cycle` |
| 8 | Ordre d'initialisation des fichiers importés | Ordre | non compté | oublié ; Go diverge (essai) | `ordre-initialisation-modules` |
| 9 | Fonction du même fichier appelée avant sa déclaration | Position | 1 821 déclarations `function` | oublié | `fonction-locale-hissee-recursive` |
| 10 | Appel récursif | Profondeur | non compté | oublié | `fonction-locale-hissee-recursive` |
| 11 | Fonction fléchée rangée dans une constante puis appelée | Forme | 29 au premier niveau | oublié | `fonction-locale-hissee-recursive` |
| 12 | Appel d'un paramètre de type fonction | Symétrie appelant/appelé | non compté | oublié | `fonction-locale-hissee-recursive` |
| 13 | Appel du résultat d'un appel `f(a)(b)`, fléchée appelée sur place | Profondeur | non compté | oublié | `ordre-evaluation-arguments`, `forme-curryfiee-hors-pipe` |
| 14 | Méthode native (`.map`, `.then`, `.push`, …) | Forme | 1 262 | oublié | `methode-native` |
| 15 | Appel optionnel `format?.(value)` | Forme, valeurs limites | 146 | oublié | `appel-optionnel` |
| 16 | Fonction `async`, `await` d'un appel, promesse rangée puis attendue | Position | 3 630 `await` ; exercice 10 | différé (§7.1 `notfound-transformer` ; §11 silence sur `async`) | `appel-asynchrone` |
| 17 | Fonction générique utilisateur, arguments de type explicites `identity<number>(3)` | Forme | non compté | différé (§7.6, §11 : génériques ignorés sans erreur) | `arguments-de-type-explicites` |

### 3.2 Arguments et ordre d'évaluation

| # | Cas | Axe | Inventaire | Classe | Épreuve |
|---|---|---|---|---|---|
| 18 | Fonction utilisateur à 0 argument | Cardinalité 0 | non compté | oublié | `six-arguments-heterogenes` |
| 19 | 6 arguments de types différents (nombre, chaîne, booléen, tableau, objet, fonction) | Cardinalité 6, hétérogénéité | non compté | oublié | `six-arguments-heterogenes` |
| 20 | Appel imbriqué, profondeur 2 (`isRight(add(1, 2))`, `success(success(1))`) | Profondeur | — | sur parole (§7.3, §7.5) | `appel-instruction-isolee` |
| 21 | Appels imbriqués, profondeur 6 | Profondeur 6 | non compté | oublié | `six-arguments-heterogenes` |
| 22 | Argument étalé sur une fonction utilisateur `add(...pair)` | Forme | 64 (toutes cibles) | oublié | `argument-etale` |
| 23 | Argument étalé sur une fonction de bibliothèque | Forme | — | refusé (`spread-argument-not-supported`) | — |
| 24 | Moins d'arguments que de paramètres (optionnel, défaut, `undefined` explicite, rest à 0 et 6) | Cardinalité, valeurs limites | 608 + 78 | oublié côté appel | `parametres-optionnels-et-defaut` |
| 25 | Argument ternaire dont une seule branche a un effet | Ordre | exercice 06 (`one < 0 ? one : two`) | oublié | `argument-conditionnel-effets` |
| 26 | Argument `&&` ou `\|\|` avec court-circuit | Ordre | non compté | différé (§11 : court-circuit perdu, sans erreur) | `argument-conditionnel-effets` |
| 27 | Arguments évalués de gauche à droite, y compris imbriqués | Ordre | — | sur parole (§4) ; §11 note que les enfants sont transformés en parallèle | `ordre-evaluation-arguments` |
| 28 | Appelé évalué avant les arguments quand l'appelé a un effet | Ordre | non compté | oublié (le §4 ne raisonne que sur un appelé constant) | `ordre-evaluation-arguments` |
| 29 | Appel en condition, en initialisation de constante, en argument | Position | — | sur parole (§7.3) | `appel-dans-chaque-position` |
| 30 | Appel dans un `return`, un corps de fléchée, un élément de tableau, une propriété d'objet, un gabarit, une branche de ternaire | Position | exercices 07 à 10 pour la fléchée | oublié | `appel-dans-chaque-position` |

### 3.3 Fonction de bibliothèque, forme donnée d'abord

| # | Cas | Axe | Inventaire (`h usages`) | Classe | Épreuve |
|---|---|---|---|---|---|
| 31 | `DEither.success(expr)` | Forme | 319 sur 327 | sur parole | `projects/00`, `projects/01` |
| 32 | `DEither.isRight(x)` | Forme | 371 sur 448 | sur parole | `projects/01` |
| 33 | `DCommon.print(x)` | Forme | 26 sur 29 | sur parole | `projects/01` |
| 34 | `print(x, "info" \| "warn" \| "error" \| { depth })` | Cardinalité | 3 | différé (`print-params-not-supported`) | — |
| 35 | `print(x, { columns })` | Cardinalité | compris dans les 3 | refusé | — |
| 36 | `DEither.success(1);`, `DEither.isRight(x);` en instruction isolée | Position | non compté | différé (erreur `…-reference`, mal nommée pour ce cas) | `appel-instruction-isolee` |
| 37 | Import nommé, import nommé avec alias, alias d'espace de noms d'une fonction de bibliothèque | Forme | 0 sur 2 640 imports `@duplojs/lang` | sur parole (§7.3 à §7.5) | `import-nomme-bibliotheque` |
| 38 | Arguments de type explicites, Right plus large que l'argument (`success<number \| string>(1)`) | Forme, hétérogénéité | non compté | différé ; détection à la compilation Go, pas à la transpilation | `arguments-de-type-explicites` |
| 39 | Constructeur dont le Right n'est pas inférable : `fail()`, `left(info)`, `right(info)`, `left(info, v)`, tableau vide | Cardinalité 0, symétrie Left/Right | 14 + 47 + 78 + 377 ; exercices 04 à 10 | différé ([HYPOTHÈSE], §3.5 limite 3) ; essai Go : `cannot infer R` | `constructeur-type-non-inferable` |
| 40 | `DEither.isLeft(x)` | Symétrie | 364 sur 380 | différé (`transformation-error`) | `import-nomme-bibliotheque` |
| 41 | Les autres fonctions des exercices en forme donnée d'abord : `whenIsRight` 2 arg. (5), `whenIsRightOtherwise` 3 arg. (8), `DArray.map` 2 arg. (75), `matchInformation` 2 arg. (19), `group` (13), `asyncGroup` (11), `DString.to` (29), `DArray.coalescing` (22) | Cardinalité | chiffres ci-contre | différé (§3.4, « raisonnés, pas exécutés ») | `projects/02`, `06`, `09`, `10`, `unions/*` |

### 3.4 Forme curryfiée, référence nue, pipe

| # | Cas | Axe | Inventaire | Classe | Épreuve |
|---|---|---|---|---|---|
| 42 | Forme curryfiée comme étape de pipe | Forme | `map` 67, `whenIsRight` 36, `whenIsRightOtherwise` 12, `matchInformation` 7 ; exercices 03 à 08 | oublié ; essai Go : inférence impossible | `projects/03` à `08` |
| 43 | Forme curryfiée hors pipe : rangée dans une constante, appliquée sur place, passée à `map` | Position | non compté | oublié | `forme-curryfiee-hors-pipe` |
| 44 | Choix de la surcharge par le nombre d'arguments (`map`, `whenIsRight`, `whenIsRightOtherwise`, `matchInformation` testent `args.length`) | Forme | `h signatures` : 4 fonctions à aiguillage dynamique | oublié | `forme-curryfiee-hors-pipe` |
| 45 | Référence nue de bibliothèque en argument | Forme | 139 (détail §2) ; exercices 02 à 08 | différé avec erreur (`either-is-right-reference`, `either-success-reference`, `common-print-reference`) | `reference-nue-bibliotheque` |
| 46 | Référence nue de bibliothèque rangée dans une constante ou une propriété d'objet (`success: DString.to`, exercice 07) | Position | exercice 07 | différé pour la constante ; propriété d'objet non citée | `reference-nue-bibliotheque` |
| 47 | Référence nue d'une fonction utilisateur (argument, étape de pipe, constante, via espace de noms) | Symétrie | non compté | oublié | `reference-nue-utilisateur` |
| 48 | `DCommon.pipe` de 2 à 16 arguments, étapes de formes mêlées, type qui change à chaque étape | Succession, cardinalité 6 | 1 082 : 867 / 120 / 65 / 17 / 7 / 4 / 1 pour 2 à 8 arguments | oublié | `pipe-six-etapes-formes-melees` |
| 49 | Pipe dans un pipe, premier argument qui est un appel, référence nue en dernière étape | Profondeur | non compté | oublié | `pipe-imbrique-premier-argument-appel` |
| 50 | `rightPipe` (33, jusqu'à 8 arguments), `asyncPipe` (127), `rightAsyncPipe` (45, jusqu'à 10), 16 surcharges chacun | Succession | chiffres ci-contre | différé (§3.4 : « s'écrit en générique », « orthogonal », non exécuté) | `unions/chaine-six-etapes`, `appel-asynchrone` |

## 4. Épreuves créées

Vingt-cinq dossiers dans `hackathon-tools/verify/epreuves/appels/`, chacun avec `index.ts` et `tsconfig.json` ; non ajoutés au README du corpus (consigne) :

`appel-asynchrone`, `appel-dans-chaque-position`, `appel-instruction-isolee`, `appel-optionnel`, `argument-conditionnel-effets`, `argument-etale`, `arguments-de-type-explicites`, `constructeur-type-non-inferable`, `fonction-locale-hissee-recursive`, `forme-curryfiee-hors-pipe`, `import-alias-nomme`, `import-cycle`, `import-espace-de-noms-utilisateur`, `import-nomme-bibliotheque`, `import-par-defaut`, `import-reexport-baril`, `methode-native`, `ordre-evaluation-arguments`, `ordre-initialisation-modules`, `parametres-optionnels-et-defaut`, `pipe-imbrique-premier-argument-appel`, `pipe-six-etapes-formes-melees`, `reference-nue-bibliotheque`, `reference-nue-utilisateur`, `six-arguments-heterogenes`.

Vérifié : les vingt-cinq s'exécutent avec `pnpm --silent exec tsx` (code 0) et passent `pnpm --silent exec tsc --noEmit -p`. Non vérifié : aucune n'a été passée à `verify.sh`, le transpileur échouant déjà sur l'exercice 01.

Constat fait en écrivant `forme-curryfiee-hors-pipe` : hors d'un pipe, `DArray.map(DString.to)` ne passe pas le typage sans arguments de type explicites (`DArray.map<readonly number[], string>(…)`). La forme curryfiée hors pipe entraîne donc la ligne 38.

Les lignes 9 à 12 partagent une épreuve, comme les lignes 18, 19 et 21 : à scinder si un refus par cas est voulu.

## 5. Ce qui n'a pas été inventorié

- **Fonctions DuploJS hors des dix-neuf des exercices.** `h api_list only_exercises=true` borne la tranche ; les autres domaines (`DPattern`, `DDataStructure`, `DChrono`, …) n'ont pas été déroulés.
- **Imports nommés sur plusieurs lignes.** Les comptages d'import reposent sur des expressions régulières d'une ligne ; le zéro des imports nommés de `@duplojs/lang` vaut pour cette forme.
- **Fréquence des cycles d'import, de la récursion, des appels à 0 ou 6 arguments, des fonctions passées en référence nue par l'utilisateur.** `usages` ne compte que les fonctions écrites avec un espace de noms DuploJS ; il n'existe pas d'outil pour les fonctions utilisateur.
- **Appels traversant un ré-export.** 1 251 est le nombre de lignes `export * from`, pas le nombre d'appels qui passent par elles.
- **Deux anomalies de `usages` non élucidées :** `DArray.map` à 3 arguments (1) et `DCommon.pipe` à 1 argument (1), que les signatures ne déclarent pas.
- **Constructions d'appel non déroulées :** `new`, gabarits étiquetés, `this`, accesseurs, `super`, import dynamique.
- **Les essais Go** (inférence, ordre d'initialisation, cycle) ont été exécutés sur des programmes écrits à la main dans le dossier temporaire de session, pas sur une sortie du transpileur.
