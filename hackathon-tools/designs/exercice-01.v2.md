# Conception : exercice 01, deuxième version — représentation Go d'une union TypeScript

Date : 2026-11-19. Remplace la décision centrale de `exercice-01.md`, qui n'est pas modifié. Aucun fichier de `src/`, `bin/`, `projects/` n'a été touché.

Preuves : [exécuté] compilé et lancé pendant cette conception ; [exécuté, contradicteur] ou [exécuté, couverture] repris d'un rapport joint ; [lu] lu dans le source ; [hypothèse] ni l'un ni l'autre.

Tout le Go de ce document est écrit à la main. Rien n'est transpilé : toute phrase sur ce que fera le transpileur est une hypothèse tant que `verify.sh` ne l'a pas montré.

Essais rejouables dans `hackathon-tools/verify/out/design-01-v2/` :

| Élément | Contenu |
|---|---|
| `u/`, `u0/`, `a2/`, `b/`, `c/` | Bibliothèque partagée de chaque option. `b/` est celle du contradicteur, recopiée |
| `prog/<option>/<programme>/` | Sept programmes par option : exercice 01, `chaine-six-etapes`, `six-succes`, `either-et-brut`, `fail-partage`, `tableau-elargi`, `fail-retreci-dans-left` |
| `run.sh` | Compile, passe `go vet`, exécute les 28 programmes et les compare au TypeScript (`ref/`) |
| `essais/either/`, `essais/autres/` | Option U seulement : les 30 épreuves `either/` et 9 épreuves d'autres familles, en Go |
| `run-essais.sh` | Même comparaison pour ces 39 programmes |
| `essais/tdz`, `essais/fma`, `essais/coercition`, `essais/inference`, `essais/ordre` | Essais isolés cités dans le texte |
| `bench/bench_test.go`, `bench/bench.txt`, `bench/resume.md` | Bancs d'essai, résultats bruts, médianes |
| `expected/` | Go attendu de l'exercice 01 dans la disposition du boilerplate, module séparé |

Environnement : Go 1.27.4 `linux/arm64` dans `golang:1.27` (15 processeurs vus par le conteneur), Node 24.14.1. Fonctions mesurées marquées `noinline`, 3 passes, médiane.

---

## 1. Problème et famille

L'exercice 01 demande de traduire un retour `Success<number> | Fail`, un `if`, une constante de premier niveau et un `print`. La décision qui engage tout le reste est la représentation Go d'une union TypeScript. L'Either en est le cas le plus fréquent, pas un cas à part.

Appartiennent à la même famille, parce qu'ils contraignent le même type Go :

| Cas | Pourquoi il contraint le même type |
|---|---|
| Union d'Either à un, deux, six Right ou six Left | C'est le type de retour lui-même |
| Union sans aucun Right (`Fail`, `Left<…> \| Left<…>`) | TypeScript l'accepte partout où une union plus large est attendue |
| Union Either et valeur brute (`Fail \| number[]`, exercice 02) | Le même Either y entre et en ressort par rétrécissement |
| Union de valeurs brutes (`number \| undefined`, six `return` de types différents) | Même question : un emplacement, plusieurs types |
| Either dans un Either, dans un tableau, dans un objet, dans un générique | L'emplacement intérieur a un type Go que le lecteur doit retrouver |
| Variable rétrécie par une garde | Le type TypeScript change, la variable Go non |

Ce que TypeScript permet et que Go ne permet pas : le sous-typage structurel. `Fail` est accepté là où `Success<number> | Fail` est attendu, et `readonly Fail[]` là où `readonly (Success<number> | Fail)[]` l'est. Go n'a de sous-typage que par interface, et aucune covariance. Toute représentation typée doit donc convertir aux endroits où TypeScript ne fait rien. Les options se distinguent par le nombre de ces endroits et par leur coût.

## 2. Ce qui n'a pas été éprouvé

À lire avant le reste.

1. **Le transpileur.** Aucune ligne de `src/` n'existe pour cette conception. Les 67 programmes Go identiques au TypeScript prouvent que la représentation porte ces cas, pas que le transpileur saura les émettre.
2. **La comparaison profonde des types.** La règle « un type TypeScript, un type Go, et une conversion ou un refus à chaque écart » (§3, règle commune) repose sur une fonction qui compare deux types TypeScript position par position. Elle n'est ni écrite ni essayée. Seule sa nécessité est établie : sans elle, l'option recommandée panique (`essais/coercition`).
3. **L'asynchrone.** `Promise<Either>`, `await`, `rightAsyncPipe`, `asyncGroup` : aucune option n'a été essayée dans cette position. La décision sur le modèle asynchrone n'est pas prise ici. C'est la seule case de la matrice que je laisse en hypothèse pour toutes les options.
4. **Option C au-delà de sept programmes.** Fonction générique de l'utilisateur, valeur de type `unknown`, références nues : non écrits. Je tiens pour probable, sans l'avoir exécuté, que C a besoin de la forme dynamique de l'option U dès qu'une information est de type `string` (`Left<string, unknown>`, 27 usages).
5. **Options A2, B et C sur les 39 essais.** Seule l'option U les a tous. A2, B et C ont les sept programmes de `prog/`.
6. **`DCommon.pipe` à six étapes de formes mêlées, `group`, `matchInformation` en forme curryfiée.** Les étapes sont essayées une à une (`forme-curryfiee-hors-pipe`, `chaine`), pas leur composition.
7. **Fonction passée là où une fonction au retour plus large est attendue.** Go refuse pour A2 (`essais/inf_func` du contradicteur). La fermeture de conversion qui le réparerait n'est pas écrite. Sous U le cas ne se pose pas entre Either ; il se pose entre types bruts et n'est pas essayé.
8. **Largeur d'affichage Unicode.** Node donne 373 plages de largeur 0 et 125 de largeur 2 [exécuté, extraction par `node --expose-internals`]. La table n'est pas portée en Go, et l'effet de la normalisation que Node applique avant de mesurer n'est pas vérifié.
9. **Ordre d'initialisation.** La chaîne `Init()` est exécutée sur deux modules. Non essayé : import élidé parce qu'il ne sert qu'aux types, import sans liaison (`import "./x"`), ré-export.
10. **Détection de la lecture avant initialisation** pour une constante qui n'est pas un Either : analyse statique décrite au §10, non écrite.
11. **Mesures** : une seule architecture, 3 passes, pas de `benchstat`. L'écart U contre A2 sur le cas courant (1,3 ns contre 0,8 ns) est de l'ordre du bruit entre deux lancements (A2 a varié de 0,77 à 0,96 ns).
12. **Résolution des imports** (alias nommé, import depuis la racine `@duplojs/lang`, ré-export) : lue dans `either/index.ts`, non exécutée.

## 3. Options

Règle commune à toutes les options sauf A, et qui est le premier changement par rapport à la première conception :

> Le type Go d'une expression est une fonction du type TypeScript **déclaré** de ce qu'elle désigne, jamais de sa provenance. Chaque emplacement qui reçoit une valeur connaît le type TypeScript attendu. Quand les deux types n'ont pas la même représentation, le transpileur émet une conversion ou refuse. Il ne laisse jamais Go ou l'exécution le découvrir.

