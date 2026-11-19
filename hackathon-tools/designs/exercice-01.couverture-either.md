# Couverture — exercice 01, tranche « valeurs et types Either »

Date : 2026-11-19. Document examiné : `hackathon-tools/designs/exercice-01.md`. Je compte, je ne juge pas la solution.

Tranche : constructeurs, prédicats, types, rétrécissement après une garde.

## 1. Comment la population a été établie

Avant la lecture du document :

| Source | Ce qu'elle donne |
|---|---|
| `h api_list namespace=DEither` | 50 entrées indexées |
| `node_modules/@duplojs/lang/dist/either/**/*.d.ts` | Les déclarations elles-mêmes : 10 constructeurs (`left`, `fail`, `error`, `none`, `right`, `success`, `ok`, `result`, `some`, plus `result` curryfié), 4 prédicats (`isRight`, `isLeft`, `hasInformation`, `isSelected`), 13 types (`Left`, `Right`, `Success`, `Fail`, `Error`, `Ok`, `None`, `Some`, `Result`, `Maybe`, `GetValue`, `GetInformation`, `RequireInformationCombination`) |
| `h usages DEither.<nom>` | Décompte par arité, par zone, références nues, pour les 24 noms de la tranche |
| Comptage par motif sur `hackathon-tools/sources/ecosystem/packages/*/{scripts,bin}` (1632 fichiers) | Formes que `usages` ne distingue pas : garde `if (isLeft(`, négation, taille des unions annotées, formes d'import |

Écart relevé : `api_list` ne liste pas les types `Left`, `Right`, `Error`, `Ok`, `None`, `Some`, `Result`, `Maybe`, `GetValue`, `GetInformation`. `usages` les compte quand on les demande par leur nom. L'inventaire par `api_list` seul aurait manqué `DEither.Left` (537 usages, le nom le plus écrit de la tranche).

Dans la colonne « inventaire », « code » désigne la somme des zones `*:code` et `boilerplate` de `usages`, et « scripts » le comptage par motif.

## 2. Ce que « géré » veut dire ici

Aucun exercice ne passe `verify.sh` aujourd'hui (00 échoue à la compilation Go, 01 à la transpilation). « géré » désigne donc un cas dont le Go attendu, écrit à la main, a été compilé et exécuté par l'auteur (`verify/out/design-01/expected/`, `expected-00/`). Ce n'est pas encore une épreuve transpilée.

Toutes les épreuves citées s'exécutent en TypeScript et passent le typage (vérifié le 2026-11-19, 30 sur 30). Aucune n'est transpilée : `verify.sh hackathon-tools/verify/epreuves/either/tous-les-constructeurs` échoue à la transpilation, comme attendu à ce stade. Elles ne montrent donc pas que la représentation tient, elles fixent la sortie de référence à reproduire.

## 3. Tableau

Chemin des épreuves : `hackathon-tools/verify/epreuves/either/<nom>/`, sauf mention `unions/`.

### 3.1 Constructeurs et valeurs

