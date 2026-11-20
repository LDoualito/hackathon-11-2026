# Contradiction — exercice 01 : représentation Go d'un Either et d'une union

Date : 2026-11-19. Document attaqué : `hackathon-tools/designs/exercice-01.md`. Aucun fichier de `src/`, `bin/`, `projects/` ni du document n'a été modifié.

Tout est rejouable depuis `hackathon-tools/verify/out/contradiction-01/` :

| Élément | Contenu |
|---|---|
| `a/shard/`, `b/shard/` | Bibliothèque partagée écrite à la main pour l'option A (struct `Either[R]`, disposition à trois champs du §3.2) et pour l'option B (interface, une struct par variante). Le formateur est la copie de `design-01/inspect/shard/inspect.go` |
| `a/{chaine,six,brut}/`, `b/{chaine,six,brut}/` | Le Go des trois épreuves existantes, une fois par option |
| `run.sh` | Compile, passe `go vet`, exécute et compare au TypeScript les six programmes |
| `bench/bench_test.go`, `bench/bench.txt` | Bancs d'essai et résultats bruts (3 passes) |
| `essais/` | Un dossier par contre-exemple Go, avec sa sortie `*.go.txt` et son erreur `*.go.err` |
| `fuzz/` | Comparaison différentielle du formateur contre Node, 2 × 600 valeurs aléatoires |
| `probe-contexte.ts`, `probe-contexte.txt` | Types contextuels rendus par le checker aux constructeurs de Left |

Environnement : Go 1.27 `linux/arm64` dans `golang:1.27`, Node 24.14.1. Les fonctions mesurées sont marquées `noinline`, comme dans le document.

Épreuves ajoutées (toutes typées par `tsc --noEmit` et exécutées par `tsx` ; `verify.sh` s'arrête aujourd'hui à la transpilation sur chacune, comme sur les trois existantes) :

| Épreuve | Ce qu'elle déclenche |
|---|---|
| `epreuves/unions/fail-partage/` | Un même `Fail` renvoyé par deux fonctions dont les Right diffèrent, puis une union de deux Right |
| `epreuves/unions/tableau-elargi/` | Un tableau de `Fail` et un tableau de `Success<number>` passés là où un tableau d'union plus large est attendu |
| `epreuves/unions/fail-retreci-dans-left/` | Une variable rétrécie à `Fail` rangée dans la valeur d'un Left, puis relue |
| `epreuves/premier-niveau/ordre-des-imports/` | Deux modules avec un effet de premier niveau, importés dans l'ordre non alphabétique |
| `epreuves/premier-niveau/import-circulaire/` | Deux fichiers qui s'importent mutuellement (fonctions seulement) |
| `epreuves/affichage/tableau-pleine-largeur/` | Tableaux de 7 chaînes contenant des caractères de largeur 2 ou 0 |

---

## 1. Cassé

### 1.1 Une variable rétrécie à `Fail` rangée dans un emplacement dynamique : panique à l'exécution

Programme : `epreuves/unions/fail-retreci-dans-left/index.ts`. `label` renvoie `Success<string> | Fail`. Dans la branche `isLeft`, la variable est rangée dans `DEither.left("wrapped", labelled)`, puis `matchInformation` la relit et la passe à une fonction qui attend `Success<number> | Fail`.

Trois règles du document s'appliquent mécaniquement : le rétrécissement « ne demande rien » (§3.4, §3.5), le type Go d'un `Fail` seul est `Either[JSUndefined]` (§7.6), la valeur d'un Left se lit « par une assertion vers le type que TypeScript annonce » (§3.5, limite 2). Go écrit ainsi : `essais/retreci_naif/main.go`.

| | Sortie |
|---|---|
| TypeScript | l'Either `wrapped` sur 9 lignes, puis `0` |
| Go, option A | l'Either `wrapped` identique, puis `panic: interface conversion: interface {} is shard.Either[string], not shard.Either[shard.JSUndefined]` |