| | Option | Forme Go |
|---|---|---|
| A | Première conception : Right typé, Left dynamique, type du Left hérité de la provenance | `type Either[R any] struct { right R; left any; meta *Meta }` |
| A2 | A sous la règle commune : un type unique pour toute union sans Right, conversions aux écarts | `Either[R]` comme A, plus `type Left struct { value any; meta *Meta }` ; plusieurs Right : `Either[any]` |
| B | Interface, une struct par variante | `type Either interface { … }` ; `EitherSuccess[T]`, `EitherRight[T]`, `EitherFail`, `EitherLeft[T]` |
| U | Struct unique non générique, descripteur statique, emplacement numérique | `type Either struct { number float64; value any; kind *EitherKind }` |
| C | Union engendrée par signature : étiquette et un champ par type de valeur | `type FailOrSuccessNumber struct { Tag uint8; Number float64 }` |

U0 est U sans le champ `number` (24 octets, toute valeur dans `value`). Elle n'est mesurée que pour montrer ce que le champ apporte.

Pour U, la règle d'union est unique et ne mentionne pas l'Either :

> Une union TypeScript dont tous les membres ont le même type Go prend ce type. Sinon elle prend `any`.

Tous les types de `@duplojs/lang/either` ont le type Go `Either`. Donc `Success<number> | Fail`, six Right de types différents, et `Fail` seul sont `Either` ; `-1 | 0 | 1` est `float64` ; `Fail | number[]` et `number | undefined` sont `any`.

Options non reprises, et pourquoi sans les réécrire : A' (Left et Right typés) est A2 avec un paramètre de plus, donc les mêmes conversions en plus grand nombre [hypothèse] ; D (struct dynamique de 40 octets de la première conception) est U0 en plus gros, mesurée à 13,7 ns par la première conception contre 6,5 ns pour U0 ici.

## 4. Matrice des axes

Chaque case : tient, se dégrade ou casse, puis la preuve. Les noms entre parenthèses sont des programmes de `prog/` ou `essais/`.

| Axe | Cas essayé | A | A2 | B | U | C |
|---|---|---|---|---|---|---|
| Cardinalité 0 | Union sans Right : `fail()` gardé dans une constante puis renvoyé par deux fonctions aux Right différents (`fail-partage`) | casse : `cannot infer R`, puis erreur de compilation sans conversion [exécuté, contradicteur] | tient, une conversion `FromLeft[R]` par retour [exécuté] | tient, aucune conversion [exécuté] | tient, aucune conversion [exécuté ; aussi `gauches-seuls`, `gauche-hors-contexte`] | tient, une struct construite par retour [exécuté] |
| Cardinalité 1 | Exercice 01 | tient [exécuté, première conception] | tient [exécuté] | tient [exécuté] | tient [exécuté] | tient [exécuté] |
| Cardinalité 2 | Deux Right de même type (`deux-droites-meme-type`), deux Left (exercice 07) | tient [hypothèse] | tient [hypothèse] | tient [hypothèse] | tient [exécuté] | tient [hypothèse] |
| Cardinalité 6 | Six Right (`six-succes`), six Left (`chaine`, `six-gauches-garde`) | se dégrade en `Either[any]` [exécuté, contradicteur] | se dégrade en `Either[any]` : 9,2 ns en cycle [exécuté] | tient : 13,2 ns [exécuté] | tient : 6,8 ns [exécuté] | tient : 5,0 ns, struct de 64 octets [exécuté] |
| Symétrie : même essai de l'autre côté | Six Left contre six Right ; Left portant un nombre contre Right portant un nombre | asymétrique : Left alloue [exécuté, contradicteur] | asymétrique : Right 0,8 ns, Left 6,7 ns et 1 allocation [exécuté] | symétrique [exécuté] | symétrique : 1,3 ns des deux côtés [exécuté] | symétrique [exécuté] |
| Hétérogénéité : tous différents | `six-succes` ; tableau mêlant des Right de types différents (`tableau-heterogene`) | se dégrade [exécuté, contradicteur] | se dégrade : le Right n'est plus vérifié par Go, six assertions [exécuté pour `six-succes` ; tableau : hypothèse] | tient, assertions [exécuté pour `six-succes`] | tient, assertions [exécuté pour les deux] | tient, typé de bout en bout [exécuté pour `six-succes`] |
| Hétérogénéité : membre et non-membre | `either-et-brut`, `predicat-sur-brut` | se dégrade : interface non prévue [exécuté, contradicteur] | se dégrade : le Left rangé dans `any` alloue 24 octets, 15,6 ns [exécuté] | tient : 4,9 ns, 0 allocation [exécuté] | se dégrade : l'Either rangé dans `any` alloue 32 octets, 17,3 ns [exécuté pour les deux programmes] | tient et reste typé : 2,0 ns [exécuté pour `either-et-brut`] ; `unknown` : hypothèse |
| Profondeur | Either rétréci rangé dans un Left puis relu (`fail-retreci-dans-left`) ; tableau élargi (`tableau-elargi`) ; Either d'Either ; générique de l'utilisateur | casse : panique à l'exécution [exécuté, contradicteur] | tient avec conversions [exécuté] ; tableau de 1000 : 21,8 µs et 32 Ko par élargissement [exécuté] ; fonction en argument : erreur de compilation Go [exécuté, contradicteur] | tient, aucune conversion [exécuté] | tient, aucune conversion [exécuté ; aussi `imbrique-deux-cotes`, `generique-utilisateur`] | tient avec conversions [exécuté] ; tableau de 1000 : 2,8 µs et 16 Ko [exécuté] ; générique : hypothèse |
| Succession de 6 maillons, 6 types | `chaine-six-etapes` ; six gardes `if (isLeft(x)) return x` (`garde-isleft-six-types`) | tient [exécuté, contradicteur] | tient : 40,5 ns, 1 allocation [exécuté] | tient : 87 ns, 6 allocations [exécuté] | tient : 67 ns, 4 allocations [exécuté pour les deux formes] | tient : 35,5 ns, 1 allocation, 192 lignes de Go contre 106 [exécuté] |
| Formes d'écriture | Référence nue, forme curryfiée, constructeur sans valeur | casse à la compilation Go pour `fail()` [exécuté, contradicteur] | `whenIsRight(coalescing)` curryfié : `cannot infer R` [exécuté, couverture] ; argument de type à écrire | types à écrire à chaque construction [exécuté] | constructeurs sans valeur : rien à inférer [exécuté, `constructeur-type-non-inferable`] ; `isRight` nu : passe tel quel [exécuté] ; fonction générique nue : `cannot infer R`, argument de type à écrire [exécuté, `essais/inference` et `forme-curryfiee-hors-pipe`] | aucune fonction de bibliothèque : chaque forme est développée sur place [exécuté pour la forme appel ; références nues : hypothèse] |
| Positions | Premier niveau, corps de fonction, branche rétrécie, argument, retour, propriété d'objet ; asynchrone | branche rétrécie puis rangement : casse [exécuté, contradicteur] | tient avec conversion au rangement [exécuté, `retreci`] ; asynchrone : hypothèse | tient [exécuté, `retreci`] ; asynchrone : hypothèse | tient [exécuté : `retreci-gauche-en-argument`, `either-dans-objet`, `expected/`] ; asynchrone : hypothèse | tient [exécuté, `retreci`] ; asynchrone : hypothèse |
| Valeurs limites | Valeur `undefined`, `null`, `0`, `-0`, `NaN`, `""`, `false`, `[]` des deux côtés ; valeur zéro Go | valeur zéro : succès de `0` en silence, panique d'affichage pour `Either[any]` [exécuté, contradicteur] | valeur zéro : panique voulue [lu, `a2/either.go`] ; valeurs : hypothèse | interface nulle : hypothèse | tient [exécuté, `gauche-valeurs-limites`, `droite-valeurs-limites`] ; valeur zéro : panique `ReferenceError` [exécuté, `essais/tdz`] | étiquette 0 : panique voulue [lu] ; valeurs : hypothèse |
| Composition avec l'existant | `print` d'un tableau d'Either ; fonction appelée rangée dans un temporaire par `shared/call.ts` | `EitherSuccessOf` générique ne se range pas dans un temporaire [exécuté, `verify.sh 00`] | idem [lu] | idem pour les constructeurs [lu] | `EitherIsRight` non générique se range ; `EitherSuccessOf` non [lu] ; affichage [exécuté] | pas de fonction de bibliothèque [exécuté] |