| # | Cas | Axe | Inventaire | Classe | Épreuve |
|---|---|---|---|---|---|
| C01 | `success(v)`, `v` nombre | — | usages 327 (319 à 1 argument), 38 code, 16 exercices | géré | exercice 01 |
| C02 | `success(v)`, `v` chaîne, booléen, tableau, objet | Hétérogénéité | idem | géré sur parole | `litteraux-const` |
| C03 | `success(42)` au retour inféré : `Success<42>` | Forme (inféré) | signatures : `const GenericValue` sur `success`, `left`, `right`, `error`, `result` | différé | `litteraux-const` |
| C04 | Même paramètre `const` sur un tableau ou un objet : `right("list", [1, 2])` a pour type `Right<"list", readonly [1, 2]>` | Forme, hétérogénéité | idem | oublié | `litteraux-const` |
| C05 | `success(undefined)`, `success(null)` | Valeurs limites | 2 scripts | différé | `droite-valeurs-limites` |
| C06 | `success(NaN)`, `success(-0)`, `success("")`, `success(false)`, `success([])` | Valeurs limites | — | géré sur parole | `droite-valeurs-limites` |
| C07 | `success(success(1))` | Profondeur | 6 constructeurs imbriqués (scripts) | géré sur parole | `imbrique-deux-cotes` |
| C08 | `success` en référence nue | Forme | 8 références nues | refusé | `references-nues-constructeurs` |
| C09 | `fail()` | Symétrie | 16 (14 appels), 9 code, exercices 04 et 05 | différé | `gauche-valeurs-limites` |
| C10 | `fail`, `ok`, `none`, `error`, `some` en référence nue | Forme | `fail` 2, `ok` 2, `error` 4 | oublié | `references-nues-constructeurs` |
| C11 | `left(info)` sans valeur | Cardinalité 0 | 47 sur 424 | différé | `six-gauches-garde` |
| C12 | `left(info, valeur)` | — | 377 sur 424 ; 68 dans `server:code` | différé | `six-gauches-garde` |
| C13 | Six Left distincts, six types de valeur, dans un même retour | Cardinalité N, hétérogénéité | scripts : sur 64 unions annotées multi-lignes, 16 ont 2 Left, 3 en ont 5, 2 en ont 10 (`json-web-token/.../verify.ts:40`) | différé | `six-gauches-garde`, `unions/chaine-six-etapes` |
| C14 | `right(info)` sans valeur : `Right<I, undefined>` | Symétrie de C11 | 78 sur 649 | oublié | `droite-sans-valeur` |
| C15 | `right(info, valeur)` | — | 571 sur 649 ; 149 code | différé | `deux-droites-meme-type` |
| C16 | Plusieurs Right de même type Go, informations différentes | Cardinalité, symétrie de C13 | scripts : 0 union annotée multi-lignes à 2 Right ; unions inférées non comptées | différé | `deux-droites-meme-type` |
| C17 | Plusieurs Right de types différents (six) | Cardinalité N, hétérogénéité | — | différé | `unions/six-succes` |
| C18 | `ok()` : `Right<"ok", void>` | Sans valeur | 28 (26 appels), 5 code | différé | `droite-sans-valeur` |
| C19 | `some(v)` | — | 8, 4 code | différé | `tous-les-constructeurs` |
| C20 | `none()` : `Left<"none", null>` | Symétrie de C19 | 14, 8 code | différé | `tous-les-constructeurs` |
| C21 | `error(v)` | Symétrie de C01 | 131 (127 appels), 18 code | oublié | `tous-les-constructeurs` |
| C22 | `result(info, v)` | — | 45 (41 à 2 arguments), 11 code | oublié | `tous-les-constructeurs` |
| C23 | `result(info)` curryfié, qui rend une fonction | Forme | 4 | oublié | `references-nues-constructeurs` |
| C24 | Left dont la valeur est `undefined`, `null`, `0`, `-0`, `NaN`, `""`, `false`, `[]` : le test `left != nil` doit rester vrai | Valeurs limites | 10 `left\|right(info, undefined\|null)` (scripts) | géré sur parole | `gauche-valeurs-limites` |
| C25 | Constructeurs dans un ternaire, retour inféré, y compris dans une fléchée | Position, forme | 2 scripts (60 tests et docs compris) | oublié | `ternaire-constructeurs` |
| C26 | Left construit hors de tout contexte typé (constante de premier niveau), puis renvoyé | Position | — | différé | `gauche-hors-contexte` |
| C27 | Fonction qui ne renvoie que des Left, dont le résultat est renvoyé par une autre dans une union | Symétrie | 17 unions annotées sans Right sur 64 | différé | `gauches-seuls` |
| C28 | Imbrication des deux côtés : Right de Left, Left de Left, Left de Right | Profondeur × symétrie | 6 | oublié | `imbrique-deux-cotes` |
| C29 | Tableau d'Either de même type Right | Profondeur | — | différé | `tableau-vide-et-gauches` |
| C30 | Tableau qui mêle des Right de types différents et des Left | Profondeur, hétérogénéité | — | oublié | `tableau-heterogene` |
| C31 | Tableau vide typé, tableau de Left seuls | Cardinalité 0 | — | oublié | `tableau-vide-et-gauches` |
| C32 | Either dans une propriété d'objet ou un tuple | Position | — | oublié | `either-dans-objet` |
| C33 | Même information à gauche et à droite (`left("pending", …)` et `right("pending", …)`) | Symétrie | — | oublié | `meme-information-deux-cotes` |
| C34 | Affichage des onze formes : 3 clés pour `left` et `right`, 4 pour les variantes marquées | Composition avec `print` | 11 constructeurs dans les `.d.ts` | différé | `tous-les-constructeurs` |

