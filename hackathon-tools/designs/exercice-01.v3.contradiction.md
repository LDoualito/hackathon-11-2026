# Contradiction : `exercice-01.v3.md`

Date : 2026-11-19. Document attaqué : `hackathon-tools/designs/exercice-01.v3.md` (option U recommandée, avec R-IDENT, R-TDZ, R-REPR, R-FONC, R-RETRECI, R-OPAQUE, R-MUT, R-IMPORT).
Rien n'a été modifié sous `src/`, `bin/`, `projects/`, ni dans `verify/out/design-01-v3/` (travail sur une copie). Le README du corpus n'a pas été modifié : les 13 épreuves ajoutées n'y sont pas inscrites.

Essais : `hackathon-tools/verify/out/contradiction-01-v3/`

| Élément | Contenu |
|---|---|
| `copie/` | Copie de `design-01-v3/`, relancée après suppression de `ref-v3/`, `out-v3/`, `out/` et des binaires |
| `rerun-v3.txt`, `rerun-prog.txt`, `rerun-essais.txt`, `rerun-detect.txt` | Sorties des relances |
| `copie/c3/<nom>/main.go` | Go écrit à la main selon les règles du document (U, `[]T`, struct, `any` pour une union) |
| `run-c3.sh`, `go-out/` | Compile, passe `go vet`, exécute chaque programme de `c3/` |
| `ts-out/` | Sorties `tsx` des 13 épreuves ajoutées |
| `detect-contre.tsv` | `detect.ts` du document lancé sur les 13 épreuves : aucune ligne |
| `sondes/`, `detect-sondes.tsv` | Programmes de sonde (refus à tort, autres échappées, imports) et verdict de `detect.ts` |
| `copie/detect-bibliotheque.ts` | `detect.ts` avec la comparaison d'argument étendue aux signatures de bibliothèque |
| `copie/bench/moi_test.go`, `bench-moi*.txt` | Bancs ajoutés et résultats bruts |

Environnement : Go 1.27 `linux/arm64` en Docker `golang:1.27`, Node 24.14.1.

Lecture des colonnes « détection » : c'est ce qui arrive quand la construction a son transformer et que seules les règles du document montent la garde. La colonne « aujourd'hui » dit ce qui masque le cas à l'exercice 01.

**Fait à lire avant le reste : aucun des 13 contre-exemples n'est atteignable avec les seules constructions livrées par l'exercice 01.** Chacun emploie au moins une construction que le plan refuse encore (`notfound-transformer`, ou une garde de la v2). Ils attaquent les règles telles qu'elles sont écrites, pas le Go attendu de l'exercice 01.

Les 13 épreuves passent `tsc --noEmit`. Onze s'exécutent avec `tsx` (code 0). Deux lèvent `ReferenceError`, ce qui est leur sortie attendue.

---

## Cassé

### 1. Condition 3 du §6.3 : l'union cible perd l'association entre membre et forme

`unions/union-gauche-droite-formes-croisees`. La cible est `Left<"rejected", (number | string)[]> | Right<"accepted", number[]>`. La source est `Left<"rejected", number[]>`.

`reprOf` fusionne les Either d'une union : cible `Either<any{[]any | []float64}>`, source `Either<[]float64>`. La condition 3 trouve « un membre compatible » : `[]float64`. Ce membre est celui du Right. TypeScript, lui, rétrécit par `isLeft` vers le Left et lit `(number | string)[]`.

| | Sortie |
|---|---|
| TypeScript | `[ false, true ]`, `[ true, false ]` |
| `detect.ts` | aucun refus |
| Go, option U (`c3/croisees`) | `[ false, true ]` puis `panic: interface conversion: interface {} is []float64, not []interface {}` |

`go build` et `go vet` passent. Détection : panique que TypeScript ne justifie pas. Aujourd'hui : masqué par `left`, la constante locale et le littéral de tableau, tous sans transformer.

Même défaut, sans exécution Go de ma part : deux Right d'informations différentes (`sondes/repr-divers`, constante `informed` : aucun refus), et deux objets discriminés par un littéral (`reprOf` efface le littéral en `string`).

