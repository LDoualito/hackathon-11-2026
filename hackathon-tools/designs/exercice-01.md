# Conception — exercice 01 : union d'Either, `if`, constante de premier niveau, `print`

Date : 2026-11-19. Document de conception, aucun fichier de `src/` n'a été modifié.

Légende : [VÉRIFIÉ] exécuté ou lu pendant cette conception ; [RAPPORTÉ] repris des notes ; [HYPOTHÈSE] non exécuté.

Tous les essais sont dans `hackathon-tools/verify/out/design-01/` (jetable, hors `src/`) :

| Dossier | Contenu |
|---|---|
| `bench/` | bancs d'essai Go des représentations (`go test -bench`), résultats bruts dans `bench*.txt` |
| `inspect/` | portage complet du format d'affichage de Node en Go, corpus Node et Go, sorties comparées |
| `inspect-stage01/` | corpus limité à ce que l'exercice 01 livre, et `run.sh` qui rejoue la comparaison sur un `shard_dependencies.go` donné |
| `expected/` | le Go attendu de l'exercice 01, compilé et exécuté |
| `expected-00/` | la même représentation appliquée à l'exercice 00 |
| `probe.ts`, `probe2.ts` | sondes du type-checker (types aux emplacements, nœuds de type synthétisés, résolution) |

Environnement des mesures : Go 1.27.4 `linux/arm64` dans l'image Docker `golang:1.27`, Node 24.14.1.

---

## 1. Problème et familles

L'exercice 01 pose deux questions dans son README et en cache quatre autres.

| Construction | Famille (synthèse §5) | Posée par |
|---|---|---|
| Retour `Success<number> \| Fail` | 5.2 Unions et discrimination | README, problème 1 |
| `if (cond) { … }` | 5.5 Flux de contrôle | README, problème 2 |
| `DEither.isRight(result)` et le rétrécissement de `result` | 5.2 | implicite |
| `const result = add(1, 2)` au premier niveau | 5.7 Structure du programme | implicite |
| `DCommon.print(result)` | 5.7 Effets observables | implicite |
| `DEither.success` qui ne compile pas en Go | 5.3 Fonctions génériques de la bibliothèque | hérité de l'exercice 00 |

La décision centrale est la représentation Go d'un Either et d'une union d'Either. Elle conditionne les exercices 02 à 10 ; les autres points en dépendent.

## 2. État de départ

[VÉRIFIÉ] `verify.sh 01` échoue à la transpilation sur `const result = add(1, 2);` (aucun transformer). `verify.sh 00` échoue à la compilation Go (`EitherSuccessOf` sans instanciation). Sortie de référence de l'exercice 01 : 6 lignes, 233 octets.

[VÉRIFIÉ, `probe.ts` et `probe2.ts`] Ce que le type-checker fournit pour l'exercice 01, avec les fonctions réelles du contexte (`createBuildContext`, `resolveReferenceModule`) :

- le type de retour annoté est un `ParenthesizedType` contenant un `UnionType` de deux `TypeReference` ;
- le type de `result` à sa déclaration est `Fail | Success<number>` ; `typeToTypeNode` rend un `UnionType` synthétisé (`pos = -1`) dont les deux membres se résolvent en `Fail` (`dist/either/left/fail.d.ts`) et `Success` (`dist/either/right/success.d.ts`, argument `NumberKeyword`) ;
- dans le bloc du `if`, le type de `result` est `Success<number>` (rétréci) ;
- le type de `DEither.isRight(result)` porte le drapeau `TypeFlags.Boolean` ;
- la déclaration de `result` a pour arrière-grand-parent le `SourceFile`, et sa liste porte `NodeFlags.Const`.

## 3. Décision centrale : représentation Go d'un Either

### 3.1 Ce qu'il faut reproduire

[RAPPORTÉ, note 01 §2] Un Either est un objet plat à 3 ou 4 clés, dans cet ordre : statut (`right` ou `left`, valeur `null`), `information`, `value` (toujours présente), puis le marqueur de variante (`success`, `fail`, …) quand il existe. Le seul endroit où cette forme est observable dans les exercices est `print`.

### 3.2 Options comparées

| | Option | Type Go de `Success<number> \| Fail` |
|---|---|---|
| A | Struct générique unique, Right typé, Left dynamique | `Either[float64]` |
| A' | Struct générique unique, Left et Right typés | `Either[JSUndefined, float64]` |
| B | Interface Go, une struct par variante, type switch | `Either` (interface), valeurs `EitherSuccess[float64]`, `EitherFail` |
| C | Union générée par signature | `Union_Fail_Success_float64` (struct engendrée, étiquette + un champ par membre) |
| D | Struct unique entièrement dynamique (valeur en `any`) | `Either` |

Disposition retenue pour A, après mesure (§3.3) :

```go
type Either[R any] struct {
	right R
	left  any
	meta  *eitherMeta
}
```

- `left == nil` signifie Right. C'est le même test que `err == nil`. `undefined` et `null` sont `JSUndefined{}` et `JSNull{}`, jamais une interface nulle, donc un Left sans valeur a bien `left != nil`.
- `meta == nil` signifie la variante par défaut du côté : `success` pour un Right, `fail` pour un Left. Les autres variantes (`left("negative-operand", v)`, `ok`, `some`, `right(info, v)`, …) pointent vers un descripteur `{information, marker}`.
- Les champs ne sont pas exportés : le code généré, qui vit dans d'autres packages, ne peut construire un Either que par les constructeurs.
- La valeur zéro `Either[R]{}` est un état légal : c'est `success` de la valeur zéro de `R`.

L'exercice 01 n'a besoin que de `right` et `left`. Le champ `meta` arrive avec l'exercice 06 (premier Left nommé) ; c'est un changement interne à la dépendance partagée, sans effet sur les transformers. Les mesures ci-dessous portent sur la disposition finale à trois champs.

### 3.3 Mesures

[VÉRIFIÉ] `bench/`, `go test -bench . -benchmem`, 3 à 5 passes, valeurs arrondies. Micro-bancs : l'ordre de grandeur et le classement comptent, pas la décimale. La fonction `add` est marquée `noinline`.

Tailles (`unsafe.Sizeof`) :

| Représentation | `R = float64` | `R = string` | `R = []float64` |
|---|---|---|---|
| A, disposition retenue | 32 octets | 40 | 48 |
| A', compacte | 24 | — | — |
| B | 16 (interface) + objet sur le tas | idem | idem |
| C, compacte | 16 | — | — |
| D | 40 | 40 | 40 |

Temps et allocations :