### 3.2 Prédicats et rétrécissement

| # | Cas | Axe | Inventaire | Classe | Épreuve |
|---|---|---|---|---|---|
| P01 | `if (isRight(x))`, `x` de type `Success<T> \| Fail` | — | 448 (371 appels), 15 code, 7 exercices ; 21 `if (isRight(` (scripts) | géré | exercice 01 |
| P02 | `isRight` avec argument à préparations, ou en initialisation de constante | Position | — | géré sur parole | `negation-garde` |
| P03 | `isRight` en référence nue (`DArray.filter(xs, DEither.isRight)`) | Forme | 77 références nues sur 448 | refusé | `tableau-heterogene` |
| P04 | `!isRight(x)`, `!isLeft(x)` | Forme | 3 `!isLeft` (scripts) | différé | `negation-garde` |
| P05 | Rétrécissement dans la branche `else` | Position | — | refusé | `negation-garde` |
| P06 | Prédicat rangé dans une constante puis testé (rétrécissement par alias) | Forme | — | oublié | `negation-garde` |
| P07 | `isLeft(x)` | Symétrie de P01 | 380 (364 appels), 164 code ; 119 `if (isLeft(` contre 21 `if (isRight(` (scripts) | différé | `garde-isleft-six-types` |
| P08 | Six gardes `if (isLeft(x)) return x;` de suite, type Right différent à chaque maillon | Succession | — | différé | `garde-isleft-six-types` |
| P09 | `isLeft` en référence nue | Forme, symétrie de P03 | 16 | oublié | `tableau-heterogene` |
| P10 | `isRight`, `isLeft` sur une union Either et valeur brute, sur `unknown`, sur un non-Either | Hétérogénéité | signatures : `GenericInput extends unknown` | différé | `predicat-sur-brut`, `unions/either-et-brut` |
| P11 | Rétrécissement vers plusieurs Right de types différents | Hétérogénéité | — | différé | `has-information` |
| P12 | Variable rétrécie à ses Left puis passée à un paramètre typé `Fail \| Left<…>` | Symétrie, position (argument) | — | oublié | `retreci-gauche-en-argument` |
| P13 | Après `isLeft`, lecture d'une valeur Left dont le type est une union brute (`number \| string \| number[] \| undefined`) | Hétérogénéité | `unwrapLeft` 28 | oublié | `lecture-gauche-heterogene` |
| P14 | `hasInformation(x, "info")` et le rétrécissement qui suit | — | 123 (119 à 2 arguments), 13 code | oublié | `has-information` |
| P15 | `hasInformation(x, ["a", "b"])`, liste vide comprise | Cardinalité | 2 scripts | oublié | `has-information-liste` |
| P16 | `hasInformation("info")` curryfié, en prédicat de `filter` | Forme | 4 | oublié | `has-information-curry` |
| P17 | `hasInformation` sur une valeur brute | Hétérogénéité | signature : `Either \| AnyValue` | oublié | `predicat-sur-brut` |
| P18 | `isSelected(x, { … })` | — | 12 (9 à 2 arguments, 3 à 1), 0 code | oublié | `is-selected` |

### 3.3 Types