La variable Go est restée `Either[string]` alors que TypeScript dit `Fail`. Le même type TypeScript a ici deux types Go, et l'emplacement dynamique (`left any`) garde celui de la provenance. La détection est une panique à l'exécution qu'aucune garantie de TypeScript ne justifie. Le même mécanisme vaut pour tout emplacement dynamique que l'option A crée : valeur d'un Left, Right d'un `Either[any]`, élément d'une union `any`.

Pour l'éviter, le transpileur doit convertir à chaque rangement d'une valeur rétrécie, donc connaître à cet endroit l'écart entre le type Go de la variable et le type TypeScript rétréci. C'est l'information que le §4 dit ne pas vouloir dériver (« le type TypeScript d'une variable rétrécie n'est pas le type de la variable Go »).

### 1.2 Ordre des effets de premier niveau entre modules

Programme : `epreuves/premier-niveau/ordre-des-imports/`. `index.ts` importe `./zeta` puis `./alpha` ; chacun fait un `print` au premier niveau. Go écrit selon le §6 et la disposition du boilerplate (un package par fichier, instructions dans `init()`) : `essais/ordre/`.

| TypeScript | Go |
|---|---|
| `zeta`, `alpha`, `3` | `alpha`, `zeta`, `3` |

Go initialise les packages dans l'ordre de leur chemin d'import, pas dans l'ordre des lignes `import`. Le §6 affirme « l'ordre des effets est celui du module » ; c'est vrai à l'intérieur d'un fichier et faux entre fichiers. L'exercice 01 livre `print`, donc le premier effet observable : la divergence est muette (aucune erreur, sortie différente).

### 1.3 Import circulaire

Programme : `epreuves/premier-niveau/import-circulaire/` (`isEven` et `isOdd` dans deux fichiers). TypeScript : `true`, `false`. Go (`essais/cycle/`) : `import cycle not allowed`. Détection : erreur à la compilation Go. Cause : un package par fichier, hérité du boilerplate ; le §6 dit pourtant qu'une variable de package est « visible partout ».

### 1.4 Largeur d'affichage dans les tableaux de plus de 6 éléments

Programme : `epreuves/affichage/tableau-pleine-largeur/`. Go : `essais/largeur/main.go`, avec le formateur complet du document. Les quatre valeurs diffèrent.

| Valeur | Node | Formateur Go |
|---|---|---|
| 7 chaînes dont `'漢字漢字'` | une seule ligne | 4 lignes, en colonnes |
| 7 chaînes dont `'😀😀'` | colonnes, `'😀',   'dddd'` | colonnes, `'😀',  'dddd'` (un espace de moins) |
| 7 chaînes dont `'éé'` écrit avec accent combinant | `'é',  'dddd'` | `'é',   'dddd'` (un espace de plus) |
| `success([...])` du premier tableau | valeur sur une ligne | valeur sur 6 lignes |

Le document classe ce point en hypothèse (ligne 242, « un cas de 8 éléments passe, pas de garantie au-delà »). Il casse dès 7 éléments. Le code concerné est différé à l'exercice 02 ; l'exercice 01 ne le livre pas.

### 1.5 Lecture avant initialisation : succès de zéro au lieu d'une erreur

