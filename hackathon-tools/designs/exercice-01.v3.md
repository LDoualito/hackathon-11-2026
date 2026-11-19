# Conception : exercice 01, troisième version — représentation Go d'une union TypeScript

Date : 2026-11-19. Répond à `exercice-01.v2.contradiction.md`. Les documents précédents ne sont pas modifiés. Aucun fichier de `src/`, `bin/`, `projects/` n'a été touché.

Preuves : [exécuté] compilé et lancé pendant cette conception ; [exécuté v2] exécuté par la deuxième conception et relancé ici quand c'est dit ; [lu] lu dans le source ; [hypothèse] ni l'un ni l'autre.

Tout le Go est écrit à la main. Rien n'est transpilé. Les règles de refus sont exécutées par un prototype hors du transpileur (`detect.ts`), qui lit les mêmes nœuds et le même checker que lui. Qu'un transformer sache les appliquer reste une hypothèse.

Essais rejouables dans `hackathon-tools/verify/out/design-01-v3/` :

| Élément | Contenu |
|---|---|
| `u/`, `up/`, `b/`, `bp/`, `c/`, `a2/`, `u0/` | Bibliothèque de chaque option |
| `v3/<option>/<essai>/main.go`, `v3/cases.txt` | 58 programmes Go, un par contre-exemple et par option. `neutre/` : essais qui ne dépendent pas de l'option |
| `run-v3.sh`, `out-v3.txt`, `out-v3/` | Compile, passe `go vet`, exécute, compare à `ref-v3/` (sorties `tsx`) |
| `run-prog.sh`, `run-essais-v3.sh` | Les 28 programmes et les 39 essais de la v2, relancés |
| `drop-up/`, `drop-bp/`, `drop-ut/` | Copies de l'arbre où la bibliothèque `u` ou `b` est remplacée par sa variante, pour relancer les mêmes programmes et les mêmes bancs |
| `detect.ts`, `detect-corpus.sh`, `detect-corpus.tsv`, `detect-corpus.c.tsv` | Prototype des règles de refus, lancé sur 177 programmes (11 exercices, 166 épreuves), en mode U et en mode C |
| `bench/bench-v3*.txt` | Résultats bruts des bancs |
| `async/async.go` | Modèle asynchrone d'essai |
| `essai-verbatim/` | Essai des imports sous `verbatimModuleSyntax` |
| `expected/`, `expected00/` | Go attendu des exercices 01 et 00, dans la disposition du boilerplate |

Environnement : Go 1.27.4 `linux/arm64` dans `golang:1.27` (15 processeurs), Node 24.14.1. Trois passes, médiane.