### 2. Argument de type explicite sur un constructeur de bibliothèque

`unions/elargissement-par-argument-de-type` : `DEither.success<(number | string)[]>(numbers)` et `DEither.left<"rejected", (number | string)[]>("rejected", numbers)`.

La position « argument » du §6.3 ne compare que les signatures déclarées hors `node_modules`. Le type de l'expression est déjà `Success<(number | string)[]>`, donc l'initialisation ne voit rien.

| | Sortie |
|---|---|
| TypeScript | `[ true, false ]`, `[ false, true ]` |
| `detect.ts` | aucun refus |
| Go, type inféré `u.SuccessOf(numbers)` (`c3/argtype`) | `panic: interface conversion: interface {} is []float64, not []interface {}` |
| Go, type recopié `u.SuccessOf[[]any](numbers)` (`c3/argtypeexplicite`) | erreur de compilation : `cannot use numbers (variable of type []float64) as []any value` |

Détection : panique ou compilation Go selon l'émission, que le document ne fixe pas. Aujourd'hui : masqué par le littéral de tableau.

Décidabilité : le checker expose le type attendu (`getContextualTypeForArgumentAtIndex` rend `(number | string)[]`). `detect-bibliotheque.ts`, qui retire le filtre `node_modules`, refuse bien ce cas. La même variante refuse aussi les exercices 02 à 10 (un à trois R-OPAQUE chacun, sur les signatures génériques de la bibliothèque). L'extension naïve de la règle n'est donc pas disponible.

### 3. Opérande de `??`, `||`, `??=` : position absente du §6.3 et de la liste du §2

`unions/elargissement-par-coalescence` : `find(flag) ?? DEither.success(numbers)`, où `find` rend `Success<(number | string)[]> | undefined`. Le type du résultat est `Success<(string | number)[]>` par réduction ; l'opérande droit n'est comparé à rien.

| | Sortie |
|---|---|
| TypeScript | `[ false, true ]`, `[ true, false ]` |
| `detect.ts` | aucun refus |
| Go, option U (`c3/coalescence`) | `[ false, true ]` puis la même panique |

Détection : panique. Aujourd'hui : `??` n'est pas dans la table de `binary.ts`. `||` et `&&` y sont (lignes 24 et 25, lu) ; la v2 les refuse par `binary-operator-not-supported`. `sondes/repr-divers` : `later ??= numbers` et `later || numbers` ne déclenchent aucun R-REPR.

### 4. Littéral dont le type contextuel est une union

`unions/elargissement-litteral-contexte-union` : paramètre optionnel `extra?: (number | string)[][]`, appel `count([], [numbers])`.

`literalTarget` n'emploie le type contextuel que s'il est un tableau. Ici c'est `… | undefined` : il retombe sur le type propre du littéral (`number[][]`), où l'élément est compatible. L'argument lui-même est « frais », donc non comparé.

| | Sortie |
|---|---|
| TypeScript | `[ [ true, false ] ]`, `[ [ true, false ] ]` |
| `detect.ts` | aucun refus |
| Go, tableau brut (`c3/contexteunion`) | erreur de compilation : `cannot use numbers (variable of type []float64) as []any value in array or slice literal` |
| Go, variante Either seule (`c3/contexteunioneither`) | `[ [ true, false ] ]` puis la même panique |

Détection : compilation Go pour le tableau brut, panique pour l'Either. Aujourd'hui : masqué par le littéral de tableau.

### 5. Propriété abrégée

`unions/elargissement-propriete-abregee` : `const box: Box = { items, wrapped }`. La ligne « Propriété d'objet » du §6.3 nomme `PropertyAssignment` ; `{ items }` est un `ShorthandPropertyAssignment`. Une clé écrite entre guillemets échappe aussi (filtre `Identifier`, lu).

