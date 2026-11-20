# Conception : exercice 01, quatrième version — représentation Go d'une union TypeScript

Date : 2026-11-19. Répond à `exercice-01.v3.contradiction.md`. Les documents précédents ne sont pas modifiés. Aucun fichier de `src/`, `bin/`, `projects/` n'a été touché.

Preuves : [exécuté] compilé et lancé pendant cette conception ; [exécuté v3] exécuté par la v3 et relancé ici (`rerun-v3.txt`) ; [lu] lu dans le source ; [hypothèse] ni l'un ni l'autre.

Tout le Go est écrit à la main. Rien n'est transpilé. Les règles sont exécutées par un prototype hors du transpileur (`detect4.ts`), qui lit les mêmes nœuds et le même checker que lui.

Essais rejouables dans `hackathon-tools/verify/out/design-01-v4/` :

| Élément | Contenu |
|---|---|
| `detect4.ts`, `detect4-corpus.sh` | Prototype des règles. Résultats : `detect4-corpus.tsv` (U), `.c.tsv` (C), `.bp.tsv` (BP), `detect4-sondes.tsv`, `detect4-corpus.log` |
| `v4/<option>/<essai>/main.go`, `v4/cases.txt` | 50 programmes Go : les 13 contre-exemples de l'attaque et 2 nouveaux, sous U, BP et C. `neutre/` : essais sans Either |
| `v4/cases-matrice.txt`, `v4/cases-positions.txt` | 6 programmes qui ferment des cases de la matrice ; 1 programme « toutes positions » |
| `run-v4.sh`, `out-v4.txt`, `out-v4-matrice.txt`, `out-v4-positions.txt`, `out-positions-sans.txt` | Compile, passe `go vet`, exécute, compare à `ref-v4/` (sorties `tsx`) |
| `rerun-v3.txt`, `rerun-c3.txt` | Les 58 programmes de la v3 et les 20 de l'attaque, relancés |
| `sondes/positions-v4/` | Une position d'élargissement par ligne, 20 positions |
| `bench4.sh`, `bench/bench-v4*.txt`, `bench/resume4.py` | Bancs et médianes |
| `arr/arr.go` | Tableau par pointeur utilisé par les essais |
| `expected/`, `expected00/`, `out-expected*.txt` | Go attendu des exercices 01 et 00, recompilé |

Environnement : Go 1.27 `linux/arm64` dans `golang:1.27` (15 processeurs), Node 24.14.1. Trois passes, médiane.

Épreuves ajoutées, inscrites au README du corpus : `unions/covariance-puis-ecriture`, `unions/covariance-lecture-seule`. Les deux passent `tsc --noEmit` et s'exécutent avec `tsx`.

---

## 1. Problème et famille

L'exercice 01 demande un retour `Success<number> | Fail`, un `if`, une constante de premier niveau et un `print`. La décision qui engage la suite est la représentation Go d'une union TypeScript.

Cas qui contraignent le même type Go :

