# Couverture — exercice 01, tranche « instructions et flux »

Date : 2026-11-19. Document audité : `hackathon-tools/designs/exercice-01.md` (§6, §7.1, §7.2, §10.2, §11, §12).
Tranche : déclarations, `if`, `return`, ternaire, `&&` `||` `??`, bloc, instruction-expression, position.

Ce rapport compte. Il ne juge pas la solution et n'en propose pas d'autre.

## 1. Comment la population a été établie

Les outils `hackathon-tools/mcp/h` inventorient les fonctions DuploJS (`signatures`, `usages`, `api_list`), pas la syntaxe TypeScript. Pour cette tranche, l'inventaire a donc été fait par un comptage de nœuds d'AST (script jetable, analyseur TypeScript 5.9 en lecture seule) sur trois corpus :

| Corpus | Fichiers | Rôle |
|---|---|---|
| `projects/00` à `10` (« ex ») | 26 | l'échantillon |
| `hackathon-tools/sources/ecosystem/packages/{http,form,playwright,json-web-token,server,tools}/scripts` (« lib ») | 648 | le code réel |
| `ecosystem/packages/agents-kit/{docs,skills}` (« docs ») | 776 | exemples de documentation |

Outils `h` utilisés : `coverage` (état de départ : 0 exercice et 0 épreuve réussis), `verify` sur chacune des 50 épreuves, `usages DEither.isLeft` (404, dont 386 appels) et `usages DEither.isRight` (470).

Le comptage a été fait avant de lire les §6 et §7 du document.

Chiffres de cadrage (lib) : 1 386 déclarations `const` (874 dans une fonction, 512 au premier niveau), 114 `let`, 0 `var` ; 1 107 `if` (tous avec accolades) ; 1 263 `return` ; 240 ternaires ; 230 `??`, 173 `||`, 119 `&&`. Dans les exercices : 24 `const` toutes au premier niveau, 18 `if` tous sans `else`, 5 ternaires, 5 `||`, 0 `&&`, 0 `??`, 0 `let`.

## 2. Classes

- **géré** : traité, et une exécution le montre. Ici, la seule exécution est le Go attendu de l'exercice 01 écrit à la main (`verify/out/design-01/expected`) ; rien n'est encore produit par le transpileur.
- **parole** : le document dit « fait », sans épreuve exécutée.
- **refusé** : erreur explicite, sans traduction envisagée.
- **différé** : le document dit « prévu » (erreur en attendant, ou limite assumée). Aucun des cas différés de cette tranche n'a d'essai exécuté montrant que la représentation ne le bloque pas.
- **oublié** : le document n'en dit rien.

## 3. Tableau

Toutes les épreuves sont sous `hackathon-tools/verify/epreuves/instructions/`. « Blocage » est le nœud sur lequel `h verify` s'arrête aujourd'hui (toutes échouent à la transpilation, état de départ attendu).

### 3.1 Déclarations