Programme : `essais/tdz/index.ts` (une fonction lit la constante de premier niveau, elle est appelée avant la déclaration ; `tsc` l'accepte). TypeScript : `ReferenceError: Cannot access 'result' before initialization`. Go (`essais/zero/main.go`, forme b du §6) : affiche un `success` de valeur `0` et continue. Le document l'assume (ligne 267) sans mode de détection : c'est un silence.

Dans le même essai, la valeur zéro d'un `Either[any]` passée à `Print` provoque une panique du formateur (`reflect: call of reflect.Value.Type on zero Value`). L'affirmation « la valeur zéro `Either[R]{}` est un état légal : c'est `success` de la valeur zéro de `R` » (§3.2) est fausse pour `R = any`, qui est le type que la limite 4 introduit.

---

## 2. Dégradé

### 2.1 Les trois épreuves existantes : sortie identique, propriétés perdues

`run.sh` : les six programmes compilent, passent `go vet` et rendent la sortie du TypeScript octet pour octet (1518, 1259 et 526 octets), pour A comme pour B. Rien n'est cassé ici. Ce qui change est le coût et le typage.

Mesures (`bench/bench.txt`, médiane de 3 passes). Chaque ligne construit la valeur dans une fonction `noinline` puis la discrimine et lit sa valeur.

| Scénario | A (recommandée) | B (écartée) | C (écartée) |
|---|---|---|---|
| Cas favorable du document : `add` réussit, `isRight`, lecture | 0,82 ns, 0 alloc | 7,7 ns, 8 o, 1 alloc | — |
| six-succes, Right nombre non nul (`success(5)`) | 9,3 ns, 8 o, 1 alloc | 9,3 ns, 8 o, 1 alloc | 3,4 ns, 0 alloc |
| six-succes, Right objet `{ value }` | 9,4 à 11,3 ns, 8 o, 1 alloc | 15 ns, 24 o, 1 alloc | 3,5 ns, 0 alloc |
| six-succes, Right tableau de 2 nombres | 23 ns, 40 o, 2 allocs | 36 ns, 64 o, 2 allocs | 10,8 ns, 16 o, 1 alloc |
| six-succes, les six variantes en cycle | 9,0 ns | 12,8 ns | 4,8 ns |
| chaine-six-etapes, tout réussit | 44 ns, 16 o, 1 alloc | 95 ns, 80 o, 6 allocs | non mesuré |
| chaine-six-etapes, entrées 1 à 7 en cycle (6 sur 7 finissent en Left) | 45 ns, 17 o, 1 alloc | 75 ns, 65 o, 3 allocs | non mesuré |
| either-et-brut, côté Right (`[3]`) | 19 ns, 32 o, 2 allocs | 25 ns, 40 o, 3 allocs | non mesuré |
| either-et-brut, côté `fail()` | 16,9 ns, 32 o, 1 alloc | 4,5 ns, 0 alloc | non mesuré |

Tailles : `Either[float64]` 32 octets, `Either[any]` 40, interface B 16, union engendrée C pour six-succes 64.

Mon banc du cas favorable donne 0,82 ns là où le document annonce 1,7 ns (boucle différente) ; les comparaisons ci-dessous sont internes à mon banc.

Ce que ces chiffres retirent aux affirmations du document :

1. « Le chemin du succès n'alloue pas et se situe à 1,7 ns » (§3.5). Déclencheur : une fonction dont les Right ont des types Go différents (`six-succes`). Coût : une allocation par succès portant un nombre, un objet ou un tableau, et 9 à 23 ns contre 0,82, soit 11 à 28 fois le cas favorable. Sur ce cas A ne fait pas mieux que B pour un nombre (9,3 ns chacune) ; C reste à 3,4 ns sans allocation. Détection : aucune, le code compile et s'exécute.
2. Typage du Right. Dans `a/six/six.go`, chaque lecture est une assertion (`.(float64)`, `.(string)`, `.([]float64)`…) : six assertions pour six variantes. Le Right n'est plus vérifié par Go, ce qui est le reproche fait à B (§3.5, « aucune vérification du type de la valeur par Go »).
3. « `fail()` n'alloue pas » (§3.3, enseignement 3). Déclencheur : le `Fail` traverse `whenIsRight` vers une union Either + valeur brute (exercice 02). Coût : 32 octets et 16,9 ns contre 1,4 ns annoncé, parce que la struct de 32 octets est rangée dans un `any`. B ne paie rien sur ce chemin (4,5 ns, 0 alloc).
4. Deux lignes de `six-succes` sont flatteuses et ne doivent pas être lues comme un résultat : `right("a-number", 0)` et `right("b-text", "one")` ne coûtent aucune allocation (4,2 et 3,7 ns) parce que Go range sans allouer la valeur zéro et les chaînes constantes. Un nombre non nul alloue (ligne `success(5)`).

Ce qui tient dans ce tableau est dit en §4.

### 2.2 Un type TypeScript, plusieurs types Go : conversions à chaque élargissement

Programmes : `epreuves/unions/fail-partage/` et `epreuves/unions/tableau-elargi/`. Sans conversion, le Go ne compile pas (`essais/failpartage_sansconv`, `essais/tableau_sansconv`) :

```
cannot use failure (variable of struct type shard.Either[shard.JSUndefined]) as shard.Either[float64] value in return statement
cannot use parse("abc") (value of struct type shard.Either[float64]) as shard.Either[any] value in return statement
cannot use fails (variable of type []shard.Either[shard.JSUndefined]) as []shard.Either[float64] value in argument to countRights
cannot use numbers (variable of type []shard.Either[float64]) as []shard.Either[any] value in argument to countAll
```

Avec les conversions écrites à la main (`essais/failpartage`, `essais/tableau`), la sortie est identique au TypeScript. Coût mesuré de ces conversions, que TypeScript ne paie pas :

| Conversion exigée par A | Coût mesuré | Même situation en B |
|---|---|---|
| `Either[float64]` vers `Either[any]`, un succès | 10 ns, 8 o, 1 alloc | aucune conversion |
| Tableau de 1000 `Fail` vers tableau de `Success<number> \| Fail` | 15 à 20 µs, 32 792 o (copie entière) | aucune conversion, le tableau passe tel quel |
| Tableau de 1000 `Success<number>` vers tableau à deux Right | 30 à 32 µs, 48 976 o, 1001 allocs | aucune conversion |

Déclencheur : toute position où TypeScript accepte un sous-type d'union — retour, argument, élément de tableau, branche de ternaire. Détection si le transpileur l'oublie : erreur à la compilation Go. Le document ne décrit cette conversion que pour un Left renvoyé (`EitherLeftAs`, limite 3, en hypothèse) ; il ne dit rien du Right ni des tableaux. Une fonction passée en argument est dans le même cas : `essais/inf_func` (`func(float64) Either[float64]` refusé là où `func(float64) Either[any]` est attendu).

### 2.3 Appels laissés à l'inférence Go (§4, forme Y)

Le §4 dit de Y : « Ce qu'il faut savoir : Rien ». Trois essais :

| Essai | Résultat |
|---|---|
| `essais/inf_fail` : `return shard.EitherFailOf()` | `cannot infer R`. Go n'infère pas depuis le type de retour : tout constructeur de Left a besoin du type écrit, donc du chemin X dès l'exercice 04 |
| `essais/inf_hetero` : `return shard.EitherSuccessOf(value)` dans une fonction qui rend `Either[any]` | `cannot use shard.EitherSuccessOf(value) (… Either[float64]) as shard.Either[any]`. L'inférence prend le type de l'argument, pas celui attendu |
| `essais/dyn_isleft` : `shard.EitherIsLeft(value)` avec `value` de type `any` | `cannot infer R`. Pour l'épreuve either-et-brut il a fallu ajouter une interface non générique (`eitherDynamic`, `DynamicIsLeft`) que le document ne prévoit pas |

Détection dans les trois cas : erreur à la compilation Go, pas à la transpilation. L'argument de robustesse du §4 (ne jamais redériver un type Go depuis un type TypeScript) ne tient donc que pour les fonctions dont tous les paramètres de type figurent dans les arguments.

À l'inverse, le document se trompe à son désavantage ligne 173 : la référence nue compile sans instanciation quand elle est argument d'une fonction générique. `shard.EitherWhenIsRight(Add(one, 2), shard.ArrayCoalescing)` dans `a/brut/brut.go` compile et s'exécute.

### 2.4 Le descripteur `meta` n'est gratuit que s'il est statique

Le banc du document utilise un descripteur partagé (`metaNegative`, variable de package) ; le portage d'affichage du même document en alloue un à chaque appel (`design-01/inspect/shard/either.go`, `EitherLeftOf`). Mesuré avec un descripteur alloué à l'appel : 22 ns, 40 o, 2 allocs, contre 6,7 ns et 1 alloc annoncés. Le document ne dit pas qui crée la variable de package ni ce qui se passe quand l'information n'est pas un littéral.

---

## 3. Non éprouvé

Matrice refaite sans regarder le document, qui n'en contient pas (les guidelines §6 l'exigent « sans case vide »). Preuve : E = exécuté par moi, D = affirmé par le document sans exécution, — = ni l'un ni l'autre.