Ce que la matrice dit : aucune option ne tient partout.

- A casse. Elle sort.
- A2 et C tiennent en comportement à condition de convertir à chaque écart. Elles se dégradent en profondeur : copie entière d'un tableau, fermeture autour d'une fonction.
- B et U tiennent sans conversion entre Either. Elles ne laissent plus Go vérifier le type des valeurs.
- U se dégrade quand un Either entre dans une union avec une valeur brute, là où B et C ne paient rien.
- C est la plus rapide sur 10 des 16 lignes où elle est mesurée, et la seule entièrement typée. Elle engendre presque deux fois plus de Go (192 lignes contre 106 pour la chaîne, 116 contre 79, 73 contre 41) et n'a aucune fonction de bibliothèque.

## 5. Mesures

Médianes de 3 passes, `bench/bench.txt`. « o » : octets alloués par opération ; « al » : allocations.

| Scénario | U | U0 | A2 | B | C |
|---|---|---|---|---|---|
| **Cas courant** : `add` réussit, `isRight`, lecture | 1,3 ns, 0 al | 6,5 ns, 8 o, 1 al | 0,77 ns, 0 al | 7,4 ns, 8 o, 1 al | 0,73 ns, 0 al |
| Left portant un nombre | 1,3 ns, 0 al | — | 6,7 ns, 8 o, 1 al | 15 ns, 24 o, 1 al | 0,82 ns, 0 al |
| **N = 6**, six Right de types différents, en cycle | 6,8 ns | 7,7 ns | 9,2 ns | 13,2 ns | 5,0 ns |
| — dont Right nombre (`success(5)`) | 2,8 ns, 0 al | 8,2 ns, 1 al | 9,2 ns, 1 al | 9,0 ns, 1 al | 3,8 ns, 0 al |
| — dont Right tableau | 22,5 ns, 40 o, 2 al | 22 ns | 23,6 ns, 40 o, 2 al | 36 ns, 64 o, 2 al | 10,7 ns, 16 o, 1 al |
| — dont Right objet | 8,5 ns, 8 o, 1 al | 8,3 ns | 9,3 ns, 8 o, 1 al | 15,5 ns, 24 o, 1 al | 3,8 ns, 0 al |
| **N = 6**, chaîne de six étapes, tout réussit | 67 ns, 64 o, 4 al | 82 ns, 80 o, 6 al | 40,5 ns, 16 o, 1 al | 87 ns, 80 o, 6 al | 35,5 ns, 16 o, 1 al |
| — entrées 1 à 7 en cycle (6 sur 7 finissent en Left) | 52 ns, 46 o, 2 al | 61 ns | 41 ns, 17 o, 1 al | 70 ns, 65 o, 3 al | 32 ns, 9 o, 0 al |
| Six gardes `isLeft` et retour, tout réussit | 69 ns, 64 o, 4 al | — | 40 ns, 16 o, 1 al | — | — |
| **Hétérogène**, Either et valeur brute, côté Right | 19,7 ns, 32 o, 2 al | 24,5 ns | 19,7 ns, 32 o, 2 al | 26 ns, 40 o, 3 al | 6,0 ns, 8 o, 1 al |
| — côté `fail()` | 17,3 ns, 32 o, 1 al | 14,9 ns, 24 o | 15,6 ns, 24 o, 1 al | 4,9 ns, 0 al | 2,0 ns, 0 al |
| Tableau de 1000 Either (10 % de `fail`), construit puis parcouru | 1,84 µs, 0 al | 8,1 µs, 900 al | 1,88 µs, 0 al | 10,3 µs, 900 al | 1,53 µs, 0 al |
| **Pire cas** : tableau de 1000 `Fail` passé là où une union plus large est attendue | 11 ns | — | 21,8 µs, 32 792 o | 11 ns | 2,8 µs, 16 408 o |
| — tableau de 1000 succès vers une union à deux Right | 14 ns | — | 30,2 µs, 48 976 o, 1001 al | — | 6,4 µs, 32 792 o |