| | Sortie |
|---|---|
| TypeScript | `[ true, false ]`, `[ false, true ]` |
| `detect.ts` | aucun refus |
| Go, tableau brut (`c3/abregee`) | erreur de compilation : `cannot use items (variable of type []float64) as []any value in struct literal` |
| Go, variante Either seule (`c3/abregeeeither`) | `[ true, false ]` puis la même panique |

Détection : compilation Go, puis panique. Aujourd'hui : masqué par le littéral d'objet.

### 6. `==` et `!=` : R-IDENT les nomme et déclare le `==` de Go exact

`unions/egalite-large`. R-IDENT (§6.2) porte sur `===`, `!==`, `==`, `!=` et écrit « Sinon `==` de Go est exact ». Les deux opérandes sont des primitifs : la règle laisse passer.

| | Sortie |
|---|---|
| TypeScript | `1`, `2`, `3`, `4` |
| `detect.ts` | aucun refus |
| Go, option U (`c3/egalitelarge`) | `2`, `2`, `4`, `4` |

`undefined == null` vaut `true` en JavaScript, `JSUndefined{} == JSNull{}` vaut `false` en Go. `1 == "1"` vaut `true`, `any(1.0) == any("1")` vaut `false`. Détection : silence. Aujourd'hui : `==` n'est pas dans la table de `binary.ts`.

### 7. `switch` sur un Either : identité hors d'un `BinaryExpression`

`unions/identite-par-switch`. R-IDENT ne lit que `BinaryExpression`.

| | Sortie |
|---|---|
| TypeScript | `2`, `1`, `3` |
| `detect.ts` | aucun refus |
| Go, option U (`c3/switch`) | `1`, `1`, `1` |

Détection : silence. Aujourd'hui : `switch` sans transformer. Le §6.2 prévoit le prédicat pour « tout handler futur d'une fonction qui compare ». Un `switch` n'est pas une fonction.

### 8. R-MUT ne voit ni `++` ni `--`, ni cinq autres formes

`unions/mutation-par-increment` : `box.count++`, `--box.count`, puis lecture par l'Either.

| | Sortie |
|---|---|
| TypeScript | `2`, `[ 2, 2 ]` |
| `detect.ts` | aucun refus |
| Go, struct par valeur comme l'écrit le §6.3 (`c3/increment`) | `1`, `[ 2, 2 ]` |

Détection : silence pour l'objet. La tranche, elle, partage son tableau : `counters[0]!++` rend la même sortie.

`sondes/mut-divers` (valide, sortie `{ count: 7 }`, `[ 1, 4, 2 ]`) : aucun R-MUT pour `box.count++`, `--box.count`, `list[0]!++`, l'affectation déstructurée `[list[0], list[1]] = …`, `({ count: box.count } = …)`, `delete`, `Object.assign`. Sept formes de mutation, zéro détection.

### 9. R-TDZ : valeur par défaut d'un paramètre de fonction déclarée

`premier-niveau/lecture-avant-init-parametre-defaut` : `function read(value: … = result) { return value; }`, puis `export const early = read();` avant `const result`.

R-TDZ suit « les identifiants de son corps ». `detect.ts` appelle `collect(statement.body)` : les paramètres ne sont pas parcourus. Une fléchée, elle, est parcourue en entier.

| | Sortie standard |
|---|---|
| TypeScript | vide, `ReferenceError` |
| `detect.ts` | aucun refus |
| Go, défaut porté (`c3/tdzdefautporte`) | `1`, `2`, code 0 |
| Go, défaut ignoré comme le fait `function.ts` aujourd'hui (`c3/tdzdefautomis`) | erreur de compilation : `not enough arguments in call to read` |

Détection : silence. Aujourd'hui : la garde `function-parameter-default-not-supported` de la v2 (§7.3, cas 24) le refuse. Le §2 point 3 du document attribue ce refus à `notfound-transformer` [lu] ; `function.ts` ne transforme jamais l'initialiseur d'un paramètre (lu, lignes 17 à 44), donc `notfound-transformer` ne peut pas le produire.

### 10. R-TDZ : propriété abrégée

`premier-niveau/lecture-avant-init-propriete-abregee` : `function read() { return { result }; }`.