| Axe | Valeur | Option A | Preuve | Dans le document |
|---|---|---|---|---|
| Cardinalité des Right | 1 | tient | E (cas favorable) | mesuré |
| | 2 de même type Go | tient | — | « prévu », erreur `either-union-multiple-right` |
| | 6 de types différents | dégradé (§2.1) | E | limite 4, « Prévu, pas fait », non mesuré |
| Cardinalité des Left | 0 | tient | E | fait |
| | 1 | tient | E | mesuré |
| | 6 de types différents | tient (§4) | E | raisonné, non exécuté |
| Symétrie | Left dynamique | mesuré | E | mesuré |
| | Right dynamique | dégradé | E | absent |
| | Rétrécissement vers Right | tient | E | fait |
| | Rétrécissement vers Left puis rangement | cassé (§1.1) | E | absent |
| Hétérogénéité | Either + valeur brute | dégradé (§2.1, §2.3) | E | limite 5, renvoyé à une autre famille |
| Profondeur | Either dans la valeur d'un Left | cassé (§1.1) | E | absent |
| | Tableau d'unions élargi | dégradé (§2.2) | E | « prévu », exercice 08 |
| | Either d'Either à l'affichage | tient | E (fuzz) | vérifié |
| Succession | 6 maillons, 6 types | tient | E | absent |
| | Maillon qui rend une valeur brute | — | — | absent |
| Forme d'écriture | Référence nue en argument | tient | E | dit impossible sans instanciation |
| | Curryfiée (`whenIsRight(f)`, 36 usages sur 41) | — | — | absent |
| Position | Premier niveau, un fichier | tient | D | vérifié par le document |
| | Premier niveau, plusieurs fichiers | cassé (§1.2, §1.3) | E | absent |
| | Lecture avant initialisation | silence (§1.5) | E | assumé, sans détection |
| Valeurs limites | Valeur zéro de `Either[any]` | cassé (§1.5) | E | affirmé légal |
| | Left dont la valeur Go serait une interface nulle | — | — | affirmé impossible |
| Composition | Either × tableau × `print` | tient | E | différé à l'exercice 02 |