| Scénario | A | A' | B | C | D |
|---|---|---|---|---|---|
| `add` réussit, puis `isRight` et lecture de la valeur | 1,7 ns, 0 alloc | 1,7 ns, 0 | 6,8 ns, 8 o, 1 alloc | 1,5 ns, 0 | 13,7 ns, 8 o, 1 alloc |
| `add` échoue avec un Left portant un nombre | 6,7 ns, 8 o, 1 alloc | 1,6 ns, 0 | 12,4 ns, 24 o, 1 alloc | 1,5 ns, 0 | 13,5 ns, 8 o, 1 alloc |
| `add` échoue avec `fail()` | 1,4 ns, 0 alloc | — | — | — | — |
| Garde `isLeft` + retour anticipé, puis lecture, le type Right changeant (10 % de Left) | 4,6 ns, 0 alloc | 2,6 ns, 0 | 9,5 ns, 9 o, 1 alloc | non mesuré | 24 ns, 8 o, 1 alloc |
| Tableau de 1000 Either (10 % de Left), construit puis parcouru | 2,7 µs, 800 o, 100 allocs | non mesuré en compact | 9,3 µs, 9600 o, 1000 allocs | non mesuré | 15 µs, 8000 o, 1000 allocs |
| Right de type `string` (10 % de `fail`) | 3,6 ns, 0 alloc | — | 9,6 ns, 14 o | — | — |
| Right de type `[]float64` | 3,7 ns, 0 alloc | — | 13 ns, 21 o | — | — |

Trois enseignements :

1. La disposition compte plus que l'option. Une première struct A « naturelle » à quatre champs (`right`, `left any`, `information string`, `kind`), 48 octets, mesurait 10 ns par appel là où la disposition retenue en mesure 1,7. Sortir l'information et le marqueur derrière un pointeur divise le coût par six. [HYPOTHÈSE] La cause est la limite du compilateur Go pour garder une struct dans des registres ; seule la mesure est établie.
2. B alloue un objet par Either, sur le chemin du succès comme sur celui de l'échec. Le temps par appel reste modéré, mais un tableau d'Either (exercices 08 à 10) coûte une allocation par élément.
3. A n'alloue que pour un Left qui porte une valeur non pointeur (un nombre, une chaîne). `fail()`, `none()` et `left("x")` n'allouent pas. A' et C n'allouent jamais : c'est ce que A abandonne.

### 3.4 Évaluation sur les exercices 01 à 10 et sur le motif dominant

| Critère | A (retenue) | A' | B | C | D |
|---|---|---|---|---|---|
| Fidélité à l'affichage (ordre et nom des clés) | Oui : les entrées sont produites dans l'ordre statut, information, valeur, marqueur | Oui | Oui | Oui | Oui |
| Rétrécissement après `isRight` (01) | Aucun travail : `Success<number>` et `Fail \| Success<number>` ont le même type Go | Le type rétréci n'a plus de Left : le type Go change, il faut une conversion ou repartir du type déclaré | Lecture de la valeur par assertion de type ; le type Go de la variable ne change pas | Le type rétréci est une autre union engendrée : conversion | Aucun travail, assertion à la lecture |
| 06, Left nommé avec valeur | `meta` + valeur boxée (1 allocation) | Sans allocation | Une struct de plus, 1 allocation | Un membre de plus | 1 allocation |
| 07, union de deux Left | Même type Go `Either[float64]` : `rightPipe` s'écrit en générique | Même type seulement si les deux Left ont le même type Go ; sinon `any` et conversions | Même interface | Union à trois membres, conversion depuis les deux unions sources, à engendrer | Même type |
| 08, tableaux d'Either | `[]Either[float64]`, sans allocation par élément réussi | Idem, sans allocation | 1 allocation par élément | Sans allocation | 1 allocation par élément |
| 09, `group` | `EitherGroup[R]([]Either[R]) Either[[]R]`, générique | Générique si les Left s'unifient | Assertion par élément | Pas de générique possible sur des unions engendrées : boucle engendrée par site | Assertion par élément |
| 10, asynchrone | Orthogonal | Orthogonal | Orthogonal | Orthogonal | Orthogonal |
| `if (isLeft(x)) return x;` puis `unwrapRight(x)` | `return x` direct si le Right est le même ; sinon `EitherLeftAs[R2](x)`, générique et sans allocation (mesuré : 4,6 ns pour la chaîne entière) | Conversion à chaque frontière dès que les Left diffèrent | `return x` toujours direct ; lecture par assertion | Conversion membre à membre, engendrée | `return x` direct ; assertion |
| État invalide constructible | Non depuis le code généré (champs privés). Dans le package partagé, un `meta` du mauvais côté est possible : seuls les constructeurs en créent | Idem | Non pour les variantes ; l'interface nulle existe | Non, hors valeur zéro | Idem A, plus une valeur du mauvais type |
| Simplicité du transpileur | Un type Go par type Right. Un besoin d'information : le type Right attendu pour les constructeurs de Left (§3.5) | Unification des Left à chaque union, conversions aux frontières | Un seul type Go pour tous les Either, mais le type Go de la valeur à chaque lecture | Registre de types engendrés, nommage canonique, conversions, bibliothèque entière à engendrer par site | La plus simple |

### 3.5 Recommandation et limites assumées

Recommandation : **option A**, struct générique `Either[R]`, Right typé, Left dynamique, disposition compacte.

Pourquoi :

- le rétrécissement de type, besoin de premier rang d'après le code réel, ne demande rien : la variable Go garde son type ;
- le chemin du succès n'alloue pas et se situe à 1,7 ns, au niveau des options entièrement typées, quatre fois sous l'interface ;
- les Left traversent les fonctions tels quels (`left any`, `meta`), donc `rightPipe`, `group`, `whenIsRight…` s'écrivent une fois en Go générique au lieu d'être engendrés par site ;
- un seul paramètre de type à déterminer, celui du Right.

Limites assumées :