`collect` lit le symbole par `checker.getSymbolAtLocation(identifier)`, comme l'écrit le §6.2. Sur le nom d'une propriété abrégée, le symbole rendu n'est pas celui de la constante. `walkValues`, dans le même fichier, emploie `getShorthandAssignmentValueSymbol` pour R-IMPORT ; `collect` ne le fait pas.

| | Sortie standard |
|---|---|
| TypeScript | vide, `ReferenceError` |
| `detect.ts` | aucun refus |
| Go (`c3/tdzabregee`) | `1`, `2`, code 0 |

Détection : silence. Aujourd'hui : masqué par le littéral d'objet.

### 11. Lecture rétrécie d'une propriété ou d'une liaison déstructurée

`unions/retrecissement-propriete-et-destructuration`. R-RETRECI ne regarde qu'un `Identifier` déclaré par `VariableDeclaration` ou `Parameter`. `box.value` et `{ value }` (un `BindingElement`) échappent.

| | Sortie |
|---|---|
| TypeScript | `4`, `6` |
| `detect.ts` | aucun refus |
| Go (`c3/retrecipropriete`) | erreur de compilation : `cannot use box.value (variable of interface type any) as float64 value in argument to double: need type assertion` |

Détection : compilation Go, soit un échec à l'étape 3 de `verify.sh`, que le critère du §7 interdit.

### 12. Profondeur 7 : coupure du prototype absente du document

`unions/elargissement-profondeur-sept` : `number[][][][][][][]` rangé dans `(number | string)[][][][][][][]`.

`reprOf` rend `opaque "profond"` au-delà de la profondeur 6 (ligne 87). `storedCompatible` compare les clés avant de regarder l'opacité (ligne 201) : deux types coupés au même endroit sont « identiques ». Le §6.3 ne mentionne aucune borne.

| | Sortie |
|---|---|
| TypeScript | `[ true, false ]`, `[ false, true ]` |
| `detect.ts` | aucun refus |
| Go (`c3/sept`) | erreur de compilation : `cannot use deep (variable of type [][][][][][][]float64) as [][][][][][][]any value` |
| Go, variante Either seule (`c3/septeither`) | `panic: interface conversion: interface {} is [][][][][][][]float64, not [][][][][][][]interface {}` |

Détection : compilation Go, panique pour l'Either. Le même ordre des tests laisse passer sans R-OPAQUE toute valeur opaque rangée dans un emplacement de même clé : `sondes/repr-divers` contient `const raw: any = numbers; const copy: any = raw`, une fonction `identity<T>` et une fonction `wrap<T>` qui rend `DEither.success(value)` ; aucun R-OPAQUE. La ligne R-OPAQUE du §6.1 (« `any`, paramètre de type : refusé ») n'est pas ce que le prototype exécute. Le code accepte aussi `any` comme cible (ligne 207) ; le §6.3 n'accepte que `unknown`.

### 13. Interface nulle atteignable sans lecture avant initialisation

`unions/valeur-absente-sans-initialisation` : `let pending: number | undefined;` puis `DEither.success(pending)` et `pending === undefined`.

Le document écrit (§4.1, valeurs limites) : « interface nulle : panique voulue, inatteignable sous R-TDZ ». Il ne dit pas ce qu'émet un `let` sans initialiseur. Si c'est la valeur zéro de Go :

| | Sortie |
|---|---|
| TypeScript | l'Either `success` portant `undefined`, puis `1`, puis un second Either |
| `detect.ts` | aucun refus |
| Go, `var pending any` (`c3/absente`) | `panic: either: valeur absente, ni undefined ni null` |
| Go, même variable sans l'Either (`c3/absentesansof`) | le `1` manque : `pending == any(js.JSUndefined{})` vaut `false` |

Détection : panique, et silence pour la comparaison. Elle dépend d'une émission que le document ne fixe pas ; la couverture de la v2 classe `let x: T;` « oublié » (tranche instructions, cas 17). Autres sources d'une interface nulle non essayées : paramètre optionnel omis, champ optionnel absent d'un littéral d'objet.