Épreuves ajoutées par cette conception : `unions/elargissement-puis-mutation`, `unions/elargissement-autres-positions` (passent `tsc --noEmit`, s'exécutent avec `tsx`, inscrites au README du corpus).

---

## 1. Problème et famille

L'exercice 01 demande un retour `Success<number> | Fail`, un `if`, une constante de premier niveau et un `print`. La décision qui engage la suite est la représentation Go d'une union TypeScript.

Cas qui contraignent le même type Go, repris de la v2 et complétés par l'attaque :

| Cas | Pourquoi il contraint le même type |
|---|---|
| Union d'Either à 0, 1, 2, 6 Right ou Left ; Either et valeur brute ; union de valeurs brutes | Un emplacement, plusieurs types |
| Either dans un Either, un tableau, un objet, un générique ; variable rétrécie | L'emplacement intérieur a un type Go que le lecteur doit retrouver |
| `===` et `!==` entre deux Either | Une struct Go se compare par contenu, un objet JavaScript par référence |
| Valeur dont le type TypeScript s'élargit sans conversion visible (annotation, réduction par sous-type) | Le type Go de la valeur rangée doit être celui que le lecteur attend |
| Fonction passée là où une fonction au type plus large est attendue | Go n'a pas de variance sur les types fonction |
| `Promise` d'Either | Le type doit traverser un paramètre de type |

Frontière de famille, tracée par essai :

| Cas | Contraint-il le type de l'Either ? | Preuve |
|---|---|---|
| Représentation des tableaux et des objets (tranche ou pointeur) | Non. Les cinq options portent les deux formes | `mutationpointeur` identique sous U, UP, B, BP, C [exécuté] |
| Modèle asynchrone | Non. Le même paquet `async`, générique, porte les cinq options | `promesse` identique sous U, UP, B, BP, C [exécuté] |
| Ordre d'initialisation, imports élidés, lecture avant initialisation | Non. Essais `neutre/` et `tdz` : même résultat pour toute option | [exécuté] |

Ces trois familles ne sont pas conçues ici. Ce document donne pour chacune la règle qui empêche un silence dès l'exercice 01.

## 2. Ce qui n'a pas été éprouvé

1. **Le transpileur.** Aucune ligne de `src/` n'existe. `verify.sh` n'a rien à exécuter pour ces épreuves. Les noms d'erreur sont des noms.
2. **Les règles de refus dans un transformer.** `detect.ts` les exécute hors du transpileur. Non vérifié : l'ordre des gardes devant les transformers d'origine, et l'absence d'effet sur le contexte avant un refus.
3. **Positions non couvertes par `detect.ts`** : assertion `as`, `satisfies`, valeur par défaut d'un paramètre, élément étalé, déstructuration, argument d'une fonction de bibliothèque. Aucun de ces nœuds n'a de transformer aujourd'hui, donc `notfound-transformer` les arrête [lu]. La règle « tout transformer qui range une valeur passe par la comparaison » (§6.3) n'est vérifiée par rien d'automatique.
4. **Fréquence de `===` entre deux références dans le code réel.** La note 06 compte 750 `===` ou `!==`, dont 294 sur un discriminant et 64 sur `typeof`. Le reste n'est pas ventilé par type d'opérande. Le coût en programmes refusés de la règle R-IDENT est donc inconnu.
5. **Refus à tort de R-TDZ.** Sur 177 programmes, un seul déclenchement, celui visé. Aucun programme réel n'a été passé au prototype. Formes valides refusées par construction : fonction référencée mais jamais appelée avant l'initialisation.
6. **Identité par une fonction de bibliothèque** (`DArray.includes`, `Set`, `Map`, `DCommon.equal`). Aucun handler n'existe. La règle à leur appliquer est écrite (§6.2), pas essayée.
7. **Option BP au-delà de 15 programmes.** Les 39 essais de la v2 ne sont pas écrits pour BP. Option C : les 39 essais non plus (inchangé depuis la v2).
8. **Option A2** : seuls deux contre-exemples d'identité sont écrits. Les mesures qui l'écartent viennent de la v2 pour la ligne « tableau de 1000 `Fail` élargi », non relancée ici.
9. **Asynchrone.** Un programme, six promesses. Non essayé : rejet, `throw`, minuterie, `rightAsyncPipe`, `asyncGroup`, ordre fin des micro-tâches (un `return` de promesse dans une fonction `async` coûte des tours supplémentaires en JavaScript), coût d'exécution. Le modèle d'essai n'est pas une proposition.
10. **Cardinalité 2** pour B, BP et C : non écrit.
11. **Lecture depuis `unknown`** vers un tableau ou un objet : non essayée. Seuls les primitifs et l'Either le sont (`predicat-sur-brut`, v2).
12. **Mesures** : une architecture, trois passes, pas de `benchstat`. Entre deux lancements, `Courant_U` a varié de 1,25 à 1,35 ns et `ContreInformation_Statique` de 1,0 à 2,0 ns.
13. **Largeur Unicode, couleurs du terminal, sortie d'erreur** : inchangé depuis la v2, non essayé.
14. **Emplacement texte** : la variante essayée est plus lente (§3). Sa cause n'est pas analysée. Une autre disposition n'a pas été essayée.

## 3. Options

Règle commune, inchangée : le type Go d'une expression est une fonction de son type TypeScript. À chaque emplacement qui reçoit une valeur, le transpileur compare les deux représentations. Il convertit ou il refuse.

| | Option | Forme Go |
|---|---|---|
| U | Struct unique par valeur, descripteur statique, emplacement numérique | `type Either struct { number float64; value any; kind *Kind }` |
| UP | U derrière un pointeur | `type Either = *box` ; `box` a les champs de U |
| B | Interface, une struct par variante, rangée par valeur | `type Either interface { … }` ; `EitherSuccess[T]{Value}` |
| BP | B dont les variantes sont rangées par pointeur | `&EitherSuccess[T]{Value}` ; `EitherFail` a un octet |
| C | Union engendrée par signature | `type FailOrSuccessNumber struct { Tag uint8; Number float64 }` |

UP et BP sont les deux variantes que l'identité de référence impose. Dans BP, `EitherFail` ne peut pas être vide : Go donne la même adresse à toutes les valeurs de taille nulle, et `fail() === fail()` rendrait `true`.

Sous U, UP, B et BP, la règle d'union est celle de la v2 : même type Go pour tous les membres, sinon `any`.

Options écartées, chacune sur un essai exécuté :

| Option | Essai | Résultat |
|---|---|---|
| A | v1 et v2 | Panique à l'exécution (`fail-retreci-dans-left`) [exécuté v2] |
| A2 | `a2/identite`, `a2/identitetableau`, bancs | Identité : même sort que U (sortie `1 2`, puis erreur de compilation). Left portant un nombre : 6,9 ns et 1 allocation contre 1,3 ns [exécuté]. Tableau de 1000 `Fail` élargi : 21,8 µs et 32 Ko contre 11 ns [exécuté v2] |
| U0 (U sans emplacement numérique) | `Courant_U0` | 7,4 ns et 1 allocation contre 1,25 ns [exécuté] |
| UT (U avec un emplacement `text string`, 48 octets) | `drop-ut/`, 46 programmes identiques | `Courant` 16 à 20 ns contre 1,3 ; `Tableau1000` 12 à 21 µs contre 1,8. Supprime les 900 allocations de `ContreTexte1000` sans gagner de temps (12 à 22 µs contre 12) [exécuté] |

## 4. Matrice des axes

Chaque case : tient, se dégrade ou casse, puis la preuve. « refus » : le programme doit être refusé à la transpilation par la règle nommée (§6.2), faute de quoi le résultat entre parenthèses se produit.

### 4.1 Axes du gabarit

« v2 » : 7 programmes par option relancés ici (`run-prog.sh`, 28 identiques) ; U a en plus 39 essais relancés (`run-essais-v3.sh`). UP : les mêmes 46 programmes dans `drop-up/`. BP : les 7 programmes dans `drop-bp/`.

| Axe | Cas essayé | U | UP | B | BP | C |
|---|---|---|---|---|---|---|
| Cardinalité 0 | `fail-partage`, `gauches-seuls` | tient, aucune conversion [exécuté] | tient [exécuté] | tient [exécuté] | tient [exécuté, `fail-partage`] | tient, une struct construite par retour [exécuté] |
| Cardinalité 1 | Exercice 01 | tient [exécuté] | tient [exécuté] | tient [exécuté] | tient [exécuté] | tient [exécuté] |
| Cardinalité 2 | `deux-droites-meme-type` | tient [exécuté] | tient [exécuté] | tient [hypothèse] | tient [hypothèse] | tient [hypothèse] |
| Cardinalité 6 | `six-succes`, `chaine-six-etapes` | tient : 8,4 ns en cycle [exécuté] | tient : 22,6 ns [exécuté] | tient : 12,5 ns [exécuté] | tient : 16,7 ns [exécuté] | tient : 5,0 ns, struct de 64 octets [exécuté] |
| Symétrie Left et Right | Left portant un nombre contre Right | symétrique : 1,3 ns [exécuté] | symétrique : 19 et 16 ns [exécuté] | Left 13,9 ns, Right 10,7 [exécuté] | Left 12,9 ns, Right 6,6 [exécuté] | symétrique : 0,95 et 0,74 ns [exécuté] |
| Hétérogénéité : tous différents | `six-succes`, `tableau-heterogene` | tient, assertions [exécuté] | tient [exécuté] | tient [exécuté, `six-succes`] | tient [exécuté, `six-succes`] | tient, typé [exécuté, `six-succes`] |
| Hétérogénéité : membre et non-membre | `either-et-brut` ; tableau de 1000 | se dégrade : 32 octets par Either rangé dans `any` [exécuté] | se dégrade : 32 octets par Either [exécuté] | tient pour `fail()` : 4,8 ns, 0 allocation [exécuté] | se dégrade : 1 octet alloué par `fail()` [exécuté] | tient, typé : 2,1 ns [exécuté] |
| Profondeur | `fail-retreci-dans-left`, `tableau-elargi`, `imbrique-deux-cotes` | tient, aucune conversion [exécuté] | tient [exécuté] | tient [exécuté pour les deux premiers] | tient [exécuté pour les deux premiers] | tient avec conversions : 2,8 µs par tableau de 1000 [exécuté v2] |
| Succession de 6 maillons, 6 types | `chaine-six-etapes` | tient : 74 ns, 4 allocations [exécuté] | tient : 149 ns, 10 allocations [exécuté] | tient : 87 ns, 6 allocations [exécuté] | tient : 78 ns, 7 allocations [exécuté] | tient : 37 ns, 1 allocation [exécuté] |
| Formes d'écriture | Référence nue, forme curryfiée, constructeur sans valeur | tient ; fonction générique nue : argument de type à écrire [exécuté] | idem [exécuté] | types à écrire à chaque construction [exécuté v2] | idem [hypothèse] | développé sur place ; références nues [hypothèse] |
| Positions | Premier niveau, fonction, branche rétrécie, argument, retour, propriété | tient [exécuté] | tient [exécuté] | tient [exécuté, `retreci`] | tient [exécuté, `retreci`] | tient [exécuté, `retreci`] |
| Valeurs limites | `undefined`, `null`, `0`, `-0`, `NaN`, `""`, `[]` des deux côtés ; interface nulle | tient ; interface nulle : panique voulue, inatteignable sous R-TDZ [exécuté, `valeurnulle`] | idem [exécuté] | [hypothèse] | [hypothèse] | [hypothèse] |
| Composition avec l'existant | `print` d'un tableau d'Either ; temporaire de `shared/call.ts` | tient ; `EitherSuccessOf` générique ne se range pas dans un temporaire [lu] | idem [lu] | idem [lu] | idem [lu] | pas de fonction de bibliothèque [exécuté] |

### 4.2 Axes ajoutés par l'attaque

| Axe | Cas essayé | U | UP | B | BP | C |
|---|---|---|---|---|---|---|
| Identité : `===`, `!==` entre deux Either | `identite-de-reference` (TS : `2 3`) | casse : `1 2`. refus R-IDENT [exécuté] | tient [exécuté] | casse : `1 2`. refus [exécuté] | tient [exécuté] | casse : `1 2`. refus [exécuté] |
| Identité : Either à valeur tableau | `identite-valeur-tableau` | casse : panique `comparing uncomparable type`. refus [exécuté] | tient [exécuté] | casse : panique. refus [exécuté] | tient [exécuté] | casse : erreur de compilation Go. refus [exécuté] |
| Identité : alias, retour de fonction, élément de tableau, `whenIsRight`, deux `fail()` | `identite-objets-tableaux-alias`, 13 lignes | casse aux lignes 4 et 5 (`add(-1, 2) === failed`, `fail() === fail()`). refus [exécuté] | tient [exécuté] | casse aux lignes 4 et 5. refus [exécuté] | tient [exécuté] | casse aux lignes 4 et 5. refus [exécuté] |
| Identité : entre tableaux, entre objets | même épreuve, lignes 6 à 10 | hors option : tient si tableaux et objets sont des pointeurs [exécuté] ; une tranche ne se compare pas en Go | idem | idem | idem | idem |
| Identité : contre `undefined` | même épreuve, lignes 11 et 12 | tient, autorisé par R-IDENT [exécuté] | tient [exécuté] | tient [exécuté] | tient [exécuté] | tient par étiquette [exécuté] |
| Symétrie entrée et sortie, appelant et appelé | `variance-fonctions` : retour élargi, paramètre rétréci, `() => Fail` pour `() => Success \| Fail`, retour tableau élargi, initialisation | tient avec 4 fermetures ; `failing` passe sans conversion [exécuté] | idem [exécuté] | idem [exécuté] | idem [exécuté] | tient avec 5 fermetures [exécuté] ; sans : erreur de compilation Go [exécuté, `sansconversion`] |
| Annoté contre inféré : ternaire | `elargissement-par-reduction` | sans conversion : panique. refus R-REPR ; avec : tient [exécuté] | idem [exécuté] | sans : panique [exécuté] | avec : tient [exécuté] | sans : erreur de compilation Go ; avec : tient [exécuté] |
| Annoté contre inféré : `return` multiples, littéral de tableau, argument, initialisation | `elargissement-par-position` | sans conversion : 5 erreurs de compilation Go ; avec : tient [exécuté] | idem [exécuté] | hors option : même Go | hors option | hors option |
| Mutation après rangement | `mutation-apres-rangement` | tranche : casse (`[ 1 ]` pour `[ 1, 2 ]`) ; pointeur : tient [exécuté] | idem [exécuté] | pointeur : tient [exécuté] | pointeur : tient [exécuté] | pointeur : tient [exécuté] |
| Mutation après élargissement | `elargissement-puis-mutation` | hors option : la conversion par copie casse (`[ 1, 2 ]` pour `[ 1, 2, 'a' ]`) [exécuté, `neutre/elargimutation`] | idem | idem | idem | idem |
| Asynchrone | `promesse-d-either` : `await` en chaîne, garde `isLeft`, `Promise.all` de six | tient [exécuté] | tient [exécuté] | tient [exécuté] | tient [exécuté] | tient [exécuté] |
| Lecture avant initialisation sans consultation | `lecture-avant-init-sans-usage` | casse : `1 2` au lieu d'une erreur. refus R-TDZ [exécuté] | casse : pointeur nul rendu en silence. refus [exécuté] | casse. refus [exécuté] | casse. refus [exécuté] | casse. refus [exécuté] |
| Imports élidés | `import-de-type-seul`, `import-formes-elidees` (10 formes) | hors option : tient avec la règle R-IMPORT [exécuté] | idem | idem | idem | idem |

Ce que la matrice dit :

- Aucune option par valeur (U, B, C) ne porte l'identité entre Either. Les deux options par pointeur la portent.
- Aucune option ne supprime R-TDZ, R-REPR sur les tableaux, ni la fermeture autour d'une fonction. Ces règles ne départagent pas les options.
- C demande plus de conversions : `detect.ts` trouve 261 déclenchements de R-REPR sur 177 programmes en mode C, contre 12 en mode U [exécuté]. Sur les exercices 01 à 05, C convertit à chaque `return` ; U à aucun.

## 5. Mesures

Go 1.27.4 `linux/arm64`, Docker, 15 processeurs, trois passes, médiane. « o » : octets par opération ; « al » : allocations. Sources : `bench/bench-v3.txt` (U, B, C), `bench-v3-up.txt`, `bench-v3-bp.txt`.

| Scénario | U | UP | B | BP | C |
|---|---|---|---|---|---|
| **Cas courant** : `add` réussit, `isRight`, lecture | 1,25 ns, 0 al | 16,3 ns, 32 o, 1 al | 10,7 ns, 8 o, 1 al | 6,6 ns, 8 o, 1 al | 0,74 ns, 0 al |
| **N = 6**, six Right de types différents, en cycle | 8,4 ns, 8 o | 22,6 ns, 40 o, 1 al | 12,5 ns, 20 o | 16,7 ns, 29 o, 1 al | 5,0 ns, 2 o |
| **N = 6**, chaîne de six étapes, tout réussit | 74 ns, 64 o, 4 al | 149 ns, 256 o, 10 al | 87 ns, 80 o, 6 al | 78 ns, 88 o, 7 al | 37 ns, 16 o, 1 al |
| **Hétérogène**, Either et valeur brute, côté Right | 19,1 ns, 32 o, 2 al | 34,9 ns, 64 o, 3 al | 25,3 ns, 40 o, 3 al | 24,1 ns, 40 o, 3 al | 6,3 ns, 8 o, 1 al |
| — côté `fail()` | 16,2 ns, 32 o, 1 al | 19,3 ns, 32 o, 1 al | 4,8 ns, 0 al | 6,9 ns, 1 o, 1 al | 2,1 ns, 0 al |
| Tableau de 1000 Either à valeur nombre | 1,82 µs, 0 al | 19,2 µs, 32 000 o, 1000 al | 10,3 µs, 7200 o, 900 al | 9,0 µs, 8000 o, 1000 al | 1,40 µs, 0 al |
| **Tableau de 1000 Either à valeur chaîne** | 11,7 µs, 14 400 o, 900 al | 30,1 µs, 46 400 o, 1900 al | 13,2 µs, 14 400 o, 900 al | 12,5 µs, 14 500 o, 1000 al | 1,77 µs, 0 al |
| **Tableau de 1000 union Either et valeur brute** | 9,2 µs, 10 400 o, 1000 al | 9,4 µs, 10 400 o, 1000 al | 8,5 µs, 7200 o, 900 al | 8,4 µs, 8000 o, 1000 al | 1,52 µs, 0 al |
| Left portant un nombre | 1,26 ns, 0 al | 19,4 ns, 32 o, 1 al | 13,9 ns, 24 o, 1 al | 12,9 ns, 24 o, 1 al | 0,95 ns, 0 al |

Tailles : U 32 octets ; UP 8 plus 32 sur le tas ; B et BP 16 plus l'objet ; C 16 pour `Success<number> | Fail`, 64 pour six membres.

Dans « tableau de 1000 union », 900 des 1000 allocations de U, UP, B et BP sont le rangement d'un `float64` dans `any` (8 octets). Elles ne viennent pas de l'Either.

Coût des conversions et des représentations voisines (`bench-v3.txt`, `bench-v3-creer.txt`, `bench-v3-divers.txt`) :

| Opération | Mesure |
|---|---|
| Copie d'un tableau de 1000 nombres vers `[]any` | 13,8 µs, 24 408 o, 1002 al |
| Appel à travers une fermeture de conversion | 7,5 ns, 8 o, 1 al, contre 1,2 ns en direct |
| Création d'un tableau de 2 nombres : tranche | 8,4 ns, 16 o, 1 al |
| — pointeur vers une liste | 20,2 ns, 40 o, 2 al |
| Somme d'un tableau de 1000 : tranche et pointeur | 520 ns pour les deux |
| Either dont l'information n'est pas un littéral, renvoyé par une fonction | 34,2 ns, 48 o, 1 al, contre 1,9 ns |
| Lecture d'un nombre d'Either sous le type `any` | 6,7 à 10 ns, 8 o, 1 al, contre 0,5 à 0,9 ns |

## 6. Dégradations

### 6.1 Tableau, pour l'option U

| Déclencheur (forme TypeScript exacte) | Coût (mesuré) | Détection |
|---|---|---|
| `first === second`, `first !== second` où les deux opérandes peuvent être un objet | Sans objet : refusé. Le porter coûte BP : 6,6 ns et 8 octets par Either au lieu de 1,25 ns et 0 | Transpilation, R-IDENT, `reference-identity-not-supported` |
| Instruction de premier niveau qui atteint une constante déclarée plus bas : `const early = read(); … const result = add(1, 2);` | Sans objet : refusé | Transpilation, R-TDZ, `top-level-read-before-initialization` |
| Valeur dont la représentation change en s'élargissant : `flag ? success(numbers) : success(mixed)`, `const widened: (number \| string)[] = numbers` | Refusé à l'exercice 01. Converti : 13,8 µs et 24 Ko pour 1000 éléments | Transpilation, R-REPR, `representation-change-not-supported` |
| Fonction passée pour un type fonction de représentation différente : `apply(half, 4)` avec `half: (value: number) => number` | Refusé à l'exercice 01. Converti : 7,5 ns et 8 octets par appel | Transpilation, R-FONC, même erreur |
| Variable lue sous un type rétréci dont le type Go diffère : `if (value !== undefined) { use(value) }` | Une assertion de type. Refusé à l'exercice 01 | Transpilation, R-RETRECI, `narrowed-read-not-supported` |
| Type sans représentation : `any`, paramètre de type, type conditionnel, `Promise` | Sans objet : refusé | Transpilation, R-OPAQUE, `type-not-representable` |
| `items.push(2)`, `box.count = 2` | Sans objet : refusé tant que la représentation des tableaux n'est pas décidée | Transpilation, R-MUT, `mutation-not-supported` |
| Either dont la valeur est une chaîne non constante, un tableau ou un objet | 16 octets et 1 allocation par chaîne : 11,7 µs pour 1000 contre 1,77 µs sous C | Comportement identique. Banc `ContreTexte1000` |
| Either rangé dans `any` : `whenIsRight(x, f)`, `(Fail \| number)[]` | 32 octets par Either : 16,2 ns contre 2,1 ns sous C | Comportement identique. Bancs `Brut`, `ContreBrut1000` |
| Lecture d'une valeur d'Either | Une assertion de type, comprise dans toutes les mesures | Panique impossible si R-REPR, R-OPAQUE et R-TDZ tiennent. Prouvé sur 177 programmes par `detect.ts`, pas par le transpileur |
| Nombre lu sous `any` : `Success<number \| string>` | 8 octets, 6,7 à 10 ns | Comportement identique |
| Information non littérale : `left(code, value)` avec `code: string` | 48 octets, 34,2 ns | Comportement identique |
| `import` sous `verbatimModuleSyntax` | Sans objet : refusé | Transpilation, `tsconfig-verbatim-module-syntax-not-supported` |
| `import "./setup"`, `export { x } from "./x"` | Sans objet : refusé à l'exercice 01 | Transpilation, `import-without-binding-not-supported`, `export-from-not-supported` |
| `value * factor + shift` sur `arm64` | Divergence du dernier chiffre | Aucune tant que la ligne 82 de `binary.ts` n'est pas modifiée (décision 5). `float64(a * b)` la supprime [exécuté v2] |
| Sortie standard sur un terminal | Node colore, le Go non | Aucune. Décision 8 |

### 6.2 Règles de détection

**R-IDENT.** Nœud : `BinaryExpression` dont l'opérateur est `===`, `!==`, `==` ou `!=`. Types : `checker.getTypeAtLocation(node.left)` et `(node.right)`. Un type « peut être une référence » si un de ses membres d'union ou d'intersection n'est pas un primitif (`number`, `string`, `boolean`, `bigint`, leurs littéraux, `undefined`, `null`, `void`, énumération, `symbol`, `never`). `unknown`, `any` et un paramètre de type comptent comme références. Refus si les deux opérandes peuvent être une référence. Sinon `==` de Go est exact : deux interfaces de types dynamiques différents se comparent sans panique. Essai : 16 comparaisons refusées sur 18 dans les trois épreuves d'identité ; les deux `=== undefined` passent et sont identiques sous U. Tout handler futur d'une fonction qui compare par identité applique le même prédicat au type des éléments.

**R-TDZ.** Unité : une instruction de premier niveau, ou un déclarateur d'une `const`, `let` ou `class` de premier niveau, dans l'ordre du source. Pour chaque unité, l'ensemble des symboles atteints est la fermeture de : les identifiants qu'elle évalue (hors nœuds de type ; un initialiseur fléché ou `function` n'évalue rien), puis, pour chaque fonction ou constante-fonction du fichier atteinte, les identifiants de son corps. Symbole lu par `checker.getSymbolAtLocation(identifier)`. Refus si un symbole atteint est déclaré par une unité de rang supérieur ou égal. La règle vaut pour tous les types, Either compris. Elle ne suit pas les fonctions d'un autre fichier : elles ne lisent la constante que par un cycle d'import, refusé par ailleurs. Essai : 1 refus sur 177 programmes, celui de `lecture-avant-init-sans-usage`.

**R-IMPORT.** Un `import` relatif est exécuté dans trois cas : il n'a pas de clause (`import "./f"`) ; sa clause n'est pas `import type` et au moins une liaison sans modificateur `type` est référencée hors d'un nœud de type (`typeof x` en position de type ne compte pas) ; c'est un `export … from` qui n'est pas `export type` et dont les spécificateurs ne sont pas tous `type`. Tout autre import est élidé : son module n'est ni initialisé ni appelé. `Init()` est appelé pour les imports exécutés, dans l'ordre du source. Lecture préalable : `compilerOptions.verbatimModuleSyntax` ; si `true`, refus. Essais : `import-formes-elidees` rend `./f ./g ./i` pour dix formes, comme `tsx` (`f g i 12`) ; `essai-verbatim` : `tsx --tsconfig` rend `1 4` au lieu de `4`.

### 6.3 Comparaison de types, position par position

Représentation d'un type, lue sur le checker par `reprOf` :

| Type TypeScript | Représentation | Type Go sous U |
|---|---|---|
| `number`, `string`, `boolean`, `undefined`, `null` et leurs littéraux | primitif | `float64`, `string`, `bool`, `JSUndefined`, `JSNull` |
| Type portant la clé de kind dont l'intersection contient `@DuplojsLangEither/value` | either(valeur) | `Either` |
| Tableau, tuple | tableau(élément) | `[]T` |
| Union | union des représentations distinctes ; les Either fusionnent | type commun, sinon `any` |
| Signature d'appel | fonction(paramètres, résultat) | `func(…) T` |
| Objet | objet(champs triés) | struct |
| `unknown` | opaque accepté en cible | `any` |
| Reste | opaque | refus R-OPAQUE |

La source S est rangée dans la cible C sans conversion si l'une de ces conditions tient :

1. même représentation ;
2. C est `unknown` ;
3. C est une union, et chaque membre de S est compatible avec un membre de C ;
4. S et C sont des Either, et leurs valeurs sont compatibles ;
5. S et C sont des tableaux, de même type Go d'élément, aux éléments compatibles ;
6. S et C sont des fonctions de même type Go, au résultat compatible, aux paramètres compatibles en sens inverse ;
7. S et C sont des objets de même type Go, aux champs compatibles.

Sinon : conversion ou refus. À l'exercice 01, toujours refus. Sous C, seules les conditions 1 et 2 existent.

| Position | Nœud | Type source | Type cible | Essai |
|---|---|---|---|---|
| Argument | `CallExpression` dont la signature résolue est déclarée hors `node_modules` | `getTypeAtLocation(argument)` | `getContextualTypeForArgumentAtIndex(call, index)` | `elargissement-par-position` ligne 25 : détecté ; Go sans conversion : erreur ligne 40 ; avec : identique |
| `return` | `ReturnStatement`, corps d'une fléchée sans bloc | `getTypeAtLocation(expression)` | `getReturnTypeOfSignature` de la signature contextuelle, sinon de `getSignatureFromDeclaration` ; type attendu par `await` si `async` | ligne 13 : détecté ; erreur Go ligne 22 ; avec : identique |
| Branche de ternaire | `ConditionalExpression` | type de chaque branche | `getTypeAtLocation(ternaire)` | ligne 19 et `elargissement-par-reduction` ligne 9 : détectés ; erreur Go ligne 30, panique pour l'Either ; avec : identiques |
| Élément de tableau | `ArrayLiteralExpression` | type de l'élément | élément de `getContextualType(littéral)` si c'est un tableau ou un tuple, sinon du type propre | ligne 22 : détecté ; erreur Go ligne 38 ; avec : identique |
| Initialisation | `VariableDeclaration` | type de l'initialiseur | `getTypeAtLocation(declaration.name)` | ligne 23 : détecté ; erreur Go ligne 44 ; avec : identique |
| Propriété d'objet | `PropertyAssignment` | type de l'initialiseur | propriété du type contextuel | `elargissement-autres-positions` ligne 16 : détecté ; Go non écrit |
| Affectation | `BinaryExpression` `=` | type de droite | `getTypeAtLocation(gauche)` | ligne 23 : détecté ; Go non écrit |
| Valeur d'un Either renvoyé | cas du `return` | `Success<number[]>` | `Success<(number \| string)[]>` | ligne 12 : détecté ; Go non écrit |
| Lecture rétrécie | `Identifier` lu | `getTypeOfSymbol(symbole)` | `getTypeAtLocation(identifiant)` | `if-retrecissement-undefined` : 5 détections ; Go identique [exécuté v2] |
| Fonction en argument ou en initialisation | positions ci-dessus, condition 6 | | | `variance-fonctions` : 4 détections, `failing` non détectée ; Go avec fermetures : identique |

Un littéral de tableau, d'objet ou de fonction est construit directement dans le type cible : il n'est pas comparé à sa propre position.

Élargissements qui ne déclenchent rien sous U, vérifiés : `Fail[]` pour `(Success<number> | Fail)[]`, `number[]` pour `number[] | undefined` (`elargissement-autres-positions`), `tableau-elargi`, les exercices 00 à 10 (aucun R-REPR ; deux R-OPAQUE aux exercices 07 et 10).

Invariant d'implémentation : un transformer n'obtient le type Go d'un emplacement que par la fonction qui fait cette comparaison.

## 7. Épreuves

État attendu après l'implémentation de l'exercice 01. « Refusé » : arrêt à l'étape 1 de `verify.sh`.

| Épreuve | Sortie TypeScript | État attendu | Preuve à la main |
|---|---|---|---|
| `unions/identite-de-reference` | `2 3` | Refusé : `reference-identity-not-supported` | U : `1 2` ; BP : identique |
| `unions/identite-valeur-tableau` | `true false` | Refusé : idem | U : panique ; BP : identique |
| `unions/identite-objets-tableaux-alias` | 13 lignes | Refusé : idem | U : lignes 4 et 5 fausses ; BP : identique |
| `premier-niveau/lecture-avant-init-sans-usage` | `ReferenceError` | Refusé : `top-level-read-before-initialization` | Toute option : `1 2` |
| `unions/elargissement-par-reduction` | 2 lignes | Refusé : `representation-change-not-supported` (branche de ternaire) | Avec conversion : identique sous U, UP, BP, C |
| `unions/elargissement-par-position` | 5 lignes | Refusé : idem, première position rencontrée | Avec conversion : identique |
| `unions/elargissement-autres-positions` | 6 valeurs | Refusé : idem | Détection seule |
| `unions/elargissement-puis-mutation` | `[ 1, 2, 'a' ]`, `true` | Refusé : idem | Conversion par copie : `[ 1, 2 ]`, `false` |
| `unions/fonction-retour-elargi-brut` | `2` | Refusé : idem (fonction) | Avec fermeture : identique |
| `unions/variance-fonctions` | 5 valeurs | Refusé : idem | Avec fermetures : identique sous U, UP, B, BP, C |
| `unions/mutation-apres-rangement` | 4 valeurs | Refusé : `mutation-not-supported` ou `notfound-transformer` sur le littéral de tableau | Pointeur : identique ; tranche : différent |
| `unions/promesse-d-either` | 2 Ko | Refusé : `function-async-not-supported` | Identique sous les cinq options |
| `premier-niveau/import-de-type-seul` | `4` | Identique | `neutre/typeseul` |
| `premier-niveau/import-formes-elidees` | `f g i 12` | Refusé : `import-without-binding-not-supported` | `neutre/importsformes` : identique |
| `projects/00`, `projects/01` | 0 et 6 lignes | Identiques | `expected00/`, `expected/` : `go build`, `go vet`, sorties identiques |

Les 152 autres épreuves gardent l'état décidé au §7.3 de la v2. Critère global inchangé : aucune épreuve n'échoue à l'étape 3, 4 ou 5.

Résumé de `run-v3.sh`, 58 programmes : 30 identiques, 15 différents, 7 paniques, 6 erreurs de compilation. Les 28 qui ne sont pas identiques sont tous des formes « sans conversion » ou « sans refus », gardées comme preuve de ce que les règles empêchent.

## 8. Recommandation

**Option U, avec les refus R-IDENT, R-TDZ, R-REPR, R-FONC, R-RETRECI, R-OPAQUE, R-MUT et la règle R-IMPORT.**

Raisons, sur les essais :

- cas courant sans allocation : 1,25 ns contre 6,6 ns (BP) et 16,3 ns (UP) ;
- aucune conversion entre Either : 12 déclenchements de R-REPR sur 177 programmes, contre 261 sous C ;
- un tableau de 1000 Either à valeur nombre coûte 1,82 µs, contre 9,0 µs (BP) ;
- les cinq cas cassés par l'attaque finissent identiques ou refusés par une règle exécutée.

Ce qu'elle abandonne :

- face à BP et UP : `===` entre deux Either. U le refuse. Fréquence dans le code réel inconnue (§2, point 4) ;
- face à C : un facteur 6 sur un tableau de 1000 Either à valeur chaîne (11,7 contre 1,77 µs), un facteur 6 sur l'union avec une valeur brute, un facteur 2 sur la chaîne de six étapes, et la vérification par Go du type des valeurs ;
- face à B : l'entrée gratuite de `fail()` dans une union avec une valeur brute (16,2 contre 4,8 ns).

Limites de cette recommandation :

- elle repose sur des règles que le transpileur n'exécute pas encore ;
- si `===` entre Either doit être porté, U ne convient pas. BP est alors le choix : il bat UP sur toutes les lignes mesurées ;
- la conversion d'un tableau par copie n'est fidèle que si la mutation est refusée (`elargissement-puis-mutation`). Les deux ne peuvent pas être acceptées ensemble. Le code réel compte 92 `.push(` natifs : cette décision appartient à la conception des tableaux et n'est pas prise ici.

## 9. Go attendu

[exécuté] `expected/` (exercice 01) : `go build ./...`, `go vet ./...`, sortie de 233 octets identique à `ref/ex01.txt`. `expected00/` (exercice 00) : compile, sortie vide, comme le TypeScript ; ses noms de paquet portent encore `01`.

Le Go est celui du §9 de la v2, avec un ajout dans `EitherOf` :

```go
func EitherOf[T any](kind *EitherKind, value T) Either {
	switch typed := any(value).(type) {
	case nil:
		panic("either: valeur absente, ni undefined ni null")
	case float64:
		return Either{number: typed, kind: kind}
	}
	return Either{value: value, kind: kind}
}
```

`index.ts/index.ts.go` :

```go
var Sourced_result shard_dependencies.Either

var Generated_initialized bool

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

`add.ts/add.ts.go`, `main.go` et le reste de la dépendance partagée : inchangés, dans `expected/`. Sortie attendue : les six lignes de `ref/ex01.txt`.

Réserves : numérotation `Generated_N` non contractuelle ; mise en forme du printer.

## 10. Plan d'implémentation

Le plan de la v2 (§10) reste la base. Ce qui change :

### 10.1 Fichiers à créer en plus

Tous sous `src/transpiler/`.

| Fichier | Rôle |
|---|---|
| `representation/reprOf.ts` | Type du checker vers représentation (§6.3) ; reconnaît l'Either par sa clé de kind |
| `representation/storedCompatible.ts` | Les sept conditions ; rend « rien à faire » ou le refus avec position et les deux représentations |
| `transformers/guards/referenceIdentity.ts` | R-IDENT |
| `transformers/guards/representationChange.ts` | R-REPR, R-FONC, R-OPAQUE aux positions argument et `return` ; les autres positions sont appelées par leur transformer |
| `transformers/guards/narrowedRead.ts` | R-RETRECI |
| `transformers/guards/mutation.ts` | R-MUT |
| `topLevelInitialization.ts` | R-TDZ, lancée une fois par fichier avant ses instructions |
| `executedImports.ts` | R-IMPORT ; lue par `createSourcePackageFile.ts` pour la chaîne `Init()` |

L'analyse statique du §10.4 de la v2 est remplacée par R-TDZ. `kindOrPanic` reste comme garde interne.

### 10.2 Lignes d'origine à modifier

Celles de la v2 (§10.2), plus :

| Fichier | Ligne | Modification | Raison |
|---|---|---|---|
| `transformSourceFile.ts` | avant la réduction des instructions | appel de R-TDZ et de la lecture de `verbatimModuleSyntax` | Refuser avant tout effet sur le contexte |

Alternative additive : aucune. Ces deux contrôles portent sur le fichier entier, que seul `transformSourceFile.ts` voit.

### 10.3 Étapes ajoutées et critères

| Étape | Contenu | Critère |
|---|---|---|
| 2 bis | `representation/` | Test unitaire : les représentations et les verdicts de `detect-corpus.tsv` sont retrouvés sur les 177 programmes |
| 6 bis | `executedImports.ts` | `verify.sh premier-niveau/import-de-type-seul` : identique. `import-formes-elidees` : `import-without-binding-not-supported` |
| 7 bis | Gardes R-IDENT, R-REPR, R-MUT, R-TDZ | Chaque épreuve du §7 rend l'erreur indiquée. `verify.sh 00` et `01` restent identiques |
| 8 | Corpus entier | `hackathon-tools/mcp/h coverage` : aucune épreuve n'échoue après l'étape 1 |

## 11. Décisions qui reviennent à l'utilisateur

1. **U, BP ou C.** U : le plus rapide sur les nombres, refuse `===` entre Either. BP : porte `===`, 5 fois plus lent sur le cas courant. C : le plus rapide partout, typé, 261 conversions contre 12 et un générateur d'unions. Je recommande U.
2. **Mesurer avant de trancher le point 1** : lancer R-IDENT sur le code réel pour compter les `===` entre références. Non fait.
3. **Tableaux et objets** : tranche avec mutation refusée et conversion par copie, ou pointeur avec mutation et identité portées et élargissement refusé. À décider avant l'exercice 02.
4. **Chaîne `Init()`** et modification de `transformSourceFile.ts`, `build.ts` : inchangé depuis la v2. R-IMPORT en dépend.
5. **`binary.ts` ligne 82** (produit puis somme) : inchangé.
6. **Import sans liaison et `export … from`** : refusés par ce plan. Les porter demande de résoudre un module hors de la résolution d'un identifiant.
7. **`else`, constante locale** : refusés par ce plan, comme en v2.
8. **Couleurs du terminal, sortie d'erreur** : inchangé.
9. **`verify.sh` lance `tsx` sans `--tsconfig`** : la référence ignore le `tsconfig.json` de l'épreuve. Sans effet aujourd'hui. À corriger si une épreuve change une option du compilateur.
10. **Fichiers `either/success/*` sans appelant** : inchangé.
