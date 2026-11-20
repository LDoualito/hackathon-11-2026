# Contradiction : `exercice-01.v2.md`

Date : 2026-11-19. Document attaqué : `hackathon-tools/designs/exercice-01.v2.md` (option U recommandée).
Rien n'a été modifié sous `src/`, `bin/`, `projects/`, ni dans `verify/out/design-01-v2/` (travail sur une copie).

Essais : `hackathon-tools/verify/out/contradiction-01-v2/`

| Élément | Contenu |
|---|---|
| `copie/` | Copie de `design-01-v2/`, relancée telle quelle |
| `copie/contre/<nom>/main.go` | Go écrit à la main sous l'option U pour chaque contre-exemple |
| `<nom>.go.out`, `<nom>.go.err` | Sorties Go |
| `ref-moi/` | Sorties TypeScript régénérées par moi pour les 46 programmes du document |
| `copie/bench/contre_test.go`, `bench-moi.txt` | Bancs ajoutés et résultats bruts (3 passes) |
| `sonde/` | Copie d'une épreuve avec deux affectations à `never` pour lire les types inférés |
| `go.sh` | Lanceur Docker `golang:1.27` |

Environnement : Go 1.27 `linux/arm64` en Docker, Node 24.14.1.

Épreuves ajoutées (toutes passent `tsc --noEmit` et s'exécutent avec `tsx`) ; non inscrites au README du corpus :

| Épreuve | Sortie TypeScript |
|---|---|
| `unions/identite-de-reference` | `2`, `3` |
| `unions/identite-valeur-tableau` | `true`, `false` |
| `unions/elargissement-par-reduction` | `[ false, true ]`, `[ true, false ]` |
| `unions/fonction-retour-elargi-brut` | `2` |
| `premier-niveau/lecture-avant-init-sans-usage` | rien sur la sortie standard, `ReferenceError` |
| `premier-niveau/import-de-type-seul` | `4` |

---

## Cassé

### 1. Identité de référence : `===` entre deux Either

Axe absent de la matrice. Le document ne contient ni le mot ni le cas ; la tranche instructions (cas 34) ne traite `===` que pour les nombres et les chaînes.

`unions/identite-de-reference` n'emploie que des constructions livrées par l'exercice 01 (constante de premier niveau, `if`, `===`, `print` d'un nombre) :

```ts
const first = add(1, 2);
const second = add(1, 2);
const alias = first;
if (first === second) { DCommon.print(1); }
if (first === alias) { DCommon.print(2); }
if (first !== second) { DCommon.print(3); }
```

| | Sortie |
|---|---|
| TypeScript | `2`, `3` |
| Go, option U (`contre/identite`) | `1`, `2` |

`go build` et `go vet` passent. La struct `Either` est comparable, Go compare les champs : deux Either distincts de même contenu sont égaux. `binary.ts` (lignes 27 et 28, lu) traduit `===` par `==` sans regarder le type des opérandes, et aucune des gardes du §10.1 ne le refuse. Détection : silence.

Variante avec une valeur non numérique, `unions/identite-valeur-tableau` :

| | Sortie |
|---|---|
| TypeScript | `true`, `false` |
| Go, option U (`contre/identitetableau`) | `panic: runtime error: comparing uncomparable type []float64` |

Ici la détection est une panique à l'exécution que TypeScript ne justifie pas. Elle vaut aussi pour toute union rangée dans `any` (`Fail | number[]`) comparée avec `===`.

### 2. Lecture avant initialisation d'un Either qui n'est pas consulté

Le document (§6, ligne « constante de premier niveau lue avant son initialisation », et cas 7 de la tranche instructions) donne pour un Either : « panique `ReferenceError` [exécuté, `essais/tdz`], justifiée ». La panique est dans `kindOrPanic`, donc à la consultation du descripteur, pas à la lecture de la variable.

`premier-niveau/lecture-avant-init-sans-usage` :

```ts
function read() { return result; }
export const early = read();
DCommon.print(1);
const result = add(1, 2);
DCommon.print(2);
```

| | Sortie standard |
|---|---|
| TypeScript | vide (`ReferenceError` avant le premier `print`) |
| Go, option U (`contre/tdz`) | `1`, `2`, code de sortie 0 |

Détection : silence. L'analyse statique du §10.4 refuserait ce programme si elle s'appliquait aussi aux Either ; le document la réserve aux autres types et elle n'est pas écrite.

### 3. Élargissement sans aucune annotation

Le document range l'élargissement de valeur (`Success<number[]>` pour `Success<(number | string)[]>`) dans les dégradations, avec un refus `coercion-not-supported` fondé sur une comparaison « à chaque emplacement qui reçoit une valeur » et sur le type « déclaré ». `unions/elargissement-par-reduction` n'a ni emplacement déclaré ni annotation :

```ts
const numbers = [1, 2];
const mixed: (number | string)[] = ["a", 1];
function pick(flag: boolean) {
	return flag ? DEither.success(numbers) : DEither.success(mixed);
}
function describe(flag: boolean) {
	const items = DEither.unwrapRight(pick(flag));
	return DArray.map(items, (item) => item === 1);
}
```

Types lus sur le checker (`sonde/`) : `pick` rend `Success<(string | number)[]>`, `items` est `(string | number)[]`. La réduction par sous-type du ternaire a absorbé `Success<number[]>`.

| | Sortie |
|---|---|
| TypeScript | `[ false, true ]`, `[ true, false ]` |
| Go, option U (`contre/reduction`) | `[ false, true ]` puis `panic: interface conversion: interface {} is []float64, not []interface {}` |

Le Go compile et passe `go vet`. Le point de conversion est une branche de ternaire dont le type attendu n'est écrit nulle part ; il n'existe que comme type inféré de l'expression englobante. La même réduction s'applique aux `return` d'une fonction sans annotation et aux éléments d'un littéral de tableau. Tant que la comparaison profonde (§2, point 2 du document) n'est ni écrite ni essayée sur ces positions, la ligne « Toute lecture d'une valeur d'Either » du §6 a pour détection une panique que TypeScript ne justifie pas.

### 4. Fonction passée là où le retour attendu est une union de valeurs brutes

Le document le cite au §2, point 7, comme non essayé. Il appartient à la famille qu'il déclare lui-même au §1 (« union de valeurs brutes »).

`unions/fonction-retour-elargi-brut` : `half: (value: number) => number` passée pour `(value: number) => number | undefined`.

| | Résultat |
|---|---|
| TypeScript | `2` |
| Go, option U (`contre/fonction`) | erreur de compilation : `cannot use half (value of type func(value float64) float64) as func(float64) any value in argument to apply` |

Détection : compilation Go, à condition qu'aucun refus ne le précède. Le plan refuse aujourd'hui les types fonction par `notfound-transformer` ; la fermeture de conversion n'est pas écrite.

### 5. Import qui ne sert qu'aux types

Cité au §2, point 9, comme non essayé. `premier-niveau/import-de-type-seul` : `forme.ts` exporte un type et affiche `1` au premier niveau ; `index.ts` fait `import { type Forme } from "./forme"`.

| | Sortie |
|---|---|
| TypeScript (`tsx`) | `4` : `forme.ts` n'est jamais exécuté |
| Go, chaîne `Init()` appliquée à chaque `import` comme l'écrit le §10.1 (`contre/typeseul`) | `1`, `4` |

Détection : silence. La chaîne `Init()` doit exclure les imports que TypeScript élide ; le document ne dit pas comment.

---

## Dégradé

Mesures : `bench-moi.txt`, médiane de 3 passes.

| Déclencheur | Mesure | Ce que le document en dit |
|---|---|---|
| Tableau de 1000 Either dont la valeur est une chaîne non constante (10 % de `fail`), construit puis parcouru | U : 11,2 µs, 14 400 octets, 900 allocations. A2 : 3,17 µs, 0 allocation | La ligne « Tableau de 1000 Either » du §5 (U 1,84 µs, 0 allocation, à égalité avec A2) ne mesure que des nombres, le cas où l'emplacement numérique joue. Le §8 écrit « le coût par valeur est le même à un Right qu'à six » : il dépend du type de la valeur, d'un facteur 6 ici |
| Tableau de 1000 `(Fail \| number)[]` (union Either et valeur brute), construit puis parcouru | U : 9,0 µs, 10 400 octets, 1000 allocations, contre 1,84 µs et 0 allocation pour le tableau d'Either seuls | Le §5 ne donne que le coût par valeur (17,3 ns). Pas de ligne tableau pour le cas hétérogène |
| Either et valeur brute, côté `fail()` | 18,8 à 19,3 ns chez moi | Le document donne 17,3 ns |
| Perte de la vérification par Go | Les cinq programmes Go ci-dessus sous « Cassé » passent `go vet` sauf le n° 4 | Le document l'annonce pour le type des valeurs ; il ne l'annonce pas pour l'identité |

Dégradations du §6 auxquelles il manque un champ :

| Ligne du §6 | Champ manquant |
|---|---|
| Lecture d'une valeur d'Either | Détection : panique dont la justification repose sur une fonction non écrite ; contre-exemple n° 3 |
| Élargissement de représentation | Coût : hypothèse |
| Élargissement scalaire vers une union | Coût « 8 octets à la lecture d'un nombre sous `any` » : lu, pas mesuré |
| Information non littérale | Coût : hypothèse, chiffre repris de l'option A |
| Produit suivi d'une somme | Détection : silence si la décision 4 du §11 est « la laisser » |
| Ordre des imports | Détection : silence si la décision 3 du §11 est « plus tard » |
| Sortie sur un terminal | Détection : aucune |

Formules d'alarme relevées (numéros de ligne du document) :

| Ligne | Formule |
|---|---|
| 49, 567 | « La décision sur le modèle asynchrone n'est pas prise ici », « À trancher avant l'exercice 10 » : la question est reportée, sans essai exécuté |
| 50 | « Je tiens pour probable, sans l'avoir exécuté » |
| 82 | Option A' écartée sur une hypothèse |
| 154, 298 | « Écart assumé » (couleurs du terminal) |
| 253 | « Non tranché » (ré-export) |
| 528 | « Hors périmètre strict de l'exercice » pour une divergence muette déjà présente |
| 560 | « ou plus tard, en acceptant une divergence muette » |

---

## Non éprouvé

Cases de la matrice du §4 remplies sans exécution :

| Axe | Cases |
|---|---|
| Cardinalité 2 | A, A2, B, C : « tient [hypothèse] » |
| Hétérogénéité, tous différents | A2 sur le tableau : hypothèse |
| Hétérogénéité, membre et non-membre | C avec `unknown` : hypothèse |
| Profondeur | C sur le générique : hypothèse |
| Formes d'écriture | C sur les références nues : hypothèse |
| Positions | Asynchrone : hypothèse pour les cinq options |
| Valeurs limites | A2 et C : « lu » et hypothèse ; B : hypothèse |
| Composition | A2, B : « lu » ; U : « lu » pour le rangement dans un temporaire |

Axes ou valeurs que ma matrice a et que celle du document n'a pas :

| Axe | Manque |
|---|---|
| Identité | Aucune ligne. Contre-exemples n° 1 |
| Symétrie | Seul Left contre Right est déroulé. Entrée contre sortie et appelant contre appelé (variance des fonctions) : contre-exemple n° 4. Valeur contre type : contre-exemple n° 3 |
| Formes d'écriture | Type annoté contre type inféré : contre-exemple n° 3. Alias d'import : « lu, non exécuté » |
| Composition | Deux lignes seulement (`print` d'un tableau, temporaire). Either avec `===`, avec le ternaire, avec l'ordre d'initialisation : non déroulé |
| Valeurs limites | Valeur zéro d'une variable de type `any` (`number \| undefined` lue avant initialisation) : une interface nulle passée à `EitherOf` donne un succès portant `0`. Non exécuté par moi non plus |

Frontières de famille :

| Cas renvoyé ailleurs | Contraint-il le même type Go ? |
|---|---|
| Asynchrone (T14, §11 point 10) | Non exécuté, donc inconnu. Le document ne montre pas que `Either` n'est pas bloqué dans cette position |
| Représentation des tableaux (`[]float64` contre `[]any`) | Oui : elle décide de ce que contient `value any` et de l'assertion à la lecture. Contre-exemple n° 3 |
| Représentation des objets (« tenu par valeur ») | Oui pour l'identité et la comparabilité du champ `value`. Non essayé : mutation d'un objet ou `push` sur un tableau après son rangement dans un Either |
| Produit et somme, ordre des imports | Non : ne touchent pas au type `Either` |

Autres points :

- L'exercice 00 n'a pas été refait sous U (dit au §9), alors que l'étape 1 du plan en fait son critère.
- `Brut1000` et `Texte1000` n'ont pas été mesurés pour B et C.

---

## Tenu

| Affirmation | Comment je l'ai attaquée | Résultat |
|---|---|---|
| Le Go attendu de l'exercice 01 compile et rend la sortie de référence | `go build ./...`, `go vet ./...`, `go run .` dans une copie de `expected/`, comparé à ma propre sortie `tsx projects/01/index.ts` | Identique, 233 octets. Le Go du §9 est celui du fichier exécuté (comparé par `diff`) |
| Les 28 programmes de `prog/` (7 programmes, 4 options) | `run.sh` relancé dans la copie après suppression des binaires et de `out/` | 28 identiques |
| Les 39 essais de l'option U | `run-essais.sh` relancé de même | 39 identiques |
| Les références `ref/` sont bien les sorties du TypeScript | Régénération des 46 sorties avec `tsx` depuis `projects/01` et `verify/epreuves/`, `cmp` avec `ref/` | Aucune différence |
| Les mesures du §5 | Relance de `Courant`, `LeftNombre`, `Six_U`, `Six_U0`, `Chaine`, `Brut`, `Tableau1000` pour toutes les options, 3 passes | Reproduites à quelques pour cent près, sauf `Brut/left` sous U (19 ns contre 17,3) |
| Symétrie Left et Right sous U | `LeftNombre_U` contre `Courant_U` | 1,25 ns des deux côtés, 0 allocation |
| Invariant « un nombre est toujours dans `number` » | Recherche d'un chemin de construction qui range un `float64` dans `value` : `Of`, `SuccessOf`, `FailOf` lus | Aucun trouvé |

---

## Non vérifié par moi

- La fidélité ligne à ligne des 39 programmes Go de `essais/` à leur TypeScript. Je n'ai relu que `prog/u/brut/brut.go`. Le document signale lui-même un écart pour `ordre-des-imports`.
- Les contre-exemples n° 1 à 3 sous B, A2 et C. Seule l'option U a été écrite.
- Les bancs non relancés : `Gardes6`, `Elargir1000Fail`, `Elargir1000Succes`, les sous-cas de `Six` pour A2, B et C.
- Les tailles `unsafe.Sizeof`.
- Tout ce qui concerne le transpileur : aucune ligne n'existe, `verify.sh` n'a rien à exécuter pour ces épreuves. Les erreurs de refus nommées au §7.3 sont des noms, pas des comportements observés.
- Les décomptes d'usages cités (516, 874, 93, 27) et les rapports de couverture.
- La table de largeur Unicode et le formateur au-delà de ce que les 46 programmes affichent.