| # | Cas | Axe | Inventaire | Classe | Épreuve | Blocage aujourd'hui |
|---|---|---|---|---|---|---|
| 1 | `const x = appel()` au premier niveau, type inféré | Position | ex 22 ; lib 497 | géré | `projects/01` | `const result = add(1, 2);` |
| 2 | `const x: T = …`, dont annotation plus large que la valeur (`number \| undefined`, union d'Either) | Forme d'écriture | ex 2 ; lib 175 | parole | `const-annotee` | déclaration |
| 3 | Initialisation littérale : nombre, chaîne, booléen, `undefined`, `null`, `-0`, `1e21` | Valeurs limites | lib 19 | parole (le document ne cite que `1`) | `const-litteraux` | déclaration |
| 4 | Constante de premier niveau jamais lue | Valeurs limites | non mesuré | parole | `const-jamais-lue` | déclaration |
| 5 | `export const` lue depuis un autre fichier : au premier niveau, dans une fonction, ordre des effets entre modules | Position | lib 415 `export const` de valeur ; docs 109 | parole (hypothèse déclarée au §12) | `const-exportee-autre-fichier` | `DCommon.print` dans le fichier importé |
| 6 | Constante de premier niveau lue par une fonction du même fichier | Position | non mesuré (demande la résolution des symboles) | parole | `const-lue-par-fonction` | déclaration |
| 7 | Fonction appelée avant l'initialisation de la constante | Valeurs limites | non mesurable | différé, « limite assumée » : valeur zéro au lieu de `ReferenceError`, **détection : silence** | aucune (le programme TypeScript lève une erreur, il ne peut pas servir de référence) | |
| 8 | `const` dans un corps de fonction | Position | ex 0 ; **lib 874** (63 % des `const`) | différé (erreur `variable-statement-outside-top-level`) | `const-dans-fonction` | `const sum = one + two;` |
| 9 | `const` locale jamais lue (`declared and not used` en Go) | Valeurs limites | non mesuré | différé (« il faudra traiter ») | `const-locale-non-lue` | déclaration |
| 10 | `const` dans un bloc, masquage sur trois niveaux, au premier niveau et en fonction | Profondeur | non mesuré | différé (même erreur que 8) | `const-dans-bloc-masquage` | déclaration |
| 11 | Six déclarateurs dans une instruction | Cardinalité | ex 0 ; lib 0 ; docs 0 | différé (erreur `variable-statement-multiple-declarations`) | `const-plusieurs-declarateurs` | déclaration |
| 12 | Déstructuration de tableau | Forme d'écriture | lib 24 ; docs 3 | différé (erreur `variable-statement-binding-pattern`) | `destructuration-tableau` | déclaration |
| 13 | Déstructuration d'objet, avec renommage | Forme d'écriture | lib 34 (10 renommages) ; docs 13 | différé (même erreur) | `destructuration-objet` | déclaration |
| 14 | Trou, reste, valeur par défaut, motif imbriqué | Profondeur | lib : trou 4, reste 2, défaut 0, imbriqué 0 | différé (même erreur, formes non énumérées) | `destructuration-formes-rares` | déclaration |
| 15 | `let` réaffecté dans une branche, en fonction | Forme d'écriture | lib 114 | différé (erreur `variable-statement-let`) | `let-reaffectation` | type `string` |
| 16 | `let` de premier niveau modifié par une fonction | Position | lib 1 ; docs 2 | différé (même erreur) | `let-premier-niveau` | `let counter = 0;` |
| 17 | `let x: T;` sans initialisation | Valeurs limites | lib 0 | oublié | `let-sans-initialisation` | type `string` |
| 18 | `let` dont la valeur prend six types successifs | Succession, hétérogénéité | non mesuré | oublié | `let-type-change` | déclaration |
| 19 | `var` | Forme d'écriture | lib 0 | refusé (`variable-statement-var`) | | |
| 20 | `declare const` | Forme d'écriture | lib 1 ; docs 342 | refusé (`variable-statement-ambient`) | | |
| 21 | `const f = (x) => …` au premier niveau et en fonction | Forme d'écriture | lib 107 (15 + 92) | oublié | `const-fonction-flechee` | déclaration |
| 22 | `const x = await …` au premier niveau | Position (asynchrone) | lib 96 initialisations par `await` ; ex 10 | différé (`notfound-transformer`, pas d'erreur nommée) | `const-await-premier-niveau` | type de retour |

### 3.2 `if` et `return`

| # | Cas | Axe | Inventaire | Classe | Épreuve | Blocage aujourd'hui |
|---|---|---|---|---|---|---|
| 23 | `if (isRight(x)) { … }` sans `else`, premier niveau | Position | ex 7 | géré | `projects/01` | |
| 24 | Retour anticipé : six `return` dans une fonction, cinq `if` | Cardinalité | ex 11 ; **lib 408** retours anticipés, 257 fonctions à 2 `return` ou plus (13 à 6 ou plus) | parole (« le bloc et `return` existent déjà ») | `retour-anticipe` | type de retour inféré `-1 \| 0 \| 1 \| 2 \| 3 \| 4` |
| 25 | `if` / `else` | Forme d'écriture | lib 32 blocs `else` | différé (erreur `if-else-not-supported`) | `if-else` | déclaration |
| 26 | Chaîne de six `else if` avec `else` final, conditions à préparer | Cardinalité 6 | lib 93 chaînes : 19 de 2, 11 de 3, 14 de 4, 15 de 5, **34 de 6 ou plus** ; 13 avec `else` final | différé (même erreur) | `else-if-six-avec-else` | type de retour |
| 27 | Chaîne de six `else if` sans `else` final, premier niveau, conditions à effet | Cardinalité 6, position | lib 80 | différé (même erreur) | `else-if-six-sans-else` | type `string` |
| 28 | Sans accolades : `if`, `else if`, `else`, `return` | Forme d'écriture | lib 0 sur 1 107 | différé (erreur `if-body-not-block`) | `if-sans-accolades` | déclaration |
| 29 | Condition non booléenne : `0`, `-0`, `NaN`, `""`, `"0"`, `undefined`, `null`, `[]`, `{}` | Valeurs limites | lib 70 au moins (identifiant 33, accès de propriété 37) | différé (erreur `if-condition-not-boolean`) | `if-condition-non-booleenne` | type du paramètre |
| 30 | `!cond`, `!appel()`, `!(a > b)`, `!!x` | Forme d'écriture | lib 90 | différé (pas d'erreur nommée) | `if-negation` | type `boolean` |
| 31 | `a \|\| b`, `a && b` en condition, court-circuit observable | Composition | **ex 5 (exercices 06 à 10)** ; lib 188 (124 + 64) | différé, **détection : silence** (§11 : le court-circuit est perdu) | `condition-court-circuit` | type `string` |
| 32 | `if` imbriqués sur trois niveaux | Profondeur | non mesuré | parole | `if-imbriques` | type de retour |
| 33 | Bloc de `if` vide, `else` après un bloc vide | Valeurs limites | lib 0 | oublié | `if-bloc-vide` | type `string` |
| 34 | Comparaisons `===` et `!==` aux limites : `NaN`, `-0`, flottants, chaînes | Valeurs limites | lib 404 (364 + 40) | parole (« selon les transformers disponibles ») | `if-comparaisons-limites` | type de retour |
| 35 | Rétrécissement hors Either : `=== undefined`, `typeof` | Position (branche rétrécie) | lib 381 occurrences de `undefined` | oublié | `if-retrecissement-undefined` | type du paramètre |
| 36 | Garde `isLeft` puis retour anticipé, le type du succès changeant | Succession | `h usages DEither.isLeft` : 404 ; lib 101 gardes Either en condition | différé (§3.4 le raisonne, §10.2 refuse `isLeft` aujourd'hui) | `garde-isleft-retour-anticipe` | type de retour |
| 37 | Six `return` de six types bruts différents | Hétérogénéité, cardinalité 6 | lib 13 fonctions à 6 `return` ou plus | oublié (le document ne traite que l'union d'Either) | `six-return-types-bruts` | type de retour |
| 38 | `return` de littéraux : le type de retour inféré est une union de littéraux | Hétérogénéité | lib 48 `return` d'un littéral | oublié (trouvé en exécutant 24) | `retour-anticipe`, `ternaire-initialisation-et-retour` | `UnionType` |
| 39 | `return;` nu | Forme d'écriture | lib 30 | oublié (`return.ts` répond `notSupport`) | `return-nu` | type `void` |
| 40 | Fonction sans `return`, corps fait d'appels | Cardinalité 0 | lib 174 fonctions ; 350 appels-instructions en fonction | oublié | `fonction-sans-return` | type `string` |
| 41 | `if` / `else if` / `else` tous terminants, pas de `return` final | Composition | lib 50 fonctions dont la dernière instruction n'est pas un `return` | oublié | `retours-exhaustifs-sans-return-final` | type de retour |

### 3.3 Ternaire et opérateurs logiques

| # | Cas | Axe | Inventaire | Classe | Épreuve | Blocage aujourd'hui |
|---|---|---|---|---|---|---|
| 42 | Ternaire en argument d'appel | Position | **ex 5 (exercices 06 à 10)** ; lib 81 | oublié | `ternaire-argument` | déclaration |
| 43 | Ternaire en initialisation, en `return`, en corps de flèche, en propriété | Position | lib 37 + 20 + 29 + 39 | oublié | `ternaire-initialisation-et-retour` | déclaration |
| 44 | Six ternaires imbriqués | Profondeur, cardinalité 6 | lib 3 | oublié | `ternaire-imbrique-six` | type de retour |
| 45 | Ternaire à six branches de types différents | Hétérogénéité | non mesuré | oublié | `ternaire-branches-heterogenes` | type de retour |
| 46 | Une seule branche du ternaire est évaluée | Composition | lib 240 ternaires | oublié | `ternaire-evaluation-paresseuse` | type `string` |
| 47 | Chaînes de six `\|\|`, de six `&&`, et mélange, en valeur, avec effets | Cardinalité 6 | lib 53 opérateurs logiques imbriqués | différé, **détection : silence** | `logique-chaine-six` | type `string` |
| 48 | `\|\|` et `&&` sur des non-booléens (rendent un opérande) ; ternaire à condition non booléenne | Hétérogénéité | lib 49 `\|\|` et 55 `&&` hors condition de `if` | oublié | `logique-valeurs-non-booleennes` | type `string` |
| 49 | `??` : `undefined`, `null`, `0`, `NaN`, droite évaluée à la demande | Valeurs limites | **lib 230** (opérateur logique le plus fréquent) | oublié | `coalescence-nulle` | `DCommon.print` |
| 50 | Chaîne de six `??` | Cardinalité 6 | lib 9 | oublié | `coalescence-chaine-six` | type du paramètre |
| 51 | `??=`, `\|\|=`, `&&=` | Forme d'écriture | lib 26 + 3 + 0 | oublié | `affectation-logique` | type du paramètre |
| 52 | `+=`, `-=`, `*=`, `/=`, `++`, `--` | Forme d'écriture | lib 27 + 3 | oublié | `affectation-composee` | type `string` |

### 3.4 Bloc, instruction-expression, position

| # | Cas | Axe | Inventaire | Classe | Épreuve | Blocage aujourd'hui |
|---|---|---|---|---|---|---|
| 53 | Bloc nu : premier niveau, fonction, imbriqué, vide | Position | lib 0 | oublié | `bloc-nu` | déclaration |
| 54 | Appel dont le résultat est ignoré, premier niveau et fonction | Position | ex 19 ; lib 29 + 350 | parole (critère « `add(1, 2);` » du §9.3) | `appel-resultat-ignore` | `DCommon.print` dans une fonction |
| 55 | Expression sans effet en instruction (`value;`, `value + 1;`) | Valeurs limites | lib 0 | oublié | `expression-sans-effet` | déclaration |
| 56 | Corps de fonction fléchée en bloc, avec `const`, `if`, `return` | Position | **lib 401** | oublié | `corps-de-fleche` | déclaration |

## 4. Décomptes

Population : **56 cas**.

| Classe | Nombre | Lignes |
|---|---|---|
| géré | 2 | 1, 23 |
| parole | 9 | 2, 3, 4, 5, 6, 24, 32, 34, 54 |
| refusé | 2 | 19, 20 |
| différé | 20 | 7 à 16, 22, 25 à 31, 36, 47 |
| oublié | 23 | 17, 18, 21, 33, 35, 37 à 46, 48 à 53, 55, 56 |

Trois dégradations sont silencieuses, ce que le §3 point 4 des guidelines interdit : lignes 7, 31 et 47.

Aucun des 20 cas différés n'a d'essai exécuté montrant que la représentation choisie ne le bloque pas.

## 5. Non gérés, par fréquence dans le code réel

Oubliés :

| Rang | Cas | Ligne | lib | Exercices |
|---|---|---|---|---|
| 1 | Corps de fonction fléchée en bloc | 56 | 401 | 0 |
| 2 | Ternaire, toutes positions | 42 à 46 | 240 | 5, exercices 06 à 10 |
| 3 | `??` | 49, 50 | 230 | 0 |
| 4 | Fonction sans `return` | 40 | 174 | 0 |
| 5 | `const f = (x) => …` | 21 | 107 | 0 |

Suivent : `return` de littéraux (48), `return` nu (30), affectations logiques (29), affectations composées (30).

Différés ou sur parole, plus fréquents encore :

| Cas | Ligne | lib | Classe |
|---|---|---|---|
| `const` dans une fonction | 8 | 874 | différé |
| Retour anticipé | 24 | 408 | parole |
| `\|\|` et `&&` en condition, court-circuit | 31 | 188, et 5 dans les exercices 06 à 10 | différé, silencieux |
| `let` | 15 | 114 | différé |
| Chaînes `else if` | 26, 27 | 93, dont 34 de six maillons ou plus | différé |

## 6. Épreuves créées

50 dossiers sous `hackathon-tools/verify/epreuves/instructions/`. Chacune s'exécute (`pnpm --silent exec tsx`) et passe le typage (`pnpm --silent exec tsc --noEmit -p`). Toutes échouent aujourd'hui à la transpilation. Elles ne sont pas inscrites dans `epreuves/README.md` (consigne : plusieurs agents en parallèle).

`affectation-composee`, `affectation-logique`, `appel-resultat-ignore`, `bloc-nu`, `coalescence-chaine-six`, `coalescence-nulle`, `condition-court-circuit`, `const-annotee`, `const-await-premier-niveau`, `const-dans-bloc-masquage`, `const-dans-fonction`, `const-exportee-autre-fichier`, `const-fonction-flechee`, `const-jamais-lue`, `const-litteraux`, `const-locale-non-lue`, `const-lue-par-fonction`, `const-plusieurs-declarateurs`, `corps-de-fleche`, `destructuration-formes-rares`, `destructuration-objet`, `destructuration-tableau`, `else-if-six-avec-else`, `else-if-six-sans-else`, `expression-sans-effet`, `fonction-sans-return`, `garde-isleft-retour-anticipe`, `if-bloc-vide`, `if-comparaisons-limites`, `if-condition-non-booleenne`, `if-else`, `if-imbriques`, `if-negation`, `if-retrecissement-undefined`, `if-sans-accolades`, `let-premier-niveau`, `let-reaffectation`, `let-sans-initialisation`, `let-type-change`, `logique-chaine-six`, `logique-valeurs-non-booleennes`, `retour-anticipe`, `retours-exhaustifs-sans-return-final`, `return-nu`, `six-return-types-bruts`, `ternaire-argument`, `ternaire-branches-heterogenes`, `ternaire-evaluation-paresseuse`, `ternaire-imbrique-six`, `ternaire-initialisation-et-retour`.

Les épreuves isolent mal leur cas aujourd'hui : beaucoup s'arrêtent sur un type (`string`, `boolean`, `void`, union) ou sur `DCommon.print` avant d'atteindre l'instruction visée. La colonne « Blocage » le montre.

## 7. Ce qui n'a pas été inventorié

- **La syntaxe n'a pas d'outil d'inventaire.** `h` ne compte que les fonctions DuploJS. Les chiffres viennent d'un script jetable, non versionné, qui ne résout pas les symboles.
- **Lecture d'une constante de premier niveau depuis une fonction ou un autre fichier** (lignes 5 et 6) : seul le nombre d'`export const` est connu (415), pas le nombre de lectures.
- **Constantes locales non lues, masquage, `if` imbriqués** : non comptés.
- **Conditions non booléennes** : 70 est un plancher ; `!x` (90) et les appels (62) demandent le type de l'opérande.
- **Appel avant initialisation** (ligne 7) : ni mesurable ni exprimable en épreuve.
- **Import cyclique entre deux fichiers à constantes de premier niveau** : non essayé.
- **`using`** : 0 occurrence, pas d'épreuve.
- **Retour implicite `undefined`** : exclu de la population, le `tsconfig` de base (`noImplicitReturns`) le refuse (TS7030, vérifié).
- **Corpus de tests** de l'écosystème et génération précédente (`@duplojs/utils`) : non comptés.
- **Hors tranche, rencontré dans lib, non classé** : `for` 56, `for…of` 34, `throw` 40, `try` 17, `while` et `do` 6, `break` et `continue` 14, `switch` 0, `await` en instruction 126, affectation `=` en instruction 584 (surtout des propriétés), conditions `instanceof` 138 et `in` 32, fonctions déclarées dans une fonction 44.