---

## Dégradé

### Coûts que le tableau du §5 n'a pas

Bancs `copie/bench/moi_test.go`, fonctions marquées `noinline`, 3 passes, médiane (`bench-moi-3.txt`).

| Déclencheur | U, mesuré | Ce que le document en dit |
|---|---|---|
| `Success<number>` renvoyé par une fonction non intégrée | 2,56 ns, 0 allocation | 1,25 ns : `uex01.Add` est intégrable |
| `Success<Success<number>>`, construit puis lu | 24,9 ns, 32 octets, 1 allocation | Ligne « Profondeur » de la matrice : « tient, aucune conversion », sans mesure pour U |
| Either imbriqué sur 4 niveaux | 71,4 ns, 96 octets, 3 allocations | Aucune ligne |
| `Success<{x, y, z}>` (trois nombres) | 19,4 ns, 24 octets, 1 allocation | §6.1 : « 16 octets et 1 allocation par chaîne ». Rien pour l'objet |
| `Success<number[]>` | 20,6 ns, 24 octets, 1 allocation | Idem, rien pour le tableau |
| `Success<boolean>` | 3,1 ns, 0 allocation | Aucune ligne. Ne se dégrade pas |

Le cas « sans allocation » de la recommandation vaut pour le nombre et le booléen. Tableau, objet et Either imbriqué coûtent une allocation par Either, soit un facteur 8 à 10 sur le temps.

### Refus à tort

`sondes/tdz-faux-refus` s'exécute et affiche `1`, `1`, `1`. `detect.ts` y rend quatre R-TDZ :

| Forme valide refusée | Ligne |
|---|---|
| `const handlers = { run: () => later };` déclaré avant `later` | 3 |
| `class Reader { read() { return later; } }` déclarée avant `later` | 4 |
| Toute classe de premier niveau : « lit Reader depuis l'instruction 3 » (le nom de la classe compte comme une lecture d'elle-même) | 4 |
| `const table = [read];` | 12 |

Le §2 point 5 n'annonce que « fonction référencée mais jamais appelée ». Les deux premières lignes et la troisième n'y sont pas.

`sondes/ident-faux-refus` s'exécute. R-IDENT refuse `first === second` pour un nombre marqué (`number & { readonly brand: "positive" }`) et pour `GenericValue extends number`. Le premier vient de `some` sur les membres d'une intersection (§6.2 : « un de ses membres d'union ou d'intersection »).

Coût de ces refus en programmes réels : non mesuré, ni par le document (§2 points 4 et 5), ni par moi.

### Dégradations du §6.1 auxquelles il manque un champ

| Ligne du §6.1 (ligne du document) | Champ manquant |
|---|---|
| `value * factor + shift` sur `arm64` (197) | Détection : « Aucune ». C'est un silence, sur des constructions livrées par l'exercice 01 |
| Sortie standard sur un terminal (198) | Détection : « Aucune » |
| Lecture d'une valeur d'Either (192) | « Panique impossible si R-REPR, R-OPAQUE et R-TDZ tiennent » : les cas 1 à 5, 12 et 13 la produisent |
| Mutation (189) | Déclencheur incomplet : cas 8 |
| Identité (183) | Déclencheur incomplet : cas 6 et 7 |

### Formules d'alarme (numéro de ligne du document)

| Ligne | Formule |
|---|---|
| 53 | « Ces trois familles ne sont pas conçues ici » |
| 59 | « n'est vérifiée par rien d'automatique » |
| 62 | « La règle à leur appliquer est écrite (§6.2), pas essayée » |
| 65 | « Le modèle d'essai n'est pas une proposition » |
| 86, 217 | « sinon `any` » |
| 128, 132, 134, 137 | « hors option » |
| 197, 198 | Détection « Aucune » |
| 242, 243, 244, 266 | « Go non écrit », « Détection seule » |
| 301 | « cette décision appartient à la conception des tableaux et n'est pas prise ici » |
| 392, 393 | « Je recommande U », suivi de « Mesurer avant de trancher le point 1 […] Non fait » |
| 394 | « À décider avant l'exercice 02 » |
| 400 | « À corriger si » |