| # | Cas | Axe | Inventaire | Classe | Épreuve |
|---|---|---|---|---|---|
| T01 | `Success<T>` seul | — | 161, 12 code | géré | exercice 00 |
| T02 | `Success<T> \| Fail` annoté | — | exercices 01 à 03 | géré | exercice 01 |
| T03 | Même union inférée, ordre inverse, parenthèses | Forme | — | géré sur parole | `ternaire-constructeurs` |
| T04 | `Fail` seul | Symétrie de T01 | 23, 2 code | différé | `gauches-seuls` |
| T05 | Union de Left seuls | Symétrie | 17 sur 64 unions annotées (scripts) | différé | `gauches-seuls` |
| T06 | `Left<I>` à un argument | Cardinalité 0 | 28 scripts | différé | `six-gauches-garde` |
| T07 | `Left<I, V>` | — | `Left` : 537, 194 code ; 102 sur une ligne et 25 multi-lignes (scripts) | différé | `six-gauches-garde` |
| T08 | `Right<I>`, `Right<I, V>` | Symétrie | `Right` : 302, 118 code ; 1 et 51 (scripts) | différé | `droite-sans-valeur` |
| T09 | `Left` et `Right` sans argument (`Left<string, unknown>`) | Forme | 13 et 14 (scripts) | oublié | `types-nus-et-larges` |
| T10 | `Ok`, `Some`, `None`, `Result`, `Error`, `Maybe<T>` | — | `Error` 102 (10 code), `Maybe` 9 (3 code, dans `src/transpiler/context/build.ts`), `Result` 9, `Ok` 8, `None` 12, `Some` 7 | différé | `types-utilitaires`, `droite-sans-valeur` |
| T11 | Deux membres Right dans l'annotation | Cardinalité | voir C16 | refusé | `deux-droites-meme-type` |
| T12 | Union Either et valeur brute | Hétérogénéité | — | différé | `unions/either-et-brut` |
| T13 | Alias local (`type R = …`) | Forme | — | différé | `types-utilitaires` |
| T14 | `Promise<…>` | Position asynchrone | 5 scripts | différé | aucune |
| T15 | Tableau d'unions en annotation | Profondeur | — | différé | `tableau-vide-et-gauches` |
| T16 | Fonction générique de l'utilisateur : `Success<T> \| Left<I, T>` | Profondeur | 11 scripts | différé | `generique-utilisateur` |
| T17 | `Success<unknown>`, `Success<void>`, `Error<unknown>`, `Left<I, void>` | Valeurs limites de type | — | oublié | `types-nus-et-larges` |
| T18 | `GetValue<…>`, `GetInformation<…>` | — | `GetValue` 16, 8 code (dont `src/transpiler/createTransformer.ts:76`) ; `GetInformation` 0 | oublié | `types-utilitaires` |
| T19 | `Extract<…, DEither.Left>` | Forme | 7 scripts | oublié | `types-utilitaires` |
| T20 | Élargissement du Right : un `Either[float64]` qui arrive là où TypeScript attend `Success<number \| string>`, ou deux résultats de Right différents réunis par un retour ou un tableau | Hétérogénéité, position | — | différé | `elargissement-droit` |
| T21 | Type Either en paramètre de fonction | Symétrie entrée et sortie | — | géré sur parole | `retreci-gauche-en-argument` |

### 3.4 Formes d'import

| # | Cas | Axe | Inventaire | Classe | Épreuve |
|---|---|---|---|---|---|
| F01 | `import * as DEither from "@duplojs/lang/either"` | — | 177 imports sur 185 (scripts) | géré | exercice 01 |
| F02 | Imports nommés, `import * as E` | Forme | 0 (scripts) | géré sur parole | `alias-import` |
| F03 | `import { DEither } from "@duplojs/lang"` (racine), renommé | Forme | 0 (scripts) | oublié | `alias-import` |
| F04 | `import type * as DEither` | Forme | 8 (scripts) | géré sur parole | aucune |

## 4. Décomptes

Population : 77 cas.

| Classe | Nombre |
|---|---|
| géré | 5 |
| géré sur parole | 9 |
| refusé | 4 |
| différé | 33 |
| oublié | 26 |

Deux lignes n'ont pas d'épreuve : T14 (asynchrone, hors de ma tranche) et F04.

Sur les 33 cas différés, le document n'apporte un essai exécuté que pour trois : P07 et P08 (banc `EitherLeftAs`, un seul maillon mesuré) et C29 (banc du tableau de 1000 Either). Les 30 autres sont reportés sans essai montrant que `Either[R]` ne les bloque pas. Le document le dit lui-même en §12 : « raisonnés, pas exécutés ».

## 5. Ce qui pèse le plus dans le code réel sans être « géré »

Classé par usages mesurés.