| Cas | Pourquoi |
|---|---|
| Union d'Either à 0, 1, 2, 6 membres ; Either et valeur brute | Un emplacement, plusieurs types |
| Either dans un Either, un tableau, un objet | Le lecteur doit retrouver le type Go intérieur |
| Tableau et objet rangés dans un Either | Leur représentation (valeur ou pointeur, type d'élément) décide si la lecture réussit. L'attaque l'a montré : cas 1 à 5, 8 et 12. La v3 les renvoyait à une autre famille. C'est la même |
| `===`, `!==`, `==`, `switch` entre deux Either | Une struct Go se compare par contenu |
| Valeur élargie sans conversion visible | Le type Go rangé doit être celui que le lecteur attend |
| Alias élargi d'un conteneur modifiable | Une écriture par l'alias large range une valeur que l'alias étroit ne sait pas lire. Trouvé par cette conception |
| Fonction passée pour un type fonction plus large | Go n'a pas de variance |
| `Promise` d'Either | Le type traverse un paramètre de type |

Frontière, tracée par essai :

| Cas | Contraint-il le type de l'Either ? | Preuve |
|---|---|---|
| Modèle asynchrone | Non | `promesse` identique sous U, UP, B, BP, C [exécuté v3] |
| Ordre d'initialisation, imports élidés, lecture avant initialisation | Non | Même sortie fausse `1 2` sous U, BP, C pour les deux épreuves de lecture avant initialisation [exécuté] |
| Égalité large, rétrécissement d'une propriété | Non | Essais `neutre/` sans Either [exécuté] |

## 2. Ce qui n'a pas été éprouvé

1. **Le transpileur.** Aucune ligne de `src/` n'existe. `verify.sh` n'a rien à exécuter pour ces épreuves. Les noms d'erreur sont des noms.
2. **La sûreté de la règle `fit` (§6.3).** Elle est exécutée sur 192 programmes et 8 sondes. Elle n'est pas prouvée. Les trois versions précédentes de cette règle ont chacune été cassées. Sous U et BP, une fuite finit en panique. Sous C, elle finit en erreur de compilation Go (6 essais sur 6).
3. **Option C au-delà de 22 programmes.** Les 39 essais de la v2 ne sont pas écrits pour C. Le générateur de types d'union n'existe pas, même en prototype. Les noms de types, leur dédoublonnage entre fichiers et le développement sur place de `rightPipe` sont des hypothèses.
4. **Option BP au-delà de 24 programmes.** Les 39 essais de la v2 ne sont pas écrits pour BP.
5. **R-COVAR.** Quatre déclenchements sur 192 programmes, dont un sur une épreuve qui ne mute rien (`elargissement-autres-positions` ligne 28). Aucun programme réel n'a été passé au prototype. `hackathon-tools/sources/ecosystem` n'a pas de `node_modules` : le checker n'y résout pas les types. Le nombre de programmes réels refusés est inconnu.
6. **Fréquence de `===` entre deux Either dans le code réel.** Inchangé depuis la v3 : 750 `===` ou `!==` comptés, non ventilés par type.
7. **R-TDZ, refus à tort.** Deux formes valides restent refusées : `const handlers = { run: () => later }` et `const table = [read]` déclarés avant `later` (sonde `tdz-faux-refus`). Coût en programmes réels inconnu.
8. **`let total: number;` sans initialiseur et sans capture.** La règle l'accepte en s'appuyant sur l'erreur TypeScript 2454. Aucun essai.
9. **Tableaux.** Lecture hors bornes (`list[5]`), trous, `new Array(n)`, `length = 0`. Le prototype refuse `list[0]!` par R-RETRECI. La représentation par pointeur n'a que 6 essais.
10. **Objets.** Le sous-typage en largeur (`{a, b}` passé pour `{a}`) est refusé (1 cas dans le corpus). Aucune représentation qui le porte n'a été essayée.
11. **`Promise` et types contraints DuploJS.** `reprOf` les rend opaques. Les exercices 05, 06, 07 et 10 sont refusés par R-OPAQUE pour cette raison. La forme de leur représentation n'est pas écrite.
12. **Asynchrone.** Un programme, six promesses. Non essayé : rejet, `throw`, minuterie, `rightAsyncPipe`, `asyncGroup`, ordre des micro-tâches, coût.
13. **Fonctions génériques de l'utilisateur.** Refusées (R-OPAQUE). Go a des génériques, mais aucun essai ne montre qu'ils suffisent.
14. **Mesures.** Une architecture, trois passes, pas de `benchstat`. `Courant_U` vaut 1,25 ns en v3 et 1,73 ns ici. Les écarts inférieurs à 40 % ne départagent rien.
15. **Objet par pointeur rangé dans un Either.** Le banc `Moi_Objet` range une struct par valeur. Le coût avec un pointeur n'est pas mesuré.
16. **Sortie sur un terminal et produit puis somme sur `arm64`.** Voir §6.1 : aucun essai nouveau.
17. **Option non évaluée.** Un Either générique `Either[V]` n'a pas été écrit.

## 3. Options

Règle commune : le type Go d'une expression est une fonction de son type TypeScript. Chaque expression est placée dans son emplacement par une seule fonction, qui compare, convertit ou refuse (§6.3).

| | Option | Forme Go |
|---|---|---|
| U | Struct unique par valeur | `type Either struct { number float64; value any; kind *Kind }` |
| BP | Interface, variantes par pointeur | `type Either interface { … }` ; `&EitherSuccess[T]{Value}` |
| C | Union engendrée par signature | `type FailOrSuccessNumber struct { Tag uint8; Number float64 }` |

Tableaux et objets, pour les trois options : par pointeur (`*arr.List[T]`, `*Box`). Décision prise ici, motivée au §8.

BP a dû recevoir une méthode `eitherValue() any`. Sans elle, lire un `Success<number>` comme `Success<number | string>` panique (`bp/covariancelecture`) ; avec elle, l'essai est identique (`bp/covariancelecturemethode`) [exécuté].

Options écartées, chacune sur un essai exécuté :

| Option | Essai | Résultat |
|---|---|---|
| A, A2, U0, UT | v1 à v3 | Inchangé : panique, ou 5 à 15 fois plus lent que U [exécuté v3] |
| UP | `bench-v4-up.txt` contre `bench-v4-bp.txt` | Plus lent que BP sur les 16 lignes communes : 20,8 contre 9,2 ns au cas courant, 25,7 contre 10,2 µs sur 1000 Either [exécuté] |
| B | `rerun-v3.txt`, `bench-v4.txt` | Identité fausse comme U (`b/identite` : différent ; `b/identitetableau` : panique). Panique comme U sur l'élargissement (`b/reduction`). 8,9 ns contre 1,7 au cas courant. Seul gain : `fail()` dans une union avec une valeur brute, 5,9 contre 22,6 ns [exécuté] |

## 4. Matrice des axes

« refus » : le programme est refusé à la transpilation par la règle nommée. Le résultat entre parenthèses est ce qui se produit sans la règle.

### 4.1 Axes du gabarit

| Axe | Cas essayé | U | BP | C |
|---|---|---|---|---|
| Cardinalité 0 | `fail-partage` | tient [exécuté v3] | tient [exécuté v3] | tient [exécuté v3] |
| Cardinalité 1 | Exercice 01 | tient [exécuté] | tient [exécuté v3] | tient [exécuté v3] |
| Cardinalité 2 | `deux-droites-meme-type` | tient [exécuté v3] | tient [exécuté] | tient [exécuté] |
| Cardinalité 6 | `six-succes`, banc `Six` | tient : 7,5 ns [exécuté] | tient : 18,1 ns, 1 allocation [exécuté] | tient : 5,5 ns [exécuté] |
| Symétrie Left et Right | Left portant un nombre | symétrique : 1,6 et 1,7 ns [exécuté] | Left 15,0 ns, Right 9,2 [exécuté] | symétrique : 0,87 ns [exécuté] |
| Hétérogénéité : tous différents | `droite-valeurs-limites`, 11 formes dans un tableau | tient [exécuté v3] | tient [exécuté] | tient, une union à 9 étiquettes [exécuté] |
| Hétérogénéité : membre et non-membre | `either-et-brut`, banc `Brut` | se dégrade : 32 octets par Either rangé dans `any` [exécuté] | se dégrade : 1 allocation par `fail()` [exécuté] | tient : 2,5 ns [exécuté] |
| Profondeur | Either d'Either sur 2 et 4 niveaux | se dégrade : 21,6 et 64,2 ns, 1 et 3 allocations [exécuté] | se dégrade : 20,4 et 44,4 ns, 2 et 4 allocations [exécuté] | tient : 0,8 et 0,7 ns [exécuté] |
| Profondeur 7 | `elargissement-profondeur-sept` | refus R-REPR (panique) [exécuté] | refus (panique) [exécuté] | refus (erreur de compilation Go) [exécuté] |
| Succession de 6 maillons | `chaine-six-etapes` | tient : 105 ns, 4 allocations [exécuté] | tient : 94 ns, 7 allocations [exécuté] | tient : 38 ns, 1 allocation [exécuté] |
| Formes d'écriture | `references-nues-constructeurs`, 7 références nues | tient [exécuté v3] | tient, une fermeture par référence [exécuté] | tient, une fermeture et un type par référence [exécuté] |
| Positions | 20 positions, §6.3 | chaque position détectée [exécuté] | même règle [exécuté, mode BP] | 24 détections [exécuté] |
| Valeurs limites | `droite-valeurs-limites` ; `let` sans valeur | tient ; interface nulle : identique avec la règle I-NIL [exécuté] | idem [exécuté] | idem [exécuté] |
| Composition avec l'existant | `print` d'un tableau d'Either | tient [exécuté v3] | tient [exécuté] | tient par `JSInner` [exécuté] |

### 4.2 Axes demandés par l'attaque

| Axe | Cas essayé | U | BP | C |
|---|---|---|---|---|
| Identité entre deux Either | `identite-de-reference` | refus R-IDENT (`1 2` pour `2 3`) [exécuté v3] | tient [exécuté v3] | refus (`1 2`) [exécuté v3] |
| Identité, Either à valeur tableau | `identite-valeur-tableau` | refus (panique) [exécuté v3] | tient [exécuté v3] | refus (erreur de compilation Go) [exécuté v3] |
| Identité par `switch` | `identite-par-switch` | refus R-IDENT (`1 1 1` pour `2 1 3`) [exécuté] | tient [exécuté] | refus (`1 1 1`) [exécuté] |
| Identité entre tableaux, entre objets, alias | `identite-objets-tableaux-alias` lignes 6 à 10 | tient par pointeur [exécuté v3] | tient [exécuté v3] | tient [exécuté v3] |
| Identité contre `undefined` | même épreuve | tient [exécuté v3] | tient [exécuté v3] | tient [exécuté v3] |
| Égalité large | `egalite-large` | hors option : refus R-EGAL (`2 2 4 4` pour `1 2 3 4`) ; portée par une fonction : identique [exécuté] | idem | idem |
| Entrée et sortie, appelant et appelé | `variance-fonctions` | refus R-FONC ; avec 4 fermetures : identique [exécuté v3] | idem [exécuté v3] | idem, 5 fermetures [exécuté v3] |
| Annoté contre inféré : ternaire, `return`, littéral, argument, initialisation | `elargissement-par-reduction`, `-par-position` | refus R-REPR (panique ou erreur Go) ; avec conversion : identique [exécuté v3] | refus (panique) [exécuté v3] | refus (erreur Go) ; avec conversion : identique [exécuté v3] |
| Annoté contre inféré : union croisée, argument de type, `??`, littéral sous union, propriété abrégée | Cas 1 à 5 de l'attaque | refus R-REPR (panique, 5 sur 5) [exécuté] | refus (panique, 5 sur 5) [exécuté] | refus (erreur de compilation Go, 5 sur 5) [exécuté] |
| Mutation après rangement | `mutation-apres-rangement`, `mutation-par-increment` | par valeur : casse (`1` pour `2`) ; par pointeur : tient [exécuté] | idem [exécuté] | idem [exécuté] |
| Mutation après élargissement | `elargissement-puis-mutation` | refus R-REPR (copie : `[ 1, 2 ]` pour `[ 1, 2, 'a' ]`) [exécuté v3] | idem | idem |
| Écriture par un alias élargi | `covariance-puis-ecriture` | refus R-COVAR (panique) [exécuté] | refus (panique) [exécuté] | refus R-REPR (erreur de compilation Go) [exécuté] |
| Alias `readonly` élargi, puis `push` sur la source | `covariance-lecture-seule` | tient [exécuté] | tient avec `eitherValue` [exécuté] | casse si converti par copie (`[ 1, 2 ]` pour `[ 1, 2, 3 ]`) : refus R-REPR [exécuté] |
| Asynchrone | `promesse-d-either` | tient [exécuté v3] | tient [exécuté v3] | tient [exécuté v3] |
| Lecture avant initialisation | 3 épreuves | refus R-TDZ (`1 2`) [exécuté] | idem [exécuté] | idem [exécuté] |
| Imports élidés | `import-de-type-seul`, `import-formes-elidees` | hors option : tient avec R-IMPORT [exécuté v3] | idem | idem |

Ce que la matrice dit :

- Aucune option ne tient seule. Les trois ont besoin des mêmes règles.
- Sans la règle, U et BP paniquent à l'exécution. C échoue à la compilation Go.
- Seul BP porte `===` entre deux Either.
- C refuse plus : 353 R-REPR sur 192 programmes, contre 22 sous U. 317 sont des conversions d'Either par valeur, faisables. 36 portent sur un conteneur et restent des refus.
- C est la seule option cassée par `covariance-lecture-seule` quand elle convertit. Elle doit donc refuser tout élargissement d'un conteneur qui n'est pas un littéral.

## 5. Mesures

Go 1.27 `linux/arm64`, Docker, 15 processeurs, trois passes, médiane. « o » : octets par opération ; « al » : allocations. Sources : `bench/bench-v4.txt` (U, C), `bench-v4-bp.txt` (BP).

| Scénario | U | BP | C |
|---|---|---|---|
| **Cas courant** : `add` réussit, `isRight`, lecture | 1,73 ns, 0 al | 9,23 ns, 8 o, 1 al | 0,87 ns, 0 al |
| Même cas, fonction non intégrée | 1,63 ns, 0 al | 8,48 ns, 8 o, 1 al | 0,69 ns, 0 al |
| **N = 6**, six Right de types différents, en cycle | 7,48 ns, 8 o | 18,06 ns, 29 o, 1 al | 5,53 ns, 2 o |
| **N = 6**, chaîne de six étapes, tout réussit | 105,1 ns, 64 o, 4 al | 93,7 ns, 88 o, 7 al | 38,3 ns, 16 o, 1 al |
| **Hétérogène**, Either et valeur brute, côté Right | 28,2 ns, 32 o, 2 al | 30,9 ns, 40 o, 3 al | 9,0 ns, 8 o, 1 al |
| — côté `fail()` | 22,6 ns, 32 o, 1 al | 8,2 ns, 1 o, 1 al | 2,5 ns, 0 al |
| Tableau de 1000 Either à valeur nombre | 2,02 µs, 0 al | 10,19 µs, 8000 o, 1000 al | 1,56 µs, 0 al |
| **Tableau de 1000 Either à valeur chaîne** | 13,90 µs, 14 400 o, 900 al | 15,45 µs, 14 500 o, 1000 al | 2,30 µs, 0 al |
| **Tableau de 1000 union Either et valeur brute** | 10,36 µs, 10 400 o, 1000 al | 11,48 µs, 8000 o, 1000 al | 1,64 µs, 0 al |
| Left portant un nombre | 1,62 ns, 0 al | 14,95 ns, 24 o, 1 al | 0,87 ns, 0 al |
| Either d'Either, 2 niveaux | 21,6 ns, 32 o, 1 al | 20,4 ns, 24 o, 2 al | 0,82 ns, 0 al |
| Either d'Either, 4 niveaux | 64,2 ns, 96 o, 3 al | 44,4 ns, 56 o, 4 al | 0,70 ns, 0 al |
| Either à valeur objet (3 nombres, par valeur) | 16,9 ns, 24 o, 1 al | 20,2 ns, 24 o, 1 al | 1,52 ns, 0 al |
| Either à valeur tableau | 19,0 ns, 24 o, 1 al | 26,3 ns, 24 o, 1 al | 0,84 ns, 0 al |
| Either à valeur booléenne | 2,23 ns, 0 al | 6,99 ns, 1 o, 1 al | 2,05 ns, 0 al |

Pire cas de U : l'Either imbriqué sur 4 niveaux (64 ns, facteur 90 face à C) et le tableau de 1000 chaînes (facteur 6). Pire cas de BP : le tableau de 1000 nombres (facteur 6,5 face à C, 1000 allocations). Pire cas de C : aucun sur ces lignes ; son coût est dans le nombre de conversions (§4.2).

Coût des conversions et des représentations voisines (`bench-v4.txt`) :

| Opération | Mesure |
|---|---|
| Copie d'un tableau de 1000 nombres vers `[]any` | 13,3 µs, 24 408 o, 1002 al |
| Appel à travers une fermeture de conversion | 8,4 ns, 8 o, 1 al, contre 1,3 ns |
| Création d'un tableau de 2 nombres : tranche | 9,1 ns, 16 o, 1 al |
| — pointeur vers une liste | 22,2 ns, 40 o, 2 al |
| Somme d'un tableau de 1000 : tranche, pointeur | 560 ns, 569 ns |
| Information non littérale renvoyée par une fonction | 26,4 ns, 48 o, 1 al, contre 1,5 ns |
| Nombre d'Either lu sous `any` | 8,3 ns, 8 o, 1 al, contre 0,5 ns |

## 6. Dégradations

### 6.1 Tableau

Les lignes valent pour U, BP et C, sauf mention.

| Déclencheur (forme TypeScript exacte) | Coût (mesuré) | Détection |
|---|---|---|
| `first === second`, `switch (first) { case second: }` où les deux opérandes peuvent être un Either (U, C), une fonction ou un type opaque | Refusé. Le porter coûte BP : 9,2 ns et 8 octets au lieu de 1,7 ns | Transpilation, R-IDENT, `reference-identity-not-supported` |
| `first == second` hors des deux cas exacts | Refusé | Transpilation, R-EGAL, `loose-equality-not-supported` |
| `const early = read(); … const result = add(1, 2);` | Refusé | Transpilation, R-TDZ, `top-level-read-before-initialization` |
| `const wide: (number \| string)[] = numbers` et les 19 autres positions du §6.3 | Refusé. Une copie coûterait 13,3 µs pour 1000 éléments et casserait l'alias | Transpilation, R-REPR, `representation-change-not-supported` |
| `const wide: Success<number \| string>[] = narrow` (cible modifiable, même type Go, formes différentes) | Refusé. Refus à tort quand rien n'écrit par l'alias : 1 cas sur 192 programmes | Transpilation, R-COVAR, `mutable-covariance-not-supported` |
| `apply(half, 4)` avec un type fonction de représentation différente | Refusé à l'exercice 01. Fermeture : 8,4 ns et 8 octets par appel | Transpilation, R-FONC, `function-representation-not-supported` |
| `if (box.value !== undefined) { use(box.value) }`, liaison déstructurée, `list[0]!` | Une assertion de type. Refusé à l'exercice 01 | Transpilation, R-RETRECI, `narrowed-read-not-supported` |
| `any`, paramètre de type, fonction surchargée ou générique, `Promise`, type imbriqué sur plus de 40 niveaux | Refusé | Transpilation, R-OPAQUE, `type-not-representable` |
| `count([], [numbers])` : littéral dont le type attendu a 0 ou plusieurs membres candidats | Refusé | Transpilation, R-LITTERAL, `literal-target-ambiguous` |
| `let total: number;` capturé par une fonction | Refusé | Transpilation, R-INIT, `uninitialized-variable-not-supported` |
| `distance({horizontal, vertical, label})` passé pour `{horizontal, label}` (sous-typage en largeur, objet non littéral) | Refusé : 1 cas sur 192 | Transpilation, R-REPR |
| Nœud sans transformer : `await`, étalement, déstructuration, `new`, `delete`, `for…of` | Refusé : 33 cas sur 192 | Transpilation, `notfound-transformer` |
| Fonction DuploJS sans handler, ou fonction nue passée à la bibliothèque | Refusé : 83 cas sur 192, dont les exercices 02 à 10 | Transpilation, `duplojs-function-not-supported` |
| Either dont la valeur est une chaîne, un tableau, un objet ou un Either (U, BP) | 1 allocation par Either : 13,9 µs pour 1000 chaînes contre 2,3 sous C ; 64 ns pour 4 niveaux | Comportement identique. Bancs `ContreTexte1000`, `Moi_*` |
| Either rangé dans `any` : `whenIsRight(x, f)`, `(Fail \| number)[]` (U) | 32 octets : 22,6 ns contre 2,5 sous C | Comportement identique. Banc `Brut` |
| Lecture d'une valeur d'Either (U, BP) | Une assertion de type | Panique si `fit` a une fuite. TypeScript ne la justifie pas. Voir §2 point 2 |
| `import` sous `verbatimModuleSyntax` | Refusé | Transpilation, `tsconfig-verbatim-module-syntax-not-supported` |
| `import "./setup"`, `export { x } from "./x"` | Refusé à l'exercice 01 | Transpilation, `import-without-binding-not-supported`, `export-from-not-supported` |
| `value * factor + shift` sur `arm64` | Dernier chiffre différent. `float64(a * b)` le supprime [exécuté v2] | Aucune aujourd'hui : silence. Règle proposée : refus `fused-multiply-add-not-supported`, ou correction de `binary.ts` ligne 82. Décision 5 |
| Sortie standard sur un terminal | Node colore, le Go non | Aucune : silence hors de `verify.sh`. Décision 7 |

Règles supprimées depuis la v3 : R-MUT. La représentation par pointeur porte la mutation (`incrementpointeur` identique sous U, BP, C).

### 6.2 Règles de détection

**R-IDENT.** Nœuds : `BinaryExpression` d'opérateur `===` ou `!==` ; `SwitchStatement`, pour chaque paire (sujet, expression de `CaseClause`). Types : `checker.getTypeAtLocation` des deux côtés. Refus si chaque côté peut être comparé par valeur : sa représentation contient un Either (sauf sous BP), une fonction ou un type opaque. Un tableau ou un objet est un pointeur et se compare juste. Une intersection qui contient un primitif est un primitif. Un paramètre de type est jugé sur `getBaseConstraintOfType`. Essai : 13 refus sur 192 programmes sous U et C, 0 sous BP ; sonde `ident-faux-refus` : 0 refus.

**R-EGAL.** Nœud : `BinaryExpression` d'opérateur `==` ou `!=`. Deux cas acceptés : les deux côtés ont la même représentation primitive (émis comme `===`) ; un côté a le type `null` ou `undefined` seul (émis comme un test des deux absences). Sinon refus. Essai : `egalite-large` ligne 11 refusée, ligne 4 acceptée.

**R-TDZ.** Règle de la v3, avec trois corrections. Le parcours d'une fonction inclut ses paramètres et leurs valeurs par défaut. Le symbole d'un identifiant est lu par une fonction unique : `getShorthandAssignmentValueSymbol` pour une propriété abrégée, `getExportSpecifierLocalTargetSymbol` pour un export, `getSymbolAtLocation` sinon. Le nom d'une classe n'est pas une lecture d'elle-même. Essai : 3 refus sur 192, un par épreuve visée.

**R-RETRECI.** Nœuds : `Identifier` (déclaré par `VariableDeclaration`, `Parameter` ou `BindingElement`), `PropertyAccessExpression`, `NonNullExpression`. Type rangé : `getTypeOfSymbol` du symbole de la variable ou de la propriété ; pour `x!`, le type de `x`. Type lu : `getTypeAtLocation(nœud)`. Refus si les deux types Go diffèrent. Essai : `retrecissement-propriete-et-destructuration` lignes 9 et 16 ; avec assertion, identique (`neutre/retreciassertion`).

**R-INIT et I-NIL.** Nœud : `VariableDeclaration` sans initialiseur. Type : `getTypeOfSymbol`. S'il accepte `undefined`, le Go reçoit `JSUndefined{}`. Sinon, refus si un identifiant de ce symbole est lu dans une autre fonction que celle de la déclaration. Un paramètre optionnel omis reçoit `JSUndefined{}` chez l'appelant. Aucun emplacement `any` ne garde la valeur zéro de Go. Essai : `absenteinit` identique sous U, BP, C ; sans la règle, panique sous les trois.

**R-OPAQUE.** Le refus est testé avant toute comparaison de clés. Seul `unknown` est accepté en cible. Essai : sonde `repr-divers`, 7 refus (`any` rangé dans `any`, `identity<T>`, `wrap<T>`).

**R-IMPORT.** Inchangée. Un `import` relatif est exécuté s'il n'a pas de clause, ou si une liaison sans `type` est référencée hors d'un nœud de type, ou si c'est un `export … from` non `type`. Tout autre import est élidé. Essais : `import-formes-elidees` rend `./f ./g ./i`, comme `tsx` (`f g i 12`) ; `import-de-type-seul` : aucun import exécuté, Go identique ; `essai-verbatim` relancé : `tsx --tsconfig` rend `1 4` au lieu de `4`.

### 6.3 Placement et comparaison, position par position

**Architecture.** Un transformer n'obtient le Go d'une expression enfant que par `place(enfant, typeAttendu)`. Un nœud sans transformer s'arrête sur `notfound-transformer`. Une position ne peut donc pas être oubliée : elle est refusée tant que personne ne l'a écrite. La v3 énumérait les positions à surveiller ; les cas 3, 4, 5 et 9 de l'attaque étaient des positions absentes de la liste.

`place` propage le type attendu à travers les nœuds qui laissent passer une valeur : parenthèses, `satisfies`, ternaire, `??`, `||`, `&&`, virgule. Un littéral de tableau, d'objet ou de fonction est construit dans le type cible.

Représentation (`reprOf`) : primitif ; either(membres : côté, information, valeur) ; tableau(élément, `readonly`) ; objet(champs, `readonly`) ; fonction ; union ; récursif(identifiant du type) ; opaque. L'union ne fusionne plus les valeurs des Either : chaque membre garde son côté, son information et sa valeur. Aucune coupure de profondeur avant 40, et la coupure est un refus.

Type Go sous U et BP : primitif ; `Either` ; pointeur de liste ; pointeur de struct ; `func` ; union : le type commun des membres, sinon `any`.

`fit(source, cible)`, sous U et BP. Rien à faire si :

1. la source est `never`, ou la cible est `unknown` ;
2. source union : chaque membre passe ;
3. cible union : les candidats sont les membres auxquels `checker.isTypeAssignableTo(source, membre)` ; pour un primitif, les membres de même type Go. Il en faut au moins un, et la source doit passer pour **chacun** ;
4. Either : pour chaque membre source, les candidats sont les membres cible de même côté auxquels il est assignable. Pour chacun : le type Go de la valeur rangée égale celui de la valeur lue, ou la valeur lue est `any` ; puis `fit` des valeurs ;
5. tableau : même type Go d'élément, `fit` des éléments, et la cible est `readonly` ou les éléments ont la même forme profonde ou `fit` échoue en sens inverse. Sinon R-COVAR ;
6. objet : même type Go, `fit` champ par champ, même condition que 5 pour chaque champ non `readonly` ;
7. fonction : une seule signature, non générique, même type Go, `fit` du résultat, `fit` inverse des paramètres.

Sous C : même type Go, ou cible `unknown`.

Ce que la règle 3 corrige : dans la v3, « un membre compatible » suffisait. Le cas 1 passait par le membre Right alors que le lecteur lit le membre Left.

| Position | Nœud | Type cible, lu sur le checker | Sonde `positions-v4` | Go sans conversion | Go avec |
|---|---|---|---|---|---|
| Valeur par défaut | `Parameter.initializer` | `getTypeAtLocation(parameter.name)` | ligne 9 | erreur ligne 30 | identique |
| `return` | `ReturnStatement` | `getReturnTypeOfSignature(getSignatureFromDeclaration(fonction))` ; pour un littéral de fonction placé, celui de la signature attendue ; `getAwaitedType` si `async` | ligne 13 | erreur ligne 37 | identique |
| Corps de fléchée | `ArrowFunction.body` | idem | ligne 15 | erreur ligne 40 | identique |
| Argument | `CallExpression.arguments[i]`, signature hors `node_modules` | `getContextualTypeForArgumentAtIndex(call, i)` | ligne 16 | aucune erreur Go : le paramètre optionnel est `any`. Panique à la lecture | identique |
| Initialisation | `VariableDeclaration.initializer` | `getTypeOfSymbol` du nom | ligne 17 | erreur ligne 58 | identique |
| Branche de ternaire | `ConditionalExpression.whenTrue`, `.whenFalse` | type attendu du parent, sinon `getTypeAtLocation(ternaire)` | ligne 18 | erreur ligne 59 | identique |
| Élément de tableau | `ArrayLiteralExpression.elements[i]` | élément de la cible du littéral : l'unique membre tableau du type attendu auquel le littéral est assignable | ligne 19 | erreur ligne 60 | identique |
| Propriété | `PropertyAssignment`, nom `Identifier`, `StringLiteral` ou `NumericLiteral` | `getTypeOfSymbol` de la propriété de la cible du littéral | lignes 20 et 22 | erreurs lignes 61 et 63 | identique |
| Propriété abrégée | `ShorthandPropertyAssignment` | idem | ligne 21 | erreur ligne 62 | identique |
| Affectation | `BinaryExpression` `=` | type rangé de la gauche (`getTypeOfSymbol`) | ligne 24 | erreur ligne 65 | identique |
| Affectation logique | `??=`, `\|\|=`, `&&=` | idem | ligne 26 | erreur ligne 68 | identique |
| Opérande droit de `??`, `\|\|`, `&&` | `BinaryExpression.right` | type attendu du parent, sinon type du nœud | lignes 27, 28, 29, 34 | erreurs lignes 71, 72, 75, 82 | identique |
| Opérande gauche de `??`, `\|\|` | `BinaryExpression.left` | idem, source privée de `null` et `undefined` pour `??` | épreuve `logique-valeurs-non-booleennes` | non écrit | non écrit |
| `as` | `AsExpression` | `getTypeAtLocation(as)` ; `as const` laisse passer | ligne 30 | erreur ligne 78 | identique |
| `satisfies` | `SatisfiesExpression` | type attendu du parent | ligne 31 | erreur ligne 79 | identique |
| Argument d'un constructeur DuploJS | `CallExpression` dont la déclaration est dans `@duplojs` et le nom dans la table des constructeurs | type de la propriété `@DuplojsLangEither/value` de `getTypeAtLocation(call)` | ligne 32 | aucune erreur Go ; panique à la lecture (`u/argtype`) | identique |
| Either rangé | positions ci-dessus | règle 4 | ligne 33 | aucune erreur Go ; panique à la lecture (`u/abregeeeither`) | identique |
| Argument d'une autre fonction DuploJS | `CallExpression` | décidé par le handler de la fonction ; sans handler, refus | 83 refus sur 192 | — | — |

Les 20 lignes de la sonde sont détectées sous U, 24 constats sous C [exécuté]. Le Go « sans » rend 17 erreurs de compilation (`out-positions-sans.txt`). Le Go « avec » est identique au TypeScript (`out-v4-positions.txt`). Trois positions ne produisent aucune erreur Go sous U : l'argument d'un paramètre `any` et les deux Either. Là, seule la règle protège.

## 7. Épreuves

« Refusé » : arrêt à l'étape 1 de `verify.sh`. La colonne « sans la règle » donne le résultat de `run-v4.sh` pour U, BP, C.

### 7.1 Les treize cas de l'attaque

| N° | Épreuve | État attendu | Règle, nœud, type lu | Sans la règle : U / BP / C |
|---|---|---|---|---|
| 1 | `unions/union-gauche-droite-formes-croisees` | Refusé, R-REPR | `ReturnStatement` ligne 15 ; `fit` règles 3 et 4 : le candidat Left lit `[]any`, la source range `[]float64` | panique / panique / erreur Go |
| 2 | `unions/elargissement-par-argument-de-type` | Refusé, R-REPR | Argument de constructeur, lignes 7 et 8 ; cible lue sur le type de l'appel | panique / panique / erreur Go |
| 3 | `unions/elargissement-par-coalescence` | Refusé, R-REPR | Opérande droit de `??`, ligne 13 ; cible : type de retour propagé | panique / panique / erreur Go |
| 4 | `unions/elargissement-litteral-contexte-union` | Refusé, R-REPR | Élément de tableau, lignes 19 et 20 ; cible : membre tableau de `… \| undefined` | panique / panique / erreur Go |
| 5 | `unions/elargissement-propriete-abregee` | Refusé, R-REPR | `ShorthandPropertyAssignment`, lignes 14 et 15 | panique / panique / erreur Go |
| 6 | `unions/egalite-large` | Refusé, R-EGAL | `BinaryExpression` `==`, ligne 11, `string \| number` des deux côtés | `2 2 4 4` (sans Either) ; porté par `looseEquals` : identique |
| 7 | `unions/identite-par-switch` | U, C : refusé, R-IDENT. BP : identique | `SwitchStatement`, `CaseClause` lignes 14 et 16 | `1 1 1` / identique / `1 1 1` |
| 8 | `unions/mutation-par-increment` | Identique pour la mutation. Refusé à l'exercice 01 par R-RETRECI sur `counters[0]!` | Représentation par pointeur | par valeur : `1` pour `2` sous les trois ; par pointeur : identique sous les trois |
| 9 | `premier-niveau/lecture-avant-init-parametre-defaut` | Refusé, R-TDZ | Déclarateur `early`, ligne 12 ; atteint `result` par le paramètre de `read` | `1 2` sous les trois |
| 10 | `premier-niveau/lecture-avant-init-propriete-abregee` | Refusé, R-TDZ | Idem ; symbole lu par `getShorthandAssignmentValueSymbol` | `1 2` sous les trois |
| 11 | `unions/retrecissement-propriete-et-destructuration` | Refusé, R-RETRECI | `PropertyAccessExpression` ligne 9, `Identifier` de `BindingElement` ligne 16 : `any` lu comme `float64` | erreur Go ; avec assertion : identique |
| 12 | `unions/elargissement-profondeur-sept` | Refusé, R-REPR | Initialisations lignes 6 et 7 ; aucune coupure | panique / panique / erreur Go |
| 13 | `unions/valeur-absente-sans-initialisation` | Identique | I-NIL : `let pending` reçoit `JSUndefined{}` ; l'appelant de `absent()` aussi | panique sous les trois ; avec I-NIL : identique sous les trois |

Aucun cas ne finit en silence ni en panique. `detect4-corpus.tsv` contient chaque ligne citée.

### 7.2 Autres épreuves

| Épreuve | État attendu | Preuve |
|---|---|---|
| `unions/covariance-puis-ecriture` | Refusé, R-COVAR (lignes 5, 17, 24) ; R-REPR sous C | panique / panique / erreur Go |
| `unions/covariance-lecture-seule` | Identique sous U et BP ; refusé sous C | U identique ; C converti : différent |
| `unions/identite-de-reference`, `-valeur-tableau`, `-objets-tableaux-alias` | U, C : refusé, R-IDENT. BP : identique | `rerun-v3.txt` |
| `unions/elargissement-par-reduction`, `-par-position`, `-autres-positions`, `-puis-mutation` | Refusé, R-REPR | `detect4-corpus.tsv` |
| `unions/variance-fonctions`, `unions/fonction-retour-elargi-brut` | Refusé, R-FONC | Avec fermetures : identique |
| `unions/promesse-d-either` | Refusé, `notfound-transformer` sur `await` | Identique à la main sous U, BP, C |
| `premier-niveau/lecture-avant-init-sans-usage` | Refusé, R-TDZ | `1 2` sans la règle |
| `premier-niveau/import-de-type-seul` | Identique | `neutre/typeseul` |
| `premier-niveau/import-formes-elidees` | Refusé, `import-without-binding-not-supported` | `neutre/importsformes` identique |
| `projects/00`, `projects/01` | Identiques | Aucun constat de `detect4.ts` ; `expected/` recompilé |
| `projects/02` à `10` | Refusés : 1 à 16 constats chacun, tous `duplojs-function-not-supported` ou R-OPAQUE | `detect4-corpus.tsv` |

Résumé de `detect4.ts` sur 192 programmes, mode U : 77 avec au moins un constat ; R-OPAQUE 145, sans handler 83, sans transformer 33, R-RETRECI 32, R-REPR 22, R-IDENT 13, R-FONC 5, R-COVAR 4, R-TDZ 3, R-EGAL 1, R-LITTERAL 1.

Résumé de `run-v4.sh`, 50 programmes : 11 identiques, 13 différents, 18 paniques, 8 erreurs de compilation. Les 39 non identiques sont les formes « sans la règle », gardées comme preuve.

## 8. Recommandation

**Je ne recommande pas d'option entre U et C. Je retire la recommandation de U faite en v3.**

Ce qui est décidé, parce que les essais ne laissent pas de choix :

- Tableaux et objets par pointeur. Par valeur, la mutation casse en silence sous les trois options. Coût : 22 ns contre 9 à la création, rien à la lecture.
- L'élargissement d'un conteneur qui n'est pas un littéral est refusé. Mutation, alias élargi et type Go statique ne tiennent pas ensemble sans copie, et la copie casse l'alias.
- Le placement par `place` et la règle `fit` du §6.3, quelle que soit l'option.
- BP est écarté, sauf si `===` entre deux Either doit être porté. Il est 5 fois plus lent que U au cas courant et panique comme lui.

Ce qui sépare U de C :

| Critère | U | C |
|---|---|---|
| Fuite de la règle `fit` | Panique à l'exécution, ou rien tant que la valeur n'est pas lue | Erreur de compilation Go |
| Temps et mémoire | Égal à C sur les nombres ; 6 fois plus lent sur 1000 chaînes ; 1 allocation par Either non numérique | Le plus rapide sur chaque ligne mesurée, 0 allocation |
| Refus sur le corpus | 22 R-REPR, 4 R-COVAR | 36 refus sur des conteneurs, dont l'alias `readonly` que U accepte |
| Travail du transpileur | Un type, des fonctions génériques | Un générateur de types, 317 conversions sur 192 programmes, une dès l'exercice 01 |
| Éprouvé | 46 programmes de la v2, 20 ici | 22 programmes |

Pourquoi je ne tranche pas. U repose sur une règle cassée à chaque relecture, et sa fuite est une panique. C a le compilateur Go comme second contrôle, mais son générateur n'existe pas et ses 39 essais manquent. Recommander U serait ignorer le point 2 du §2. Recommander C serait recommander ce qui n'a pas été écrit.

Ce qui manque pour trancher : les 39 essais de la v2 écrits pour C ; un prototype du générateur lancé sur les exercices 01 à 05 ; le décompte de R-COVAR et de R-IDENT sur du code réel typé.

## 9. Go attendu

[exécuté] `expected/` (exercice 01, option U) : `go build ./...`, `go vet ./...`, sortie de 233 octets identique à `tsx projects/01/index.ts`. `expected00/` : compile, sortie vide comme le TypeScript.

Option U, `add.ts/add.ts.go` :

```go
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either) {
	Generated_6 := Sourced_one
	Generated_7 := Sourced_two
	Generated_8 := Generated_6 + Generated_7
	return shard_dependencies.EitherSuccessOf(Generated_8)
}
```

Option U, `index.ts/index.ts.go` :

```go
var Sourced_result shard_dependencies.Either

func Init() {
	if Generated_initialized {
		return
	}
	Generated_initialized = true
	Sourced_…add001ats.Init()
	Generated_1 := Sourced_…add001ats.Sourced_add
	Generated_2 := (float64)(1)
	Generated_3 := (float64)(2)
	Sourced_result = Generated_1(Generated_2, Generated_3)
	Generated_4 := Sourced_result
	if shard_dependencies.EitherIsRight(Generated_4) {
		Generated_5 := Sourced_result
		shard_dependencies.Print(Generated_5)
	}
}
```

Option C, même exercice : `prog/c/ex01/ex01.go`, exécuté par la v3, non recompilé dans la disposition du boilerplate. La fonction rend `FailOrSuccessNumber{Tag: FSNSuccess, Number: …}` ; le test devient `result.Tag == FSNSuccess`.

Sortie attendue :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
```

Réserves : numérotation `Generated_N` non contractuelle ; mise en forme du printer.

## 10. Plan d'implémentation

Le plan de la v2 (§10) reste la base. Il ne démarre qu'après la décision 1.

### 10.1 Fichiers à créer

Tous sous `src/transpiler/`.

| Fichier | Rôle |
|---|---|
| `representation/reprOf.ts` | Type du checker vers représentation ; membres d'Either séparés ; types récursifs ; refus au-delà de 40 niveaux |
| `representation/fit.ts` | Les sept règles ; rend « rien à faire » ou le refus avec ses deux formes |
| `representation/place.ts` | Seule porte d'entrée vers le Go d'une expression enfant ; propage le type attendu |
| `representation/literalTarget.ts` | Cible d'un littéral sous un type attendu en union |
| `guards/referenceIdentity.ts` | R-IDENT (`===`, `!==`, `switch`) et R-EGAL |
| `guards/narrowedRead.ts` | R-RETRECI |
| `guards/uninitialized.ts` | R-INIT et I-NIL |
| `valueSymbolOf.ts` | Symbole d'un identifiant, partagé par R-TDZ, R-IMPORT et R-RETRECI |
| `topLevelInitialization.ts` | R-TDZ |
| `executedImports.ts` | R-IMPORT |

### 10.2 Lignes d'origine à modifier

Celles de la v2 (§10.2), plus `transformSourceFile.ts`, avant la réduction des instructions : appel de R-TDZ et lecture de `verbatimModuleSyntax`. Raison : refuser avant tout effet sur le contexte. Alternative additive : aucune, ces contrôles portent sur le fichier entier.

### 10.3 Étapes et critères

| Étape | Contenu | Critère |
|---|---|---|
| 1 | `reprOf`, `fit` | Test unitaire : les verdicts de `detect4-corpus.tsv` sont retrouvés sur les 192 programmes |
| 2 | `place`, `literalTarget` | La sonde `positions-v4` rend 20 refus, un par ligne |
| 3 | Gardes R-IDENT, R-EGAL, R-RETRECI, R-INIT | Chaque épreuve du §7.1 rend l'erreur indiquée |
| 4 | R-TDZ, R-IMPORT | Les trois épreuves de lecture avant initialisation sont refusées ; `import-de-type-seul` identique |
| 5 | Exercices 00 et 01 | `verify.sh 00` et `verify.sh 01` : identiques |
| 6 | Corpus entier | `hackathon-tools/mcp/h coverage` : aucune épreuve n'échoue après l'étape 1 |

## 11. Décisions qui reviennent à l'utilisateur

1. **U ou C.** U : simple, une fuite de règle panique. C : le plus rapide, une fuite ne compile pas, générateur à écrire. Je ne tranche pas (§8). Un prototype du générateur sur les exercices 01 à 05 lèverait le doute.
2. **`===` entre deux Either.** Refusé sous U et C. Le porter impose BP.
3. **Tableaux et objets par pointeur, élargissement refusé.** Décidé ici. L'autre branche : par valeur, mutation et identité refusées, élargissement par copie.
4. **R-COVAR.** Refuser tout alias élargi d'un conteneur modifiable, ou accepter une panique que TypeScript ne justifie pas quand le programme écrit par cet alias.
5. **`binary.ts` ligne 82** (produit puis somme) : corriger la ligne, ou refuser la forme. Silence tant que rien n'est fait.
6. **Chaîne `Init()`** et modification de `transformSourceFile.ts`, `build.ts` : inchangé depuis la v2.
7. **Couleurs du terminal, sortie d'erreur** : inchangé. Silence hors de `verify.sh`.
8. **Import sans liaison, `export … from`, `else`, constante locale** : refusés par ce plan.
9. **`verify.sh` lance `tsx` sans `--tsconfig`** : sans effet aujourd'hui.