Points que le document laisse en hypothèse ou vides et que je n'ai pas tranchés :

- `rightPipe` « s'écrit une fois en Go générique » (§3.5). Sa signature TypeScript accepte une entrée brute et des étapes qui rendent une valeur brute (`dist/either/right/pipe.d.ts`, `RightPipeFunction` ; le runtime emballe alors dans `success`). La signature Go `func(A) Either[B]` ne couvre que les étapes qui rendent un Either. J'ai écrit et exécuté ce seul cas.
- Forme curryfiée : `usages DEither.whenIsRight` compte 36 appels à un argument sur 41. Aucun essai, ni dans le document ni ici.
- Le type Right vient du checker sous une forme littérale : `probe-contexte.txt` montre `Success<2>`, `Success<string & Number>`, `Success<readonly [number, number]>`, `Success<{ readonly count: 2; }>` pour l'épreuve en chaîne. La règle « un seul type Go par type Right » suppose une normalisation que le document ne décrit que pour une constante de premier niveau (`getBaseTypeOfLiteralType`).

Formules d'alarme relevées (lignes du document) :

| Ligne | Formule |
|---|---|
| 96 à 106 | Tableau de mesures sans ligne N = 6 ni ligne hétérogène ; cases « non mesuré » |
| 131 | « Recommandation » avant toute recherche de contre-exemple |
| 142 | « à revoir si un exercice fait de l'échec le cas courant » |
| 144 | « [HYPOTHÈSE, non conçu ici] » |
| 145 | « donnera `Either[any]`. Prévu, pas fait. » |
| 146 | « ce sera `any` […] C'est la famille "union hétérogène", distincte de celle-ci. » |
| 152 | « Hors de portée du hackathon. » |
| 173 | « se conçoit avec l'exercice 02 » |
| 240, 242 | « Différé à l'exercice 02 », « pas de garantie au-delà » |
| 267 | « Limite assumée […] Aucun exercice n'est concerné. » sans détection |
| 314, 345 | « Limite assumée » dont la détection est la compilation Go |