| Rang | Cas | Usages | Classe |
|---|---|---|---|
| 1 | Type `Left<I, V>` (T07) et `left(info, valeur)` (C12) | 537 et 424 ; 194 et 192 code | différé |
| 2 | `right(info, valeur)` (C15) et type `Right` (T08) | 649 et 302 ; 149 et 118 code | différé |
| 3 | `isLeft` (P07) | 380 ; 164 code ; 119 gardes contre 21 pour `isRight` | différé |
| 4 | `error(v)` (C21) | 131 ; 18 code | oublié |
| 5 | `hasInformation` (P14 à P17) | 123 ; 13 code | oublié |
| 6 | `right(info)` sans valeur (C14) | 78 | oublié |
| 7 | `isRight` en référence nue (P03) | 77 | refusé |
| 8 | `result` (C22, C23) | 45 ; 11 code | oublié |

L'exercice 01 livre le prédicat le moins écrit des deux : `isLeft` porte 164 usages dans le code contre 15 pour `isRight`.

## 6. Les oublis, classés par fréquence

| Rang | Oubli | Fréquence | Pourquoi il touche la représentation |
|---|---|---|---|
| 1 | `error(v)` : le constructeur n'apparaît nulle part, seul le type `Error` est listé en §7.6 | 131 usages, 18 code, 4 références nues | Quatrième clé `error` à l'affichage, donc un descripteur `meta` ; valeur Left presque toujours présente, donc l'allocation de la limite 1 devient le cas courant de ce constructeur |
| 2 | `hasInformation` : absent du document | 123 usages, 13 code | Rétrécit à un membre précis, des deux côtés à la fois (C33). Vers un Right parmi plusieurs de types différents, la lecture passe par `Either[any]` ; vers un Left, par une assertion |
| 3 | `right(info)` sans valeur, et `ok()` dont la valeur est `void` | 78 et 28 usages | Le type Go du paramètre `R` pour `undefined` et pour `void` n'est jamais nommé côté Right. Le document ne le fixe (`JSUndefined`) que pour les Left seuls |
| 4 | `result(info, v)` et sa forme curryfiée | 45 usages, 11 code | Variante marquée côté Right avec information libre : le descripteur `meta` doit porter l'information et le marqueur séparément |
| 5 | `Left` et `Right` sans argument | 27 dans les scripts | `Right<string, unknown>` : le type Right est `unknown`, donc `Either[any]` dès l'annotation |

Oublis sans décompte possible mais qui contredisent une phrase du document :

- **P12** : §3.5 dit que le rétrécissement « ne demande rien : la variable Go garde son type ». §7.6 dit qu'un type fait de Left seuls « sera `Either[JSUndefined]` ». Une variable `Either[float64]` rétrécie à ses Left puis passée à un paramètre `Fail | Left<…>` rencontre les deux règles en même temps (`retreci-gauche-en-argument`).
- **P13** : la limite 2 prévoit une assertion « vers le type que TypeScript annonce ». Quand les Left portent des valeurs de types différents, ce type est une union brute (`lecture-gauche-heterogene` rend `[ 0, 'one', [ 2 ], undefined, 8 ]`), c'est-à-dire la famille que la limite 5 déclare distincte.
- **C04** : le paramètre `const` des constructeurs donne des tuples et des objets `readonly` de littéraux. Deux de mes épreuves ont d'abord échoué au typage pour cette raison (`Left<"d-list", readonly [3, 3]>` refusé par une annotation `number[]`).
- **C28, C30** : seule l'imbrication `success(success(1))` est traitée. Un Left qui porte un Either, et un tableau qui mêle des Right de types différents, ne le sont pas.

Formules d'alarme des guidelines (§1) relevées dans la tranche : « Prévu, pas fait » (limite 4), « C'est la famille … distincte de celle-ci » (limite 5), « Limite assumée » sans détection à la transpilation (§7.3 et §7.5 : la détection est une erreur de compilation Go), « à revoir si » (limite 1).

## 7. Épreuves créées

Trente dossiers sous `hackathon-tools/verify/epreuves/either/`, chacun avec `index.ts` et `tsconfig.json`. Je n'ai pas modifié `hackathon-tools/verify/epreuves/README.md`.