Les 11 à 14 ns des lignes « pire cas » sous U et B sont le coût du banc lui-même (rangement d'une tranche dans une interface), pas une conversion.

Tailles (`unsafe.Sizeof`) : U 32 octets, U0 24, `a2.Either[float64]` 32, `[string]` 40, `[[]float64]` 48, `[any]` 40, `a2.Left` 24, interface B 16 plus l'objet alloué, C 16 pour `Success<number> | Fail` et 64 pour les unions à six membres.

Ce que les chiffres enlèvent à l'option que je recommande plus bas : U est derrière A2 et C sur la chaîne de six étapes (67 ns contre 40,5 et 35,5), parce que trois des six valeurs intermédiaires sont une chaîne, un tableau et un objet, et que chacune coûte une allocation en entrant dans `value`.

## 6. Dégradations

De l'option U. Celles des autres options sont dans la matrice et au §5.

| Déclencheur (forme TypeScript exacte) | Coût (mesuré ou hypothèse) | Détection |
|---|---|---|
| Either dont la valeur est une chaîne non constante, un tableau ou un objet tenu par valeur : `DEither.success(text)`, `DEither.right("d-list", [a, b])` | Une allocation de 16, 24 octets ou de la taille de l'objet par Either construit. Mesuré : 67 ns et 4 allocations sur la chaîne de six étapes, contre 40,5 ns et 1 pour A2 | Aucune : le comportement est identique. Visible au banc seulement |
| Either qui entre dans une union avec une valeur brute : `DEither.whenIsRight(x, DArray.coalescing)`, `(Fail \| number)[]` | 32 octets alloués par Either, 17,3 ns contre 4,9 (B) et 2,0 (C) | Aucune : comportement identique |
| Toute lecture d'une valeur d'Either : `unwrapRight`, `unwrapLeft`, rappel de `whenIsRight`, de `rightPipe`, de `matchInformation` | Une assertion de type par lecture, comprise dans les mesures. Go ne vérifie plus le type de la valeur à la compilation | Panique `interface conversion`. Elle n'est justifiée par une garantie de TypeScript que si la ligne suivante est tenue |
| Valeur dont la représentation change en s'élargissant : `Success<number[]>` passé pour `Success<(number \| string)[]>`, `number[]` pour `(number \| string)[]` | Conversion élément par élément quand elle sera écrite [hypothèse]. Sans elle : panique [exécuté, `essais/coercition`] | Erreur à la transpilation `coercion-not-supported`, tant que la conversion n'est pas écrite. Repose sur la comparaison profonde du §2, point 2 |
| Élargissement d'une valeur scalaire vers une union : `const widened: Success<number \| string> \| Fail = count(3)` | Aucune conversion : la valeur est lue comme `any` [exécuté, `elargissement-droit`]. Une allocation de 8 octets à la lecture d'un nombre sous le type `any` [lu] | Sans objet |
| Tout Either dont la valeur n'est pas un nombre | 8 octets de plus par Either que U0 (32 contre 24) : c'est le prix de l'emplacement numérique | Sans objet |
| Information qui n'est pas un littéral : `DEither.left(code, value)` avec `code: string` | Un descripteur de 40 octets alloué par appel au lieu d'une variable de package [hypothèse ; le contradicteur mesure 22 ns et 2 allocations pour la forme équivalente de A] | Sans objet |
| Fonction de bibliothèque générique passée nue : `DEither.whenIsRight(DArray.coalescing)`, `DArray.map(xs, DEither.success)` | Aucun à l'exécution. Le transpileur doit écrire l'argument de type (`ArrayCoalescing[float64]`), lu sur la signature résolue par le checker | Si l'argument manque : erreur de compilation Go `cannot infer R` [exécuté]. Donc refus à la transpilation `library-reference-not-supported` tant que le handler n'écrit pas l'argument |
| Constante de premier niveau lue avant son initialisation | Sans objet | Either : panique `ReferenceError` [exécuté, `essais/tdz`], justifiée, TypeScript lève aussi. Autre type : refus à la transpilation `top-level-read-before-initialization` [hypothèse, §10] |
| Sortie standard branchée sur un terminal | Node colore la sortie de `console.info`, le Go non | Aucune. La référence est la sortie redirigée, celle que `verify.sh` compare. Écart assumé, à valider par l'utilisateur (§11) |

Deux dégradations qui ne viennent pas de la représentation mais que `print`, livré par cet exercice, rend observables :

| Déclencheur | Coût | Détection |
|---|---|---|
| Produit suivi d'une somme : `value * factor + shift` | Sur `arm64`, Go fusionne les deux opérations même à travers un temporaire : `0.1 * 10 + -1` donne `5.551115123125783e-17` au lieu de `0` [exécuté, `essais/fma`] | Aucune aujourd'hui : divergence muette de `expression/binary.ts`. Une conversion explicite `float64(a * b)` la supprime [exécuté]. Épreuve ajoutée : `nombres/produit-puis-somme` |
| Deux fichiers importés qui ont chacun un effet de premier niveau | Go initialise les packages par ordre de chemin, pas dans l'ordre des `import` [exécuté, contradicteur] | Aucune avec `init()`. Une fonction `Init()` par package, appelée dans l'ordre des `import`, rend l'ordre du TypeScript [exécuté, `essais/ordre`] |

## 7. Épreuves

### 7.1 État attendu après l'implémentation de l'exercice 01

Deux programmes doivent finir identiques : `projects/00` et `projects/01`.

Chacune des 152 épreuves du corpus (151 dans six familles, plus `nombres/produit-puis-somme`) doit finir dans l'un de deux états : identique, ou arrêt à l'étape 1 de `verify.sh` sur une erreur de transpilation. Presque toutes s'arrêteront à l'étape 1 ; celles qui n'emploient que les constructions livrées doivent être identiques. Critère vérifiable avec `hackathon-tools/mcp/h coverage` : **aucune épreuve n'échoue à l'étape 3, 4 ou 5**. Une épreuve qui se transpile puis ne compile pas, panique ou diverge est un défaut du transpileur, à corriger par un refus ou par la prise en charge.

Je ne peux pas donner aujourd'hui la première erreur de chaque épreuve : elle dépend de l'ordre dans lequel les transformers rencontrent les constructions. Les erreurs nommées ci-dessous sont celles que la conception crée ; `notfound-transformer` est l'erreur existante du boilerplate pour un nœud qu'aucun transformer ne connaît, elle porte le genre du nœud et son texte.

### 7.2 Ce qui est établi à la main pour l'option U

| Programmes | Résultat |
|---|---|
| Exercice 01 dans la disposition du boilerplate (`expected/`) | Identique, 233 octets [exécuté] |
| `unions/` : `chaine-six-etapes`, `six-succes`, `either-et-brut`, `fail-partage`, `tableau-elargi`, `fail-retreci-dans-left` | Identiques : 1518, 1259, 526, 1404, 12 et 419 octets [exécuté]. Identiques aussi pour A2, B et C |
| Les 30 épreuves de `either/` | Identiques [exécuté, `run-essais.sh`] |
| `instructions/` : `six-return-types-bruts`, `ternaire-branches-heterogenes`, `if-retrecissement-undefined`, `let-type-change`, `coalescence-nulle` | Identiques [exécuté] |
| `appels/` : `forme-curryfiee-hors-pipe`, `reference-nue-bibliotheque`, `constructeur-type-non-inferable` | Identiques [exécuté] |
| `premier-niveau/ordre-des-imports` | Identique avec la chaîne `Init()` [exécuté] ; mon Go lit deux variables de package là où le TypeScript appelle deux fonctions |

### 7.3 Décision pour chaque cas des auditeurs

M : pris en charge par l'implémentation de l'exercice 01. R : refusé à la transpilation, avec l'erreur. D : code différé, refusé en attendant avec l'erreur indiquée, et un essai exécuté montre que U ne le bloque pas. Les numéros sont ceux des rapports de couverture. Toute mention « M » est une hypothèse jusqu'à `verify.sh`.

**Tranche Either** (`exercice-01.couverture-either.md`)

| Cas | Décision | Erreur en attendant | Essai exécuté sous U |
|---|---|---|---|
| C02, C03, C07 | M : le constructeur ne dépend pas du type de la valeur, le type Go est `Either` même pour `Success<42>` | — | `droite-valeurs-limites`, `imbrique-deux-cotes` |
| C04, C05, C06 | D | `notfound-transformer` sur le littéral de tableau, d'objet, `undefined`, `null`, `NaN` | `litteraux-const`, `droite-valeurs-limites` ; `-0` par négation à l'exécution dans `essais/fma` |
| C08, C10, C23 | D | `library-reference-not-supported` | `references-nues-constructeurs` |
| C09, C11, C12, C14, C15, C18 à C22, C34 | D | `transformation-error` du routeur Either (ligne 45 existante) | `tous-les-constructeurs` : onze constructeurs, 3 ou 4 clés |
| C13, C16, C17 | D | idem | `six-gauches-garde`, `deux-droites-meme-type`, `prog/u/six` |
| C24 | D : le côté est porté par le descripteur, pas par la valeur | idem | `gauche-valeurs-limites` |
| C25 | D | `notfound-transformer` sur le ternaire | `ternaire-constructeurs` |
| C26, C27, C28 | D | routeur Either | `gauche-hors-contexte`, `gauches-seuls`, `imbrique-deux-cotes`, `prog/u/retreci` |
| C29, C30, C31, T15 | D | `notfound-transformer` sur le type tableau | `tableau-vide-et-gauches`, `tableau-heterogene` |
| C32, C33 | D | `notfound-transformer` sur l'objet littéral ; routeur Either | `either-dans-objet`, `meme-information-deux-cotes` |
| P02, P07 | M : `isLeft` partage le handler de `isRight` | — | `prog/u/retreci` |
| P03, P09 | D : `EitherIsRight` n'est pas générique, la référence nue passe sans instanciation | `library-reference-not-supported` | `tableau-heterogene`, `tableau-vide-et-gauches` |
| P04, P05, P06 | D : aucune émission pour le rétrécissement, dans aucune branche | `notfound-transformer` (négation), `if-else-not-supported`, `variable-statement-outside-top-level` | `negation-garde` |
| P08 | D | routeur Either (`unwrapRight`) | `garde-isleft-six-types`, banc « six gardes » |
| P10, P17 | D : variante dynamique choisie quand le type Go de l'argument est `any` | `either-predicate-on-non-either` | `predicat-sur-brut` |
| P11, P12, P13 | D | routeur Either | `has-information`, `retreci-gauche-en-argument`, `lecture-gauche-heterogene` |
| P14, P15, P16, P18 | D | routeur Either | `has-information`, `has-information-liste`, `has-information-curry`, `is-selected` |
| T03, T04 à T11, T17, T21 | M : tout type de `dist/either` et toute union de ces types donnent `Either`. Deux Right ne sont plus refusés | — | `types-nus-et-larges`, `droite-sans-valeur`, `gauches-seuls` |
| T12 | D | `union-members-not-uniform` | `prog/u/brut`, `predicat-sur-brut` |
| T13, T18, T19 | D | `notfound-transformer` sur la référence de type | `types-utilitaires` |
| T14 | R | `notfound-transformer` sur `Promise`. Décision asynchrone non prise (§2) | aucun |
| T16 | D | `function-generic-not-supported` | `generique-utilisateur` |
| T20 | D : aucune conversion à émettre | routeur Either | `elargissement-droit` |
| F02, F03, F04 | M par résolution du symbole [lu, non exécuté] | — | `alias-import` (même Go) |

**Tranche instructions** (`exercice-01.couverture-instructions.md`)

| Cas | Décision | Erreur en attendant | Essai ou source |
|---|---|---|---|
| 2, 4, 6 | M : variable de package, type pris sur le type déclaré | — | `essais/tdz` pour la lecture par une fonction |
| 3 | M pour un nombre ; D pour le reste | `notfound-transformer` | — |
| 5 | M | — | `essais/ordre` : lecture depuis un autre package |
| 7 | R, ou panique justifiée pour un Either | `top-level-read-before-initialization` | `essais/tdz` |
| 8, 9, 10 | D : déclaration courte locale, suivie de `_ = x` si elle n'est pas lue | `variable-statement-outside-top-level` | constantes locales de `garde-isleft-six-types` |
| 11 | R | `variable-statement-multiple-declarations` | — |
| 12, 13, 14 | R | `variable-statement-binding-pattern` | — |
| 15, 16, 17, 18 | D | `variable-statement-let` | `let-type-change` |
| 21, 56 | R | `notfound-transformer` sur la fonction fléchée | — |
| 22 | R | `notfound-transformer` sur `await` | — |
| 24, 32 | M : `if` et `return` ; un retour en union de littéraux numériques est `float64` par la règle d'union | l'épreuve `retour-anticipe` s'arrête sur `-1` (`notfound-transformer`) | — |
| 25, 26, 27, 41 | R | `if-else-not-supported` | `negation-garde` montre le `else` en Go |
| 28 | R | `if-body-not-block` | — |
| 29 | R | `if-condition-not-boolean` | — |
| 30 | R | `notfound-transformer` sur la négation | — |
| 31, 47, 48 | R : fin du silence | `binary-operator-not-supported` pour `&&`, `\|\|`, `%` et les opérateurs bit à bit | — |
| 33, 53, 54 | M : bloc vide, bloc nu, appel au résultat ignoré [lu, `block.ts`, `call.ts`] | — | — |
| 34 | M pour les nombres : `==` de Go sur `float64` suit la même norme [lu] | chaînes : `notfound-transformer` | — |
| 35, 37, 38 | D | `union-members-not-uniform` | `if-retrecissement-undefined`, `six-return-types-bruts` |
| 36 | D | routeur Either | `garde-isleft-six-types` |
| 39, 40 | R | `notfound-transformer` (`return` nu, type `void`) | — |
| 42 à 46 | D : `if` et `else` autour d'une affectation, une seule branche évaluée | `notfound-transformer` sur le ternaire | `ternaire-constructeurs`, `ternaire-branches-heterogenes` |
| 49, 50 | D | `notfound-transformer` (`??` n'est pas dans la table de `binary.ts`) | `coalescence-nulle` |
| 51, 52, 55 | R | `notfound-transformer` | — |

**Tranche appels** (`exercice-01.couverture-appels.md`)

| Cas | Décision | Erreur en attendant | Essai ou source |
|---|---|---|---|
| 1, 2, 18, 20, 21, 29 | M [lu, `call.ts`] | — | `expected/` |
| 3 | R | `import-alias-not-supported` : `identifier.ts` émettrait le nom local, absent du package importé [lu] | — |
| 4, 13, 14 | R | `notfound-transformer` sur l'appelé qui n'est pas un identifiant | — |
| 5 | Non tranché : dépend de ce que `resolveDependencyFile` rend pour un ré-export | épreuve `import-reexport-baril`, à lancer à l'étape 8 | — |
| 6 | R | `import-default-not-supported` | — |
| 7 | R | `import-cycle-not-supported` | `essais/cycle` du contradicteur : Go refuse |
| 8 | M par la chaîne `Init()` | — | `essais/ordre` |
| 9, 10 | M : les fonctions Go de package ne dépendent pas de l'ordre [lu] | — | — |
| 11, 12, 19, 30 | R | `notfound-transformer` (fléchée, type fonction, chaîne, tableau, objet, gabarit, ternaire) | — |
| 15 | R : fin du silence | `call-optional-not-supported` | — |
| 16 | R : fin du silence | `function-async-not-supported` | — |
| 17 | R : fin du silence | `function-generic-not-supported` | `generique-utilisateur` |
| 22 | R | `notfound-transformer` sur l'argument étalé | — |
| 24 | R : fin du silence | `function-parameter-optional-not-supported`, `-default-`, `-rest-` | — |
| 25, 26 | R | `notfound-transformer` ; `binary-operator-not-supported` | — |
| 27, 28 | M : l'appelé puis les arguments, dans l'ordre [lu, `call.ts` lignes 79 à 83] | — | — |
| 31, 32, 33, 36, 37, 40 | M : appel direct de la fonction partagée, aussi en instruction isolée | — | `expected/` |
| 34 | M pour `"info"` écrit en littéral ; R pour le reste | `print-params-not-supported` | — |
| 38 | M : les arguments de type explicites d'un constructeur n'ont pas d'effet sous U | — | `elargissement-droit` |
| 39 | D : rien à inférer | routeur Either | `constructeur-type-non-inferable` |
| 41 | D | routeur Either, routeur `common` | `prog/u/brut`, `prog/u/chaine` ; `group` non essayé |
| 42, 43, 44 | D : argument de type écrit depuis le checker ; forme choisie par le nombre d'arguments | routeur Either | `forme-curryfiee-hors-pipe` |
| 45, 46, 47 | D | `library-reference-not-supported` | `reference-nue-bibliotheque` |
| 48, 49 | D | `transformation-error` du routeur `common` | étapes isolées seulement (§2, point 6) |
| 50 | D : `rightPipe` développé en gardes successives, sans limite d'arité | routeur Either | banc « six gardes » : 69 ns contre 67 ns pour la fonction générique à six étapes |

**Tranche affichage** (`exercice-01.couverture-affichage.md`)

Le formateur livré par l'exercice 01 connaît nombres, chaînes, booléens, `null`, `undefined` et objets `JSObject`. Le transpileur refuse `print` quand le type statique de l'argument sort de cette liste : `print-value-type-not-supported`. Il n'y a donc pas de panique d'affichage à l'exécution.

| Cas | Décision | Erreur en attendant | Essai ou source |
|---|---|---|---|
| 4, 15, 16 | M | — | `droite-valeurs-limites`, `gauche-valeurs-limites` ; 600 valeurs aléatoires du contradicteur |
| 5 | M : les opérandes passent par des temporaires, Go calcule à l'exécution | — | `essais/fma` : `-0` et `0.30000000000000004` |
| 6, 45 à 49 | R | `print-value-type-not-supported` | — |
| 8, 41 | D : formateur lu, transformer de chaîne absent | `notfound-transformer` | — |
| 11 | R à l'arrivée des chaînes | `string-lone-surrogate-not-supported` : une chaîne Go ne peut pas contenir un demi-couple | — |
| 12 | D : règle de troncature à porter avec le premier transformer de chaîne | `notfound-transformer` | non exécuté ; ne dépend pas de la représentation |
| 17 à 21, 23 | D | routeur Either | `tous-les-constructeurs`, `imbrique-deux-cotes` |
| 25 à 34 | D | `print-value-type-not-supported` | portage complet du contradicteur : 11 186 lignes identiques ; `prog/u/chaine` et `six` affichent des tableaux d'Either |
| 35 | D | idem | table de largeur non portée (§2, point 8) |
| 36, 42 | R à l'arrivée des littéraux | `array-hole-not-supported`, `object-integer-key-not-supported` | — |
| 37, 38 | D | `notfound-transformer` sur l'objet littéral | `litteraux-const`, `either-dans-objet` |
| 43, 44 | R | `print-value-type-not-supported` | — |
| 55 | Signalé : `verify.sh` ne compare pas la sortie d'erreur | décision de l'utilisateur (§11) | — |
| 56, 57, 58, 60 | M : `Print` rend son entrée, c'est une expression | — | — |
| 59, 63 | R | `notfound-transformer` (fléchée, `await`) | — |
| 61, 62 | D | `library-reference-not-supported` | — |
| 65 | Écart assumé, §6 | — | — |

### 7.4 Épreuve ajoutée

`hackathon-tools/verify/epreuves/nombres/produit-puis-somme/` : s'exécute avec `tsx`, passe `tsc --noEmit`. État attendu après implémentation : identique si la ligne 82 de `binary.ts` est corrigée (§10.2), sinon divergente sur `arm64`. Non inscrite au README du corpus.

## 8. Recommandation

Aucune option ne tient sur toute la matrice. Ce qui suit est un compromis, avec ses dégradations nommées au §6.

**Option U** : une struct `Either` unique, non générique, avec un descripteur statique par variante et un emplacement numérique ; `any` pour toute union dont les membres n'ont pas le même type Go.

Pourquoi elle, sur les essais :

- c'est la seule, avec B, qui ne convertit jamais entre deux types d'Either, à aucune profondeur : 46 programmes écrits sans une conversion, et le pire cas des tableaux à 11 ns contre 21,8 µs (A2) et 2,8 µs (C) ;
- elle ne se dégrade pas quand le nombre de variantes ou leurs types changent : le coût par valeur est le même à un Right qu'à six ;
- sur le cas courant elle reste au niveau des options typées (1,3 ns contre 0,77 et 0,73, sans allocation), et elle est devant A2 dès qu'un Left porte un nombre (1,3 contre 6,7 ns) ;
- les constructeurs n'ont rien à inférer, ce qui supprime la classe d'erreurs `cannot infer R` pour `fail()`, `left(info)`, `right(info)` (516 usages) ;
- le rétrécissement ne demande rien, et cette fois sans l'exception qui cassait A : il n'y a qu'un type Go.

Ce qu'elle abandonne :

- face à C : la vérification par Go du type de chaque valeur, et près de la moitié du temps sur une chaîne dont les valeurs sont des chaînes, des tableaux ou des objets (35,5 ns pour C, 67 pour U) ;
- face à A2 : la lecture d'un Right sans assertion et sans allocation quand il est une chaîne ou un tableau (67 contre 40,5 ns sur la même chaîne) ;
- face à B : l'entrée gratuite d'un Either dans une union avec une valeur brute (17,3 contre 4,9 ns).

Ce n'est pas une solution générale au sens où tout serait typé et rapide. C'est la représentation dont le comportement ne dépend d'aucune propriété de l'échantillon. Si la vitesse sur de longs enchaînements à valeurs non numériques prime, C est le bon choix et il coûte un générateur d'unions, de conversions et de fonctions développées sur place ; ce choix revient à l'utilisateur (§11).

## 9. Go attendu

[exécuté] `expected/` : `go build ./...` et `go vet ./...` passent, `go run .` rend les 233 octets du TypeScript, comparés avec `cmp`. L'exercice 00 n'a pas été refait à la main sous U.

Réserves : la numérotation `Generated_N` n'est pas contractuelle ; la mise en forme sera celle du printer. Le formateur est celui de la première conception, inchangé (`FormatConsole`, `formatValue`, `formatObject`, `reduceToSingleString`, `formatString`, `quoteJSString`, `JSNumberToString`, 311 lignes au total pour le fichier partagé). Le fichier partagé n'emploie aucune construction absente de l'AST Go : le test du type passe par un `switch` de type, pas par une déclaration courte multiple.

`main.go`

```go
package main

import "duplojs.local/transpiled/index.ts"

func main() {
	Sourced_001busers001bj001aneupert001bhackathon00191100192026001bprojects001b01001bindex001ats.Init()
}
```

`add.ts/add.ts.go`

```go
package Sourced_001busers001bj001aneupert001bhackathon00191100192026001bprojects001b01001badd001ats

import "duplojs.local/transpiled/shard_dependencies"

var Generated_initialized bool

func Init() {
	if Generated_initialized {
		return
	}
	Generated_initialized = true
}

func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either) {
	Generated_6 := Sourced_one
	Generated_7 := Sourced_two
	Generated_8 := Generated_6 + Generated_7
	return shard_dependencies.EitherSuccessOf(Generated_8)
}
```

`index.ts/index.ts.go`

```go
package Sourced_001busers001bj001aneupert001bhackathon00191100192026001bprojects001b01001bindex001ats

import "duplojs.local/transpiled/add.ts"
import "duplojs.local/transpiled/shard_dependencies"

var Sourced_result shard_dependencies.Either

var Generated_initialized bool

func Init() {
	if Generated_initialized {
		return
	}
	Generated_initialized = true
	Sourced_001busers001bj001aneupert001bhackathon00191100192026001bprojects001b01001badd001ats.Init()
	Generated_1 := Sourced_001busers001bj001aneupert001bhackathon00191100192026001bprojects001b01001badd001ats.Sourced_add
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

`shard_dependencies/shard_dependencies.go`, partie Either :

```go
const eitherKindPrefix = "@duplojs/lang/kind/@DuplojsLangEither/"

type EitherKind struct {
	left        bool
	information string
	marker      string
}

var EitherKindSuccess = &EitherKind{information: "success", marker: "success"}

var EitherKindFail = &EitherKind{left: true, information: "fail", marker: "fail"}

type Either struct {
	number float64
	value  any
	kind   *EitherKind
}

func (either Either) kindOrPanic() *EitherKind {
	if either.kind == nil {
		panic("ReferenceError: lecture d'un Either avant son initialisation")
	}
	return either.kind
}

func EitherOf[T any](kind *EitherKind, value T) Either {
	switch typed := any(value).(type) {
	case float64:
		return Either{number: typed, kind: kind}
	}
	return Either{value: value, kind: kind}
}

func EitherSuccessOf[T any](value T) Either {
	return EitherOf(EitherKindSuccess, value)
}

func EitherIsRight(input Either) bool {
	return !input.kindOrPanic().left
}

func EitherIsLeft(input Either) bool {
	return input.kindOrPanic().left
}

func (either Either) JSEntries() []JSEntry {
	kind := either.kindOrPanic()
	status := "right"
	if kind.left {
		status = "left"
	}
	var value any = either.value
	if either.value == nil {
		value = either.number
	}
	entries := []JSEntry{
		JSEntry{Key: eitherKindPrefix + status, Value: JSNull{}},
		JSEntry{Key: eitherKindPrefix + "information", Value: kind.information},
		JSEntry{Key: eitherKindPrefix + "value", Value: value},
	}
	if kind.marker != "" {
		entries = append(entries, JSEntry{Key: eitherKindPrefix + kind.marker, Value: JSNull{}})
	}
	return entries
}
```

Invariants de la struct :

- `kind == nil` n'est jamais construit : c'est la valeur zéro, donc une lecture avant initialisation ;
- `value == nil` signifie que la valeur est le nombre de `number`. `undefined` et `null` sont `JSUndefined{}` et `JSNull{}`, jamais une interface nulle ;
- un nombre est toujours dans `number`, même quand il arrive sous le type `any` ;
- les champs ne sont pas exportés : le code généré ne passe que par les constructeurs et les lecteurs, ce qui laisse la disposition interne modifiable sans toucher aux transformers.

La bibliothèque complète qui a servi aux 39 essais (lecteur `Value[T]`, `HasInformation`, variantes dynamiques, `WhenIsRight`, forme curryfiée, `RightPipe5`) est dans `u/either.go`. Elle n'est pas livrée par l'exercice 01.

Sortie attendue : les six lignes de `ref/ex01.txt`, inchangées par rapport à la première conception.

## 10. Plan d'implémentation

### 10.1 Fichiers à créer

Tous sous `src/transpiler/`.

| Fichier | Rôle |
|---|---|
| `sharedDependency/jsObject.ts` | `JSEntry`, `JSObject` |
| `transformers/duplojs/sharedDependencyCall.ts` | Appel direct d'une fonction partagée : arguments dans l'ordre, chacun dans un temporaire, dépendances enregistrées après la réussite des enfants |
| `transformers/duplojs/either/sharedDependency.ts` | `EitherKind`, les deux descripteurs, `Either`, `kindOrPanic`, `EitherOf`, `JSEntries`. Les clés de kind ne vivent qu'ici |
| `transformers/duplojs/either/type.ts` | `eitherTypeHandler` : toute référence résolue dans `dist/either` vers `Left`, `Right`, `Success`, `Fail`, `Ok`, `Some`, `None`, `Error`, `Result`, `Maybe` rend `Either` |
| `transformers/duplojs/either/successCall.ts`, `successDependency.ts` | `EitherSuccessOf` et son handler en appel direct |
| `transformers/duplojs/either/side/index.ts`, `side/sharedDependency.ts` | `isRight` et `isLeft` : un handler, deux fonctions ; refus `either-predicate-on-non-either` |
| `transformers/duplojs/common/index.ts` | Routeur `common` pour les expressions et les instructions |
| `transformers/duplojs/common/print/index.ts`, `printableType.ts`, `sharedDependency.ts` | `print` ; garde par type statique ; formateur |
| `transformers/type/parenthesized.ts` | Type parenthésé |
| `transformers/type/union.ts` | Règle d'union : même type Go pour tous les membres, sinon `union-members-not-uniform` |
| `transformers/statement/variable.ts` | Constante de premier niveau : variable de package et affectation ; refus du §7.3 ; analyse de lecture avant initialisation |
| `transformers/statement/if.ts` | `if` sans `else`, condition booléenne |
| `transformers/guards/index.ts` et un fichier par garde | Refus explicites placés devant les transformers d'origine : opérateurs binaires, modificateurs de fonction, alias et défaut d'import, appel optionnel |
| `createSourcePackageFile.ts` | Fichier Go d'un module : fonction `Init()` gardée, appels aux `Init()` des modules importés dans l'ordre des `import`, refus d'un cycle |

### 10.2 Lignes d'origine à modifier

Une par une. Tout le reste est additif.

| Fichier | Ligne | Modification | Raison |
|---|---|---|---|
| `transformers/statement/index.ts` | après 7 | 3 imports | Inscription |
| | avant 11 | `...guardStatementTransformers.value,` | Les gardes passent avant tout autre transformer |
| | après 14 | `variableStatementTransformer,` et `ifStatementTransformer,` | Les deux instructions de l'exercice |
| `transformers/type/index.ts` | après 6 | 2 imports | Inscription |
| | après 12 | `parenthesizedTypeTransformer,` et `unionTypeTransformer,` | Le retour de `add` est une union parenthésée |
| `transformers/expression/index.ts` | après 8 | 1 import | Inscription |
| | avant 12 | `...guardExpressionTransformers.value,` | Fin des replis silencieux de `binary.ts`, `identifier.ts` et `call.ts` |
| `transformers/declaration/index.ts` | après 6 | 1 import | Inscription |
| | avant 10 | `...guardDeclarationTransformers.value,` | Fin du silence de `function.ts` sur `async`, génériques, paramètres optionnels, par défaut et rest |
| `transformers/duplojs/index.ts` | après 2 | 1 import | Inscription du domaine `common` |
| | 10 | ajout de `duploJSCommonCallTransformer` | `print` en expression |
| | 13 | ajout de `duploJSCommonCallTransformer` et du routeur Either | Appel de bibliothèque en instruction isolée |
| `transformers/duplojs/either/index.ts` | 7 | import des nouveaux handlers | — |
| | 39 | `successExpressionHandler` remplacé par le handler en appel direct | Cause de l'échec de l'exercice 00 : fonction générique rangée dans un temporaire |
| | entre 43 et 44 | deux branches `isRight`, `isLeft` | Le routeur est le seul point d'entrée du domaine |
| | 71 et 72 | `DCommon.equal("Success")` et `successTypeHandler` remplacés par le test d'appartenance aux noms de type Either et `eitherTypeHandler` | Tout type Either a le même type Go |
| `transformSourceFile.ts` | 12 | import | — |
| | 100 | `createFile(` remplacé par `createSourcePackageFile(` | Ordre d'initialisation entre modules, refus des cycles |
| `build.ts` | 58 | retrait de l'alias `_` | Le package d'entrée est appelé, plus seulement importé |
| | 67 | le corps de `main` appelle `Init()` du package d'entrée | Idem |
| `transformers/expression/binary.ts` | 82 à 86 | le résultat d'un opérateur arithmétique est enveloppé dans `float64(…)` | Fusion produit et somme sur `arm64` (§6). Hors périmètre strict de l'exercice : décision de l'utilisateur |

Deux fichiers d'origine n'ont plus d'appelant après la ligne 39 et les lignes 71 et 72 : `either/success/index.ts` et `either/success/sharedDependency.ts`. `hackathon.md` demande de supprimer le code mort ; la règle « ne pas toucher l'existant » dit l'inverse. Décision de l'utilisateur (§11).

Alternative sans toucher `transformSourceFile.ts` ni `build.ts` : garder `init()`, et refuser à la transpilation tout fichier qui importe deux modules ayant un effet de premier niveau. Ce refus demande lui aussi de connaître le contenu des modules importés, donc une ligne dans `build.ts`. Je ne vois pas de voie purement additive.

Non couvert par ces lignes : un import sans liaison (`import "./setup"`) est sauté par `transformSourceFile.ts` lignes 42 à 44 et le module n'est jamais transpilé [lu]. Le refuser demande de modifier ces trois lignes. Décision de l'utilisateur.

### 10.3 Étapes et critères

Après chaque étape : `pnpm test:types` et `pnpm test:lint` passent.

| Étape | Contenu | Critère de vérification |
|---|---|---|
| 1 | `jsObject.ts`, `either/sharedDependency.ts`, `sharedDependencyCall.ts`, `successCall.ts`, `successDependency.ts`, `either/type.ts`, lignes de `either/index.ts` | `verify.sh 00` : `IDENTIQUE : 0 lignes` |
| 2 | `type/parenthesized.ts`, `type/union.ts`, inscriptions | Projet jetable `add.ts` de l'exercice 01 et `index.ts` réduit à `add(1, 2);` : compile, signature `(shard_dependencies.Either)`. Même résultat membres inversés, sans annotation, et avec `Right<"a", number> \| Right<"b", string> \| Fail`. `number \| string` en retour : `union-members-not-uniform` |
| 3 | `statement/variable.ts`, inscription | `const result = add(1, 2);` seul : compile et passe `go vet` sans lecture. Les refus des cas 11 à 17 de la tranche instructions rendent l'erreur indiquée |
| 4 | `either/side/`, `statement/if.ts` | `if (DEither.isRight(result)) { add(3, 4); }` et la même chose avec `isLeft` : compilent, la branche exécutée est la bonne (vérifiée par un `print` à l'étape 5) |
| 5 | `common/`, `print` | `verify.sh 01` : `IDENTIQUE : 6 lignes`. `print(result, "info")` : identique. `print(result, "error")` : `print-params-not-supported` |
| 6 | `createSourcePackageFile.ts`, lignes de `transformSourceFile.ts` et `build.ts` | `verify.sh 00` et `01` toujours identiques. `premier-niveau/import-circulaire` : `import-cycle-not-supported`. Projet jetable à deux modules affichant chacun un nombre : ordre du TypeScript |
| 7 | `guards/` | Chaque erreur nommée au §7.3 avec la mention « fin du silence » est obtenue sur son épreuve |
| 8 | Corpus entier | `hackathon-tools/mcp/h coverage` : 00 et 01 réussis ; aucune épreuve n'échoue après l'étape 1. Chaque échec tardif est corrigé par un refus ou une prise en charge, et ajouté au §7.3 |
| 9 | README de `projects/01` | Problème, stratégie, mesures du §5, dégradations du §6, hypothèses du §2 |

### 10.4 Analyse de lecture avant initialisation

Pour une constante de premier niveau `C` déclarée par l'instruction de rang `i` : refuser si une instruction de premier niveau de rang inférieur ou égal à `i` référence une fonction du fichier qui lit `C`, directement ou à travers d'autres fonctions du même fichier. L'analyse refuse des programmes valides (fonction référencée mais pas appelée). Elle ne voit pas les fonctions d'un autre fichier : elles ne peuvent lire `C` que par un cycle d'import, déjà refusé. [hypothèse : non écrite, non essayée.]

## 11. Décisions qui reviennent à l'utilisateur

1. **U ou C.** U : uniforme, aucune conversion entre Either, coût constant, types des valeurs non vérifiés par Go, une allocation par valeur non numérique. C : typé et le plus rapide, au prix d'un générateur d'unions et de conversions, de fonctions de bibliothèque développées à chaque site, et de copies de tableaux à chaque élargissement. Je recommande U. Passer de U à C plus tard change tous les types émis.
2. **L'emplacement numérique.** 8 octets de plus par Either pour diviser par cinq le coût d'un nombre (1,3 contre 6,5 ns). Recommandé. Il est interne à la dépendance partagée et se retire sans toucher aux transformers.
3. **Chaîne `Init()`** (lignes de `transformSourceFile.ts` et `build.ts`) : maintenant, recommandé, parce que `print` rend l'ordre observable ; ou plus tard, en acceptant une divergence muette dès que deux modules importés ont un effet.
4. **`binary.ts` ligne 82** : corriger la fusion produit et somme maintenant, ou la laisser et garder l'épreuve `nombres/produit-puis-somme` en échec connu.
5. **Fichiers `either/success/index.ts` et `sharedDependency.ts`** : supprimés, ou laissés sans appelant.
6. **Import sans liaison** : modifier les lignes 42 à 44 de `transformSourceFile.ts` pour le refuser, ou le documenter comme non pris en charge.
7. **`else`, `else if`, constante locale** : refusés par ce plan faute d'exercice qui les demande, alors que le code réel compte 874 constantes locales et 93 chaînes `else if`. Les prendre dès maintenant allonge l'exercice 01 de deux transformers ; les essais montrent que la représentation ne s'y oppose pas.
8. **Sortie d'erreur et couleurs** : `verify.sh` ne compare que la sortie standard, et Node colore sa sortie dans un terminal. À accepter comme référence, ou à faire évoluer avant de livrer `print(x, "error")`.
9. **Formateur en nœuds `GoAST`** (additif, long) ou en fichier Go copié dans la sortie (modifie `build.ts`). Inchangé depuis la première conception.
10. **Asynchrone** : la représentation des unions n'a pas été essayée dans cette position. À trancher avant l'exercice 10, par un essai, pas par un raisonnement.