---

## Non éprouvé

### Cases de la matrice du document sans exécution

| Axe | Cases |
|---|---|
| Cardinalité 2 | B, BP, C : hypothèse |
| Formes d'écriture | BP, C : hypothèse |
| Valeurs limites | B, BP, C : hypothèse |
| Composition | U, UP, B, BP : « lu » |
| Profondeur | B, BP : deux programmes sur trois |
| §6.3, propriété d'objet, affectation, valeur d'un Either renvoyé | Détection exécutée, Go non écrit |

### Ce que ma matrice a et que celle du document n'a pas

| Axe | Manque | Preuve |
|---|---|---|
| Formes d'écriture | Propriété abrégée, clé entre guillemets, argument de type explicite, `==`, `switch`, `++` | Cas 2, 5, 6, 7, 8, 10 |
| Position | Opérande de `??`, `||`, `??=` ; littéral sous type contextuel en union ; paramètre par défaut ; propriété et liaison déstructurée rétrécies | Cas 3, 4, 9, 11 |
| Symétrie Left et Right | Union dont le Left et le Right portent des formes croisées | Cas 1 |
| Profondeur | Au-delà de 6 ; type récursif (`interface Tree { children: Tree[] }` : aucun essai de conversion) | Cas 12 |
| Valeurs limites | Valeur zéro d'un `any` Go hors lecture avant initialisation | Cas 13 |
| Succession | Chaîne dont la représentation change à chaque maillon sous R-REPR : aucune ligne | Non essayé par moi non plus |
| Composition | R-REPR avec chaque opérateur déjà dans `binary.ts` (`&&`, `||`) | Cas 3 |

### Frontières de famille

| Cas renvoyé ailleurs | Contraint-il le même type Go ? |
|---|---|
| Représentation des tableaux et des objets (document : « Non ») | Oui. Les conditions 5 et 7 du §6.3 et la colonne « Type Go sous U » fixent `[]T` et struct. Les cas 1 à 5 et 12 n'existent que par l'écart `[]float64` contre `[]any` rangé dans `value any`. Le cas 8 n'existe que par la struct par valeur. L'essai cité (`mutationpointeur` identique sous cinq options) montre que les options ne se départagent pas, pas que `Value[T]` est indifférent au choix. Le §11 point 3 laisse ce choix ouvert |
| Modèle asynchrone (« Non ») | Un programme, cinq options, identique. Je n'ai pas attaqué ce point |
| Ordre d'initialisation, imports | Non : mes sondes d'import rendent le même verdict que `tsx` quelle que soit l'option |

### Règles : décidabilité avec le checker

| Règle | Ce que j'ai vérifié |
|---|---|
| R-IDENT | Décidable (`getTypeAtLocation`). Incomplète : cas 6, 7. Refus à tort : nombre marqué, paramètre de type borné |
| R-TDZ | Décidable. Le texte « `getSymbolAtLocation(identifier)` » est faux pour la propriété abrégée (cas 10). « Corps » exclut les paramètres (cas 9) |
| R-REPR, R-FONC | Décidables aux positions listées. Le type attendu d'un argument de bibliothèque est lisible mais inutilisable tel quel (cas 2). Une seule signature lue (`signatures[0]`) : les surcharges au-delà de la première ne sont pas comparées |
| R-RETRECI | Décidable pour un identifiant. Rien pour un accès de propriété, d'élément ou une liaison déstructurée (cas 11) |
| R-OPAQUE | Le prototype ne refuse pas `any` ni un paramètre de type rangés dans un emplacement de même clé (cas 12) |
| R-MUT | Décidable. Sept formes non vues (cas 8) |
| R-IMPORT | Voir « Tenu » |

---

## Tenu