| Épreuve | Axes | Cas |
|---|---|---|
| `tous-les-constructeurs` | Symétrie | C19 à C22, C34 |
| `six-gauches-garde` | Cardinalité 6, hétérogénéité | C11 à C13, T06, T07 |
| `garde-isleft-six-types` | Succession | P07, P08 |
| `gauche-valeurs-limites` | Valeurs limites | C09, C24 |
| `droite-valeurs-limites` | Valeurs limites | C05, C06 |
| `droite-sans-valeur` | Cardinalité 0 | C14, C18, T08 |
| `deux-droites-meme-type` | Cardinalité 2, symétrie | C15, C16, T11 |
| `litteraux-const` | Forme (inféré) | C02 à C04 |
| `ternaire-constructeurs` | Position | C25, T03 |
| `gauche-hors-contexte` | Position | C26 |
| `gauches-seuls` | Symétrie | C27, T04, T05 |
| `imbrique-deux-cotes` | Profondeur | C07, C28 |
| `tableau-heterogene` | Profondeur, hétérogénéité | C30, P03, P09 |
| `tableau-vide-et-gauches` | Cardinalité 0 | C29, C31, T15 |
| `has-information` | Rétrécissement | P11, P14 |
| `has-information-liste` | Cardinalité | P15 |
| `has-information-curry` | Forme | P16 |
| `meme-information-deux-cotes` | Symétrie | C33 |
| `predicat-sur-brut` | Hétérogénéité | P10, P17 |
| `negation-garde` | Forme, position | P02, P04 à P06 |
| `retreci-gauche-en-argument` | Symétrie, position | P12, T21 |
| `elargissement-droit` | Hétérogénéité | T20 |
| `lecture-gauche-heterogene` | Hétérogénéité | P13 |
| `types-nus-et-larges` | Valeurs limites de type | T09, T17 |
| `types-utilitaires` | Forme | T10, T13, T18, T19 |
| `alias-import` | Forme | F02, F03 |
| `is-selected` | — | P18 |
| `references-nues-constructeurs` | Forme | C08, C10, C23 |
| `generique-utilisateur` | Profondeur | T16 |
| `either-dans-objet` | Position | C32 |

Commandes de vérification, depuis la racine du dépôt :

```bash
for d in hackathon-tools/verify/epreuves/either/*/; do
  pnpm --silent exec tsx $d/index.ts > /dev/null && pnpm --silent exec tsc --noEmit -p $d/tsconfig.json || echo "ÉCHEC $d"
done
```

## 8. Ce que je n'ai pas pu inventorier

- **Les unions inférées.** Le comptage des tailles d'union ne voit que les annotations écrites sur plusieurs lignes (64 unions). Les unions sur une ligne et celles que TypeScript infère au retour d'une fonction ne sont pas comptées. Le « 0 union à deux Right » de C16 vaut pour les annotations multi-lignes seulement.
- **Les écritures sans espace de noms.** `usages` compte `DEither.x`. Un import nommé (`success(…)`) lui échappe. Le comptage par motif en trouve 0 dans les scripts, mais je n'ai pas contrôlé les tests ni la documentation.
- **Les cibles de rétrécissement.** Je sais combien de fois `hasInformation` et `isLeft` sont écrits, pas ce que devient la variable ensuite (renvoyée, lue, passée en argument). P12 et P13 n'ont donc pas de fréquence.
- **Les positions asynchrones, de classe et de méthode.** `Promise<Either>` est compté (5 dans les scripts) sans épreuve. Les méthodes et les fonctions fléchées affectées à une constante ne sont pas croisées avec les constructeurs.
- **La composition deux à deux** avec les familles des autres tranches (`pipe`, `whenIsRight`, `matchInformation`, `group`) : hors de ma tranche, non déroulée.
- **Le comportement en Go.** Aucune épreuve n'est transpilée ni compilée. Je ne peux pas dire si un cas différé est bloqué ou non par `Either[R]` ; je dis seulement que le document ne le montre pas.
- **`oxlint`** n'est pas installé dans le dépôt (`Command "oxlint" not found`) : les épreuves n'ont pas été passées au linter.