1. Un Left portant un nombre ou une chaîne coûte une allocation de 8 à 16 octets (mesuré : 6,7 ns contre 1,6 pour A'). Acceptable parce que c'est le chemin d'échec ; à revoir si un exercice fait de l'échec le cas courant.
2. Le type du Left n'est plus vérifié par Go. Toute lecture d'une valeur Left (`matchInformation`, `unwrapLeft`, exercice 06) passe par une assertion vers le type que TypeScript annonce.
3. Un type TypeScript qui ne contient que des Left ne dit rien du Right. Les constructeurs de Left (`fail()` dès l'exercice 04) doivent donc recevoir le type Right attendu, lu sur le type contextuel ou sur le type de retour de la fonction englobante. [HYPOTHÈSE, non conçu ici] Un Left construit hors de tout contexte typé puis renvoyé dans une union demandera une conversion `EitherLeftAs`.
4. Une union dont les Right ont des types Go différents (`Right<"a", number> | Right<"b", string>`) donnera `Either[any]`. Prévu, pas fait.
5. Une union qui mêle Either et valeur brute (`Fail | number[]`, exercice 02) n'est pas un `Either[R]` : ce sera `any` avec un type switch. C'est la famille « union hétérogène », distincte de celle-ci.

Options écartées :

- **A'** : la plus rapide sur l'échec, mais le type Go change avec le rétrécissement et avec chaque combinaison de Left (le checker donne par exemple `Left<"division-by-zero", 0>` à l'exercice 07), ce qui impose des conversions partout.
- **B** : la plus simple après D pour faire circuler les valeurs, mais une allocation par Either et aucune vérification du type de la valeur par Go.
- **C** : la meilleure en vitesse brute, mais toute la bibliothèque Either doit être engendrée par site d'appel, avec un registre de types et des conversions entre unions. Hors de portée du hackathon.
- **D** : deux fois plus lente que B, allocation sur le chemin du succès.

## 4. Appel d'une fonction de la bibliothèque : laisser Go inférer

L'erreur de l'exercice 00 vient de la forme émise : la fonction appelée est rangée dans un temporaire (`Generated_4 := shard_dependencies.EitherSuccessOf`), ce que Go refuse pour une fonction générique non instanciée.

Deux corrections possibles :

| | Forme émise | Ce qu'il faut savoir |
|---|---|---|
| X | `Generated_4 := shard_dependencies.EitherSuccessOf[float64]` puis `Generated_4(Generated_7)` (forme du README de l'exercice 00) | Les arguments de type, à dériver des types TypeScript |
| Y | `shard_dependencies.EitherSuccessOf(Generated_7)` | Rien : Go infère depuis l'argument |

Recommandation : **Y pour la forme appel**.

- Avec X, le transpileur doit redériver des types Go depuis des types TypeScript à chaque appel. Or le type TypeScript d'une variable rétrécie n'est pas le type de la variable Go : dans une branche où `x` est rétréci à `Fail`, le type TypeScript ne contient plus le Right, alors que la variable Go reste `Either[float64]`. Avec Y, c'est le compilateur Go qui lit le type de son propre opérande ; il ne peut pas se tromper.
- X exige un transformer de type pour chaque type de valeur avant que `success(v)` ou `print(v)` fonctionne ; Y n'exige que le transformer d'expression.
- Ne pas ranger la fonction appelée dans un temporaire ne change pas l'ordre d'évaluation : une référence à une fonction de la bibliothèque est une constante, son évaluation n'a pas d'effet observable. Les arguments restent évalués dans l'ordre et rangés dans des temporaires, comme le fait `shared/call.ts`.
- [VÉRIFIÉ] Coût : la forme X (temporaires partout) mesure 0,83 à 0,91 ns par itération contre 0,68 à 0,80 pour la forme directe sur la séquence de l'exercice 01. L'écart est faible ; l'argument est la robustesse, pas la vitesse.

La forme « référence nue » (`DArray.map(xs, DEither.success)`, exercice 02 pour `DArray.coalescing`) aura besoin de l'instanciation explicite. Elle est refusée avec une erreur aujourd'hui et se conçoit avec l'exercice 02.

Besoin d'outil à décrire (le skill `typescript-to-go` demande de le faire avant de créer une aide partagée) : « appeler une fonction de la dépendance partagée, arguments évalués dans l'ordre dans des temporaires, types laissés à l'inférence Go ». Il sert trois fois dans cet exercice (`success`, `isRight`, `print`) et servira à chaque fonction de bibliothèque en forme appel. D'où un fichier `duplojs/sharedDependencyCall.ts` (§9).

Signature Go de `isRight` : `EitherIsRight[R any](input Either[R]) bool`. [VÉRIFIÉ] L'autre signature possible, paramétrée par le type entier via une contrainte de méthode, mesure 1,14 ns contre 0,83.

## 5. Affichage : reproduire `console.info`

### 5.1 Règles, lues dans Node et vérifiées par exécution

[VÉRIFIÉ] Les règles viennent du source de `internal/util/inspect` embarqué dans le binaire Node 24.14.1 installé (`process.binding('natives')`), pas de la mémoire, puis d'une comparaison octet pour octet.

Paramètres par défaut de `console.info` : `depth = 2`, `breakLength = 80`, `compact = 3`, `maxArrayLength = 100`.

1. Premier niveau : une chaîne est écrite brute ; toute autre valeur passe par le formateur. Un saut de ligne final.
2. Nombre : conversion JS en chaîne, sauf `-0` qui s'écrit `-0`. Notation exponentielle sous `1e-6` et à partir de `1e21`, exposant sans zéro de remplissage (`1e-7`, `1e+21`).
3. Chaîne imbriquée : entre apostrophes ; entre guillemets doubles si elle contient une apostrophe et pas de guillemet double ; entre accents graves si elle contient les deux et ni accent grave ni `${` ; sinon apostrophes avec `\'`. Échappements : `\b \t \n \f \r`, `\\`, `\xNN` (hexadécimal majuscule) pour les autres caractères sous `0x20` et de `0x7f` à `0x9f`. Les caractères accentués ne sont pas échappés.
4. Chaîne imbriquée longue (plus de 16 unités et plus de `80 - indentation - 4`) : découpée après chaque saut de ligne, morceaux joints par ` +` et un retour à la ligne indenté.
5. Clé d'objet : nue si elle correspond à `^[a-zA-Z_][a-zA-Z_0-9]*$`, sinon formatée comme une chaîne. Les clés de kind sont donc entre apostrophes.
6. Objet ou tableau vide : `{}`, `[]`, avant tout test de profondeur.
7. Profondeur : un objet ou un tableau atteint à une profondeur supérieure à 2 devient `[Object]` ou `[Array]`.
8. Une ligne ou plusieurs. Les entrées d'un objet tiennent sur une ligne (`{ a: 1, b: 'x' }`) si trois conditions sont réunies : l'objet le plus profond formaté en dernier est à moins de 3 niveaux sous l'objet courant ; avec `n` le nombre d'entrées, `3n + indentation courante + 11` ne dépasse pas 80, et `2n + indentation courante + 11 + somme des longueurs des entrées` non plus ; aucune entrée ne contient de saut de ligne. Sinon une entrée par ligne, indentée de deux espaces de plus. Les longueurs se comptent en unités UTF-16, pas en octets : `'é'` compte pour 1, `'😀'` pour 2.
9. L'indentation courante augmente de 2 pendant le formatage de chaque valeur de propriété et de chaque élément de tableau.
10. Tableau de plus de 6 éléments : regroupement en colonnes (`groupArrayElements`), nombres alignés à droite, autres valeurs à gauche, au plus 15 colonnes et `compact × 4 = 12`. Un tableau regroupé n'est jamais remis sur une seule ligne.
11. Tableau de plus de 100 éléments : `... N more items`.

Conséquence pour un Either : ses clés font 45 à 51 caractères, la règle 8 échoue toujours, il est donc toujours sur plusieurs lignes ; sa valeur, elle, peut tenir sur une ligne (`value: [ 3 ]`).

### 5.2 Conception Go

Un contrat entre les valeurs et l'affichage, dans la dépendance partagée :

```go
type JSEntry struct {
	Key   string
	Value any
}

type JSObject interface {
	JSEntries() []JSEntry
}
```

Tout type Go qui représente un objet JavaScript rend ses propriétés dans l'ordre d'énumération. `Either[R]` l'implémente (3 ou 4 entrées, clés de kind complètes). Les futurs objets littéraux et tuples l'implémenteront ou passeront par le chemin des tableaux. Le formateur ne connaît donc aucun type particulier : nombres, chaînes, booléens, `JSNull`, `JSUndefined`, `JSObject`, tableaux.

Le formateur est un portage direct des fonctions de Node, avec les mêmes noms pour qu'on puisse le relire à côté du source : `formatValue`, `formatObject`, `formatArray`, `reduceToSingleString`, `isBelowBreakLength`, `groupArrayElements`, et un contexte `{indentationLvl, currentDepth}`.

`Print[T any](value T) T` écrit sur `os.Stdout` sans tampon et renvoie son entrée. Sans tampon : un `print` suivi d'un arrêt brutal du programme reste visible, comme sous Node quand la sortie est un fichier ou un tube.

`JSNumberToString` (règle 2) servira aussi à `DString.to` (exercice 05).

### 5.3 Ce qui est vérifié

[VÉRIFIÉ] Portage complet (`inspect/shard/inspect.go`, 376 lignes) contre Node sur 103 valeurs, 435 lignes de sortie, 12 043 octets : identique octet pour octet. Le corpus couvre nombres (dont `-0`, `NaN`, infinis, exposants), chaînes (guillemets, échappements, longues, multilignes), `null`, `undefined`, booléens, Either réussis, échoués et nommés, Either imbriqués jusqu'à la profondeur 4, tableaux de 0 à 250 éléments, tableaux imbriqués, objets placés juste sous et juste au-dessus du seuil de la règle 8, imbrication mixte.

[VÉRIFIÉ] Version réduite livrée par l'exercice 01 (`expected/shard_dependencies/shard_dependencies.go`) contre Node sur 67 valeurs, 243 lignes, dont des chaînes `x`, `é` et `😀` placées juste sous et juste au-dessus du seuil de la règle 8 : identique.

Le seul écart rencontré pendant la mise au point venait du test : `0.1 + 0.2` écrit en constantes est calculé exactement par le compilateur Go. Aucune correction du formateur n'a été nécessaire.

### 5.4 Couvert maintenant, différé

| Élément | Exercice 01 | Ensuite |
|---|---|---|
| Nombres, chaînes, booléens, `null`, `undefined` | Livré | |
| Objets via `JSObject`, imbrication, profondeur, règle une ligne ou plusieurs | Livré | |
| Chaînes longues découpées, échappements, choix des guillemets | Livré (sinon divergence muette à l'exécution) | |
| Either : Right `success`, Left `fail` | Livré | Autres variantes avec `meta` (06) |
| Tableaux, regroupement en colonnes, plus de 100 éléments | Différé à l'exercice 02 ; le code existe dans `inspect/shard/inspect.go` (importe `reflect`) | |
| Second paramètre de `print` (`"warn"`, `"error"`, `{ depth }`, `{ columns }`) | Refusé à la transpilation | `stderr` et profondeur prévus ; `console.table` non prévu |
| Largeur d'affichage des caractères pleine largeur dans le regroupement | | [HYPOTHÈSE] approximée par le nombre de points de code ; un cas de 8 éléments passe, pas de garantie au-delà |
| Références circulaires, tableaux troués, `Map`, `Set`, fonctions, `Promise`, clés entières triées en tête | Non prévu tant qu'aucune représentation Go ne les produit | |

Une valeur que le formateur ne connaît pas provoque un `panic` explicite, jamais une sortie approximative.

## 6. Code de premier niveau

Le boilerplate place les instructions de premier niveau dans `init()` du package. Trois façons de représenter `const result = add(1, 2);` :

| | Forme Go | Effet |
|---|---|---|
| a | `Sourced_result := …` dans `init()` | Invisible des fonctions du fichier et des autres packages ; une constante jamais lue arrête la compilation Go (`declared and not used`) |
| b | `var Sourced_result T` au niveau du package, `Sourced_result = …` dans `init()` | Visible partout, ordre d'évaluation conservé, pas d'erreur si elle n'est pas lue |
| c | `var Sourced_result = …` au niveau du package | Les temporaires de préparation vivent dans `init()` : ne compile pas, et l'initialisation passerait avant `init()` |

Recommandation : **b**.

- Une fonction du même fichier qui lit une constante de module est courante dans le code réel, et `export const` aussi. La forme a ne les permet pas ; b les permet sans autre mécanisme, le nom Go `Sourced_…` étant déjà exporté.
- L'affectation reste à sa place dans `init()`, entre les instructions qui la précèdent et celles qui la suivent : l'ordre des effets est celui du module.
- Une variable de package jamais lue n'est pas une erreur en Go.
- Durée de vie : une constante de module vit autant que le programme en JavaScript aussi.
- [VÉRIFIÉ] Coût : écrire puis lire une variable de package mesure 1,23 ns contre 1,09 pour une locale. Le code de premier niveau ne s'exécute qu'une fois.

Le type `T` vient du checker : type du nom déclaré, ramené à son type de base s'il est littéral (`getBaseTypeOfLiteralType`), puis `typeToTypeNode` et `typeTransformers`. [VÉRIFIÉ] Ce chemin rend un `UnionType` résoluble pour `result` et un `NumberKeyword` pour un littéral numérique.

Limite assumée : une fonction appelée avant l'initialisation de la constante lit la valeur zéro Go au lieu de lever `ReferenceError`. Aucun exercice n'est concerné.

Dans une fonction, une constante sera une déclaration courte locale ; il faudra alors traiter la locale non lue. Aucun des exercices 01 à 10 ne déclare de constante dans une fonction : c'est prévu, pas fait, et refusé avec une erreur.

## 7. Inventaire des variantes

Statuts : **fait** (livré par l'exercice 01), **prévu** (la conception le couvre, refus explicite en attendant), **refusé** (pas de traduction envisagée).

### 7.1 Déclaration `const`

| Forme | Statut | Détail |
|---|---|---|
| `const x = expr;` au premier niveau | fait | Variable de package + affectation dans `init()` |
| `export const x = expr;` | fait | Même Go. [HYPOTHÈSE] lecture depuis un autre fichier non exécutée |
| `const x: T = expr;` | fait | Même chemin : le type vient du checker, annotation comprise |
| `const x = 1;` (type littéral `1`) | fait | Le type est ramené à son type de base (`getBaseTypeOfLiteralType`) avant d'être traduit |
| Constante jamais lue | fait | Pas d'erreur Go pour une variable de package |
| `const x = expr;` dans une fonction ou un bloc | prévu | Erreur `variable-statement-outside-top-level` |
| `const a = 1, b = 2;` | prévu | Erreur `variable-statement-multiple-declarations` |
| `const [a, b] = …`, `const { a } = …` | prévu | Erreur `variable-statement-binding-pattern` |
| `let x = …` | prévu | Erreur `variable-statement-let` (il manque l'affectation) |
| `var x = …` | refusé | Erreur `variable-statement-var` (portée de fonction, hissage) |
| `declare const x: T;` | refusé | Erreur `variable-statement-ambient` |
| Initialisation avec `await` (exercice 10) | prévu | L'expression n'a pas de transformer : `notfound-transformer` |

### 7.2 `if`

| Forme | Statut | Détail |
|---|---|---|
| `if (cond) { … }`, condition de type booléen | fait | Premier niveau ou corps de fonction. Les préparations de la condition sont placées avant le `if` |
| Condition = appel, comparaison, identifiant booléen | fait | Selon les transformers d'expression disponibles |
| `if (cond) { … } else { … }` | prévu | Erreur `if-else-not-supported` |
| `else if` | prévu | Erreur `if-else-not-supported`. Les préparations de la seconde condition devront être dans le `else` |
| `if (cond) instruction;` sans accolades | prévu | Erreur `if-body-not-block` |
| Condition non booléenne (`if (value)`, `if (text)`) | prévu | Erreur `if-condition-not-boolean`. Demande la vérité JavaScript par type |
| `!cond`, `a && b`, `a \|\| b` en condition | prévu | Pas de transformer unaire ; `&&` et `\|\|` existent mais perdent le court-circuit (§11) |
| `return` dans le bloc (exercice 04) | fait | Le bloc et `return` existent déjà |

### 7.3 `DEither.isRight`

| Forme | Statut | Détail |
|---|---|---|
| `DEither.isRight(x)`, `x` union d'Either | fait | `shard_dependencies.EitherIsRight(tmp)` |
| Alias d'import (`import { isRight }`, `import * as E`) | fait | Le routeur résout le symbole, pas le texte |
| Argument avec préparations (`isRight(add(1, 2))`) | fait | Préparations puis temporaire |
| En condition, en initialisation de constante, en argument | fait | C'est une expression |
| Rétrécissement de l'argument dans la branche | fait | Rien à émettre |
| `x` de type union hétérogène, `unknown` ou non-Either | prévu | Variante dynamique. Aujourd'hui l'inférence Go échoue : erreur à la compilation Go, pas à la transpilation. Limite assumée |
| Référence nue (`DArray.filter(xs, DEither.isRight)`) | prévu | Erreur `either-is-right-reference` |
| `DEither.isRight(x);` en instruction isolée | prévu | Erreur `either-is-right-reference` (l'instruction passe par `shared/call.ts`, qui présente la référence seule) |
| `!DEither.isRight(x)` | prévu | Pas de transformer unaire |
| `DEither.isLeft` | prévu | Le routeur rend `transformation-error` |

### 7.4 `DCommon.print`

| Forme | Statut | Détail |
|---|---|---|
| `DCommon.print(x);` en instruction | fait | `shard_dependencies.Print(tmp)` |
| `const y = DCommon.print(x);` | fait | `Print` renvoie son entrée |
| Alias d'import | fait | Résolution du symbole |
| Valeur : nombre, chaîne, booléen, Either, objet `JSObject` | fait | §5.4 |
| Valeur : tableau | prévu | Exercice 02 |
| `print(x, "info")` | prévu | Erreur `print-params-not-supported` |
| `print(x, "warn")`, `print(x, "error")` | prévu | Idem ; écriront sur `os.Stderr` |
| `print(x, { depth })` | prévu | Idem |
| `print(x, { columns })` | refusé | Idem ; `console.table` |
| Référence nue dans un pipe | prévu | Erreur `common-print-reference` |
| Autre fonction de `DCommon` | prévu | Le routeur rend `transformation-error` |

### 7.5 `DEither.success`

| Forme | Statut | Détail |
|---|---|---|
| `DEither.success(expr)` | fait | `shard_dependencies.EitherSuccessOf(tmp)`, type inféré par Go |
| Alias d'import | fait | |
| `success(success(1))` | fait | L'appel interne est un argument |
| `success(42)` avec retour annoté | fait | Le littéral est déjà émis en `float64` |
| `success(42)` avec retour inféré (`Success<42>`) | prévu | Le type littéral n'a pas de transformer : `notfound-transformer` |
| Type Right attendu plus large que celui de l'argument | prévu | Erreur à la compilation Go aujourd'hui. Limite assumée |
| `success(undefined)`, `success(null)` | prévu | Pas de transformer pour ces expressions |
| Référence nue | prévu | Erreur `either-success-reference` |
| `DEither.success(x);` en instruction isolée | prévu | Erreur `either-success-reference` |
| Argument étalé (`success(...args)`) | refusé | Erreur `spread-argument-not-supported` |

### 7.6 Types `Success`, `Fail` et union

| Forme | Statut | Détail |
|---|---|---|
| `DEither.Success<T>` seul (exercice 00) | fait | `Either[T]` |
| `DEither.Success<T> \| DEither.Fail`, dans un ordre ou l'autre | fait | `Either[T]` : le type Go est celui du seul membre Right |
| Parenthèses et barre initiale (`(\| A \| B)`) | fait | Transformer de type parenthésé |
| Même union inférée, sans annotation | fait | Nœuds synthétisés, même chemin [VÉRIFIÉ pour `result`] |
| Alias d'import des types | fait | |
| `Success<Success<T>>` | fait | Récursion par `typeTransformers` |
| `DEither.Fail` seul | prévu | `notfound-transformer` (le routeur de type Either le refuse). Sera `Either[JSUndefined]` |
| Union de Left seuls | prévu | Erreur `either-union-without-right`. Sera `Either[JSUndefined]` |
| `Left<I, V>`, `Right<I, V>`, `Ok`, `Some`, `Result`, `Error`, `None`, `Maybe<T>` | prévu | Erreur `either-union-member-not-supported` |
| Deux membres Right | prévu | Erreur `either-union-multiple-right` |
| Union Either et valeur brute | prévu | Le routeur refuse, `notfound-transformer` ; sera `any` (exercice 02) |
| Alias local (`type R = Success<number> \| Fail`) | prévu | `notfound-transformer` |
| `Promise<…>`, tableau d'unions | prévu | Exercices 10 et 08 |
| Fonction générique renvoyant `Success<T>` | prévu | Voir §11 : les génériques sont ignorés sans erreur par `declaration/function.ts` |

## 8. Go attendu pour l'exercice 01

[VÉRIFIÉ] Les cinq fichiers ci-dessous sont dans `expected/`. `go build ./...` et `go vet ./...` passent, `go run .` rend les 233 octets de la référence TypeScript, comparés avec `cmp`. La même représentation appliquée à l'exercice 00 (`expected-00/`) compile, passe `go vet` et n'écrit rien, comme le TypeScript.

Réserves : la numérotation `Generated_N` n'est pas contractuelle (elle dépend de l'ordre de résolution) ; la mise en forme sera celle du printer (parenthèses autour des littéraux composites et des conversions), pas celle de ce texte ; `gofmt -l` signale déjà `add.ts.go` à cause du type de retour parenthésé, sans conséquence.

`go.mod`

```go
module duplojs.local/transpiled

go 1.27.4
```

`main.go`

```go
package main

import _ "duplojs.local/transpiled/index.ts"

func main() {}
```

`add.ts/add.ts.go`

```go
package Sourced_001busers001bj001aneupert001bhackathon00191100192026001bprojects001b01001badd001ats

import "duplojs.local/transpiled/shard_dependencies"

func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[float64]) {
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

var Sourced_result shard_dependencies.Either[float64]

func init() {
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

`shard_dependencies/shard_dependencies.go`

```go
package shard_dependencies

import "math"
import "os"
import "strconv"
import "strings"

type JSNull struct{}

func (_ JSNull) MarshalJSON() ([]byte, error) {
	return ([]byte)("null"), nil
}

type JSUndefined struct{}

func (_ JSUndefined) MarshalJSON() ([]byte, error) {
	return ([]byte)("null"), nil
}

func (_ JSUndefined) IsZero() bool {
	return true
}

type JSEntry struct {
	Key   string
	Value any
}

type JSObject interface {
	JSEntries() []JSEntry
}

const eitherKindPrefix = "@duplojs/lang/kind/@DuplojsLangEither/"

type Either[R any] struct {
	right R
	left  any
}

func EitherSuccessOf[R any](value R) Either[R] {
	return Either[R]{right: value}
}

func EitherIsRight[R any](input Either[R]) bool {
	return input.left == nil
}

func (either Either[R]) JSEntries() []JSEntry {
	if either.left == nil {
		return []JSEntry{
			JSEntry{Key: eitherKindPrefix + "right", Value: JSNull{}},
			JSEntry{Key: eitherKindPrefix + "information", Value: "success"},
			JSEntry{Key: eitherKindPrefix + "value", Value: either.right},
			JSEntry{Key: eitherKindPrefix + "success", Value: JSNull{}},
		}
	}
	return []JSEntry{
		JSEntry{Key: eitherKindPrefix + "left", Value: JSNull{}},
		JSEntry{Key: eitherKindPrefix + "information", Value: "fail"},
		JSEntry{Key: eitherKindPrefix + "value", Value: either.left},
		JSEntry{Key: eitherKindPrefix + "fail", Value: JSNull{}},
	}
}

const inspectDepth = 2

const inspectBreakLength = 80

const inspectCompact = 3

const inspectMinLineLength = 16

type inspectContext struct {
	indentationLvl int
	currentDepth   int
}

func Print[T any](value T) T {
	os.Stdout.WriteString(FormatConsole(value) + "\n")
	return value
}

func FormatConsole(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	}
	context := &inspectContext{}
	return context.formatValue(value, 0)
}

func (context *inspectContext) formatValue(value any, recurseTimes int) string {
	switch typed := value.(type) {
	case float64:
		if typed == 0 && math.Signbit(typed) {
			return "-0"
		}
		return JSNumberToString(typed)
	case string:
		return context.formatString(typed)
	case bool:
		if typed {
			return "true"
		}
		return "false"
	case JSNull:
		return "null"
	case JSUndefined:
		return "undefined"
	case JSObject:
		return context.formatObject(typed.JSEntries(), recurseTimes)
	}
	panic("print: valeur sans représentation d'affichage")
}

func (context *inspectContext) formatObject(entries []JSEntry, recurseTimes int) string {
	if len(entries) == 0 {
		return "{}"
	}
	if recurseTimes > inspectDepth {
		return "[Object]"
	}
	recurseTimes += 1
	context.currentDepth = recurseTimes
	output := make([]string, 0, len(entries))
	for _, entry := range entries {
		context.indentationLvl += 2
		formatted := context.formatValue(entry.Value, recurseTimes)
		context.indentationLvl -= 2
		output = append(output, formatKey(entry.Key)+": "+formatted)
	}
	return context.reduceToSingleString(output, "{", "}", recurseTimes)
}

func (context *inspectContext) reduceToSingleString(output []string, open string, close string, recurseTimes int) string {
	if context.currentDepth-recurseTimes < inspectCompact {
		start := len(output) + context.indentationLvl + len(open) + 10
		if isBelowBreakLength(output, start) {
			joined := strings.Join(output, ", ")
			if !strings.Contains(joined, "\n") {
				return open + " " + joined + " " + close
			}
		}
	}
	indentation := "\n" + strings.Repeat(" ", context.indentationLvl)
	return open + indentation + "  " + strings.Join(output, ","+indentation+"  ") + indentation + close
}

func isBelowBreakLength(output []string, start int) bool {
	totalLength := len(output) + start
	if totalLength+len(output) > inspectBreakLength {
		return false
	}
	for _, entry := range output {
		totalLength += utf16Length(entry)
		if totalLength > inspectBreakLength {
			return false
		}
	}
	return true
}

func (context *inspectContext) formatString(value string) string {
	length := utf16Length(value)
	if length > inspectMinLineLength && length > inspectBreakLength-context.indentationLvl-4 {
		lines := strings.SplitAfter(value, "\n")
		if lines[len(lines)-1] == "" {
			lines = lines[:len(lines)-1]
		}
		escaped := make([]string, 0, len(lines))
		for _, line := range lines {
			escaped = append(escaped, quoteJSString(line))
		}
		return strings.Join(escaped, " +\n"+strings.Repeat(" ", context.indentationLvl+2))
	}
	return quoteJSString(value)
}

func formatKey(key string) string {
	if isIdentifierKey(key) {
		return key
	}
	return quoteJSString(key)
}

func isIdentifierKey(key string) bool {
	if key == "" {
		return false
	}
	for index := 0; index < len(key); index += 1 {
		character := key[index]
		isLetter := (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z') || character == '_'
		isDigit := character >= '0' && character <= '9'
		if !isLetter && !(isDigit && index > 0) {
			return false
		}
	}
	return true
}

func quoteJSString(value string) string {
	quote := "'"
	if strings.Contains(value, "'") {
		if !strings.Contains(value, "\"") {
			quote = "\""
		} else if !strings.Contains(value, "`") && !strings.Contains(value, "${") {
			quote = "`"
		}
	}
	builder := strings.Builder{}
	builder.WriteString(quote)
	for _, character := range value {
		switch {
		case character == '\'' && quote == "'":
			builder.WriteString("\\'")
		case character == '\\':
			builder.WriteString("\\\\")
		case character == '\b':
			builder.WriteString("\\b")
		case character == '\t':
			builder.WriteString("\\t")
		case character == '\n':
			builder.WriteString("\\n")
		case character == '\f':
			builder.WriteString("\\f")
		case character == '\r':
			builder.WriteString("\\r")
		case character < 0x20 || (character >= 0x7f && character <= 0x9f):
			hexadecimal := strings.ToUpper(strconv.FormatInt(int64(character), 16))
			if len(hexadecimal) < 2 {
				hexadecimal = "0" + hexadecimal
			}
			builder.WriteString("\\x" + hexadecimal)
		default:
			builder.WriteRune(character)
		}
	}
	builder.WriteString(quote)
	return builder.String()
}

func JSNumberToString(value float64) string {
	if math.IsNaN(value) {
		return "NaN"
	}
	if math.IsInf(value, 1) {
		return "Infinity"
	}
	if math.IsInf(value, -1) {
		return "-Infinity"
	}
	if value == 0 {
		return "0"
	}
	absolute := math.Abs(value)
	if absolute >= 1e-6 && absolute < 1e21 {
		return strconv.FormatFloat(value, 'f', -1, 64)
	}
	scientific := strconv.FormatFloat(value, 'e', -1, 64)
	exponentIndex := strings.IndexByte(scientific, 'e')
	exponent := scientific[exponentIndex+2:]
	for len(exponent) > 1 && exponent[0] == '0' {
		exponent = exponent[1:]
	}
	return scientific[:exponentIndex+2] + exponent
}

func utf16Length(value string) int {
	length := 0
	for _, character := range value {
		length += 1
		if character > 0xffff {
			length += 1
		}
	}
	return length
}
```

Sortie attendue (stdout, 233 octets) :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
```

Le fichier partagé est écrit sans construction absente de l'AST Go (note 03 §18) : pas de déclaration courte multiple, pas de `i++`, pas de déclaration groupée, pas de chaîne brute, pas de résultat nommé. [HYPOTHÈSE] Que chaque instruction se construise avec les factories de `GoAST` et se rende correctement n'a pas été exécuté ; c'est établi par l'inventaire des nœuds, pas par un rendu.

## 9. Plan d'implémentation

### 9.1 Fichiers à créer

| Fichier | Rôle |
|---|---|
| `src/transpiler/sharedDependency/jsObject.ts` | `jsObjectDependency` (memo) : `JSEntry`, `JSObject`. Pas dans les défauts ; enregistrée par ceux qui s'en servent |
| `src/transpiler/transformers/duplojs/sharedDependencyCall.ts` | `sharedDependencyCallHandler(node, dependencies, functionIdentifier, context)` : refuse un argument étalé, transforme les arguments comme `shared/call.ts` (préparations puis temporaire, dans l'ordre), enregistre les dépendances après la réussite des enfants, rend l'appel `shard_dependencies.F(tmp…)` |
| `src/transpiler/transformers/duplojs/either/sharedDependency.ts` | `eitherTypeIdentifier`, `eitherDependency` (memo) : constante du préfixe de kind, type `Either[R]`, méthode `JSEntries`. Les clés de kind vivent ici et nulle part ailleurs |
| `src/transpiler/transformers/duplojs/either/isRight/index.ts` | `isRightExpressionHandler` |
| `src/transpiler/transformers/duplojs/either/isRight/sharedDependency.ts` | `eitherIsRightDependency` (memo) : `EitherIsRight` |
| `src/transpiler/transformers/duplojs/either/unionType.ts` | Routeur `duploJSEitherUnionTypeTransformer` : accepte un `UnionTypeNode` dont chaque membre est une référence résolue dans `@duplojs/lang`, `dist/either/` ; sinon `notSupport` |
| `src/transpiler/transformers/duplojs/either/union/index.ts` | `eitherUnionTypeHandler` : classe les membres (`Success` à droite, `Fail` à gauche) ; exactement un membre Right, le délègue au routeur de type Either et rend son résultat ; sinon les erreurs du §7.6 |
| `src/transpiler/transformers/duplojs/common/index.ts` | Routeur `duploJSCommonCallTransformer`, typé `Transformer<GoAST.CallExpression>`, exposé dans les listes d'expressions et d'instructions : déballe un `ExpressionStatement`, résout dans `dist/common/`, route `print` |
| `src/transpiler/transformers/duplojs/common/print/index.ts` | `printExpressionHandler` : exactement un argument, sinon `print-params-not-supported` |
| `src/transpiler/transformers/duplojs/common/print/sharedDependency.ts` | `printDependency` (memo) : imports `math`, `os`, `strconv`, `strings` ; `Print`, `FormatConsole`, le formateur, `JSNumberToString` |
| `src/transpiler/transformers/type/parenthesized.ts` | `parenthesizedTypeTransformer` : délègue le type intérieur à `typeTransformers` |
| `src/transpiler/transformers/statement/variable.ts` | `variableStatementTransformer` (§6 et §7.1) : ajoute `var` à `context.file.declarations` après la réussite des enfants, rend l'affectation |
| `src/transpiler/transformers/statement/if.ts` | `ifStatementTransformer` (§7.2) : condition par `expressionTransformers`, corps par `blockStatementTransformer` |

### 9.2 Lignes d'origine à modifier

Aucune autre ligne d'un fichier d'origine n'est touchée.

| Fichier | Lignes | Modification | Justification |
|---|---|---|---|
| `transformers/statement/index.ts` | après 7 ; après 14 | 2 imports ; 2 entrées de liste (`variableStatementTransformer`, `ifStatementTransformer`) | Inscription des deux nouveaux transformers d'instruction |
| `transformers/type/index.ts` | après 6 ; après 12 | 1 import ; 1 entrée (`parenthesizedTypeTransformer`) | Le retour de `add` est un type parenthésé |
| `transformers/duplojs/index.ts` | après 2 ; 10 ; 13 ; 16 | 2 imports ; ajout de `duploJSCommonCallTransformer` aux expressions (10) et aux instructions (13) ; ajout de `duploJSEitherUnionTypeTransformer` aux types (16) | Inscription du domaine `common` et du routeur d'union |
| `transformers/duplojs/either/index.ts` | après 7 ; entre 43 et 44 | 1 import ; une branche `DPattern.match(DCommon.equal("isRight"), …)` | Le routeur est le seul point d'entrée du domaine ; `isRight` doit y être routé |
| `transformers/duplojs/either/success/index.ts` | 8 ; 10 ; 16 à 27 ; 53 et 54 | Retrait de l'import de `callExpressionTransformer` ; nouveaux imports ; corps de `successExpressionHandler` (appel direct par `sharedDependencyCallHandler`, référence nue refusée) ; `successTypeHandler` rend `Either[T]` | C'est la cause de l'échec de l'exercice 00, et l'exercice 01 passe par ce handler |
| `transformers/duplojs/either/success/sharedDependency.ts` | 6 ; 8 à 101 | Retrait de `successTypeIdentifier` ; la dépendance ne déclare plus que `EitherSuccessOf[R any](value R) Either[R]` | L'alias `EitherSuccess[T]` vers une struct anonyme est la représentation remplacée |

Alternatives purement additives, non recommandées :

- pour `success/sharedDependency.ts` : créer un fichier voisin et laisser l'ancien sans appelant. Il resterait du code mort, que `hackathon.md` demande de supprimer ;
- pour `either/index.ts` : un second routeur d'expression Either dans un nouveau fichier. Il doublerait la résolution de chaque référence et contredirait « un routeur est le seul point d'entrée ».

### 9.3 Étapes et critères

Les cas d'essai sont de petits projets jetables sous `hackathon-tools/verify/out/cases/<nom>/` (`tsconfig.json` identique à ceux de `projects/`, `index.ts`, fichiers voisins), construits avec `pnpm build --tsconfig … --input … --output …`, puis `go build ./... && go vet ./...` dans l'image `golang:1.27`. Après chaque étape : `pnpm test:types` et `pnpm test:lint` passent.

| Étape | Contenu | Critère de vérification |
|---|---|---|
| 1 | `jsObject.ts`, `either/sharedDependency.ts`, `sharedDependencyCall.ts`, réécriture de `success/` | `hackathon-tools/verify/verify.sh 00` va au bout : compilation, `go vet`, `IDENTIQUE : 0 lignes`. Aujourd'hui il échoue à l'étape 3 |
| 2 | `type/parenthesized.ts`, `either/unionType.ts`, `either/union/index.ts`, inscriptions | Cas `union-return` (le `add.ts` de l'exercice 01, `index.ts` réduit à `add(1, 2);`) : le Go compile, la signature est `(shard_dependencies.Either[float64])`. Même résultat avec les membres dans l'ordre inverse et sans annotation de retour |
| 3 | `statement/variable.ts`, inscription | Cas `top-level-const` (`const result = add(1, 2);` seul) : le Go compile et passe `go vet` alors que la constante n'est pas lue ; `index.ts.go` contient la variable de package et l'affectation dans `init()` |
| 4 | `either/isRight/`, `statement/if.ts`, inscriptions | Cas `if-is-right` (`if (DEither.isRight(result)) { add(3, 4); }`) : le Go compile ; la condition est `shard_dependencies.EitherIsRight(…)` |
| 5 | `common/`, inscriptions | `hackathon-tools/verify/verify.sh 01` : `IDENTIQUE : 6 lignes`. Puis `hackathon-tools/verify/out/design-01/inspect-stage01/run.sh projects/01/dist/shard_dependencies/shard_dependencies.go` : `IDENTIQUE : 243 lignes` |
| 6 | Refus | Chaque entrée du §10.2 produit l'erreur indiquée, sans fichier Go écrit |
| 7 | README de `projects/01` | Problème, stratégie, mesures, limites, selon le README racine. Hors de ce document |

L'étape 5 est la plus lourde : environ 210 lignes de Go à exprimer en nœuds `GoAST`. Le texte Go de référence est celui du §8 ; `run.sh` dit si le rendu est fidèle.

## 10. Cas limites et exemples

### 10.1 Entrée → attendu, à l'exécution

| Entrée TypeScript | Sortie attendue |
|---|---|
| Exercice 01 tel quel | Les 6 lignes du §8 |
| Exercice 00 tel quel | Aucune sortie, code 0 |
| `add` annoté `DEither.Fail \| DEither.Success<number>` (ordre inverse) | Les 6 mêmes lignes |
| `add` sans annotation de retour | Les 6 mêmes lignes |
| `import { success, isRight, type Success, type Fail } from "@duplojs/lang/either"` et `import { print } from "@duplojs/lang/common"` | Les 6 mêmes lignes |
| `const shown = DCommon.print(result);` suivi de `DCommon.print(shown);` | Les 6 lignes deux fois |
| `if (DEither.isRight(add(1, 2))) { DCommon.print(result); }` | Les 6 mêmes lignes |
| `DCommon.print(DEither.success(DEither.success(1)));` | L'Either extérieur sur 11 lignes, l'intérieur indenté de 2 espaces de plus (valeur de référence dans `inspect-stage01/corpus.node.txt`) |
| `const unused = add(1, 2);` ajouté à l'exercice | Compile, sortie inchangée |
| Deux `print` de suite | Deux blocs, dans l'ordre |

Bornes de la règle « une ligne ou plusieurs », valeurs de référence produites par Node dans `inspect-stage01/corpus.node.txt` et rejouées par `run.sh` :

| Valeur | Attendu |
|---|---|
| `{ a: 1, b: 'x' × 56 }` | une ligne |
| `{ a: 1, b: 'x' × 57 }` | plusieurs lignes |
| `{ a: 1, b: 'é' × 56 }` | une ligne (112 octets en UTF-8 : la longueur se compte en unités UTF-16) |
| `{ a: 1, b: 'é' × 57 }` | plusieurs lignes |
| `{ a: 1, b: '😀' × 28 }` | une ligne (un caractère hors plan de base compte pour 2) |
| `{ a: 1, b: '😀' × 29 }` | plusieurs lignes |
| trois clés de 10 lettres, valeurs de 9 chiffres | une ligne |
| les mêmes, dernière valeur de 10 chiffres | plusieurs lignes |
| `{ k: { a: 1, b: 'x' × 54 } }` | objet intérieur sur une ligne (l'indentation de 2 abaisse le seuil) |
| `{ k: { a: 1, b: 'x' × 55 } }` | objet intérieur sur plusieurs lignes |
| `{ a: { b: { c: { d: 1 } } } }` | `{ a: { b: { c: [Object] } } }` sur une ligne (profondeur 2 dépassée) |
| `{ a: { b: { c: {} } } }` | `{ a: { b: { c: {} } } }` : un objet vide s'écrit `{}` même au-delà de la profondeur |

### 10.2 Entrée → erreur attendue à la transpilation

| Entrée | Erreur |
|---|---|
| `let count = add(1, 2);` | `transformation-error`, `variable-statement-let` |
| `const one = 1, two = 2;` | `variable-statement-multiple-declarations` |
| `function f() { const x = add(1, 2); return x; }` | `variable-statement-outside-top-level` |
| `if (DEither.isRight(result)) { … } else { … }` | `if-else-not-supported` |
| `if (DEither.isRight(result)) DCommon.print(result);` | `if-body-not-block` |
| `const n = 1; if (n) { … }` | `if-condition-not-boolean` |
| `DCommon.print(result, "error");` | `print-params-not-supported` |
| `const show = DCommon.print;` | `common-print-reference` |
| `DEither.success(1);` en instruction isolée | `either-success-reference` |
| retour annoté `DEither.Fail` | `notfound-transformer` (le routeur de type Either refuse `Fail` seul) |
| retour annoté `DEither.Success<number> \| DEither.Left<"x", number>` | `either-union-member-not-supported` |
| `if (DEither.isLeft(result)) { … }` | `transformation-error` du routeur Either |

## 11. Constats hors périmètre

Signalés, à ne pas corriger dans cet exercice.

- `build.ts` concatène les imports des dépendances partagées sans dédoublonner. Tant que `printDependency` est seule à importer la bibliothèque standard, rien ne casse ; dès qu'une seconde dépendance importera `strings` ou `math` (exercice 05, `DString.to`), le fichier partagé ne compilera plus.
- `expression/binary.ts` range les deux opérandes de `&&` et `||` dans des temporaires : le court-circuit est perdu (exercice 06).
- `declaration/function.ts` ignore sans erreur `async`, les génériques et les paramètres optionnels, par défaut et rest.
- `statement/block.ts` et `shared/call.ts` transforment leurs enfants en parallèle : la numérotation `Generated_N` peut varier d'un build à l'autre.
- Les défauts `JSNull` et `JSUndefined` portent des méthodes `MarshalJSON` et `IsZero` que rien n'appelle.

## 12. Bilan

### Vérifié par exécution

- Le Go attendu de l'exercice 01 compile, passe `go vet` et rend la sortie de référence octet pour octet ; la même représentation compile pour l'exercice 00.
- Le format d'affichage : source de Node lu dans le binaire installé ; portage complet identique à Node sur 103 valeurs ; version livrée identique sur 67 valeurs.
- Les mesures du §3.3, du §4 et du §6.
- Les appels du checker dont le plan dépend (§2).

### Hypothèses

- Le fichier partagé du §8 est exprimable en `GoAST` et rendu correctement par le printer.
- L'explication du saut de performance entre dispositions de struct.
- Les mesures valent pour `linux/arm64` dans Docker ; aucune mesure sur une autre architecture.
- `export const` lu depuis un autre fichier.
- Les prolongements aux exercices 04 à 10 (type Right attendu par les constructeurs de Left, `meta`, fonctions génériques `rightPipe` et `group`) sont raisonnés, pas exécutés.
- La largeur d'affichage des caractères pleine largeur dans les tableaux de plus de 6 éléments.

### Décisions qui reviennent à l'utilisateur

1. Retenir l'option A, avec son coût : une allocation par Left portant une valeur, et le type des valeurs Left non vérifié par Go.
2. Forme d'appel : inférence Go (recommandé, s'écarte de la forme montrée dans le README de l'exercice 00) ou référence instanciée dans un temporaire.
3. `success/sharedDependency.ts` : réécrire sur place (recommandé) ou ajouter un fichier et laisser l'ancien sans appelant.
4. `either/index.ts` : insérer la branche `isRight` (recommandé) ou créer un second routeur.
5. Le formateur d'affichage en nœuds `GoAST` (additif, conforme au contrat `SharedDependency`, mais long) ou en fichier Go écrit à la main et copié dans la sortie, ce qui demanderait de modifier `build.ts`.
6. Périmètre des refus : `else`, corps sans accolades et constante locale sont refusés avec une erreur faute d'exercice qui les demande. Ils sont peu coûteux à ajouter si on préfère les avoir tout de suite.
7. Sortie standard sans tampon (fidèle en cas d'arrêt brutal, un appel système par `print`).