| Affirmation | Comment je l'ai attaquée | Résultat |
|---|---|---|
| Les 58 programmes de `run-v3.sh` | Relance dans la copie après suppression de `ref-v3/` et `out-v3/` ; références régénérées par `tsx` | 30 identiques, 15 différents, 7 paniques, 6 erreurs de compilation. Fichier trié identique à `out-v3.txt`. Références identiques octet pour octet |
| Les 28 programmes et les 39 essais de la v2 | `run-prog.sh`, `run-essais-v3.sh` relancés | 28 et 39 identiques |
| `detect.ts` sur 177 programmes | `detect-corpus.sh` relancé | Mêmes décomptes en U et en C ; `detect-corpus.tsv` et `.c.tsv` sans différence |
| Les cinq cas cassés de la v2 | Lecture de `detect-corpus.tsv` et de la relance | N° 1 : 3 et 2 R-IDENT. N° 2 : 1 R-TDZ. N° 3 : 1 R-REPR ; avec conversion, identique. N° 4 : 1 R-FONC ; avec fermeture, identique. N° 5 : import élidé, `neutre/typeseul` identique |
| R-IDENT, cas autorisés : un seul opérande peut être une référence | `sondes/ident-autorise` : `number[] | number` contre `1`, `Success<number[]> | undefined` contre `undefined`, `NaN`, `0` contre `-0`, `undefined` deux fois, nombre d'un Either élargi lu sous `any` | Aucun refus ; Go `c3/identautorise` identique sur 8 lignes, sans panique |
| Invariant « un nombre est toujours dans `number` », lecture sous `any` | Même sonde, dernière ligne : `Success<number>` rangé pour `Success<number | string>` puis lu | Identique |
| R-FONC et les surcharges | `sondes/repr-divers` : fonction surchargée passée pour `(value: number) => number | string` | Refusée |
| R-IMPORT | `sondes/imports-autres` : liaison employée seulement dans `export { value }`, autre employée seulement en propriété abrégée. `sondes/import-tardif` : `import` écrit après un `print` | `detect.ts` : `./forme ./autre` exécutés ; `tsx` : `1 3 4`. Import tardif : `tsx` rend `0 1 2`, conforme à un `Init()` appelé en tête |
| R-TDZ, formes indirectes | Raisonnement sur `collect` : rappel passé à une fonction d'un autre fichier, fermeture fabriquée par une fonction, fonction déclarée après son appel, auto-référence | Toutes atteintes par la fermeture des symboles. Non exécuté en Go |
| Mesures du §5 | `Courant_U`, `Courant_C`, `LeftNombre_U`, `LeftNombre_C`, `Tableau1000_U`, `ContreTexte1000_U`, `ContreBrut1000_U`, `Chaine_U`, 5 passes | Reproduites dans le bruit de la machine : 1,29 à 1,66 ns, 0,76 ns, 1,30 à 1,41 ns, 1,88 à 2,02 µs, 11,6 à 18,5 µs, 10,3 à 14,3 µs. Allocations identiques |
| Symétrie Left et Right sous U | `LeftNombre_U` contre `Courant_U` | 1,3 à 1,4 ns des deux côtés, 0 allocation |

---

## Non vérifié par moi

- Les contre-exemples sous UP, B, BP et C. Seule l'option U est écrite.
- La fidélité ligne à ligne des 58 programmes Go du document à leur TypeScript. J'ai relu `u/variance`, `u/positions`, `u/reduction`, `u/mutationtranche`, `u/tdz`, `u/valeurnulle`.
- Les bancs UP, BP, A2, U0, UT et les lignes « coût des conversions » du §5.
- `expected/` et `expected00/` au-delà de ce que `run-prog.sh` exécute.
- `essai-verbatim/` et le modèle `async/`.
- Les décomptes cités : 750 `===`, 92 `.push(`.
- Le coût en programmes réels des refus à tort.
- Le transpileur : aucune ligne n'existe. Les colonnes « aujourd'hui » reposent sur la lecture de `binary.ts`, de `function.ts` et du §7.3 de la v2, pas sur une exécution.
- `value * factor + shift` sur `arm64` : non relancé.