Frontière de famille (ligne 146). L'union Either + valeur brute contraint le même type Go : pour tester `isLeft` sur un `any`, `Either[R]` doit exposer une interface non générique (§2.3), et le `Fail` qui y entre porte le `R` de sa provenance, ce qui ramène au §1.1. Ce n'est pas une autre famille au sens des guidelines §3.5.

---

## 4. Tenu

| Attaque | Comment | Résultat |
|---|---|---|
| Sortie des trois épreuves sous A | Go écrit à la main, `go build`, `go vet`, exécution, `cmp` avec le TypeScript | Identique, 1518, 1259 et 526 octets |
| Chaîne de six maillons dont le type Right change à chaque étape | `EitherRightPipe5` générique à six paramètres de type, étapes en fonctions littérales, Go infère tout | Compile sans argument de type écrit ; Right typé de bout en bout ; 44 ns et 1 allocation contre 95 ns et 6 allocations pour B |
| Six Left de types différents dans une même union | `chaine-six-etapes`, un Left par étape, lus par `matchInformation` | Sortie identique ; un seul type Go `Either[float64]` |
| Coût de A face à B dans le pire cas de A | Bancs §2.1 | A reste devant B sur 7 lignes sur 9 ; à égalité sur le nombre ; derrière sur le `fail()` d'une union avec valeur brute |
| Affichage, périmètre livré par l'exercice 01 (sans tableau) | 600 valeurs aléatoires, graine 1 : nombres limites, chaînes avec `'`, `"`, `` ` ``, `${`, `\n`, caractères de contrôle, `é`, `😀`, `漢`, accent combinant, Either `success`, `fail`, `left`, `right` imbriqués jusqu'à 5 niveaux | 2617 lignes identiques à Node |
| Affichage avec tableaux, alphabet sans caractère large | 600 valeurs aléatoires, graine 2 : tableaux de 0 à 106 éléments, homogènes ou non, imbriqués | 11 186 lignes identiques à Node |
| Marqueur de variante | `right("success", v)` et `left("fail", v)` dans le fuzz : même information que `success` et `fail`, sans la quatrième clé | Identique à Node |
| Type Right attendu par un constructeur de Left (limite 3) | `probe-contexte.ts` sur trois épreuves | Le checker rend un type contextuel contenant le Right pour chaque `left` et `fail` placé dans un ternaire ; `AUCUN` pour un `return fail()` sans annotation et pour une constante de premier niveau, les deux cas que le document nomme |
| `left == nil` comme test du côté | `fail()` dans les six programmes et le fuzz, `undefined` rangé comme `JSUndefined{}` | Aucun Left pris pour un Right |

---

## 5. Non vérifié par moi

- Rien n'a été transpilé : tout le Go est écrit à la main. Que le transpileur puisse produire ces formes (conversions aux élargissements, descripteurs `meta` statiques, interface dynamique) n'est pas établi.
- Option C : mesurée sur `six-succes` seulement ; aucun programme complet, ni la chaîne, ni l'union avec valeur brute.
- Options A' et D : non réécrites.
- Option B sur les épreuves que j'ai ajoutées (`fail-partage`, `tableau-elargi`, `fail-retreci-dans-left`) : non exécutée. Seule l'absence de conversion de tableau est mesurée.
- `rightPipe` avec une étape ou une entrée brute, formes curryfiées, alias d'import : non exécutés.
- Chaînes contenant un demi-couple de substitution isolé (`"\ud800"`) : non essayé.
- Un Left dont la valeur Go serait une interface nulle : je n'ai pas trouvé de programme TypeScript qui la produise, ni prouvé qu'il n'en existe pas.
- Mesures sur `linux/arm64` dans Docker uniquement, 3 passes, sans `benchstat`.
- §5 à §12 du document hors affichage et premier niveau (plan d'implémentation, inventaire des refus du §10.2) : non attaqués.
