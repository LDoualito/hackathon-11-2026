# 02 — `@duplojs/lang` : tous les domaines sauf `either`

> Notes de recherche (lecture seule) pour le transpileur TypeScript/DuploJS → Go.
> Source étudiée : monorepo `duplojs/ecosystem`, package `packages/lang`, HEAD `5c5ca34` (2026-11-14).
> Les chemins sont relatifs à la racine de ce monorepo (`packages/lang/scripts/...`).
> Le domaine `either` est traité dans une autre note ; il n'apparaît ici que lorsqu'il conditionne un autre domaine (clés de kind, affichage par `print`).

## 0. Légende et méthode

- **[VÉRIFIÉ]** : lu dans le code source, ou exécuté avec Node v24.14.1 sur des valeurs reconstruites à la main (aucune installation, aucun build).
- **[HYPOTHÈSE]** : inféré (intention de conception, comportement Go non exécuté — Go n'est pas installé sur la machine de recherche —, algorithme interne de `util.inspect` cité de mémoire).
- Chaque entrée suit le gabarit **Fait / Pourquoi / Conséquence transpileur / Cas à anticiper**.
- Limites de la recherche : le code source ne contient presque aucune JSDoc (elle est générée ailleurs) ; les messages de commit sont laconiques (`fix:lang(hf): when`). Le « pourquoi » vient donc surtout de `packages/agents-kit/docs/concepts/**` et des commentaires en ligne. Les domaines `chrono`, `dataStructure`, `invocation`, `modeling`, `path` ont été lus par échantillonnage (fichiers pivots), pas fichier par fichier.
- Les inventaires de la section 9 sont générés par script : description issue de `packages/agents-kit/docs/API/10-lang/*/index.llms.md`, forme d'appel détectée dans l'implémentation (présence de `args.length === N`).

---

# 1. Conventions transversales

## 1.1 Points d'entrée du package et namespaces `D*`

**Fait [VÉRIFIÉ]** — `packages/lang/package.json` déclare 17 exports : `.` et un sous-chemin par domaine (`./common`, `./kind`, `./object`, `./string`, `./either`, `./dataStructure`, `./array`, `./chrono`, `./tuple`, `./number`, `./modeling`, `./pattern`, `./generator`, `./invocation`, `./path`, `./printer`), chacun en `import` (`.mjs`), `require` (`.cjs`) et `types` (`.d.ts`). `"sideEffects": false`, `"type": "module"`, `engines.node >= 24.18.0`.
L'entrée racine `packages/lang/scripts/index.ts` ré-exporte **tout `common` à plat** (`export * from "./common"`) puis chaque domaine sous un namespace long et, pour la plupart, un alias court :

| Namespace long | Alias court | Sous-chemin |
|---|---|---|
| `DCommon` (+ export à plat) | — | `@duplojs/lang/common` |
| `DKind` | — | `@duplojs/lang/kind` |
| `DObject` | `O` | `@duplojs/lang/object` |
| `DString` | `S` | `@duplojs/lang/string` |
| `DEither` | `E` | `@duplojs/lang/either` |
| `DDataStructure` | `DS` | `@duplojs/lang/dataStructure` |
| `DArray` | `A` | `@duplojs/lang/array` |
| `DChrono` | `C` | `@duplojs/lang/chrono` |
| `DTuple` | `T` | `@duplojs/lang/tuple` |
| `DNumber` | `N` | `@duplojs/lang/number` |
| `DModeling` | `M` | `@duplojs/lang/modeling` |
| `DPattern` | `P` | `@duplojs/lang/pattern` |
| `DGenerator` | `G` | `@duplojs/lang/generator` |
| `DInvocation` | `I` | `@duplojs/lang/invocation` |
| `DPath` | — | `@duplojs/lang/path` |
| `DPrinter` | — | `@duplojs/lang/printer` |

**Pourquoi** — La doc agents-kit et les exercices importent toujours `import * as DArray from "@duplojs/lang/array"` : le préfixe `D` évite la collision avec les globaux (`Array`, `String`, `Number`, `Object`) et le sous-chemin permet le tree-shaking (`sideEffects: false`). [HYPOTHÈSE pour l'intention, VÉRIFIÉ pour la forme]

**Conséquence transpileur** — Une même fonction a jusqu'à quatre écritures sources : `DArray.map` (namespace import d'un sous-chemin), `A.map` ou `DArray.map` importés depuis la racine, `map` importé nommément depuis `@duplojs/lang/array`, et pour `common` uniquement `pipe` importé à plat depuis `@duplojs/lang`. La résolution doit donc partir du **symbole résolu** (fichier de déclaration + nom exporté), jamais du texte `DArray.map`.

**Cas à anticiper** — alias local (`import * as Arr from …`), import nommé avec renommage (`import { map as arrayMap }`), `E`/`A`/`S` depuis la racine, ré-export par un module utilisateur, homonymes entre domaines (`map` existe dans `array`, `tuple`, `generator` ; `sort` dans `array`, `string`, `number` ; `at`, `first`, `last`, `includes`, `indexOf`, `slice`, `concat`, `prepend`, `pop`, `shift`, `length`, `lengthEqual` dans `array` et `string` ; `loop`/`loopAccumulator` dans `common` et `generator` ; `when`/`whenNot` dans `common` et `pattern` ; `is` dans `array`, `object`, `path` ; `to` dans `string` et `object`).

## 1.2 Forme data-first et forme curifiée (data-last) : comment le runtime tranche

**Fait [VÉRIFIÉ]** — Presque toutes les fonctions « à paramètres » sont écrites ainsi (exemple `packages/lang/scripts/array/map.ts` L44-66) :

```ts
export function map(...args: [theFunction] | [array, theFunction]): any {
	if (args.length === 1) {
		const [theFunction] = args;
		return (array) => map(array, theFunction);
	}
	const [array, theFunction] = args;
	return array.map((element, index) => theFunction(element, { index, self: array }));
}
```

- Le discriminant est **le nombre exact d'arguments** : `args.length === N` où N est l'arité de la forme curifiée. 187 fichiers hors `either` utilisent ce test.
- La forme curifiée renvoie toujours une fonction **unaire** `(input) => f(input, ...config)` qui rappelle la forme data-first.
- N vaut 1 pour la majorité, 2 pour les fonctions à deux paramètres de configuration (`reduce`, `reduceRight`, `findAndReplace`, `set`, `splice*`, `findAndSplice*`, `padStart`, `padEnd`, `replace`, `replaceAll`, `slice` de string, `when`, `whenNot`, `betweenThan*`, `transformProperty`, `discriminate`, `matchWithStringOtherwise`…), 3 pour `whenElse` et `DArray.fill`.
- **Exceptions où le discriminant est le type du premier argument** (parce que des paramètres optionnels rendent le comptage ambigu) :
  - `DArray.slice` et `DArray.copyWithin` : `!Array.isArray(args[0])` → forme curifiée (`array/slice.ts` L23, `array/copyWithin.ts` L33).
  - `DString.substring` : `typeof args[0] === "number"` → forme curifiée (`string/substring.ts` L34).
  - `DChrono.closestTo` : `typeof args[0] === "string" || args[0] instanceof TheDate` (`chrono/closestTo.ts` L31).
  - `DPrinter.renderParagraph` : `!DArray.is(values)` sur le premier argument (`printer/renderParagraph.ts`).
- **Trois arités** pour `DPattern.match` (`pattern/match/index.ts`) : 1 argument → builder chaîné, 2 → curifiée, 3 → data-first.
- Fonctions à **forme unique** (pas de curry, car déjà unaires ou sans donnée) : `coalescing`, `first`, `last`, `length`, `pop`, `shift`, `reverse`, `flat`, `from`, `is`, `findDuplicates`, `DString.to`, `trim*`, `toLowerCase`, `toUpperCase`, `capitalize`, `isNotEmpty`, `DNumber.sum/min/max/isEven…`, `DObject.keys/entries/values`, `pipe`, `print`, `forward`, `memo`, `promiseAll`, `cast`.
- Formes data-first **variadiques ou à paramètre optionnel** tout en gardant un curry à 1 argument : `push`, `unshift`, `concat`, `prepend` (array et string), `indexOf`/`lastIndexOf` (3ᵉ argument optionnel), `DString.split` (params optionnels), `DGenerator.concat`, `DPath.concatSegment`. Pour elles, « 1 argument = curry, 2 ou plus = data-first ».
- `DArray.insert` a un ordre inversé : data-first `insert(value, array)`, curifiée `insert(array)(value)` (`array/insert.ts` L34-51) — la « donnée » pipée est l'élément, pas le tableau.

**Pourquoi** — `packages/agents-kit/docs/concepts/01-fundamental/02-currying/01-use.ts` : « La forme curifiée reçoit les paramètres, puis la donnée transmise par pipe. » et « Les fonctions n'ont pas besoin d'être curifiées lorsqu'elles reçoivent déjà la donnée comme unique argument » (`10-built-in-function.ts`). Les surcharges TypeScript portent le typage ; l'implémentation unique `...args` évite de publier deux fonctions par opération.

**Conséquence transpileur** — La forme est décidable **statiquement** : compter les arguments de l'appel (attention aux spreads) et consulter une table « arité curifiée par fonction ». Mieux : demander au checker TypeScript **quelle surcharge a été résolue** (`getResolvedSignature`) — si le type de retour est une fonction `(input) => …`, c'est la forme curifiée. En Go, générer deux fonctions distinctes par opération (`ArrayMap(arr, f)` et `ArrayMapCurried(f) func(arr)`), ou n'émettre que la data-first et envelopper la curifiée dans une closure au point d'appel.

**Cas à anticiper**
- Appel avec spread (`DArray.push(...args)`) : arité inconnue statiquement → refuser ou générer un dispatch runtime.
- Fonction passée **par référence** là où un callback reçoit plusieurs arguments : `DArray.map(xs, DString.at)` appellerait `at(element, {index,self})` → 2 arguments → branche data-first avec un « index » objet. Les callbacks de `DArray.map` reçoivent **toujours 2 arguments** (§2.9) ; seules les fonctions à forme unique (`DString.to`, `DString.trim`, `DArray.coalescing`…) ou les fonctions déjà curifiées (qui ignorent le 2ᵉ argument) sont sûres. Le transpileur doit adapter la signature Go du callback au cas par cas.
- `undefined` passé explicitement compte dans `args.length` : `DArray.at(undefined)` est vu comme curry.
- Référence non appelée à une fonction surchargée (`const f = DArray.map`) : le type Go dépend de l'usage ultérieur.
- Application partielle stockée dans une variable puis réutilisée (`const toStrings = DArray.map(DString.to)`).

## 1.3 `pipe`-first : la donnée d'abord, les étapes ensuite

**Fait [VÉRIFIÉ]** — Toute la bibliothèque est pensée pour `DCommon.pipe(donnée, étape1, étape2…)` où chaque étape est une fonction unaire (forme curifiée ou fonction à forme unique). Variantes : `innerPipe(...étapes)` renvoie la fonction composée (`common/innerPipe.ts` L305-315), `preparePipe<T>()` renvoie un constructeur d'innerPipe typé (`common/preparePipe.ts` L308-322), `asyncPipe`/`asyncInnerPipe`/`prepareAsyncPipe` pour l'asynchrone, `pipeCall(cb)` enveloppe un callback pour fixer l'inférence, et les pipes spécialisés `DEither.rightPipe`/`rightAsyncPipe`.

**Pourquoi** — `02-currying/01-use.ts` : « Privilégier pipe dès qu'une donnée subit plusieurs transformations », « On peut ajouter, retirer ou réordonner les étapes sans restructurer le traitement ». L'inférence TypeScript va de gauche à droite : placer la donnée en premier permet de typer les callbacks des étapes suivantes.

**Conséquence transpileur** — Un pipe est une **séquence d'affectations** : `acc0 := input; acc1 := step1(acc0); …`. Go n'ayant pas de génériques variadiques hétérogènes, ne pas chercher une fonction `Pipe` générique : dérouler le pipe à la compilation (c'est d'ailleurs la stratégie « préparer un appel » décrite dans `projects/00/README.md` du dépôt hackathon). Le type de chaque `accN` vient du checker.

**Cas à anticiper** — pipe à 1 étape, pipe imbriqué dans un argument, `innerPipe` passé comme callback de `map`, étape qui est une référence de fonction utilisateur, étape lambda en ligne, étape qui renvoie une fonction, pipe dont le résultat est ignoré (effet de bord `print`), plus de 15 étapes (erreur de type côté TS, donc hors périmètre).

## 1.4 Immutabilité

**Fait [VÉRIFIÉ]** — Aucune fonction ne mute son entrée ; les opérations qui muteraient en JS natif copient d'abord :
- `sort` → `array.slice().sort(cmp)` (`array/sort.ts` L50) ; `reverse` → `slice().reverse()` ; `fill`, `copyWithin`, `splice*` → `slice()` puis mutation de la copie ; `push` → `slice()` + `push` (`array/push.ts` L69-75) ; `set` → `array.with(i, v)` (`array/set.ts` L42) ; `pop`/`shift` renvoient `slice(0,-1)`/`slice(1)` (le **tableau restant**, pas l'élément retiré).
- Objets : `assign`, `override`, `transformProperty`… reconstruisent par spread (`object/assign.ts` L21+).
- Kinds : `addTo` renvoie `{...input, [key]: value}` ; `setTo`, la variante mutante, est marquée `@deprecated This method make mutation.` (`kind/base.ts` L42-44, L111-127).
- Dates : `TheDate` étend `Date` mais redéfinit tous les setters en no-op avec `@deprecated this method does not work on ImmutableDate` (`chrono/theDate.ts`).
- Types : les sorties sont `readonly T[]` ; les entrées acceptent `readonly unknown[]`.
- Il n'y a **pas** de `Object.freeze` : l'immutabilité est une discipline de types et d'implémentation, pas une garantie runtime. Les copies sont **superficielles** (les éléments sont partagés).
- Certaines fonctions renvoient **la même référence** : `coalescing` sur un tableau, `forward`, `cast`, `DTuple.from`, `tap`, `print`.

**Pourquoi** — Description du package (`package.json`) : « Type-driven language layer for TypeScript: immutable, pipeable functions, Either, and constrained primitives. »

**Conséquence transpileur** — En Go, les slices sont des vues mutables partageant leur tableau sous-jacent. Toute traduction de `push`, `concat`, `set`, `sort`, `slice`… doit **allouer** (`slices.Clone`, `append([]T(nil), …)` ou `append(s[:len(s):len(s)], v)`), jamais `append(s, v)` nu (aliasing si `cap > len`). Tant que le code source ne mute pas (pas d'affectation indexée), partager la référence pour `coalescing`/`forward` est sans danger.

**Cas à anticiper** — code utilisateur qui mute malgré tout (`arr[0] = x`, `arr.push`) après un `coalescing` : l'aliasing JS (même référence) devrait alors être reproduit ; `sort` stable (JS garantit la stabilité → `slices.SortStableFunc`) ; `slice` avec indices négatifs ; identité de référence comparée avec `===` entre entrée et sortie.

## 1.5 Système de `kind` : clés textuelles préfixées

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/kind/base.ts` :
- Préfixe : `keyKindPrefix = "@duplojs/lang/kind/"` (L82). `create(name)` produit `runTimeKey = prefix + name` (L103).
- `createNamespace(ns)(name)` appelle `create("@" + ns + "/" + name)` (`kind/namespace.ts` L27). La clé runtime complète est donc **`@duplojs/lang/kind/@<Namespace>/<name>`**, par exemple `@duplojs/lang/kind/@DuplojsLangEither/right`.
- Namespaces existants : `DuplojsLangCommon`, `DuplojsLangArray`, `DuplojsLangGenerator`, `DuplojsLangEither`, `DuplojsLangChrono`, `DuplojsLangPath`, `DuplojsLangModeling`, `DuplojsLangDataStructure`, `DuplojsLangPattern`, `DuplojsLangInvocation` (fichiers `*/kind.ts`).
- Un `Handler` expose : `runTimeKey`, `has(input)` = `Boolean(input && typeof input === "object" && runTimeKey in input)` (L128-134, opérateur `in` → chaîne de prototypes incluse, **la valeur n'est pas inspectée**), `addTo(input, value)` (copie + clé), `setTo` (mutation, déprécié), `getValue(input)` = `input[runTimeKey]`.
- Les clés sont des **propriétés string ordinaires, énumérables** : elles apparaissent dans `console.log`, `JSON.stringify`, `Object.keys`, le spread. Côté types, elles sont cachées derrière un `unique symbol` (`KeySymbol`, L70-80).
- `isRuntimeKey(key)` = `key.startsWith(prefix)` (L141-143) ; `DObject.keys/entries/values/countKeys` filtrent ces clés (`object/keys.ts`, `object/entries.ts` L36+).
- `DKind.has(input, [k1,k2])` = tous présents ; `DKind.hasSome` = au moins un ; `createKindIdentifier` = prédicat multi-kinds ; `parentClass(kind, Parent?)` fabrique une classe dont le constructeur pose la clé et dont `Symbol.hasInstance` teste le kind (`kind/parentClass.ts` L57-78) — utilisé par `DuploJSError` et `TheDate`.
- Kinds « à valeur » servant d'enveloppe de typage : `reduceFrom(v)` = `{ [reduceKind.runTimeKey]: v }` (`array/reduce.ts` L55-61), `loopAccumulatorFrom`, `DPattern.result`.

**Pourquoi** — `packages/agents-kit/docs/concepts/01-fundamental/08-kind/01-identity.md` : les kinds permettent d'être « reconnus et distingués malgré le typage structurel de TypeScript » ; « clés textuelles au runtime, représentées sous un symbole dans les types ». `30-transport.md` : « Une sérialisation JSON conserve ces clés textuelles énumérables » → un autre programme peut reconnaître la donnée sans partager le gestionnaire ; `instanceof` ne survivrait pas au transport. `20-metadata.md` : « Un kind peut aussi n'être qu'un marqueur, avec une valeur `null` » et « Le `has` d'un gestionnaire vérifie seulement la présence de sa clé ».

**Conséquence transpileur** — En Go, un objet « kindé » devient une **struct nommée ou une interface scellée** ; `has` devient un type switch / une méthode. Mais les clés restent **observables** : `print` les affiche (§2.3), `JSON.stringify` les émet. Le runtime Go doit donc savoir restituer, pour chaque type kindé, la **liste ordonnée** des clés texte et de leurs valeurs (ordre d'insertion, §2.3).

**Cas à anticiper** — objet portant plusieurs kinds (Success = right + information + value + success) ; kind marqueur à valeur `null` vs kind porteur de valeur ; valeur `undefined` (clé présente, affichée `undefined`, mais **omise par JSON**) ; `DObject.keys` sur un objet kindé (clés masquées) vs `Object.keys` natif (clés visibles) ; spread d'un objet kindé (les kinds sont copiés) ; `has` vrai pour un objet forgé à la main avec la bonne clé ; kinds utilisateur créés par `DKind.createNamespace`.

## 1.6 Tagged objects et `modeling`

**Fait [VÉRIFIÉ, par échantillonnage]** — `packages/lang/scripts/modeling/` exporte `createNewType`, `createEntity`, `createEntityNamespace`, `createTaggedObject`, `createTaggedObjectFactory`, `taggedObject`, `getTagValue`, `hasTagValue`, `hasTagGroup`, `createFact`, `createFlag`. Un tagged object est un **objet simple** dont les propriétés métier sont complétées par la clé de kind `@duplojs/lang/kind/@DuplojsLangModeling/object-tag` valant le nom du tag (`modeling/taggedObject/base.ts` : `[objectTagKind.runTimeKey]: name`). Les structures (`TaggedObjectStructure`, `EntityStructure`, `NewTypeStructure`) s'appuient sur `DDataStructure` pour valider ; `map` hydrate une donnée brute et renvoie un `Either`, `new` construit depuis des propriétés déjà typées. Un `NewType` « ne modifie pas la représentation runtime de la valeur » (`06-modeling/10-new-type.ts`).

**Pourquoi** — `06-modeling/30-tagged-object.ts` : « Sans `TaggedObject`, une union discriminée serait généralement construite en ajoutant soi-même une propriété comme `type` ou `kind`. `createTaggedObject` normalise cette identité. » ; l'identité est transportable (elle survit à la sérialisation).

**Conséquence transpileur** — Tagged object → struct Go + constante de tag ; union de tagged objects → interface scellée + type switch (`DPattern.matchWithTaggedObject`). NewType → type Go défini (`type SenderEmail string`), zéro coût. Les fabriques (`createTaggedObject(...)`) sont des **déclarations évaluées à l'exécution** en TS : le transpileur doit les reconnaître statiquement comme des déclarations de type.

**Cas à anticiper** — tag groups (commits `fc50b4f`, `b67025b`, `cecaf88` « tag groups » : zone récente et mouvante), entité avec cycle de vie (`40-entity-lifecycle.ts`), `Fact`/`Flag` (preuves attachées), fabrique stockée dans une variable exportée et utilisée dans un autre fichier.

## 1.7 Contraintes : « la donnée prouve qu'elle est déjà valide »

**Fait [VÉRIFIÉ]** — Une contrainte est **uniquement un type fantôme** : `interface Constraint<Name, Value> { [ConstraintSymbol]: Record<Name, Value> }` avec `declare const ConstraintSymbol: unique symbol` (`common/constraint/types/base.ts`). Exemples : `DNumber.Integer` = `Constraint<"number-integer">` (`number/constraints/integer.ts`), `DString.Trimmed` = `Constraint<"string-trimmed">`. Rien n'est ajouté à la valeur runtime.
- Les prédicats (`DNumber.isInteger`, `DString.isNotEmpty`, `DArray.minElements(2)`…) font la vérification runtime et, côté types, **affinent** vers `T & Contrainte`.
- Les transformations propagent ou recalculent les contraintes au niveau des types (`ReapplyCompatiblesConstraints` dans `array/map.ts` L11-19 ; `DString.trim` renvoie `string & Trimmed`).
- `DCommon.cast(input)` renvoie `input` tel quel (`common/constraint/cast/index.ts` L145-149) : c'est une preuve **statique** d'implication de contraintes. `shameOnYou` (L151-157) est l'échappatoire explicite. `createConstraintFactory()` renvoie `cast` lui-même. `DCommon.infer` : même idée pour les littéraux.

**Pourquoi** — `01-constraint/01-use.ts` : « Une contrainte existe uniquement dans le typage : elle ne modifie ni ne valide la valeur. » ; `30-cast.ts` : « cast restitue la valeur sans validation runtime : TypeScript doit prouver la compatibilité. » ; `20-metadata.md` : « Contrairement aux kinds, les contraintes de typage n'ajoutent aucune propriété à la valeur. »

**Conséquence transpileur** — Les contraintes s'**effacent** : `number & DNumber.Integer` → `float64` ; `cast`, `infer`, `shameOnYou`, `createConstraintFactory()(x)` → identité (à inliner). Il faut un passage « retirer les contraintes » sur les types du checker avant de choisir le type Go (intersection avec un objet à clé `unique symbol`).

**Cas à anticiper** — intersections multiples (`string & Trimmed & MinCharacters<1>`), contraintes sur tableaux (`readonly T[] & MaxElements<4>`, `LengthEqual<2>`), tuple vs tableau contraint, tentation d'optimiser `number & Integer` en `int` (risqué : la division et le formatage doivent rester ceux de `float64`).

## 1.8 Absence signalée par `undefined`, jamais par `-1` ni par exception

**Fait [VÉRIFIÉ]** — `findIndex`, `findLastIndex`, `indexOf`, `lastIndexOf` (array et string), `DString.search` renvoient **`undefined`** quand rien n'est trouvé (`array/findIndex.ts` L58, `array/indexOf.ts` L44, `string/indexOf.ts`). `find`, `findLast`, `at`, `first`, `last`, `DString.extract` renvoient `undefined`. `findAndReplace` et `findAndSplice*` renvoient `undefined` si le prédicat ne trouve rien (`array/findAndReplace.ts` L75).

**Pourquoi [HYPOTHÈSE]** — Un `number | undefined` force le traitement de l'absence par le typage, là où `-1` est un nombre valide silencieux.

**Conséquence transpileur** — Il faut une représentation Go de `T | undefined` : `(T, bool)`, pointeur `*T`, ou type générique `Maybe[T]`. Choisir **une** convention pour toute la bibliothèque, compatible avec l'affichage (`undefined` s'imprime, §2.3).

**Cas à anticiper** — `T | undefined` où `T` contient déjà `undefined` ou `null` ; chaînage `pipe(xs, DArray.find(p), DCommon.when(...))` ; distinction `undefined` / `null` (les deux existent : les kinds marqueurs valent `null`, les absences valent `undefined`).

## 1.9 Callbacks enrichis : `(élément, { index, self })` et objets-outils

**Fait [VÉRIFIÉ]** — Deux conventions de callback :
1. **Positionnelle + objet de contexte** : `map`, `filter`, `find`, `findLast`, `findIndex`, `some`, `every`, `flatMap`, `findAndReplace`, `findAndSplice*`, `DTuple.map`, `DGenerator.map/filter` appellent `cb(element, { index, self })`. `group` appelle `cb(element, { index, output })`. `DGenerator.asyncMap/asyncFilter` : `cb(item, { index })` (pas de `self`).
2. **Objet unique + continuations** : `reduce`, `reduceRight`, `select`, `DGenerator.reduce`, `loop`, `loopAccumulator` appellent `cb({ element, index, lastValue, self, next, exit, nextWithObject, nextPush })` et attendent en retour un objet-signal `{"-next": v}` ou `{"-exit": v}` (reduce), `{"-select": v}`/`{"-skip": …}` (select), `{"-nextData": v}`/`{"-exitData": v}` (loop).

**Pourquoi [HYPOTHÈSE]** — L'objet de contexte évite le piège JS des callbacks à arité variable (`['1','2'].map(parseInt)`) et rend l'index optionnel sans dépendre de la position ; les continuations `next`/`exit` donnent une **sortie anticipée typée** à `reduce` (commits `6498963 feat: reduce`, `a8a3879 fix: readonly reduce`, `1f65858 fix: loop`).

**Conséquence transpileur** — Go : signature fixe `func(element T, params MapParams[T]) U` et adaptation au point d'appel selon le nombre de paramètres déclarés par le callback source (0, 1 ou 2, avec ou sans déstructuration de `{ index }`). Pour `reduce`, traduire les signaux en un type somme Go (`ReduceNext[A]` / `ReduceExit[E]`) ou, mieux, reconnaître statiquement `return next(x)` / `return exit(y)` et générer une boucle `for` avec `continue`/`return`.

**Cas à anticiper** — callback qui ignore `params` ; qui déstructure `{ index }` seulement ; qui utilise `self` ; callback fourni par référence (fonction nommée, fonction de la lib) ; callback renvoyant conditionnellement `next` ou `exit` avec des types différents ; `nextPush`/`nextWithObject` (valent `undefined` côté types si l'accumulateur n'est pas un tableau/objet).

---

# 2. Fonctions prioritaires (sémantique runtime exacte)

## 2.1 `DCommon.pipe`

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/common/pipe.ts` : 15 surcharges (1 à 15 étapes, L4-318) ; implémentation L319-327 :

```ts
export function pipe(input, ...pipes) {
	let acc = input;
	for (const pipe of pipes) { acc = pipe(acc); }
	return acc;
}
```

Exécution **synchrone, strictement séquentielle, de gauche à droite** ; chaque étape reçoit **un seul argument** ; aucune gestion d'erreur, de promesse ni de court-circuit (une étape qui renvoie une promesse passe la promesse telle quelle à la suivante). Le type de retour est `BreakGenericLink<DernièreSortie>` (astuce de typage sans effet runtime). Les génériques sont `const` : les littéraux sont conservés dans les types (`pipe(42, …)` voit `42`, pas `number`).

**Pourquoi** — cf. §1.3. `BreakGenericLink` coupe le lien d'inférence entre l'entrée générique et la sortie [HYPOTHÈSE sur la motivation précise].

**Conséquence transpileur** — Dérouler en affectations successives, dans l'ordre : évaluer d'abord l'expression `input`, puis **les expressions des étapes** (les arguments d'un appel JS sont tous évalués avant l'appel : `DArray.map(f)` est construit avant que la première étape ne s'exécute), puis appliquer les étapes. Si une expression d'étape a un effet de bord, l'ordre « toutes les constructions d'étapes, puis toutes les applications » doit être préservé.

**Cas à anticiper** — étape = appel curifié de la lib ; étape = lambda ; étape = référence (`DArray.coalescing`, `DString.to`) ; étape = `innerPipe(...)` ; étape = `print` (référence directe : affiche et renvoie l'entrée) ; types littéraux « const » qui s'élargissent mal en Go ; pipe dont une étape renvoie `Either` puis étapes `DEither.whenIsRight…` ; pipe utilisé comme expression au milieu d'une autre (ordre d'évaluation).

## 2.2 `DCommon.asyncPipe`

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/common/asyncPipe.ts` L359-367 :

```ts
export async function asyncPipe(input, ...pipes) {
	let acc = await input;
	for (const pipe of pipes) { acc = await pipe(acc); }
	return acc;
}
```

- Renvoie **toujours une `Promise`**, même si tout est synchrone.
- L'entrée est **attendue** (`await input`) : on peut passer une promesse comme donnée (cas de `projects/10/index.ts` : `DCommon.asyncPipe(calculations, …)` où `calculations` est la promesse de `DEither.asyncGroup`).
- Chaque étape reçoit la valeur **résolue** (`Awaited<…>` dans les types, L340-354) et son résultat est attendu avant l'étape suivante : séquentiel strict.
- Fonction `async` : le corps démarre de façon synchrone jusqu'au premier `await`, puis chaque `await` cède au moins un tour de microtâche, même sur une valeur non-promesse.
- Un rejet interrompt la chaîne et rejette la promesse résultat. 15 étapes maximum.
- Variantes : `asyncInnerPipe` (fonction composée), `prepareAsyncPipe`.

**Pourquoi** — `02-currying/30-async-pipe.ts` : « `asyncPipe` applique le même principe lorsqu'une ou plusieurs étapes du traitement sont asynchrones » ; mise en garde : « map produit ici un tableau de promesses ; asyncPipe attend chaque étape, pas chaque élément ».

**Conséquence transpileur** — Dépend de la représentation choisie pour `Promise` en Go. Si l'asynchronisme est modélisé de façon bloquante (appel direct, ou futur avec `Await()`), `asyncPipe` devient le même déroulé que `pipe` avec un `Await` par étape. L'ordre observable (affichages) doit rester celui de la boucle d'événements JS : avec du code purement séquentiel c'est trivial, avec de la concurrence réelle (`promiseAll`, timers) c'est le point dur.

**Cas à anticiper** — étape synchrone mêlée à des étapes async ; entrée déjà promesse ; `await` du résultat vs promesse stockée puis attendue plus tard (`projects/10`) ; promesse jamais attendue ; rejet (exception) dans une étape ; étape renvoyant un tableau de promesses (non attendues individuellement).

## 2.3 `DCommon.print` : sortie exacte

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/common/print.ts` L15-28 (ajouté par le commit `029f2c4 feat:lang(hf): print`, 2026-11-13) :

```ts
export function print(input, params = "info") {
	if (typeof params === "string") { console[params](input); }
	else if ("columns" in params) { console.table(input, params.columns); }
	else { console.dir(input, { depth: params.depth }); }
	return input;
}
```

- Par défaut : **`console.info(input)`**. Dans Node, `console.info` est un alias de `console.log` → **stdout**, suivi d'un `\n`.
- `"warn"` et `"error"` → **stderr**. `{ columns }` → `console.table` (stdout). `{ depth }` → `console.dir(input, { depth })` (stdout ; `depth: null` = illimité).
- **Renvoie `input`** (même référence) : utilisable comme étape de pipe.
- Le format est celui de `util.inspect` de Node (profondeur 2, largeur 80, `compact: 3`). Couleurs ANSI **uniquement si stdout est un TTY** ; redirigé dans un fichier ou un pipe, pas de couleurs.
- `DCommon.forwardLog` (`common/forwardLog.ts`) est le cousin `console.log(input); return input`.

Sorties **observées** avec Node v24.14.1, stdout non-TTY (objets Either reconstruits à la main d'après `either/right/success.ts` L26, `either/right/create.ts` L48, `either/left/create.ts` L48) :

| Valeur | Sortie exacte |
|---|---|
| `3` | `3` |
| `3.5`, `-0`, `NaN`, `1e21`, `0.1+0.2`, `1e-7`, `Infinity` | `3.5`, `-0`, `NaN`, `1e+21`, `0.30000000000000004`, `1e-7`, `Infinity` |
| `"3"` (chaîne au premier niveau) | `3` (brut, sans guillemets, sauts de ligne réels) |
| `true`, `null`, `undefined`, `10n` | `true`, `null`, `undefined`, `10n` |
| `[3]` | `[ 3 ]` |
| `["3"]` | `[ '3' ]` |
| `[]`, `{}` | `[]`, `{}` |
| `[ '3', 'échec', '1.6666666666666667' ]` (forme de `projects/08`) | `[ '3', 'échec', '1.6666666666666667' ]` |
| `["transaction annulée"]` | `[ 'transaction annulée' ]` |
| `[-0, 1e21, NaN, 'a"b', "it's", undefined, null, true]` | `[ -0, 1e+21, NaN, 'a"b', "it's", undefined, null, true ]` |
| `{a:1, b:"x"}` | `{ a: 1, b: 'x' }` |
| `[[1,[2,[3,[4]]]]]` | `[ [ 1, [ 2, [Array] ] ] ]` |
| tableau troué `[ , 1, , ,]` | `[ <1 empty item>, 1, <2 empty items> ]` |
| `["multi\nline"]` | `[ 'multi\nline' ]` |
| générateur | `Object [Generator] {}` |
| `Promise.resolve(1)` | `Promise { 1 }` |
| résultat de `DArray.group` | `[Object: null prototype] { '2': [ 3 ], b: [ 1 ], a: [ 2 ] }` |
| `memo` avant / après lecture | `{ value: [Getter] }` / `{ value: 42 }` |

`DEither.success(3)` :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
```

`DEither.left("negative-operand", -1)` :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/left': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'negative-operand',
  '@duplojs/lang/kind/@DuplojsLangEither/value': -1
}
```

Un Left sans valeur affiche `'…/value': undefined`. `DEither.success([3])` affiche `'…/value': [ 3 ],` sur la même ligne. Un Either imbriqué au-delà de la profondeur 2 devient `[Object]`.

Tableau de 8 nombres (plus de 6 éléments → regroupement en colonnes) :

```
[
  0, 1, 2, 3,
  4, 5, 6, 7
]
```

Règles de `util.inspect` qui gouvernent ces sorties [VÉRIFIÉ sur les exemples, HYPOTHÈSE pour l'énoncé général de l'algorithme] :
- Chaîne **au premier niveau** : brute. Chaîne **imbriquée** : entre apostrophes ; si elle contient `'` → guillemets doubles ; si elle contient `'` et `"` → backticks ; `\n` échappé.
- Clé d'objet : nue si identifiant valide, sinon entre apostrophes (les clés de kind, les clés numériques `'2'`, `'b-c'`).
- Ordre des clés : d'abord les clés « index entier » par ordre croissant, puis les clés string **dans l'ordre d'insertion**. D'où l'ordre `right, information, value, success` (ordre du littéral dans `success.ts`).
- Une ligne unique `{ a: 1, b: 2 }` / `[ 1, 2 ]` si l'ensemble tient dans ~72 caractères (`breakLength` 80) et si l'objet contient au plus 3 niveaux « compacts » ; sinon une entrée par ligne, indentation de 2 espaces. Les objets Either dépassent toujours (clés de ~45 caractères) → toujours multi-lignes.
- Tableau de **plus de 6 éléments** courts : mise en colonnes alignées (nombres alignés à droite, chaînes à gauche), environ `sqrt(2.5 × largeurMax × n) / largeurMax` colonnes, plafonné à 16 colonnes et à la largeur 80.
- Plus de **100 éléments** : `... N more items`.
- Profondeur par défaut **2** : au-delà, `[Object]` / `[Array]`.
- `-0` s'affiche `-0` (alors que `String(-0)` vaut `"0"`, §2.11).
- Fonctions : `[Function: nom]` ou `[Function (anonymous)]` ; `Date` : ISO ; `Map(1) { 1 => 2 }` ; `Set(1) { 1 }` ; symbole `Symbol(x)`.

**Pourquoi** — Le commit `029f2c4` n'a pas de corps ; les tests (`packages/lang/tests/common/print.test.ts`) fixent le contrat : « logs with info by default and returns the input unchanged », `console.table` avec colonnes, `console.dir` avec profondeur. `packages/lang/global.d.ts` déclare un `Console` minimal, signe que la lib veut rester indépendante de la plateforme. [HYPOTHÈSE] `print` offre un point d'observation composable en pipe, sans que le code utilisateur touche à `console`.

**Conséquence transpileur** — C'est **le** point de comparaison Go ↔ TS. Le runtime Go doit embarquer un **port de `util.inspect`** limité aux valeurs possibles (nombre, chaîne, booléen, `null`, `undefined`, tableau, objet simple, objet kindé, tuple) avec : distinction premier niveau / imbriqué pour les chaînes, règles de guillemets, repli sur plusieurs lignes à 72/80 colonnes, regroupement en colonnes au-delà de 6 éléments, troncature à 100 éléments et à la profondeur 2. Les types Go représentant les objets kindés doivent pouvoir énumérer leurs clés texte dans l'ordre d'insertion. Écrire sur `os.Stdout` (info) ou `os.Stderr` (warn/error), sans couleurs. La stratégie la plus sûre : générer des **tests dorés** en exécutant le TS d'origine et comparer octet par octet.

**Cas à anticiper** — nombre entier vs flottant (`3` et non `3.0`) ; `-0` ; chaîne avec apostrophe, guillemet, saut de ligne, caractères non-ASCII (non échappés : `'échec'`) ; tableau vide ; tableau de 7+ éléments ; tableau de 100+ ; chaînes longues forçant le multi-ligne ; Either dans tableau dans Either (profondeur) ; valeur `undefined` dans un Left ; tuple (affiché comme un tableau) ; objet avec clé non identifiant ; `print` d'une promesse non attendue (`Promise { <pending> }`) ; `print(x, "error")` (stderr) ; `print(x, { depth: null })` ; `print` au milieu d'un pipe (valeur renvoyée réutilisée).

## 2.4 `DCommon.forward`

**Fait [VÉRIFIÉ]** — `common/forward.ts` L1-5 : `return value`. Identité pure, même référence. Sert aussi à fixer un type via son générique (`forward<T | undefined>(undefined)` dans `common/memoPromise.ts`).

**Pourquoi** — Doc agents-kit : « Retourner une valeur telle quelle pour la rendre explicite dans une composition. »

**Conséquence transpileur** — Inliner (supprimer l'appel) ou `func Forward[T any](v T) T`. Quand le générique explicite élargit le type, c'est le type annoncé par le checker qui fait foi pour la variable Go.

**Cas à anticiper** — `forward` comme étape de pipe ; comme branche « sinon » (`whenIsRightOtherwise(f, DCommon.forward)`) ; avec générique explicite d'union.

## 2.5 `DCommon.memo`

**Fait [VÉRIFIÉ]** — `common/memo.ts` L7-29 : renvoie `{ get value() }`. Au **premier accès** à `.value`, appelle `theFunction()`, puis remplace l'accesseur par une propriété de donnée via `Object.defineProperty(payload, "value", { value })` (non inscriptible, toujours énumérable et configurable — vérifié). Les accès suivants lisent la valeur sans rappeler la fonction. Si `theFunction` lève, rien n'est mémorisé : le prochain accès réessaie. Une valeur `undefined` est bien mémorisée (pas de test de vérité). Variantes : `memoObject` (Proxy paresseux, `common/memoObject.ts`), `memoPromise` (mémorise une promesse partagée puis la valeur résolue, `common/memoPromise.ts`).

**Pourquoi** — Doc : « Évaluer une fonction au premier accès puis mémoriser sa valeur. » Évaluation paresseuse explicite, sans état global.

**Conséquence transpileur** — Go : `struct { once sync.Once; fn func() T; v T }` avec méthode `Value()`, ou `sync.OnceValue(fn)` (Go 1.21+). Tout accès `.value` devient un appel de méthode. Attention : `sync.OnceValue` mémorise aussi la panique, contrairement au réessai JS.

**Cas à anticiper** — memo jamais lu (la fonction ne s'exécute jamais : effets de bord absents) ; memo lu dans une closure ; memo dont la fonction affiche quelque chose (ordre des sorties) ; memo imprimé (`{ value: [Getter] }` avant, `{ value: 42 }` après) ; memo récursif.

## 2.6 `DCommon.tap`

**Fait [VÉRIFIÉ]** — `common/tap.ts` L27-41. Curry si `args.length === 1` : `tap(fn)` → `(input) => tap(input, fn)`. Data-first : `callThen(fn(input), () => input)`. Avec `callThen` (`common/callThen.ts` L49-76) : si `fn(input)` renvoie une `Promise` → renvoie une promesse qui se résout avec `input` **après** la fin de l'effet ; sinon renvoie `input` immédiatement. Le résultat de `fn` est toujours ignoré ; une exception de `fn` se propage.

**Pourquoi** — Effet de bord dans un pipe sans casser le flux de données ; la gestion sync/async unifiée évite un `asyncTap` séparé.

**Conséquence transpileur** — `fn(input); return input`. Le checker indique si `fn` renvoie une promesse (le type de retour de `tap` devient `Promise<Input>`), ce qui décide de la variante Go.

**Cas à anticiper** — `tap(DCommon.print)` ; `tap` avec fonction async dans `pipe` (le pipe synchrone propage alors une promesse) vs dans `asyncPipe` ; fn qui lève.

## 2.7 `DCommon.promiseAll`

**Fait [VÉRIFIÉ]** — `common/promiseAll.ts` L13-17 : `return Promise.all(input)`. Seul apport : le typage (tuple → tuple des valeurs résolues, itérable → tableau). Sémantique native : les promesses passées sont **déjà démarrées** ; le résultat conserve l'**ordre d'entrée** ; rejet dès la première promesse rejetée (les autres continuent sans être annulées) ; les valeurs non-promesses sont acceptées ; entrée vide → résolution avec `[]`. À côté : `promiseObject` (`common/promiseObject.ts` L16-31) fait de même sur les valeurs d'un objet.

**Pourquoi** — `02-currying/30-async-pipe.ts` : « Pour récupérer les valeurs résolues, ajouter une étape qui attend toutes les promesses. » → `promiseAll` est cette étape, sous forme pipeable et correctement typée.

**Conséquence transpileur** — Avec des futurs Go : attendre chaque élément dans l'ordre et collecter. Le point délicat n'est pas `promiseAll` mais **quand les tâches démarrent** : en JS, `xs.map(asyncFn)` exécute chaque `asyncFn` de façon synchrone jusqu'à son premier `await`, dans l'ordre du tableau, avant que `promiseAll` ne soit appelé.

**Cas à anticiper** — entrelacement des affichages de plusieurs tâches ; rejet partiel ; tuple hétérogène (types différents par position) ; itérable non-tableau ; mélange valeurs/promesses.

## 2.8 `DCommon.cast`

**Fait [VÉRIFIÉ]** — `common/constraint/cast/index.ts` L145-149 : `return input`. Aucune validation runtime ; tout est dans la signature (L120-143) qui calcule, à la compilation, si les contraintes de l'entrée **impliquent** celles du type attendu, et produit sinon une erreur de type calculée. Voir §1.7.

**Pourquoi** — `01-constraint/30-cast.ts` : « Au moins 15 caractères implique au moins 10 caractères » ; cast « convertit une garantie existante, ou exploite une valeur connue statiquement ».

**Conséquence transpileur** — Supprimer l'appel. Le type cible est fourni par le contexte (annotation, paramètre attendu) : il ne change pas la représentation Go puisque les contraintes s'effacent.

**Cas à anticiper** — `cast` comme étape de pipe ; `cast(...) satisfies T` ; `cast` sur tableau/tuple contraint ; `shameOnYou<T>(x)` et `infer` (mêmes traitements).

## 2.9 `DArray.coalescing`

**Fait [VÉRIFIÉ]** — `array/coalescing.ts` L15-21 :

```ts
return value instanceof Array ? value : [value];
```

- Valeur non-tableau (nombre, chaîne, objet, `null`, `undefined`, Either…) → **nouveau tableau à un élément** `[value]`.
- Tableau → **le même tableau, même référence**, sans copie ni aplatissement (`[[1]]` reste `[[1]]`).
- Type (L3-7) : `Coalescing<T> = T extends readonly any[] ? T : readonly [T]` → distributif sur les unions : `number | string[]` donne `readonly [number] | string[]`. Le résultat non-tableau est typé comme un **tuple à 1 élément**.
- Une chaîne n'est pas un tableau : `coalescing("abc")` → `["abc"]`. `instanceof Array` est faux pour un tableau d'un autre realm et pour les itérables.
- Forme unique (pas de curry) → utilisable directement comme callback : `DEither.whenIsRight(DArray.coalescing)` (`projects/02`, `03`, `05`).

**Pourquoi** — Doc : « Convertir une valeur en tableau sans ré-encapsuler une valeur déjà contenue dans un tableau. » Usage interne typique : normaliser un paramètre `T | T[]` (`DCommon.instanceOf` L38, `DString.isComposedOf`).

**Conséquence transpileur** — La branche est **décidable statiquement** par le type de l'argument : type tableau → identité ; type non-tableau → `[]T{v}`. Si le type est une union tableau/non-tableau, il faut un test runtime sur la représentation Go de l'union. Dans `projects/05`, `whenIsRightOtherwise(DArray.coalescing, () => [-12])` : la branche droite produit `readonly [number]` (tuple) et la branche gauche `number[]` ; l'étape suivante `DArray.map(DString.to)` doit voir un seul type Go (`[]float64`) → **unifier tuple à 1 élément et slice**.

**Cas à anticiper** — argument déjà tableau ; tuple ; union ; `undefined`/`null` (→ `[undefined]`) ; coalescing d'un Either ; tableau vide (reste vide, pas `[[]]`) ; résultat passé à `map`, `print` (`[ 3 ]`).

## 2.10 `DArray.map`

**Fait [VÉRIFIÉ]** — `array/map.ts` L44-66 (code en §1.2).
- Curry si `args.length === 1` ; sinon data-first `map(array, fn)`.
- Le callback reçoit **deux arguments** : `(element, { index, self })` — **pas** `(element, index, array)` comme `Array.prototype.map`. `self` est le tableau source (même référence).
- Délègue à `Array.prototype.map` : nouveau tableau de même longueur, ordre conservé, appel **synchrone** dans l'ordre des index ; les **trous** d'un tableau creux ne sont pas visités et restent des trous.
- Type de sortie : `readonly Output[]` avec réapplication des contraintes compatibles (`MaxElements`, `LengthEqual`… L11-19). Un tuple en entrée donne un **tableau** en sortie (pour conserver le tuple : `DTuple.map`, même runtime, autre typage — `tuple/map.ts` L40).
- Callback async → tableau de promesses (aucune attente).

Exemples d'exercices : `DArray.map(DString.to)` (curry, callback à forme unique : le 2ᵉ argument est ignoré) ; `DArray.map(inputs, ([one, two, divisor]) => …)` (data-first, déstructuration de tuple) ; `DArray.map(DEither.whenIsRightOtherwise(DString.to, () => "échec"))` (callback = fonction curifiée unaire).

**Pourquoi** — `docs/fr/v1/api/lang/array/map.md` : « `map` transforme chaque element d'un tableau sans modifier le tableau source. Elle expose aussi une signature currifiee pour la composition. » Objet `{index, self}` : cf. §1.9.

**Conséquence transpileur** — `func ArrayMap[T, U any](arr []T, fn func(T, MapParams[T]) U) []U` ; au point d'appel, envelopper le callback source selon son arité réelle. La forme curifiée devient une closure ou est fusionnée avec l'étape de pipe. Préallouer `make([]U, len(arr))`.

**Cas à anticiper** — callback 0/1/2 paramètres ; déstructuration de tuple ou d'objet dans le paramètre ; callback par référence (fonction lib à forme unique, fonction lib curifiée, fonction utilisateur) ; callback renvoyant une union (Either de formes différentes) ; map sur tableau vide ; map imbriqué ; map dont le callback a des effets (ordre) ; résultat `readonly [number]` (tuple issu de coalescing) en entrée.

## 2.11 `DArray.reduce` et `DArray.reduceFrom`

**Fait [VÉRIFIÉ]** — `array/reduce.ts`.
- Signature runtime (L141-181) : curry si `args.length === 2` (`reduce(fromValue, fn)`), sinon `reduce(array, fromValue, fn)`.
- Valeur initiale : si `fromValue` porte le kind `reduce` (créé par `reduceFrom`), elle est **déballée** (`reduceKind.getValue`, L158-160) ; sinon utilisée telle quelle.
- `reduceFrom(value)` (L55-61) renvoie `{ "@duplojs/lang/kind/@DuplojsLangArray/reduce": value }`. Son seul rôle est le **typage** : sans lui, seules les primitives `number | string | bigint | boolean` sont acceptées comme valeur initiale et leur type est élargi (`ToLargeEnsemble` : `0` → `number`, L94-100) ; avec lui, on fixe explicitement le type de l'accumulateur (objet, tableau, union).
- Boucle `for (index = 0; index < array.length; index++)` : appelle `fn({ element, index, lastValue, self, next, exit, nextWithObject, nextPush })` (un **seul** argument objet, L165-171).
- Le callback **doit** renvoyer un signal : `next(v)` → `{"-next": v}` (continue avec `lastValue = v`) ou `exit(v)` → `{"-exit": v}` (renvoie `v` **immédiatement**, type potentiellement différent de l'accumulateur). Test : `"-exit" in result` (L173).
- `nextWithObject(obj, partial)` = `next(DObject.override(obj, partial))` (les propriétés `undefined` du partiel sont ignorées) ; `nextPush(array, ...values)` = `next(DArray.push(array, ...values))`, ou `next(array)` si aucune valeur (L63-92).
- Tableau vide → renvoie la valeur initiale. Les trous sont visités (boucle indexée) et valent `undefined`.
- `reduceRight` (`array/reduceRight.ts` L43-83) : identique, de `length - 1` à `0`. `DGenerator.reduce` : même protocole avec `item` au lieu de `element`, sans `self` (`generator/reduce.ts` L131-137).

**Pourquoi** — Commits `6498963 feat:lang(hf): reduce` et `a8a3879 fix:lang(hf): readonly reduce`. Doc `10-reduce.ts` : « next transmet l'accumulateur à l'itération suivante ». [HYPOTHÈSE] Les continuations nommées apportent la sortie anticipée typée et évitent le piège de l'accumulateur mal inféré de `Array.prototype.reduce` ; `reduceFrom` existe parce que TypeScript infère un littéral trop étroit ou un objet trop précis comme type d'accumulateur.

**Conséquence transpileur** — Traduction idéale : boucle `for` Go avec variable `lastValue` ; `return next(x)` → `lastValue = x; continue` ; `return exit(y)` → `return y` (ou `break` + résultat). Si le callback n'est pas analysable (référence de fonction, retours complexes), se rabattre sur un type somme `ReduceResult[A, E]`. `reduceFrom(v)` → simplement `v` avec le type de son générique. Le type de retour est `A | E` (union si `exit` est utilisé avec un autre type).

**Cas à anticiper** — callback qui n'utilise que `next` ; mélange `next`/`exit` ; `exit` d'un type différent ; `nextPush` sur accumulateur tableau (allocation à chaque tour : coût quadratique fidèle mais optimisable) ; `nextWithObject` ; valeur initiale littérale vs `reduceFrom<Type>(…)` ; forme curifiée dans un pipe ; `DNumber.sum` comme alternative ; déstructuration partielle `({ element, lastValue, next })`.

## 2.12 `DString.to` : conversion exacte

**Fait [VÉRIFIÉ]** — `string/to.ts` L28-34 : `return \`${value}\``. C'est l'opération abstraite **ToString** d'ECMAScript, identique à `String(value)` sauf pour un `Symbol` (qui lève `TypeError` en template literal). Entrées acceptées par le type : `null | undefined | { toString(): string }` (donc nombres, chaînes, booléens, bigint, tableaux, objets). Forme unique → passable directement à `map`.

Résultats observés (Node v24.14.1) :

| Entrée | Sortie |
|---|---|
| `3` | `"3"` |
| `3.5` | `"3.5"` |
| `NaN` | `"NaN"` |
| `-0` | `"0"` (le signe est perdu — différent de `print(-0)` qui affiche `-0`) |
| `1e21` | `"1e+21"` |
| `1e20` | `"100000000000000000000"` |
| `1e-7` | `"1e-7"` |
| `0.000001` | `"0.000001"` |
| `0.1 + 0.2` | `"0.30000000000000004"` |
| `5 / 3` | `"1.6666666666666667"` |
| `123456789.123456789` | `"123456789.12345679"` |
| `2 ** 53` | `"9007199254740992"` |
| `5e-324` | `"5e-324"` |
| `1.7976931348623157e308` | `"1.7976931348623157e+308"` |
| `Infinity` / `-Infinity` | `"Infinity"` / `"-Infinity"` |
| `true`, `null`, `undefined` | `"true"`, `"null"`, `"undefined"` |
| `[1, 2]` | `"1,2"` (join par virgule, `null`/`undefined` → vide) |
| `{}` | `"[object Object]"` |
| `10n` | `"10"` |

Algorithme (`Number::toString`, base 10) : chiffres significatifs **les plus courts qui redonnent le même double** ; notation décimale si `1e-7 <= |x| < 1e21`, sinon exponentielle avec `e+NN`/`e-NN` **sans zéro de remplissage**.
Type de retour : littéral `\`${N}\`` si le nombre est littéral, sinon `string & DString.Number` (contrainte « chaîne numérique », effacée au runtime).

**Pourquoi** — Doc : « Convertir une valeur stringifiable en chaîne en conservant les littéraux connus lorsque c'est possible. » Version pipeable et typée de `String()`.

**Conséquence transpileur** — Il faut un `NumberToString(float64) string` **écrit à la main** dans le runtime Go. [HYPOTHÈSE, Go non exécuté] `strconv.FormatFloat(f, 'g', -1, 64)` et `fmt.Sprint` ne conviennent pas tels quels : le seuil de bascule en notation exponentielle n'est pas celui de JS pour les petits nombres (dès 1e-5 en Go, 1e-7 en JS), l'exposant est écrit sur deux chiffres (`1e-07` au lieu de `1e-7`), et `fmt` avec `%v` donne `1e+06` pour un million là où JS écrit `1000000`. Recette : obtenir les chiffres les plus courts avec `strconv.FormatFloat(f, 'e', -1, 64)`, en extraire mantisse et exposant, puis appliquer la mise en forme ECMAScript ; cas spéciaux `NaN`, `±Infinity`, `-0` → `"0"`. La même fonction sert à `print` pour les nombres, **sauf** `-0` qui s'y affiche `-0`. Pour un argument de type union, dispatcher selon le type statique (nombre, chaîne → identité, booléen, tableau → join récursif).

**Cas à anticiper** — entiers stockés en `float64` (pas de `.0`) ; résultats de division ; très grands/petits nombres ; `-0` issu de `-1 * 0` ; `NaN` issu de `0/0` ; `to` sur chaîne (identité) ; sur booléen ; sur tableau (récursif, séparateur `,` sans espace) ; sur valeur d'Either (`whenIsRightOtherwise(DString.to, …)` : l'argument est la valeur déballée) ; sur objet (`[object Object]`) ou objet avec `toString` personnalisé (`TheDate.toString()` renvoie la forme sérialisée).

---

# 3. Domaine `generator` (complet)

## 3.1 Vue d'ensemble du domaine `generator`

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/generator/index.ts` exporte 22 modules, par paires synchrone/asynchrone : `map`/`asyncMap`, `filter`/`asyncFilter`, `reduce`/`asyncReduce`, `chunk`/`asyncChunk`, `group`/`asyncGroup`, `flat`/`asyncFlat`, `concat`/`asyncConcat`, `loop`/`asyncLoop`, `loopAccumulator`/`asyncLoopAccumulator` (+ `loopAccumulatorFrom`), `execute`, `createExternalAsyncGenerator`, et ré-utilise `reduceFrom`/`groupOutput` du domaine array. Toutes les entrées sont typées `Iterable<T>` (ou `AsyncIterable<T> | Iterable<T>` pour les variantes async) : **un tableau est une entrée valide**.

**Pourquoi** — `02-currying/10-built-in-function.ts` : « Les generators permettent de construire des transformations lazy avec exactement le même modèle de composition » ; exemple canonique : `pipe(tableau, DGenerator.map(f), DGenerator.filter(p), DArray.from)`.

**Conséquence transpileur** — Go ≥ 1.23 : `iter.Seq[T]` pour le synchrone. Différence majeure : un générateur JS est **à usage unique** (une fois consommé, il est vide) et **avec état**, alors qu'un `iter.Seq` est une fonction rejouable. Pour l'asynchrone : `iter.Seq` bloquant ou canal, selon le modèle de promesse retenu.

**Cas à anticiper** — générateur consommé deux fois ; générateur jamais consommé (aucun effet de bord ne se produit — la paresse est observable via `print`) ; passage d'un tableau là où un itérable est attendu ; matérialisation par `DArray.from` (qui renvoie une **promesse** de tableau si l'entrée est un itérable asynchrone — `array/from.ts` L20-36) ; `print` d'un générateur (`Object [Generator] {}`).

## 3.2 Famille transformations paresseuses : `map`, `filter`, `chunk`, `flat`, `concat`

**Fait [VÉRIFIÉ]**
- `map(iter, fn)` (`generator/map.ts` L33-60) : renvoie un **objet générateur** (IIFE `function*`) ; rien ne s'exécute avant la première demande. `fn(item, { index, self: iterator })`, `index` incrémenté par élément.
- `filter(iter, pred)` (`generator/filter.ts` L54-85) : même contexte `{ index, self }` ; `index` compte **tous** les éléments source, pas seulement ceux conservés.
- `chunk(iter, size)` (`generator/chunk.ts` L36-70) : `Math.round(size)` ; si la taille arrondie n'est pas strictement positive (0, négative, `NaN`), **aucune émission** ; sinon émet des tableaux de `size` éléments, le dernier pouvant être plus court. L'arrondi est calculé à l'appel, le test dans le générateur.
- `flat(iter, depth = 1)` (`generator/flat.ts`, fonction génératrice directe, **non curifiable**) : aplatit récursivement tout élément **objet itérable** (tableau, Set, Map, générateur) tant que `depth >= 1` ; les chaînes ne sont pas aplaties (`typeof item === "object"` requis).
- `concat(iter, items, ...rest)` (`generator/concat.ts` L19-44) : `yield*` de chaque source dans l'ordre ; curry à 1 argument.
- Variantes async : `asyncMap` **attend** le résultat du callback (`yield await fn(item, { index })`, L55) ; `asyncFilter` **n'attend pas** le prédicat (`if (predicate(item, { index }))`, `generator/asyncFilter.ts` L68) → un prédicat `async` renvoie une promesse, toujours vraie : tout passe. `asyncFlat` attend chaque élément puis aplatit itérables sync **et** async. `asyncConcat` : `yield*` dans un générateur async.

**Pourquoi** — Paresse : ne calculer que ce qui est consommé, composer sans tableaux intermédiaires. [HYPOTHÈSE] L'absence d'`await` dans `asyncFilter` ressemble à un oubli plutôt qu'à un choix ; fidélité oblige, la reproduire ou la signaler.

**Conséquence transpileur** — `iter.Seq` composés ; le callback reçoit l'index courant. `chunk` : reproduire `Math.round` (arrondi au demi **vers +∞** : `Math.round(2.5) === 3`, `Math.round(-2.5) === -2` ; `math.Round` de Go arrondit le demi en s'éloignant de zéro — sans incidence ici puisque les négatifs donnent zéro émission, mais à ne pas réutiliser ailleurs sans précaution).

**Cas à anticiper** — pipeline `map` → `filter` → `DArray.from` ; effets de bord entrelacés (paresse : `map` et `filter` alternent élément par élément, contrairement aux versions tableau qui font deux passes) ; `chunk` avec taille non entière ; `flat` avec profondeur 0 ou `Infinity` ; `self` utilisé dans un callback (c'est l'itérateur, potentiellement en cours de consommation) ; arrêt anticipé du consommateur.

## 3.3 Famille consommateurs : `reduce`, `group`, `execute`

**Fait [VÉRIFIÉ]**
- `reduce(iter, from, fn)` (`generator/reduce.ts` L108-149) : **consomme immédiatement** ; `fn({ item, index, lastValue, next, exit, nextWithObject, nextPush })` ; même protocole `-next`/`-exit` que `DArray.reduce` ; `exit` arrête la consommation. `asyncReduce` (`generator/asyncReduce.ts` L44-87) renvoie une promesse et attend le callback.
- `group(iter, fn)` (`generator/group.ts` L88-123) : `fn(item, { index, output })` doit renvoyer `output(nomDeGroupe, valeur)` ; résultat = objet **sans prototype** (`Object.create(null)`) `nom → tableau de valeurs`, groupes dans l'ordre de première apparition. `asyncGroup` : promesse. Identique à `DArray.group` (`array/group.ts` L87-114).
- `execute(iter)` (`generator/execute.ts` L9-20) : épuise l'itérable pour ses effets de bord ; renvoie `undefined` (sync) ou une promesse (async), choisi par `Symbol.iterator in iterator`.

**Conséquence transpileur** — `group` exige une **map ordonnée** en Go (ordre d'insertion, avec la règle JS « clés entières d'abord par ordre croissant ») sinon `print`/`DObject.keys` divergent ; `print` affiche le préfixe `[Object: null prototype]`.

**Cas à anticiper** — noms de groupe numériques (`'2'` passe devant) ; groupe unique ; itérable vide (objet vide `[Object: null prototype] {}`) ; `execute` sur un pipeline contenant `tap`/`print`.

## 3.4 Famille producteurs : `loop`, `loopAccumulator`, `createExternalAsyncGenerator`

**Fait [VÉRIFIÉ]**
- `DGenerator.loop(cb)` (`generator/loop.ts`) : générateur infini piloté par `cb({ count, next, exit })`. `next(...valeurs)` → émet chaque valeur **différente de `undefined`** puis continue ; `exit(...valeurs)` → émet ses valeurs non-`undefined` puis termine. `count` part de 0. Doc `10-loop.ts` : « `exit()` termine sans ajouter de valeur », « `exit(value)` termine la boucle et émet sa valeur ».
- `DGenerator.loopAccumulator(init, cb)` (`generator/loopAccumulator.ts`) : idem avec un accumulateur : `next(nouvelAccumulateur, ...valeurs)`. `init` peut être enveloppé par `loopAccumulatorFrom(v)` (même rôle de typage que `reduceFrom`).
- À ne pas confondre avec `DCommon.loop` / `DCommon.loopAccumulator` (`common/loop.ts` L36-52, `common/loopAccumulator.ts` L69-94), qui **ne sont pas** des générateurs : ils bouclent immédiatement et renvoient la valeur passée à `exit`.
- `createExternalAsyncGenerator<T>()` (`generator/createExternalAsyncGenerator.ts`) : renvoie `{ asyncGenerator, next(item), exit() }`. Tel qu'écrit, le générateur attend **une seule** promesse puis se termine : il émet **au plus un élément** (pas de boucle dans le corps). [VÉRIFIÉ dans le code ; l'intention d'un flux multi-éléments est une HYPOTHÈSE]

**Pourquoi** — Commit `1f65858 fix:lang(hf): loop`. Remplacer `while`/`for` impératifs par une forme expression, typée, avec sortie explicite.

**Conséquence transpileur** — `loop` → `iter.Seq` contenant un `for count := 0; ; count++` ; reconnaître `return next(...)`/`return exit(...)` comme en §2.11. Le filtrage des `undefined` suppose une représentation de l'absence (§1.8).

**Cas à anticiper** — boucle sans `exit` atteignable (infinie, mais paresseuse : ne bloque que si on la consomme entièrement) ; `next()` sans valeur ; plusieurs valeurs par tour ; consommation partielle ; confusion `DCommon.loop` / `DGenerator.loop` (même nom, sémantique différente).

---

# 4. Domaine `array`

## 4.1 Familles de comportement du domaine `array`

**Fait [VÉRIFIÉ]** — 48 fichiers, ~54 fonctions (`packages/lang/scripts/array/`). Familles et invariants :

| Famille | Fonctions | Invariant |
|---|---|---|
| Accès | `at`, `first`, `last`, `length`, `isLastIndex` | `at` accepte les index négatifs (natif) ; hors bornes → `undefined` |
| Prédicats de taille (contraintes) | `minElements`, `maxElements`, `lengthEqual`, `is` | renvoient un booléen et affinent le type |
| Itération avec contexte | `map`, `filter`, `find`, `findLast`, `findIndex`, `findLastIndex`, `some`, `every`, `flatMap` | callback `(element, { index, self })` |
| Itération avec signaux | `reduce`, `reduceRight`, `select`, `group` | callback objet + `next`/`exit`, `select`/`skip`, `output` |
| Recherche par valeur | `includes`, `notIncludes`, `indexOf`, `lastIndexOf`, `findDuplicates` | `includes` = SameValueZero (trouve `NaN`) ; `indexOf` = `===` (ne trouve pas `NaN`) |
| Ajout / retrait immuables | `push`, `unshift`, `insert`, `concat`, `prepend`, `pop`, `shift`, `set`, `fill`, `fillAll`, `copyWithin`, `spliceDelete`, `spliceInsert`, `spliceReplace` | copie superficielle systématique |
| Recherche + modification | `findAndReplace`, `findAndSpliceDelete`, `findAndSpliceInsert`, `findAndSpliceReplace` | `undefined` si rien trouvé ; premier élément satisfaisant seulement |
| Restructuration | `slice`, `chunk`, `flat`, `reverse`, `sort` | `sort` exige un comparateur ; stable |
| Conversion | `coalescing`, `from` | `from` accepte itérables sync (tableau) et async (promesse de tableau) |

**Détails notables [VÉRIFIÉ]**
- `set(array, index, value)` : index ramené par double modulo `((i % n) + n) % n` (`array/set.ts` L39-42) → les index négatifs et supérieurs à la longueur **bouclent** ; sur tableau vide, `NaN` → `RangeError`.
- `indexOf(array, el, fromIndex?)` : `fromIndex` négatif → `max(0, n + from)` ; positif → `min(from, n - 1)` (`array/indexOf.ts` L31-37).
- `chunk` : `Math.round(size)`, taille non strictement positive → `[]` (`array/chunk.ts` L49-53).
- `select` : filtre et transforme en une passe (`select(v)` garde, `skip()` écarte — `array/select.ts` L60-93).
- `findDuplicates` : renvoie les éléments vus plus d'une fois (une fois chacun) ou **`undefined`** s'il n'y en a pas ; les `TheDate`/`TheTime` sont comparés par leur forme sérialisée (`array/findDuplicates.ts` L22-70).
- `flat(array, depth?)` : natif, non curifiable. `sort(array, cmp)` : comparateur **obligatoire** (pas de tri lexicographique par défaut) ; pour trier des nombres ou des chaînes : `DNumber.sort`, `DString.sort`.
- Commentaire récurrent « Use a loop if spread inputs can become large. » (`concat`, `push`, `prepend`, `unshift`, `splice*`) : les auteurs savent que `f(...grosTableau)` peut dépasser la limite d'arguments.

**Pourquoi** — Doc API : « Opérations immuables de lecture, transformation, sélection, réduction et modification de tableaux, avec prise en compte de leurs contraintes de typage. »

**Conséquence transpileur** — Mécanique avec des génériques Go (`[]T`) pour presque tout. Demandent une représentation : `T | undefined` (accès, recherche), `find*And*` (tableau ou absence), `group` (map ordonnée), tuples, `from` asynchrone. Égalité : `includes`/`indexOf` sur des éléments non comparables en Go (slices, maps) → en JS c'est l'égalité de **référence** pour les objets ; en Go il faut soit des pointeurs, soit interdire.

**Cas à anticiper** — tableaux creux (trous préservés par `map`, visités par les boucles indexées de `reduce`/`findIndex`) ; `NaN` dans `includes` vs `indexOf` ; index négatifs (`at(-1)`, `slice(-2)`) ; `sort` et stabilité ; `push` variadique ; égalité d'objets par référence ; tableaux de tuples (`[number, number, number][]` dans `projects/08`) ; tableau vide partout.

---

# 5. Domaines `string`, `number`, `object`, `tuple`

## 5.1 `string` : familles et pièges

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/string/` (51 fonctions). Presque toutes délèguent à la méthode native homonyme.

| Famille | Fonctions |
|---|---|
| Conversion | `to` (§2.12), `stringify` (`JSON.stringify(v) ?? String(v)`, repli `String(v)` si exception) |
| Casse / espaces | `toLowerCase`, `toUpperCase`, `capitalize`, `uncapitalize`, `trim`, `trimStart`, `trimEnd`, `isTrimmed`, `normalize` |
| Accès / découpe | `at`, `charAt`, `first`, `last`, `slice`, `substring`, `pop` (sans dernier caractère), `shift` (sans premier), `split`, `length` |
| Assemblage | `concat`, `prepend`, `join` (sur un tableau de chaînes), `repeat`, `padStart`, `padEnd` |
| Recherche | `includes`, `startsWith`, `endsWith`, `indexOf`, `lastIndexOf`, `search`, `test`, `extract`, `extractAll`, `replace`, `replaceAll` |
| Prédicats / contraintes | `isNotEmpty`, `minCharacters`, `maxCharacters`, `lengthEqual`, `isEmail`, `isUrl`, `isUuid`, `isNumber`, `isComposedOf`, `isIn`, `isKeyof` |
| Tri | `sort(tableau, "ASC" | "DSC")`, `sortCompare` |

Détails : `split` renvoie `[""]` plutôt qu'un tableau vide et ignore une limite invalide (`string/split.ts` L114+) ; `repeat` renvoie `""` pour un compte négatif ou non fini au lieu de lever ; `extract` renvoie `{ matchedValue, groups, namedGroups, offset, self }` ou `undefined` ; `extractAll` renvoie un **générateur** ; `sort` ASC utilise le tri natif par défaut (ordre des unités UTF-16), DSC compare avec `<`/`>` ; `sortCompare` utilise un `Intl.Collator` (dépend de la locale/ICU) ; `isUrl` s'appuie sur `new URL()`.

**Pourquoi** — Doc : fonctions « faites pour être composées » ; chaque prédicat/transformation attache des contraintes (`trim` → `Trimmed`, `isNotEmpty` → `MinCharacters<1>`).

**Conséquence transpileur** — Les chaînes JS sont des suites d'**unités UTF-16** ; les chaînes Go sont des octets UTF-8. `length`, `at`, `charAt`, `slice`, `substring`, `indexOf`, `padStart`, `minCharacters`… comptent en unités UTF-16 : `"é".length === 1` (2 octets en Go), `"😀".length === 2` (4 octets, 1 rune). Il faut des helpers Go travaillant en UTF-16 (`utf16.Encode`) pour toute opération indexée. Regex : la syntaxe et la sémantique JS diffèrent de RE2 (pas de lookahead ni de backreference en Go) — `emailRegex` (`string/isEmail.ts` L3) utilise des lookaheads négatifs → à réécrire à la main. `toLowerCase`/`toUpperCase` : règles Unicode (ex. `ß` → `SS`). `trim` : ensemble d'espaces JS (inclut U+FEFF, séparateurs de ligne) ≠ `strings.TrimSpace`.

**Cas à anticiper** — accents (`"échec"` dans `projects/08`), emojis, paires de substitution coupées par `slice` ; `split` avec regex ; `replace` avec fonction de remplacement ; `sortCompare` (collation locale) ; `isNumber` (regex : accepte `1e5`, `.5`, refuse `+1`, `Infinity`).

## 5.2 `number` : familles et pièges

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/number/` (22 fonctions). Pas d'arithmétique (`add`, `multiply`… n'existent pas : les opérateurs natifs restent utilisés) ; uniquement comparaisons, prédicats, agrégats, tri.

| Famille | Fonctions | Sémantique |
|---|---|---|
| Comparaison (curry 1) | `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual` | `value > threshold` etc. ; en curry, **l'argument configuré est la borne** |
| Intervalle (curry 2) | `betweenThan`, `betweenThanOrEqual` | `value > greater && value < less` / inclusif |
| Prédicats | `isEven` (`% 2 === 0`), `isOdd` (`% 2 !== 0`), `isInteger`, `isMultipleOf`, `isNotZero`, `isSafe` | — |
| Signe | `isPositive` (`>= 0`), `isStrictPositive` (`> 0`), `isNegative` (`<= 0`), `isStrictNegative` (`< 0`) | **zéro est à la fois positif et négatif** |
| Agrégats | `sum` (boucle depuis 0), `min`/`max` (`Math.min(...values)`), `minOf`/`maxOf` (boucle avec `<`/`>`) | — |
| Tri | `sort(tableau, "ASC" | "DSC")` | comparateur numérique `a - b` |

Détails : `isSafe` est **strict** aux bornes (`> MIN_SAFE_INTEGER && < MAX_SAFE_INTEGER`) et accepte les non-entiers ; `min`/`max` exigent au moins un élément par le typage (`RequireAtLeastElements`), propagent `NaN`, et distinguent `-0`/`+0` ; `minOf`/`maxOf` ignorent un `NaN` non initial (comparaisons fausses) ; `isOdd(1.5)` est vrai ; `isEven(-0)` vrai ; `%` JS = reste tronqué, du signe du dividende.

**Pourquoi** — Doc : « Prédicats et transformations fonctionnelles pour comparer, vérifier, agréger et trier des nombres tout en conservant leurs contraintes de typage. » [HYPOTHÈSE] `isPositive` incluant 0 suit la convention mathématique française (positif = ≥ 0, strictement positif = > 0).

**Conséquence transpileur** — `number` → `float64` (choix déjà acté par `projects/00/README.md`). `%` → `math.Mod` (même convention de signe que JS, y compris sur flottants) et non l'opérateur `%` entier. `Math.min/max` : `math.Min/Max` de Go gèrent `NaN` et `±0` de façon compatible [HYPOTHÈSE]. Division par zéro : `float64` donne `±Inf`/`NaN` comme JS (pas de panique tant qu'on reste en flottant).

**Cas à anticiper** — `NaN` dans toute comparaison (toujours faux) ; `-0` ; grands entiers au-delà de 2^53 ; `sum([])` = 0 ; `max([])` interdit par le typage mais `-Infinity` au runtime ; prédicats utilisés comme callbacks de `filter` (`DArray.filter(DNumber.greaterThanOrEqual(18))`) ; opérateurs natifs (`+`, `-`, `*`, `/`, `<`) hors bibliothèque.

## 5.3 `object` : familles et pièges

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/object/` (21 fonctions).

| Famille | Fonctions | Sémantique |
|---|---|---|
| Lecture | `getProperty`, `getDeepProperty` (chemin pointé), `keys`, `values`, `entries`, `countKeys`, `hasKeys` | `keys`/`entries` utilisent `for…in` (propriétés énumérables **héritées incluses**) et **excluent les clés de kind** ; `values` utilise `Object.entries` (propres) ; `hasKeys` teste `!== undefined` |
| Construction | `entry(k, v)`, `fromEntries`, `to(input, shape)` | `to` construit un objet en appliquant chaque fonction de la forme à l'entrée |
| Fusion | `assign` (spread, `undefined` écrase), `override` (**ignore** les valeurs `undefined`), `deepOverride` (récursif sur objets simples et tableaux) | nouvelle référence |
| Sélection | `pick`, `omit` (tableau de clés ou objet `{clé: true}`) | via `Reflect.ownKeys` |
| Transformation | `transformProperty(key, fn)`, `transformProperties({key: fn})` | copie + propriété recalculée |
| Discrimination | `discriminate(key, pred)`, `discriminateEntryKey`, `discriminateEntryValue`, `is`, `isSimple` | `is` = objet non nul ; `isSimple` = constructeur absent ou nommé `Object` |

`entries.unsafe = Object.entries` est exposé et marqué `@deprecated Not ignore kind key.` (`object/entries.ts`).

**Pourquoi** — Doc : « lire, discriminer, transformer, fusionner et reconstruire des objets en conservant les informations de typage utiles ». Le filtrage des clés de kind garde les métadonnées invisibles pour le code métier (§1.5).

**Conséquence transpileur** — Objets à forme connue → structs Go ; les fonctions deviennent du **code généré par forme** (pas de générique possible sur les noms de champs) : `pick`, `omit`, `transformProperty`, `assign` produisent de nouveaux types struct. `keys`/`entries` sur struct → listes constantes dans l'ordre de déclaration/insertion. Objets à clés dynamiques (`Record<string, T>`) → map **ordonnée**. Propriété optionnelle/`undefined` → champ avec présence explicite.

**Cas à anticiper** — ordre des clés (entières d'abord) ; `undefined` vs clé absente (`override`, `hasKeys`, JSON) ; objets avec kinds (clés masquées par `DObject.keys`, visibles par `print`) ; spread natif `{...a, ...b}` hors bibliothèque ; `Record` dynamique ; `getDeepProperty` avec chemin littéral.

## 5.4 `tuple`

**Fait [VÉRIFIÉ]** — Deux fonctions (`packages/lang/scripts/tuple/`) : `from(source)` renvoie `source` tel quel (rôle : fixer le **type** tuple d'un littéral, `tuple/from.ts` L29) ; `map(tuple, fn)` est, au runtime, identique à `DArray.map` (`tuple/map.ts` L40) mais son type conserve la cardinalité et la position (`readonly [U, U]`). Commentaires dans `array/index.ts` : `toTuple` envisagé, non livré.

**Pourquoi** — `10-built-in-function.ts` : « Les tuples disposent eux aussi de fonctions curifiées. » Le type distingue ce que le runtime confond.

**Conséquence transpileur** — Au runtime JS, un tuple **est** un tableau (affiché `[ 1, 2, 1 ]`). En Go : struct positionnelle générée (`Tuple3[A, B, C]`) quand les types diffèrent, ou tableau fixe `[3]float64` / slice quand ils sont homogènes. Il faut une politique de **conversion tuple → slice** (coalescing renvoie `readonly [T]`, `map` d'un tuple renvoie un tableau) et un affichage identique à celui d'un tableau.

**Cas à anticiper** — tuple homogène vs hétérogène ; déstructuration dans un paramètre (`([one, two, divisor]) =>`, `projects/08`) ; tuple à 1 élément issu de `coalescing` ; tuple avec élément rest (`[A, ...B[]]`) ; tuple optionnel ; tuple passé à une fonction attendant `readonly T[]`.

---

# 6. Domaine `common` (hors fonctions prioritaires)

## 6.1 Familles du domaine `common`

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/common/` (≈ 65 exports runtime + ~60 types utilitaires dans `common/types/`).

| Famille | Fonctions | Sémantique |
|---|---|---|
| Composition | `pipe`, `innerPipe`, `preparePipe`, `pipeCall`, `asyncPipe`, `asyncInnerPipe`, `prepareAsyncPipe` | §1.3, §2.1, §2.2 |
| Identité / observation | `forward`, `cast`, `infer`, `shameOnYou`, `createConstraintFactory`, `removeConstraint`, `print`, `forwardLog`, `tap` | renvoient l'entrée |
| Valeurs constantes | `justReturn(value)` (curry 1 : ignore l'entrée), `justExec(fn)` (IIFE nommée) | — |
| Branchement | `when(pred, fn)`, `whenNot`, `whenElse(pred, then, else)` | `when` : `pred(input) ? fn(input) : input` (`common/when.ts` L55-77) ; curry à 2 (3 pour `whenElse`) |
| Prédicats | `equal(value | valeurs[])`, `and([preds])`, `or([preds])`, `truthy`, `falsy`, `isType(type)`, `instanceOf(ctor)`, `toCurriedPredicate` | `equal` : `===`, ou `Array.includes` (SameValueZero) si liste (`common/equal.ts` L122-138) ; `and`/`or` court-circuitent |
| Assertions | `asserts(input, pred)`, `forwardAsserts(pred)` | lèvent `AssertsError` (sous-classe de `DuploJSError`) |
| Boucles | `loop`, `loopAccumulator`, `loopAccumulatorFrom`, `asyncLoop`, `asyncLoopAccumulator` | immédiates, sortie par `exit(v)` |
| Paresse / mémoire | `memo`, `memoObject`, `memoPromise`, `createGlobalStore` | §2.5 |
| Promesses | `promiseAll`, `promiseObject`, `callThen`, `createExternalPromise`, `timeout`, `createAsyncRetry`, `useAsyncRetry`, `createQueue` | `callThen(v, fn, catch?)` applique `fn` immédiatement ou via `.then` selon que `v` est une promesse |
| Clonage | `clone` (récursif tableaux/objets), `simpleClone` (objets simples, respecte accesseurs) | — |
| Fabriques | `createEnum([...])` (objet `{A: "A", …, toTuple, has, contract}`), `createBuilder`, `createTransformer`/`transformer`, `createInterpolation`, `createFormData`, `bindPrototypeMethods`, `detachObjectMethod` | — |
| Divers | `escapeRegExp`, `toRegExp`, `stringToBytes`, `stringToMillisecond`, `mimeType`, `toJSON`, `toNative`, classe `DuploJSError` | — |

`isType` reconnaît : `string`, `number`, `boolean`, `function`, `bigint`, `undefined`, `null`, `symbol`, `object` (non-tableau, non-itérable), `iterable`, `asyncIterable`, `array` (`common/isType.ts`).

**Pourquoi** — Doc : « Fonctions générales de composition, de transformation, de contrôle de flux et de manipulation des valeurs partagées par les autres domaines DuploJS. » Elles remplacent `if`, `while`, `===`, `typeof`, `instanceof` par des **expressions pipeables qui affinent les types**. Commits correctifs récents sur cette famille : `bf22b91 when`, `3175cce whenNot`, `58682c8 and`, `8b22bda equal`, `5509bba or` (novembre 2026) → typage encore en mouvement.

**Conséquence transpileur** — `when`/`whenElse` → `if` Go produisant une valeur de type **union** (`Output | Input`) : représentation d'union requise sauf si les deux branches ont le même type. `equal` avec littéraux → comparaison Go (ou `switch`). `isType` → décidable statiquement dans la plupart des cas, sinon type switch. `and`/`or` → `&&`/`||`. `justReturn(v)` → closure constante. Les fabriques (`createEnum`…) sont à traiter comme des **déclarations**.

**Cas à anticiper** — `when` dont la branche change le type ; prédicats-gardes de type (le narrowing TS doit devenir un type switch) ; `equal` sur `NaN` (faux avec une valeur seule, **vrai** avec une liste) ; `equal` sur objets (référence) ; `truthy`/`falsy` (valeurs falsy JS : `0`, `-0`, `NaN`, `""`, `null`, `undefined`, `false`, `0n`) ; exceptions (`asserts`) → `panic` ou erreur Go ; `createEnum` utilisé comme type **et** comme valeur.

---

# 7. Autres domaines (lecture par échantillonnage)

## 7.1 `pattern`

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/pattern/` (19 fonctions). `match(input, pattern, fn)` : si `input` n'est pas déjà un `PatternResult` et que `isMatch(input, pattern)`, renvoie `result(fn(input))` (objet `{ "@duplojs/lang/kind/@DuplojsLangPattern/result": valeur }`), sinon renvoie `input` inchangé (`pattern/match/index.ts`). On enchaîne les `match` dans un pipe et on termine par `exhaustive` (déballe le résultat ; le typage garantit qu'il ne reste aucun cas) ou `otherwise(fn)` (`pattern/otherwise.ts` L33). `when`/`whenNot` : même mécanique avec un prédicat. `match(input)` seul ouvre un builder chaîné.
`isMatch` (`pattern/isMatch.ts` L42+) : primitive → `===` ; fonction → prédicat ; tableau → comparaison récursive élément par élément (préfixe) ; objet → comparaison récursive propriété par propriété (sous-ensemble) ; « tool patterns » (`union(...)`).
Raccourcis : `matchWithString`/`matchWithNumber` (table `{ valeur: handler }`, `matcher[input](input)`), `matchWithTaggedObject`, `matchWithEntity`, `matchWithError`, `matchWithFact`, chacun avec variante `…Otherwise`.

**Pourquoi** — `07-discrimination/index.md` : « Sélection et affinement des types dans les unions : identité, valeurs littérales, forme ou prédicats, traitement exhaustif ou partiel. » Commit `5c5ca34 fix:lang(hf): reject undefined matcher handlers`.

**Conséquence transpileur** — Chaîne `match…exhaustive` → `switch`/`if-else` Go ; l'enveloppe `PatternResult` n'a pas besoin d'exister si la chaîne est reconnue statiquement. `matchWithString` → `switch` sur chaîne. Motifs objets → comparaisons champ par champ générées.

**Cas à anticiper** — ordre des cas (premier gagnant) ; motifs imbriqués ; motif fonction ; résultat union de types hétérogènes ; `otherwise` vs `exhaustive` ; valeur mise en correspondance qui est elle-même un `PatternResult`.

## 7.2 `printer`

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/printer/` : mise en forme de **chaînes** pour terminal, sans rapport avec `DCommon.print`. `bold(s)` = `\x1b[1m` + s + `\x1b[0m` ; `colorized(s, couleur)` (rouge 31, vert 32, jaune 33, bleu 34, magenta 35, cyan 36, gris 90) ; `colorizedBold` ; `renderLine(valeurs, { indent, indentLevel, joinCharacter })` aplatit récursivement, ne garde que les chaînes et `true` (rendu `"true"`), joint par une espace ; `renderParagraph(valeurs, { back: "LF" | "CRLF", indent… })` joint par saut de ligne et indente chaque ligne ; enums `Indent` (`tab`, `space1`…`space4`), `Back` ; constante `dash = "-"`.

**Pourquoi** — Commit `217a820 feat:lang(hf): configure printer indentation and line breaks`. Construire des sorties CLI de façon déclarative (les `false`/`undefined` sont ignorés → rendu conditionnel `condition && "texte"`).

**Conséquence transpileur** — Concaténations de chaînes, mécanique. Entrée hétérogène (`string | boolean | undefined | tableau imbriqué`) → union récursive à représenter.

**Cas à anticiper** — valeurs conditionnelles (`cond && "x"`), imbrication profonde, `indentLevel` non entier (tronqué), CRLF.

## 7.3 `chrono`

**Fait [VÉRIFIÉ par échantillonnage]** — `packages/lang/scripts/chrono/` (~82 fonctions). Deux types : `TheDate` (classe étendant `Date` via `DKind.parentClass`, constructeur privé, setters neutralisés, `toString()`/`toJSON()` renvoyant la forme sérialisée) et `TheTime` (durée). Création par `createDate`/`createTime` qui renvoient un **Either** (`right("date-created", …)` / `left("date-created-error", null)`), ou variantes `…OrThrow`. Opérateurs curifiables : `addDays`, `addHours`, `addMonths`, `subtract…`, comparaisons (`greaterThanDate`, `betweenThanTime`…), getters (`getYear`, `getDayOfWeek`…), `formatDate(format, timezone)`, `applyTimezone`, `round`, `eachDate`, `sortDates`, `minDate`/`maxDate`, `now`, `today`, `tomorrow`, `yesterday`. Les fonctions acceptent `TheDate | SerializedTheDate` (chaîne). `addDays` = timestamp + `jours × 86 400 000` (pas de logique calendaire).

**Pourquoi** — `Date` natif est mutable et ses erreurs sont silencieuses (`Invalid Date`) ; `05-chrono` : création validée, manipulation, sérialisation, fuseaux.

**Conséquence transpileur** — Type Go dédié autour d'un timestamp en millisecondes (`float64` ou `int64`) ; fuseaux via `time.LoadLocation` (dépend de la base tz du système) ; format de sérialisation à reproduire exactement. `now()` rend la sortie non déterministe → hors comparaison dorée.

**Cas à anticiper** — sérialisation dans `print` (une `TheDate` est une `Date` + une clé de kind) ; fuseaux et changements d'heure ; bornes de timestamp sûr ; `addMonths` en fin de mois.

## 7.4 `dataStructure`

**Fait [VÉRIFIÉ par échantillonnage]** — `packages/lang/scripts/dataStructure/` (~65 helpers) : schémas de validation runtime reflétés dans les types (`string()`, `number()`, `object({...})`, `array(...)`, `union`, `literal`, `record`, `optional`, `nullable`, `lazy`, `refine`, contraintes `integer`, `email`, `minCharacters`, `greaterThan`…, codecs encode/decode, erreurs interprétables). Une structure est un objet kindé (`*-structure`, `*-type`, `*-constraint`) ; valider renvoie un Either et, en cas de succès, une valeur dont le type porte les contraintes.

**Pourquoi** — `04-data-structure/index.md` : « Contrats de données partagés entre TypeScript et runtime ». C'est la **frontière** où une donnée non fiable acquiert ses contraintes (« la présence d'un kind ne valide pas les données reçues ; utiliser le contrat de validation du domaine à la frontière externe », `08-kind/30-transport.md`).

**Conséquence transpileur** — Le plus difficile à traduire mécaniquement : schémas = valeurs runtime **et** types calculés. Stratégie réaliste : évaluer le schéma à la compilation et générer un validateur Go spécialisé + la struct cible.

**Cas à anticiper** — schémas récursifs (`lazy`), unions, codecs, messages d'erreur (texte exact), schémas construits dynamiquement (non traduisibles).

## 7.5 `path`

**Fait [VÉRIFIÉ par échantillonnage]** — `packages/lang/scripts/path/` (21 fonctions) : manipulation de chemins **comme chaînes contraintes**, sans accès disque : `create`/`createAbsolute`/`createSegment` (→ Either) et variantes `…OrThrow`, `declarePath`/`declareAbsolutePath`/`declareSegment` (littéraux), `normalize`, `resolveFrom`, `resolveRelative`, `computeRelative`, `concatSegment`, `getBaseName`, `getExtensionName`, `getParentFolderPath`, `is`, `isAbsolute`, `isSegment`, `createMatcher`. Contraintes : `Path`, `AbsolutePath`, `Segment`.

**Pourquoi** — Indépendance de plateforme (pas de `node:path`), chemins validés par le typage.

**Conséquence transpileur** — Fonctions de chaînes pures, à porter une à une (ne pas substituer `path/filepath`, dont la normalisation diffère).

**Cas à anticiper** — `..`, doubles barres, barre finale, extensions multiples, chemins vides.

## 7.6 `invocation`

**Fait [VÉRIFIÉ par échantillonnage]** — `packages/lang/scripts/invocation/` : contrats d'opérations — `signedFunction`/signature, `createPort`, `createReader`, `createResolver`, `resolveReaders`, `createStep`, `createWorkflow` (effets `commit`, `iterate`, `resolve`, `breakIfLeft`, implémentés en générateurs), `flow` et contrôleurs (`aborter`, `debounce`, `exclusive`, `filter`, `retry`, `throttling`, `timeout`), `appendEvidence`/`evidenceResult`, `withAdditionalResult`. Absent de la doc API agents-kit.

**Pourquoi** — `06-modeling/index.md` : « preuves de passage et identité des opérations dans les contrats » ; architecture type-driven (ports, lecteurs, workflows).

**Conséquence transpileur** — Hors de portée d'une traduction mécanique (générateurs comme effets, temporisations) ; à traiter en dernier, probablement par un runtime Go écrit à la main.

**Cas à anticiper** — temporisations (`debounce`, `throttling`, `timeout`) dépendantes de l'horloge, annulation, workflows à effets.

## 7.7 `kind` (API publique)

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/kind/` : `create(name)`, `createNamespace(ns)`, `isRuntimeKey(key)`, `keyKindPrefix`, `has(input, kinds)`, `hasSome(input, kinds)`, `createKindIdentifier()`, `parentClass(kind, Parent?)`, plus les types `Kind`, `Handler`, `Definition`, `GetValue`, `GetHandler`, `GetName`, `Remove`, `RemoveOne`, `Maybe`. Les noms de kind ne peuvent contenir ni `@` ni `/` (`ForbiddenKindNameCharacter`, L84). Détail en §1.5.

**Conséquence transpileur** — Un programme utilisateur créant ses propres kinds définit en réalité de nouveaux **types nominaux** : chaque `createKind("x")` au niveau module → une déclaration de type/marqueur Go.

**Cas à anticiper** — kind créé dans une fonction (dynamique), kinds homonymes de namespaces différents, `DKind.Remove<T>` dans des signatures utilisateur.

---

# 8. Synthèse pour la traduction vers Go

## 8.1 Ce qui se traduit mécaniquement (génériques Go)

**Fait / Conséquence**
- Fonctions data-first sur tableaux homogènes : `map`, `filter`, `some`, `every`, `flatMap`, `push`, `concat`, `slice`, `reverse`, `sort`, `chunk`, `includes` (types `comparable`), `DNumber.sum/min/max`, comparaisons numériques.
- Identités : `forward`, `cast`, `infer`, `DTuple.from`, `coalescing` sur tableau.
- `pipe`/`innerPipe` : déroulés en affectations / closures.
- `tap`, `justReturn`, `when` à types homogènes, `and`/`or`.
- `DString` non indexées : `concat`, `repeat`, `startsWith`, `endsWith`, `includes`, `join`.

**Cas à anticiper** — même pour ces fonctions : allocation obligatoire (immutabilité), arité du callback, effacement des contraintes dans les types.

## 8.2 Ce qui demande une représentation dédiée

| Besoin | Où il apparaît | Piste Go |
|---|---|---|
| Union de types | `when`, `coalescing` sur union, retours `A | E` de `reduce`, `T | undefined`, callbacks renvoyant plusieurs formes | interface scellée + type switch, ou struct étiquetée générée |
| Absence (`undefined`) vs `null` | `find`, `at`, `indexOf`, kinds marqueurs (`null`), Left sans valeur (`undefined`) | `Maybe[T]` ; deux sentinelles distinctes pour l'affichage |
| Tuple | `coalescing` (tuple à 1), `DTuple`, `[number, number, number][]`, `promiseAll` | struct générée ou slice si homogène ; conversion tuple → slice |
| Fonction variadique typée | `pipe`/`asyncPipe` (1 à 15 étapes), `push(...valeurs)`, `concat(...)`, `next(...sorties)` | déroulage à la compilation ; variadique Go si homogène |
| Callback à arité variable | `(element, { index, self })` | signature Go fixe + adaptateur généré |
| Objet kindé | Either, PatternResult, TaggedObject, `reduceFrom` | struct + liste ordonnée de clés texte pour l'affichage |
| Objet à clés ordonnées | `group`, `Record`, `DObject.entries` | map ordonnée (clés entières d'abord) |
| Paresse | `memo`, générateurs | `sync.Once`, `iter.Seq` (attention : usage unique en JS) |
| Promesse | `asyncPipe`, `promiseAll`, `tap` async, `DArray.from` async | futur maison ou exécution bloquante séquentielle |
| Signal de contrôle | `next`/`exit`, `select`/`skip`, `output` | reconnaissance statique → `continue`/`return` ; sinon type somme |

## 8.3 Pièges de sémantique JS à reproduire

**Fait [VÉRIFIÉ sauf mention]**
- **Formatage des nombres** : `String(n)` (§2.12) ≠ `fmt`/`strconv` par défaut [HYPOTHÈSE côté Go] ; `-0` → `"0"` en chaîne mais `-0` dans `print`.
- **Affichage** : `util.inspect` (guillemets simples, colonnes au-delà de 6 éléments, largeur 80, profondeur 2, 100 éléments) — §2.3.
- **Égalité** : `===` (pas de coercition ; `NaN !== NaN` ; objets par référence) vs SameValueZero dans `includes` et `equal([...])` (`NaN` trouvé). Go `==` sur `float64` se comporte comme `===` ; sur structs il compare **par valeur**, ce qui diffère de la comparaison par référence des objets JS.
- **Tableaux creux** : `map`/`filter`/`some` natifs sautent les trous ; les boucles indexées de la lib (`reduce`, `findIndex`, `findAndReplace`, `group`) les visitent comme `undefined`. Peu probable dans les exercices, mais `new Array(n)` existe.
- **`undefined` vs `null`** : distincts à l'affichage et dans `override`/`hasKeys` ; `JSON.stringify` omet les propriétés `undefined`.
- **Chaînes UTF-16** : longueurs et index (§5.1).
- **Ordre des clés d'objet** : entières croissantes puis insertion.
- **Arrondi** : `Math.round` arrondit le demi vers +∞.
- **Modulo** : reste tronqué du signe du dividende, y compris flottant.
- **Tri** : stable ; `DString.sort` ASC = ordre des unités UTF-16 (pas l'ordre des runes : diffère pour les caractères hors BMP).
- **Ordre d'évaluation** : arguments évalués de gauche à droite avant l'appel ; les étapes curifiées d'un pipe sont **construites** avant que la première ne s'exécute.
- **Asynchronisme** : `await` cède toujours la main (microtâche) ; une fonction `async` s'exécute de façon synchrone jusqu'à son premier `await`.
- **Exceptions** : `asserts`, `…OrThrow`, `RangeError` de `array.with` → `panic`/`error`.
- **Sortie** : `console.info` → stdout ; `warn`/`error` → stderr.

## 8.4 Liste large de cas à anticiper (transversale)

1. Même fonction appelée en data-first et en curry dans le même fichier.
2. Fonction de la lib passée par référence comme callback (forme unique vs forme curifiée vs forme à dispatch — §1.2).
3. Application partielle stockée dans une constante, exportée, réutilisée.
4. `pipe` imbriqués, `innerPipe` dans `map`, `asyncPipe` contenant `pipe`.
5. Étape de pipe qui change la **forme** du type (nombre → tableau → tableau de chaînes, `projects/05`).
6. Branches produisant des types à unifier (`readonly [number]` et `number[]`).
7. Type littéral (`const` generic) à élargir : `3` → `float64`, `"success"` → `string`.
8. Contraintes en intersection à effacer.
9. Valeur Either imprimée à chaque niveau d'imbrication (tableau d'Either, Either de tableau).
10. Tableau de tuples avec déstructuration en paramètre.
11. Callback qui capture des variables externes (closures Go : attention aux variables de boucle avant Go 1.22).
12. Callback async dans `map` (tableau de promesses) puis `promiseAll`.
13. Promesse créée, stockée, attendue plus tard (`projects/10`).
14. `print` dont l'argument est le résultat d'un `await`.
15. Nombres : division non entière, division par zéro, `NaN`, `-0`, dépassement de 2^53.
16. Chaînes non-ASCII dans les sorties (`'échec'`, `'transaction annulée'`).
17. Tableaux de plus de 6 éléments, de plus de 100, ou dont la ligne dépasse 72 caractères, à l'affichage.
18. Objets simples vs objets kindés vs `Record` dynamiques.
19. `undefined` explicite dans les données (Left sans valeur, `find` infructueux).
20. Imports sous toutes leurs formes (§1.1) et homonymes inter-domaines.
21. Générateur consommé deux fois ; générateur non consommé.
22. `DCommon.loop` vs `DGenerator.loop`.
23. `reduce` avec `exit` d'un autre type que l'accumulateur.
24. `group` avec clés numériques.
25. Code utilisateur mélangeant API native (`arr.map`, `Object.keys`, `String(n)`, template literals, `console.log`) et API DuploJS — les deux doivent partager le même runtime Go de formatage.

---

# 9. Inventaires par domaine

> Générés par script. Description : `packages/agents-kit/docs/API/10-lang/<domaine>/index.llms.md`. « Forme » : détectée dans l'implémentation — `curry si args.length===N` signifie « N arguments → renvoie une fonction unaire attendant la donnée ; sinon la donnée est le premier argument » [VÉRIFIÉ automatiquement, relu manuellement pour `array`, `string`, `number`, `object`, `tuple`, `generator`, `common`]. Les domaines `kind`, `modeling` et `invocation` n'ont pas de page dans cette doc : voir §1.5, §1.6, §7.6, §7.7.

## 9.1 Inventaire `DArray`

- `DArray.at` — Lire l’élément situé à un index en reflétant dans le type la possibilité d’une absence. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/at/default.ts`.
- `DArray.chunk` — Découper un tableau en sous-tableaux dont la taille ne dépasse pas la limite donnée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/chunk.ts`.
- `DArray.coalescing` — Convertir une valeur en tableau sans ré-encapsuler une valeur déjà contenue dans un tableau. Forme : forme unique. Source : `packages/lang/scripts/array/coalescing.ts`.
- `DArray.concat` — Ajouter les éléments d’un ou plusieurs tableaux à la fin sans muter le tableau d’entrée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/concat.ts`.
- `DArray.copyWithin` — Copier une portion d’un tableau vers une autre position dans une nouvelle copie. Forme : curry décidé par type du 1er argument. Source : `packages/lang/scripts/array/copyWithin.ts`.
- `DArray.every` — Vérifier que tous les éléments d’un tableau satisfont un prédicat. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/every.ts`.
- `DArray.fill` — Remplacer une plage d’éléments par une valeur dans une nouvelle copie du tableau. Forme : curry si args.length===3, sinon data-first. Source : `packages/lang/scripts/array/fill/default.ts`.
- `DArray.fillAll` — Remplacer tous les éléments d’un tableau par une même valeur dans une nouvelle copie. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/fill/all.ts`.
- `DArray.filter` — Construire un nouveau tableau avec les éléments qui satisfont un prédicat. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/filter.ts`.
- `DArray.find` — Lire le premier élément satisfaisant un prédicat, ou undefined si aucun ne convient. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/find.ts`.
- `DArray.findAndReplace` — Remplacer le premier élément satisfaisant un prédicat dans une nouvelle copie, ou retourner undefined. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/findAndReplace.ts`.
- `DArray.findAndSpliceDelete` — Supprimer plusieurs éléments à partir du premier élément satisfaisant un prédicat. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/findAndSplice/delete.ts`.
- `DArray.findAndSpliceInsert` — Insérer des éléments avant le premier élément satisfaisant un prédicat. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/findAndSplice/insert.ts`.
- `DArray.findAndSpliceReplace` — Remplacer la portion commençant au premier élément satisfaisant un prédicat. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/findAndSplice/replace.ts`.
- `DArray.findDuplicates` — Trouver les valeurs primitives ou temporelles apparaissant plusieurs fois dans un tableau. Forme : forme unique. Source : `packages/lang/scripts/array/findDuplicates.ts`.
- `DArray.findIndex` — Lire l’index du premier élément satisfaisant un prédicat, ou undefined. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/findIndex.ts`.
- `DArray.findLast` — Lire le dernier élément satisfaisant un prédicat, ou undefined si aucun ne convient. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/findLast.ts`.
- `DArray.findLastIndex` — Lire l’index du dernier élément satisfaisant un prédicat, ou undefined. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/findLastIndex.ts`.
- `DArray.first` — Lire le premier élément d’un tableau en conservant les garanties de son type. Forme : forme unique. Source : `packages/lang/scripts/array/at/first.ts`.
- `DArray.flat` — Aplatir les niveaux imbriqués d’un tableau selon une profondeur donnée. Forme : forme unique. Source : `packages/lang/scripts/array/flat.ts`.
- `DArray.flatMap` — Transformer chaque élément puis aplatir le niveau de tableau produit. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/flatMap.ts`.
- `DArray.from` — Convertir une source array-like, itérable ou asynchrone en tableau. Forme : forme unique. Source : `packages/lang/scripts/array/from.ts`.
- `DArray.group` — Regrouper les valeurs produites par une fonction selon un nom de groupe. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/group.ts`.
- `DArray.groupOutput` — Construire le résultat nommé attendu par DArray.group pour associer une valeur à un groupe. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/group.ts`.
- `DArray.includes` — Vérifier qu’un tableau contient une valeur. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/includes.ts`.
- `DArray.indexOf` — Lire l’index de la première occurrence d’une valeur, ou undefined. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/indexOf.ts`.
- `DArray.insert` — Ajouter une valeur à la fin d’un tableau dans une nouvelle copie. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/insert.ts`.
- `DArray.is` — Vérifier au runtime qu’une valeur est un tableau et affiner son type TypeScript. Forme : forme unique. Source : `packages/lang/scripts/array/is.ts`.
- `DArray.isLastIndex` — Vérifier qu’un index désigne le dernier élément du tableau. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/isLastIndex.ts`.
- `DArray.last` — Lire le dernier élément d’un tableau en conservant les garanties de son type. Forme : forme unique. Source : `packages/lang/scripts/array/at/last.ts`.
- `DArray.lastIndexOf` — Lire l’index de la dernière occurrence d’une valeur, ou undefined. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/lastIndexOf.ts`.
- `DArray.length` — Lire la longueur d’un tableau avec les contraintes de cardinalité présentes dans son type. Forme : forme unique. Source : `packages/lang/scripts/array/length.ts`.
- `DArray.lengthEqual` — Vérifier qu’un tableau possède exactement un nombre donné d’éléments et établir cette contrainte. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/lengthEqual.ts`.
- `DArray.map` — Transformer chaque élément d’un tableau dans une nouvelle collection. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/map.ts`.
- `DArray.maxElements` — Vérifier qu’un tableau contient au plus un nombre donné d’éléments et établir cette contrainte. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/maxElements.ts`.
- `DArray.minElements` — Vérifier qu’un tableau contient au moins un nombre donné d’éléments et établir cette contrainte. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/minElements.ts`.
- `DArray.notIncludes` — Vérifier qu’un tableau ne contient pas une valeur. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/notIncludes.ts`.
- `DArray.pop` — Retirer le dernier élément d’un tableau dans une nouvelle copie. Forme : forme unique. Source : `packages/lang/scripts/array/pop.ts`.
- `DArray.prepend` — Ajouter les éléments d’un ou plusieurs tableaux au début sans muter le tableau d’entrée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/prepend.ts`.
- `DArray.push` — Ajouter une ou plusieurs valeurs à la fin d’un tableau dans une nouvelle copie. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/push.ts`.
- `DArray.reduce` — Réduire un tableau avec un accumulateur explicite et les sorties next ou exit. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/reduce.ts`.
- `DArray.reduceFrom` — Marquer explicitement la valeur initiale d’un reduce pour préserver sa forme de valeur. Forme : forme unique. Source : `packages/lang/scripts/array/reduce.ts`.
- `DArray.reduceRight` — Réduire un tableau de droite à gauche avec le contrat explicite de DArray.reduce. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/reduceRight.ts`.
- `DArray.reverse` — Inverser l’ordre d’un tableau dans une nouvelle copie. Forme : forme unique. Source : `packages/lang/scripts/array/reverse.ts`.
- `DArray.select` — Transformer sélectivement les éléments avec select et ignorer les autres avec skip. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/select.ts`.
- `DArray.set` — Remplacer la valeur à un index dans une nouvelle copie du tableau. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/set.ts`.
- `DArray.shift` — Retirer le premier élément d’un tableau dans une nouvelle copie. Forme : forme unique. Source : `packages/lang/scripts/array/shift.ts`.
- `DArray.slice` — Extraire une portion d’un tableau dans une nouvelle collection. Forme : curry décidé par type du 1er argument. Source : `packages/lang/scripts/array/slice.ts`.
- `DArray.some` — Vérifier qu’au moins un élément d’un tableau satisfait un prédicat. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/some.ts`.
- `DArray.sort` — Trier une copie du tableau avec une fonction de comparaison. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/sort.ts`.
- `DArray.spliceDelete` — Supprimer une portion d’un tableau dans une nouvelle copie. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/splice/delete.ts`.
- `DArray.spliceInsert` — Insérer des éléments à un index dans une nouvelle copie. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/splice/insert.ts`.
- `DArray.spliceReplace` — Remplacer une portion d’un tableau dans une nouvelle copie. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/array/splice/replace.ts`.
- `DArray.unshift` — Ajouter une ou plusieurs valeurs au début d’un tableau dans une nouvelle copie. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/array/unshift.ts`.

## 9.2 Inventaire `DGenerator`

- `DGenerator.asyncChunk` — Regrouper les valeurs d’un itérable asynchrone en sous-itérables de taille bornée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/asyncChunk.ts`.
- `DGenerator.asyncConcat` — Enchaîner plusieurs itérables synchrones ou asynchrones dans un générateur asynchrone. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/asyncConcat.ts`.
- `DGenerator.asyncFilter` — Conserver dans un générateur asynchrone les valeurs acceptées par un prédicat. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/asyncFilter.ts`.
- `DGenerator.asyncFlat` — Aplatir récursivement les valeurs itérables d’un générateur asynchrone jusqu’à une profondeur donnée. Forme : forme unique. Source : `packages/lang/scripts/generator/asyncFlat.ts`.
- `DGenerator.asyncGroup` — Regrouper les valeurs d’un itérable asynchrone selon les sorties nommées d’une callback. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/asyncGroup.ts`.
- `DGenerator.asyncLoop` — Produire une séquence asynchrone en distinguant les valeurs de `next` et celles de la sortie `exit`. Forme : forme unique. Source : `packages/lang/scripts/generator/asyncLoop.ts`.
- `DGenerator.asyncLoopAccumulator` — Produire une séquence asynchrone en mettant à jour un accumulateur à chaque itération. Forme : forme unique. Source : `packages/lang/scripts/generator/asyncLoopAccumulator.ts`.
- `DGenerator.asyncMap` — Transformer chaque valeur dans un générateur asynchrone, en autorisant une callback synchrone ou asynchrone. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/asyncMap.ts`.
- `DGenerator.asyncReduce` — Réduire un itérable avec un accumulateur et des sorties next ou exit dans une promesse. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/generator/asyncReduce.ts`.
- `DGenerator.chunk` — Regrouper les valeurs d’un itérable en sous-itérables de taille bornée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/chunk.ts`.
- `DGenerator.concat` — Enchaîner plusieurs itérables dans un générateur synchrone. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/concat.ts`.
- `DGenerator.createExternalAsyncGenerator` — Créer un générateur asynchrone dont la prochaine valeur ou la fin sont déclenchées de l’extérieur. Forme : forme unique. Source : `packages/lang/scripts/generator/createExternalAsyncGenerator.ts`.
- `DGenerator.execute` — Consommer une génératrice jusqu’à sa fin, en retournant une promesse pour les génératrices asynchrones. Forme : forme unique. Source : `packages/lang/scripts/generator/execute.ts`.
- `DGenerator.filter` — Conserver dans un générateur les valeurs acceptées par un prédicat. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/filter.ts`.
- `DGenerator.flat` — Aplatir récursivement les valeurs itérables jusqu’à une profondeur donnée. Forme : forme unique. Source : `packages/lang/scripts/generator/flat.ts`.
- `DGenerator.group` — Regrouper les valeurs d’un itérable selon les sorties nommées d’une callback. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/group.ts`.
- `DGenerator.groupOutput` — Construire une sortie nommée destinée à la fonction de regroupement. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/group.ts`.
- `DGenerator.loop` — Produire une séquence synchrone en distinguant les valeurs de `next` et celles de la sortie `exit`. Forme : forme unique. Source : `packages/lang/scripts/generator/loop.ts`.
- `DGenerator.loopAccumulator` — Produire une séquence synchrone en mettant à jour un accumulateur à chaque itération. Forme : forme unique. Source : `packages/lang/scripts/generator/loopAccumulator.ts`.
- `DGenerator.loopAccumulatorFrom` — Marquer une valeur initiale pour fixer précisément le type de l’accumulateur d’une boucle. Forme : forme unique. Source : `packages/lang/scripts/generator/loopAccumulator.ts`.
- `DGenerator.map` — Transformer chaque valeur d’un itérable dans un générateur. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/generator/map.ts`.
- `DGenerator.reduce` — Réduire un itérable avec un accumulateur et des sorties next ou exit. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/generator/reduce.ts`.
- `DGenerator.reduceFrom` — Marquer une valeur initiale, éventuellement élargie par un générique, pour une réduction. Forme : forme unique. Source : `packages/lang/scripts/generator/reduce.ts`.

## 9.3 Inventaire `DCommon`

Exports runtime absents de la doc agents-kit mais présents dans le code [VÉRIFIÉ] : `print` (§2.3), `createConstraintFactory`, `createGlobalStore`, `bindPrototypeMethods`, `mimeType`, classes `DuploJSError`, `AssertsError`, `InvalidBytesInStringError`, `InvalidMillisecondInStringError`, `MissingBuilderMethodsError`, `TheFormData`, et les handlers de kind `builderKind`, `queueKind`, `loopAccumulatorKind`, `duploJSErrorKind`.

- `DCommon.and` — Combiner plusieurs prédicats dans une condition qui doit tous les satisfaire. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/common/and.ts`.
- `DCommon.asserts` — Affirmer une contrainte de type et lever une erreur si le prédicat échoue. Forme : forme unique. Source : `packages/lang/scripts/common/asserts.ts`.
- `DCommon.asyncInnerPipe` — Construire une fonction qui enchaîne des opérations synchrones ou asynchrones. Forme : forme unique. Source : `packages/lang/scripts/common/asyncInnerPipe.ts`.
- `DCommon.asyncLoop` — Répéter une callback asynchrone jusqu’à `exit`, avec un compteur et une valeur de retour typée. Forme : forme unique. Source : `packages/lang/scripts/common/asyncLoop.ts`.
- `DCommon.asyncLoopAccumulator` — Répéter une callback asynchrone en faisant circuler un accumulateur et retourner la valeur de `exit`. Forme : forme unique. Source : `packages/lang/scripts/common/asyncLoopAccumulator.ts`.
- `DCommon.asyncPipe` — Exécuter séquentiellement plusieurs transformations en attendant chaque résultat. Forme : forme unique. Source : `packages/lang/scripts/common/asyncPipe.ts`.
- `DCommon.callThen` — Appliquer une fonction à une valeur immédiate ou promise, avec gestion optionnelle des erreurs. Forme : forme unique. Source : `packages/lang/scripts/common/callThen.ts`.
- `DCommon.cast` — Vérifier au niveau du typage qu’une valeur respecte une contrainte attendue. Forme : forme unique. Source : `packages/lang/scripts/common/constraint/cast/index.ts`.
- `DCommon.clone` — Copier récursivement les tableaux et objets simples sans modifier la valeur source. Forme : forme unique. Source : `packages/lang/scripts/common/clone.ts`.
- `DCommon.createAsyncRetry` — Décorer une fonction asynchrone avec une stratégie de nouvelle tentative. Forme : forme unique. Source : `packages/lang/scripts/common/asyncRetry.ts`.
- `DCommon.createBuilder` — Configurer des handlers réutilisables pour construire un objet par étapes. Forme : forme unique. Source : `packages/lang/scripts/common/builder.ts`.
- `DCommon.createEnum` — Créer un enum littéral qui expose ses valeurs, un tuple et un prédicat `has`. Forme : forme unique. Source : `packages/lang/scripts/common/enum.ts`.
- `DCommon.createExternalPromise` — Exposer les contrôles `resolve` et `reject` d’une promise séparément de sa création. Forme : forme unique. Source : `packages/lang/scripts/common/externalPromise.ts`.
- `DCommon.createFormData` — Transformer un objet de valeurs en `FormData` en conservant ses valeurs d’entrée typées. Forme : forme unique. Source : `packages/lang/scripts/common/formData.ts`.
- `DCommon.createInterpolation` — Préparer une fonction qui remplace les identifiants entre accolades dans un modèle. Forme : forme unique. Source : `packages/lang/scripts/common/interpolation.ts`.
- `DCommon.createQueue` — Créer une file d’attente typée avec une capacité optionnelle. Forme : forme unique. Source : `packages/lang/scripts/common/queue.ts`.
- `DCommon.createTransformer` — Créer une fonction de transformation récursive liée à un nom de méthode. Forme : forme unique. Source : `packages/lang/scripts/common/transformer.ts`.
- `DCommon.detachObjectMethod` — Détacher une méthode d’un objet tout en conservant son contexte d’exécution. Forme : forme unique. Source : `packages/lang/scripts/common/detachObjectMethod.ts`.
- `DCommon.equal` — Créer un prédicat d’égalité pour une valeur ou une liste de valeurs littérales. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/common/equal.ts`.
- `DCommon.escapeRegExp` — Échapper les caractères spéciaux d’une chaîne avant de l’utiliser dans une expression régulière. Forme : forme unique. Source : `packages/lang/scripts/common/escapeRegExp.ts`.
- `DCommon.falsy` — Identifier les valeurs falsy JavaScript avec un narrowing TypeScript. Forme : forme unique. Source : `packages/lang/scripts/common/falsy.ts`.
- `DCommon.forward` — Retourner une valeur telle quelle pour la rendre explicite dans une composition. Forme : forme unique. Source : `packages/lang/scripts/common/forward.ts`.
- `DCommon.forwardAsserts` — Vérifier une valeur et la retourner, ou produire une fonction réutilisable de vérification. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/common/forwardAsserts.ts`.
- `DCommon.forwardLog` — Afficher une valeur puis la retourner pour observer une composition. Forme : forme unique. Source : `packages/lang/scripts/common/forwardLog.ts`.
- `DCommon.infer` — Inférer une contrainte à partir d’une valeur littérale dans une expression typée. Forme : forme unique. Source : `packages/lang/scripts/common/constraint/infer/index.ts`.
- `DCommon.innerPipe` — Composer plusieurs transformations dans une fonction réutilisable. Forme : forme unique. Source : `packages/lang/scripts/common/innerPipe.ts`.
- `DCommon.instanceOf` — Créer un prédicat basé sur un constructeur avec narrowing de l’instance. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/common/instanceOf.ts`.
- `DCommon.isType` — Construire un prédicat de type à partir d’un type runtime. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/common/isType.ts`.
- `DCommon.justExec` — Encapsuler une logique impérative locale et affecter directement son résultat. Forme : forme unique. Source : `packages/lang/scripts/common/justExec.ts`.
- `DCommon.justReturn` — Fournir une valeur déjà calculée à une étape de pipe sans écrire de callback. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/common/justReturn.ts`.
- `DCommon.loop` — Répéter une callback synchrone jusqu’à `exit`, avec un compteur et une valeur de retour typée. Forme : forme unique. Source : `packages/lang/scripts/common/loop.ts`.
- `DCommon.loopAccumulator` — Répéter une callback synchrone en faisant circuler un accumulateur et retourner la valeur de `exit`. Forme : forme unique. Source : `packages/lang/scripts/common/loopAccumulator.ts`.
- `DCommon.loopAccumulatorFrom` — Marquer une valeur initiale pour fixer précisément le type de l’accumulateur d’une boucle. Forme : forme unique. Source : `packages/lang/scripts/common/loopAccumulator.ts`.
- `DCommon.memo` — Évaluer une fonction au premier accès puis mémoriser sa valeur. Forme : forme unique. Source : `packages/lang/scripts/common/memo.ts`.
- `DCommon.memoObject` — Exposer un objet calculé paresseusement tout en mémorisant son contenu. Forme : forme unique. Source : `packages/lang/scripts/common/memoObject.ts`.
- `DCommon.memoPromise` — Mémoriser le résultat d’un calcul synchrone ou asynchrone. Forme : forme unique. Source : `packages/lang/scripts/common/memoPromise.ts`.
- `DCommon.or` — Combiner plusieurs prédicats en une condition satisfaite par au moins l’un d’eux. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/common/or.ts`.
- `DCommon.pipe` — Appliquer une suite de transformations de gauche à droite. Forme : forme unique. Source : `packages/lang/scripts/common/pipe.ts`.
- `DCommon.pipeCall` — Corriger l’inférence d’une fonction sans générique utilisée dans un pipe. Forme : forme unique. Source : `packages/lang/scripts/common/pipeCall.ts`.
- `DCommon.prepareAsyncPipe` — Préparer une fabrique de pipelines asynchrones partageant une contrainte d’entrée. Forme : forme unique. Source : `packages/lang/scripts/common/prepareAsyncPipe.ts`.
- `DCommon.preparePipe` — Préparer une fabrique de pipelines partageant une contrainte d’entrée. Forme : forme unique. Source : `packages/lang/scripts/common/preparePipe.ts`.
- `DCommon.promiseAll` — Attendre un tuple ou un itérable de promesses en conservant la forme du tuple. Forme : forme unique. Source : `packages/lang/scripts/common/promiseAll.ts`.
- `DCommon.promiseObject` — Attendre toutes les propriétés promises d’un objet et reconstruire l’objet résolu. Forme : forme unique. Source : `packages/lang/scripts/common/promiseObject.ts`.
- `DCommon.removeConstraint` — Retirer les contraintes DuploJS d’un type tout en conservant sa forme de valeur. Forme : forme unique. Source : `packages/lang/scripts/common/constraint/remove.ts`.
- `DCommon.shameOnYou` — Contourner explicitement une contrainte attendue dans un contrat de type. Forme : forme unique. Source : `packages/lang/scripts/common/constraint/cast/index.ts`.
- `DCommon.simpleClone` — Créer une copie superficielle d’une valeur clonable. Forme : forme unique. Source : `packages/lang/scripts/common/simpleClone.ts`.
- `DCommon.stringToBytes` — Convertir une quantité en octets écrite avec une unité ou déjà numérique. Forme : forme unique. Source : `packages/lang/scripts/common/stringToBytes.ts`.
- `DCommon.stringToMillisecond` — Additionner des durées écrites avec une unité ou exprimées en millisecondes. Forme : forme unique. Source : `packages/lang/scripts/common/stringToMillisecond.ts`.
- `DCommon.tap` — Exécuter un traitement secondaire tout en conservant la valeur d’entrée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/common/tap.ts`.
- `DCommon.timeout` — Créer une promise résolue après un délai en millisecondes. Forme : forme unique. Source : `packages/lang/scripts/common/timeout.ts`.
- `DCommon.toCurriedPredicate` — Adapter un prédicat non générique vers la forme curifiée attendue par une fonction. Forme : forme unique. Source : `packages/lang/scripts/common/toCurriedPredicate.ts`.
- `DCommon.toJSON` — Transformer récursivement les valeurs DuploJS vers leur représentation JSON. Forme : const/classe. Source : `packages/lang/scripts/common/transformer.ts`.
- `DCommon.toNative` — Transformer récursivement les valeurs DuploJS qui exposent `toNative`. Forme : const/classe. Source : `packages/lang/scripts/common/transformer.ts`.
- `DCommon.toRegExp` — Convertir une chaîne, un tuple de chaînes ou une expression régulière en `RegExp`. Forme : forme unique. Source : `packages/lang/scripts/common/toRegExp.ts`.
- `DCommon.transformer` — Appliquer récursivement une méthode sans argument aux objets, tableaux et valeurs imbriqués. Forme : forme unique. Source : `packages/lang/scripts/common/transformer.ts`.
- `DCommon.truthy` — Identifier les valeurs truthy et retirer les valeurs falsy de leur union. Forme : forme unique. Source : `packages/lang/scripts/common/truthy.ts`.
- `DCommon.useAsyncRetry` — Réessayer une opération asynchrone selon son résultat et une limite d’essais. Forme : forme unique. Source : `packages/lang/scripts/common/asyncRetry.ts`.
- `DCommon.when` — Transformer une valeur uniquement lorsqu’un prédicat est satisfait. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/common/when.ts`.
- `DCommon.whenElse` — Choisir une transformation selon le résultat d’un prédicat. Forme : curry si args.length===3, sinon data-first. Source : `packages/lang/scripts/common/whenElse.ts`.
- `DCommon.whenNot` — Transformer une valeur uniquement lorsqu’un prédicat n’est pas satisfait. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/common/whenNot.ts`.

## 9.4 Inventaire `DString`

- `DString.at` — Lire le caractère situé à un index, avec `undefined` lorsque l'index est hors limites. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/at.ts`.
- `DString.capitalize` — Mettre en majuscule le premier caractère d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/capitalize.ts`.
- `DString.charAt` — Lire le caractère situé à un index positif ou nul. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/charAt.ts`.
- `DString.concat` — Ajouter une ou plusieurs chaînes à la fin d'une chaîne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/concat.ts`.
- `DString.endsWith` — Tester si une chaîne se termine par une sous-chaîne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/endsWith.ts`.
- `DString.extract` — Extraire la première occurrence d'un motif avec ses groupes et sa position. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/extract.ts`.
- `DString.extractAll` — Produire les occurrences d'un motif global sous forme de génératrice. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/extractAll.ts`.
- `DString.first` — Lire le premier caractère d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/first.ts`.
- `DString.includes` — Tester si une chaîne contient une sous-chaîne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/includes.ts`.
- `DString.indexOf` — Retourner la position d'une sous-chaîne, ou `undefined` si elle est absente. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/indexOf.ts`.
- `DString.isComposedOf` — Vérifier qu'une chaîne ne contient que des caractères appartenant à une ou plusieurs plages. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/isComposedOf.ts`.
- `DString.isEmail` — Vérifier qu'une chaîne respecte le format d'une adresse e-mail. Forme : forme unique. Source : `packages/lang/scripts/string/isEmail.ts`.
- `DString.isIn` — Vérifier qu'une chaîne appartient à une collection de valeurs autorisées. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/isIn.ts`.
- `DString.isKeyof` — Vérifier qu'une valeur est une clé de l'objet fourni et affiner son type. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/isKeyof.ts`.
- `DString.isNotEmpty` — Vérifier qu'une chaîne contient au moins un caractère. Forme : forme unique. Source : `packages/lang/scripts/string/isNotEmpty.ts`.
- `DString.isNumber` — Vérifier qu'une chaîne représente un nombre et établir cette contrainte dans le type. Forme : forme unique. Source : `packages/lang/scripts/string/isNumber.ts`.
- `DString.isTrimmed` — Vérifier qu'une chaîne ne possède pas d'espace superflu à ses extrémités. Forme : forme unique. Source : `packages/lang/scripts/string/trim/is.ts`.
- `DString.isUrl` — Vérifier qu'une chaîne est une URL valide. Forme : forme unique. Source : `packages/lang/scripts/string/isUrl.ts`.
- `DString.isUuid` — Vérifier qu'une chaîne respecte le format UUID pris en charge. Forme : forme unique. Source : `packages/lang/scripts/string/isUuid.ts`.
- `DString.join` — Réunir les chaînes d'une collection avec un séparateur. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/join.ts`.
- `DString.last` — Lire le dernier caractère d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/last.ts`.
- `DString.lastIndexOf` — Retourner la dernière position d'une sous-chaîne, ou `undefined` si elle est absente. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/lastIndexOf.ts`.
- `DString.length` — Retourner le nombre de caractères d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/length.ts`.
- `DString.lengthEqual` — Tester ou établir qu'une chaîne possède exactement un nombre donné de caractères. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/lengthEqual.ts`.
- `DString.maxCharacters` — Tester ou établir une longueur maximale pour une chaîne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/maxCharacters.ts`.
- `DString.minCharacters` — Tester ou établir une longueur minimale pour une chaîne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/minCharacters.ts`.
- `DString.normalize` — Normaliser une chaîne selon une forme Unicode. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/normalize.ts`.
- `DString.padEnd` — Compléter une chaîne par la droite jusqu'à une longueur cible. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/string/padEnd.ts`.
- `DString.padStart` — Compléter une chaîne par la gauche jusqu'à une longueur cible. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/string/padStart.ts`.
- `DString.pop` — Retirer le dernier caractère d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/pop.ts`.
- `DString.prepend` — Ajouter une ou plusieurs chaînes au début d'une chaîne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/prepend.ts`.
- `DString.repeat` — Répéter une chaîne un nombre positif de fois. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/repeat.ts`.
- `DString.replace` — Remplacer la première occurrence d'un motif par une chaîne ou une fonction de remplacement. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/string/replace.ts`.
- `DString.replaceAll` — Remplacer toutes les occurrences d'un motif par une chaîne ou une fonction de remplacement. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/string/replaceAll.ts`.
- `DString.search` — Retourner la position d'un motif, ou `undefined` lorsqu'il ne correspond pas. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/search.ts`.
- `DString.shift` — Retirer le premier caractère d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/shift.ts`.
- `DString.slice` — Extraire une portion d'une chaîne entre deux index. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/string/slice.ts`.
- `DString.sort` — Trier une copie d'une collection de chaînes dans l'ordre croissant ou décroissant. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/sort.ts`.
- `DString.sortCompare` — Comparer deux chaînes avec l'ordre de tri du domaine String. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/sortCompare.ts`.
- `DString.split` — Découper une chaîne selon un séparateur, avec une limite facultative. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/split.ts`.
- `DString.startsWith` — Tester si une chaîne commence par une sous-chaîne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/startsWith.ts`.
- `DString.stringify` — Convertir une valeur quelconque en représentation textuelle sans laisser `undefined` au résultat. Forme : forme unique. Source : `packages/lang/scripts/string/stringify.ts`.
- `DString.substring` — Extraire une sous-chaîne selon les règles de `substring`. Forme : curry décidé par type du 1er argument. Source : `packages/lang/scripts/string/substring.ts`.
- `DString.test` — Tester une chaîne avec une expression régulière. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/string/test.ts`.
- `DString.to` — Convertir une valeur stringifiable en chaîne en conservant les littéraux connus lorsque c'est possible. Forme : forme unique. Source : `packages/lang/scripts/string/to.ts`.
- `DString.toLowerCase` — Convertir une chaîne en minuscules. Forme : forme unique. Source : `packages/lang/scripts/string/toLowerCase.ts`.
- `DString.toUpperCase` — Convertir une chaîne en majuscules. Forme : forme unique. Source : `packages/lang/scripts/string/toUpperCase.ts`.
- `DString.trim` — Supprimer les espaces au début et à la fin d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/trim/default.ts`.
- `DString.trimEnd` — Supprimer les espaces à la fin d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/trim/end.ts`.
- `DString.trimStart` — Supprimer les espaces au début d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/trim/start.ts`.
- `DString.uncapitalize` — Mettre en minuscule le premier caractère d'une chaîne. Forme : forme unique. Source : `packages/lang/scripts/string/uncapitalize.ts`.

## 9.5 Inventaire `DNumber`

- `DNumber.betweenThan` — Vérifier qu’un nombre est strictement compris entre deux bornes. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/number/betweenThan.ts`.
- `DNumber.betweenThanOrEqual` — Vérifier qu’un nombre appartient à un intervalle fermé. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/number/betweenThanOrEqual.ts`.
- `DNumber.greaterThan` — Tester ou établir qu’un nombre est strictement supérieur à une borne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/number/greaterThan.ts`.
- `DNumber.greaterThanOrEqual` — Tester ou établir qu’un nombre est supérieur ou égal à une borne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/number/greaterThanOrEqual.ts`.
- `DNumber.isEven` — Vérifier qu’un nombre est pair et établir cette contrainte dans le type. Forme : forme unique. Source : `packages/lang/scripts/number/isEven.ts`.
- `DNumber.isInteger` — Vérifier qu’un nombre est entier et établir cette contrainte dans le type. Forme : forme unique. Source : `packages/lang/scripts/number/isInteger.ts`.
- `DNumber.isMultipleOf` — Tester ou établir qu’un nombre est un multiple d’une valeur donnée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/number/isMultipleOf.ts`.
- `DNumber.isNegative` — Vérifier qu’un nombre est négatif ou nul et établir cette contrainte. Forme : forme unique. Source : `packages/lang/scripts/number/isNegative.ts`.
- `DNumber.isNotZero` — Vérifier qu’un nombre est différent de zéro et établir cette contrainte. Forme : forme unique. Source : `packages/lang/scripts/number/isNotZero.ts`.
- `DNumber.isOdd` — Vérifier qu’un nombre est impair et établir cette contrainte dans le type. Forme : forme unique. Source : `packages/lang/scripts/number/isOdd.ts`.
- `DNumber.isPositive` — Vérifier qu’un nombre est positif ou nul et établir cette contrainte. Forme : forme unique. Source : `packages/lang/scripts/number/isPositive.ts`.
- `DNumber.isSafe` — Vérifier qu’un nombre est fini, non-NaN et représentable avec une précision sûre. Forme : forme unique. Source : `packages/lang/scripts/number/isSafe.ts`.
- `DNumber.isStrictNegative` — Vérifier qu’un nombre est strictement négatif et établir cette contrainte. Forme : forme unique. Source : `packages/lang/scripts/number/isStrictNegative.ts`.
- `DNumber.isStrictPositive` — Vérifier qu’un nombre est strictement positif et établir cette contrainte. Forme : forme unique. Source : `packages/lang/scripts/number/isStrictPositive.ts`.
- `DNumber.lessThan` — Tester ou établir qu’un nombre est strictement inférieur à une borne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/number/lessThan.ts`.
- `DNumber.lessThanOrEqual` — Tester ou établir qu’un nombre est inférieur ou égal à une borne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/number/lessThanOrEqual.ts`.
- `DNumber.max` — Retourner le plus grand nombre d’une collection non vide. Forme : forme unique. Source : `packages/lang/scripts/number/max.ts`.
- `DNumber.maxOf` — Calculer le maximum d’une collection non vide avec un parcours explicite. Forme : forme unique. Source : `packages/lang/scripts/number/maxOf.ts`.
- `DNumber.min` — Retourner le plus petit nombre d’une collection non vide. Forme : forme unique. Source : `packages/lang/scripts/number/min.ts`.
- `DNumber.minOf` — Calculer le minimum d’une collection non vide avec un parcours explicite. Forme : forme unique. Source : `packages/lang/scripts/number/minOf.ts`.
- `DNumber.sort` — Trier une copie d’une collection de nombres dans l’ordre croissant ou décroissant. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/number/sort.ts`.
- `DNumber.sum` — Additionner les nombres d’une collection. Forme : forme unique. Source : `packages/lang/scripts/number/sum.ts`.

## 9.6 Inventaire `DObject`

- `DObject.assign` — Fusionner les propriétés d’un objet dans une nouvelle valeur. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/assign.ts`.
- `DObject.countKeys` — Compter les clés runtime d’un objet. Forme : forme unique. Source : `packages/lang/scripts/object/countKeys.ts`.
- `DObject.deepOverride` — Remplacer récursivement les valeurs définies d’un objet sans modifier la source. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/deepOverride.ts`.
- `DObject.discriminate` — Tester une propriété avec un predicate et affiner l’objet par intersection. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/object/discriminate.ts`.
- `DObject.discriminateEntryKey` — Tester ou affiner une entrée selon sa clé. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/discriminateEntryKey.ts`.
- `DObject.discriminateEntryValue` — Tester ou affiner une entrée selon sa valeur. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/discriminateEntryValue.ts`.
- `DObject.entries` — Convertir les propriétés d’un objet en entrées typées. Forme : forme unique. Source : `packages/lang/scripts/object/entries.ts`.
- `DObject.entry` — Construire une entrée objet en conservant les types de sa clé et de sa valeur. Forme : forme unique. Source : `packages/lang/scripts/object/entry.ts`.
- `DObject.fromEntries` — Reconstruire un objet typé à partir d’une collection d’entrées. Forme : forme unique. Source : `packages/lang/scripts/object/fromEntries.ts`.
- `DObject.getDeepProperty` — Lire une propriété imbriquée avec un chemin vérifié par TypeScript. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/getDeepProperty.ts`.
- `DObject.getProperty` — Lire une propriété d’un objet en conservant son type. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/getProperty.ts`.
- `DObject.hasKeys` — Vérifier la présence de propriétés définies et affiner leur caractère obligatoire. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/hasKeys.ts`.
- `DObject.isSimple` — Vérifier si un objet est simple sans affiner son type. Forme : forme unique. Source : `packages/lang/scripts/object/isSimple.ts`.
- `DObject.keys` — Lister les clés d’un objet avec un type correspondant à ses propriétés. Forme : forme unique. Source : `packages/lang/scripts/object/keys.ts`.
- `DObject.omit` — Créer un objet en retirant les propriétés sélectionnées. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/omit.ts`.
- `DObject.override` — Remplacer les propriétés définies d’un objet par de nouvelles valeurs. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/override.ts`.
- `DObject.pick` — Créer un objet avec les propriétés sélectionnées. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/pick.ts`.
- `DObject.to` — Construire un nouvel objet en appliquant une forme de transformations à une même entrée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/to.ts`.
- `DObject.transformProperties` — Transformer plusieurs propriétés d’un objet en conservant les autres. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/object/transformProperties.ts`.
- `DObject.transformProperty` — Transformer une propriété précise d’un objet. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/object/transformProperty.ts`.
- `DObject.values` — Extraire les valeurs d’un objet avec l’union des types de ses propriétés. Forme : forme unique. Source : `packages/lang/scripts/object/values.ts`.

## 9.7 Inventaire `DTuple`

- `DTuple.from` — Interpréter les contraintes de cardinalité d’un tableau comme une forme tuple. Forme : forme unique. Source : `packages/lang/scripts/tuple/from.ts`.
- `DTuple.map` — Transformer chaque élément d’un tuple en conservant sa cardinalité. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/tuple/map.ts`.

## 9.8 Inventaire `DPattern`

`DPattern.match` a en réalité trois arités (1 → builder, 2 → curry, 3 → data-first), cf. §7.1.

- `DPattern.exhaustive` — Terminer un traitement exhaustif en extrayant les valeurs des PatternResult. Forme : forme unique. Source : `packages/lang/scripts/pattern/exhaustive.ts`.
- `DPattern.isMatch` — Vérifier un motif sur une valeur et affiner le type de la partie correspondante. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/pattern/isMatch.ts`.
- `DPattern.match` — Traiter une valeur selon un motif et conserver les cas qui ne correspondent pas. Forme : curry si args.length===1,2, sinon data-first. Source : `packages/lang/scripts/pattern/match/index.ts`.
- `DPattern.matchWithEntity` — Router une union d’entités DuploJS vers un callback pour chaque nom d’entité. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithEntity.ts`.
- `DPattern.matchWithEntityOtherwise` — Router les entités sélectionnées et conserver dans le type du fallback les entités restantes. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithEntityOtherwise.ts`.
- `DPattern.matchWithError` — Traiter chaque variante d’une union d’erreurs DuploJS selon son identifiant typé. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithError.ts`.
- `DPattern.matchWithErrorOtherwise` — Traiter certains identifiants d’erreur et transmettre au fallback l’union d’erreurs non couverte. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithErrorOtherwise.ts`.
- `DPattern.matchWithFact` — Router des facts par nom et exposer leur valeur ainsi que leur payload typé. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithFact.ts`.
- `DPattern.matchWithFactOtherwise` — Router les facts choisis et traiter les autres noms avec un callback recevant le fact restant. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithFactOtherwise.ts`.
- `DPattern.matchWithNumber` — Associer chaque nombre littéral possible à un callback spécialisé pour cette valeur. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithNumber.ts`.
- `DPattern.matchWithNumberOtherwise` — Traiter certains nombres littéraux et recevoir les autres valeurs dans un fallback. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithNumberOtherwise.ts`.
- `DPattern.matchWithString` — Associer chaque chaîne littérale possible à un callback dont le paramètre est cette valeur exacte. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithString.ts`.
- `DPattern.matchWithStringOtherwise` — Traiter certains littéraux de chaîne et transmettre au fallback l’union non couverte. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithStringOtherwise.ts`.
- `DPattern.matchWithTaggedObject` — Router une union d’objets marqués vers un callback par valeur de tag. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithTaggedObject.ts`.
- `DPattern.matchWithTaggedObjectOtherwise` — Router les tags explicitement traités et transmettre les variantes restantes au fallback. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/pattern/matchWithTaggedObjectOtherwise.ts`.
- `DPattern.otherwise` — Traiter la valeur non reconnue restante ou déballer un résultat déjà traité. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/pattern/otherwise.ts`.
- `DPattern.union` — Combiner plusieurs motifs en un seul motif correspondant à l’un d’eux. Forme : forme unique. Source : `packages/lang/scripts/pattern/union.ts`.
- `DPattern.when` — Exécuter un traitement lorsque le predicate correspond, en laissant la branche sinon inchangée. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/pattern/when.ts`.
- `DPattern.whenNot` — Exécuter un traitement pour les valeurs refusées par le predicate et laisser les autres non traitées. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/pattern/whenNot.ts`.

## 9.9 Inventaire `DPrinter`

- `DPrinter.bold` — Encadrer une chaîne par les codes ANSI de mise en gras. Forme : forme unique. Source : `packages/lang/scripts/printer/bold.ts`.
- `DPrinter.colorized` — Encadrer une chaîne par les codes ANSI d’une couleur sélectionnée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/printer/colorized.ts`.
- `DPrinter.colorizedBold` — Appliquer une couleur ANSI et le style gras à une chaîne. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/printer/colorizedBold.ts`.
- `DPrinter.renderLine` — Assembler récursivement des valeurs en séparant les éléments par une espace. Forme : forme unique. Source : `packages/lang/scripts/printer/renderLine.ts`.
- `DPrinter.renderParagraph` — Assembler récursivement des valeurs en séparant les éléments par un saut de ligne. Forme : curry décidé par type du 1er argument. Source : `packages/lang/scripts/printer/renderParagraph.ts`.

## 9.10 Inventaire `DPath`

- `DPath.computeRelative` — Calculer le chemin relatif entre deux chemins absolus. Forme : forme unique. Source : `packages/lang/scripts/path/computeRelative.ts`.
- `DPath.concatSegment` — Assembler un segment avec un ou plusieurs autres segments. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/path/concatSegment.ts`.
- `DPath.create` — Normaliser une chaîne et retourner un Either selon qu’elle forme un chemin valide. Forme : forme unique. Source : `packages/lang/scripts/path/create.ts`.
- `DPath.createAbsolute` — Normaliser une chaîne et vérifier qu’elle représente un chemin absolu. Forme : forme unique. Source : `packages/lang/scripts/path/createAbsolute.ts`.
- `DPath.createAbsoluteOrThrow` — Normaliser un chemin absolu ou lever une erreur si l’entrée est invalide. Forme : forme unique. Source : `packages/lang/scripts/path/createAbsoluteOrThrow.ts`.
- `DPath.createMatcher` — Créer un predicate de chemin à partir de motifs glob positifs et négatifs. Forme : forme unique. Source : `packages/lang/scripts/path/createMatcher.ts`.
- `DPath.createOrThrow` — Normaliser un chemin ou lever une erreur si l’entrée est invalide. Forme : forme unique. Source : `packages/lang/scripts/path/createOrThrow.ts`.
- `DPath.createSegment` — Normaliser une chaîne et vérifier qu’elle ne contient qu’un segment. Forme : forme unique. Source : `packages/lang/scripts/path/createSegment.ts`.
- `DPath.createSegmentOrThrow` — Normaliser un segment ou lever une erreur si l’entrée n’est pas un segment valide. Forme : forme unique. Source : `packages/lang/scripts/path/createSegmentOrThrow.ts`.
- `DPath.declareAbsolutePath` — Déclarer un littéral de chemin comme chemin absolu après vérification statique. Forme : forme unique. Source : `packages/lang/scripts/path/declareAbsolutePath.ts`.
- `DPath.declarePath` — Déclarer un littéral valide comme chemin après vérification statique. Forme : forme unique. Source : `packages/lang/scripts/path/declarePath.ts`.
- `DPath.declareSegment` — Déclarer un littéral valide comme segment après vérification statique. Forme : forme unique. Source : `packages/lang/scripts/path/declareSegment.ts`.
- `DPath.getBaseName` — Lire le dernier segment d’un chemin, avec la possibilité d’en retirer l’extension. Forme : forme unique. Source : `packages/lang/scripts/path/getBaseName.ts`.
- `DPath.getExtensionName` — Lire l’extension du dernier segment, avec la possibilité de conserver le point. Forme : forme unique. Source : `packages/lang/scripts/path/getExtensionName.ts`.
- `DPath.getParentFolderPath` — Lire le dossier parent d’un chemin en conservant son caractère absolu lorsqu’il est connu. Forme : forme unique. Source : `packages/lang/scripts/path/getParentFolderPath.ts`.
- `DPath.is` — Vérifier qu’une chaîne respecte la syntaxe d’un chemin et affiner son type. Forme : forme unique. Source : `packages/lang/scripts/path/is.ts`.
- `DPath.isAbsolute` — Vérifier qu’une chaîne est un chemin absolu et affiner son type. Forme : forme unique. Source : `packages/lang/scripts/path/isAbsolute.ts`.
- `DPath.isSegment` — Vérifier qu’une chaîne est un segment unique et affiner son type. Forme : forme unique. Source : `packages/lang/scripts/path/isSegment.ts`.
- `DPath.normalize` — Réduire les séparateurs et les segments relatifs d’un chemin. Forme : forme unique. Source : `packages/lang/scripts/path/normalize.ts`.
- `DPath.resolveFrom` — Résoudre des segments depuis une origine absolue, avec une option pour la conserver. Forme : forme unique. Source : `packages/lang/scripts/path/resolveFrom.ts`.
- `DPath.resolveRelative` — Résoudre une suite de chemins relatifs ou absolus en un seul chemin normalisé. Forme : forme unique. Source : `packages/lang/scripts/path/resolveRelative.ts`.

## 9.11 Inventaire `DChrono`

- `DChrono.addDays` — Ajouter un nombre de jours à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/addDays.ts`.
- `DChrono.addHours` — Ajouter un nombre d’heures à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/addHours.ts`.
- `DChrono.addMilliseconds` — Ajouter un nombre de millisecondes à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/addMilliseconds.ts`.
- `DChrono.addMinutes` — Ajouter un nombre de minutes à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/addMinutes.ts`.
- `DChrono.addMonths` — Ajouter un nombre de mois à une date en UTC. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/addMonths.ts`.
- `DChrono.addSeconds` — Ajouter un nombre de secondes à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/addSeconds.ts`.
- `DChrono.addTime` — Ajouter une durée à une date ou à une autre durée en conservant la nature de l’entrée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/addTime.ts`.
- `DChrono.addWeeks` — Ajouter un nombre de semaines à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/addWeeks.ts`.
- `DChrono.addYears` — Ajouter un nombre d’années à une date en UTC. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/addYears.ts`.
- `DChrono.applyTimezone` — Décaler une date pour l’exprimer dans un fuseau horaire donné. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/applyTimezone.ts`.
- `DChrono.betweenThanDate` — Vérifier qu’une date est strictement comprise entre deux bornes. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/chrono/operators/betweenThanDate.ts`.
- `DChrono.betweenThanOrEqualDate` — Vérifier qu’une date est comprise entre deux bornes inclusives. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/chrono/operators/betweenThanOrEqualDate.ts`.
- `DChrono.betweenThanOrEqualTime` — Vérifier qu’une durée est comprise entre deux bornes inclusives. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/chrono/operators/betweenThanOrEqualTime.ts`.
- `DChrono.betweenThanTime` — Vérifier qu’une durée est strictement comprise entre deux bornes. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/chrono/operators/betweenThanTime.ts`.
- `DChrono.closestTo` — Trouver dans une collection la date la plus proche d’une date cible. Forme : curry décidé par type du 1er argument. Source : `packages/lang/scripts/chrono/closestTo.ts`.
- `DChrono.computeTime` — Convertir une durée représentée par TheTime vers l’unité demandée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/computeTime.ts`.
- `DChrono.createDate` — Construire une date depuis une valeur sûre ou représenter la validation d’une entrée runtime avec un Either. Forme : forme unique. Source : `packages/lang/scripts/chrono/createDate.ts`.
- `DChrono.createDateOrThrow` — Construire une TheDate depuis les entrées acceptées et lever une erreur si la création échoue. Forme : forme unique. Source : `packages/lang/scripts/chrono/createDateOrThrow.ts`.
- `DChrono.createTime` — Construire une TheTime depuis une durée sûre ou représenter la validation d’une entrée runtime avec un Either. Forme : forme unique. Source : `packages/lang/scripts/chrono/createTime.ts`.
- `DChrono.createTimeOrThrow` — Construire une TheTime depuis les entrées acceptées et lever une erreur si la création échoue. Forme : forme unique. Source : `packages/lang/scripts/chrono/createTimeOrThrow.ts`.
- `DChrono.eachDate` — Parcourir une plage de dates en avançant d’une unité et en incluant les bornes. Forme : forme unique. Source : `packages/lang/scripts/chrono/eachDate.ts`.
- `DChrono.equalDate` — Vérifier l’égalité de deux dates par leur timestamp. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/equalDate.ts`.
- `DChrono.equalTime` — Vérifier l’égalité de deux durées par leur valeur en millisecondes. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/equalTime.ts`.
- `DChrono.formatDate` — Formater une date avec des jetons et un fuseau horaire. Forme : curry si args.length===2, sinon data-first. Source : `packages/lang/scripts/chrono/formatDate.ts`.
- `DChrono.formatTime` — Formater une durée TheTime avec des jetons de semaines, jours, heures, minutes, secondes et millisecondes. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/formatTime.ts`.
- `DChrono.getDayOfMonth` — Lire le jour du mois d’une date en UTC ou dans un fuseau horaire donné. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getDayOfMonth.ts`.
- `DChrono.getDayOfWeek` — Lire le jour de la semaine d’une date, de 0 pour dimanche à 6 pour samedi. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getDayOfWeek.ts`.
- `DChrono.getDayOfYear` — Lire le numéro du jour dans l’année, en tenant compte du fuseau choisi. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getDayOfYear.ts`.
- `DChrono.getDifference` — Calculer la durée signée séparant une date d’une date de référence. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/getDifference.ts`.
- `DChrono.getFirstDayOfMonth` — Retourner le premier jour du mois à minuit UTC. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getFirstDayOfMonth.ts`.
- `DChrono.getFirstDayOfWeek` — Retourner le lundi de la semaine à minuit UTC. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getFirstDayOfWeek.ts`.
- `DChrono.getHour` — Lire l’heure d’une date en UTC ou dans un fuseau horaire donné. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getHour.ts`.
- `DChrono.getLastDayOfMonth` — Retourner le dernier jour du mois à 23:59:59.999 UTC. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getLastDayOfMonth.ts`.
- `DChrono.getLastDayOfWeek` — Retourner le dimanche de la semaine à 23:59:59.999 UTC. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getLastDayOfWeek.ts`.
- `DChrono.getMilliseconds` — Lire les millisecondes d’une date en UTC. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getMilliseconds.ts`.
- `DChrono.getMinute` — Lire les minutes d’une date en UTC ou dans un fuseau horaire donné. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getMinute.ts`.
- `DChrono.getMonth` — Lire le mois d’une date, de 1 à 12, en UTC ou dans un fuseau donné. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getMonth.ts`.
- `DChrono.getSecond` — Lire les secondes d’une date en UTC ou dans un fuseau horaire donné. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getSecond.ts`.
- `DChrono.getTimezoneOffset` — Calculer le décalage d’un fuseau horaire pour une date donnée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/getTimezoneOffset.ts`.
- `DChrono.getWeekOfYear` — Lire le numéro ISO de la semaine d’une date, en tenant compte du fuseau choisi. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getWeekOfYear.ts`.
- `DChrono.getYear` — Lire l’année d’une date en UTC ou dans un fuseau horaire donné. Forme : forme unique. Source : `packages/lang/scripts/chrono/getters/getYear.ts`.
- `DChrono.greaterThanDate` — Comparer deux dates avec une relation strictement supérieure. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/greaterThanDate.ts`.
- `DChrono.greaterThanOrEqualDate` — Comparer deux dates avec une relation supérieure ou égale. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/greaterThanOrEqualDate.ts`.
- `DChrono.greaterThanOrEqualTime` — Comparer deux durées avec une relation supérieure ou égale. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/greaterThanOrEqualTime.ts`.
- `DChrono.greaterThanTime` — Comparer deux durées avec une relation strictement supérieure. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/greaterThanTime.ts`.
- `DChrono.isDate` — Identifier si une valeur est une instance de TheDate et réduire son type. Forme : forme unique. Source : `packages/lang/scripts/chrono/isDate.ts`.
- `DChrono.isSafeTimeValue` — Vérifier qu’une durée entière reste dans l’intervalle sûr de TheTime. Forme : forme unique. Source : `packages/lang/scripts/chrono/isSafeTimeValue.ts`.
- `DChrono.isSafeTimestamp` — Vérifier qu’un timestamp entier reste dans l’intervalle sûr de TheDate. Forme : forme unique. Source : `packages/lang/scripts/chrono/isSafeTimestamp.ts`.
- `DChrono.isSerializedTheDate` — Vérifier qu’une chaîne respecte le format sérialisé sûr d’une TheDate. Forme : forme unique. Source : `packages/lang/scripts/chrono/isSerializedTheDate.ts`.
- `DChrono.isSerializedTheTime` — Vérifier qu’une chaîne respecte le format sérialisé sûr d’une TheTime. Forme : forme unique. Source : `packages/lang/scripts/chrono/isSerializedTheTime.ts`.
- `DChrono.isTime` — Identifier si une valeur est une instance de TheTime et réduire son type. Forme : forme unique. Source : `packages/lang/scripts/chrono/isTime.ts`.
- `DChrono.lessThanDate` — Comparer deux dates avec une relation strictement inférieure. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/lessThanDate.ts`.
- `DChrono.lessThanOrEqualDate` — Comparer deux dates avec une relation inférieure ou égale. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/lessThanOrEqualDate.ts`.
- `DChrono.lessThanOrEqualTime` — Comparer deux durées avec une relation inférieure ou égale. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/lessThanOrEqualTime.ts`.
- `DChrono.lessThanTime` — Comparer deux durées avec une relation strictement inférieure. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/lessThanTime.ts`.
- `DChrono.makeSafeTimeValue` — Ramener une durée vers un entier compris dans l’intervalle sûr de TheTime. Forme : forme unique. Source : `packages/lang/scripts/chrono/makeSafeTimeValue.ts`.
- `DChrono.makeSafeTimestamp` — Ramener un timestamp vers un entier compris dans l’intervalle sûr de TheDate. Forme : forme unique. Source : `packages/lang/scripts/chrono/makeSafeTimestamp.ts`.
- `DChrono.maxDate` — Retourner la date la plus éloignée dans le futur parmi plusieurs dates. Forme : forme unique. Source : `packages/lang/scripts/chrono/maxDate.ts`.
- `DChrono.maxTime` — Retourner la durée de valeur maximale parmi plusieurs durées. Forme : forme unique. Source : `packages/lang/scripts/chrono/maxTime.ts`.
- `DChrono.minDate` — Retourner la date la plus éloignée dans le passé parmi plusieurs dates. Forme : forme unique. Source : `packages/lang/scripts/chrono/minDate.ts`.
- `DChrono.minTime` — Retourner la durée de valeur minimale parmi plusieurs durées. Forme : forme unique. Source : `packages/lang/scripts/chrono/minTime.ts`.
- `DChrono.now` — Créer une TheDate représentant l’instant courant. Forme : forme unique. Source : `packages/lang/scripts/chrono/now.ts`.
- `DChrono.round` — Ramener une date au début de l’unité UTC demandée. Forme : forme unique. Source : `packages/lang/scripts/chrono/round.ts`.
- `DChrono.serialize` — Convertir une TheDate ou une TheTime en chaîne sérialisée. Forme : forme unique. Source : `packages/lang/scripts/chrono/serialize.ts`.
- `DChrono.sortDates` — Trier des dates par ordre croissant ou décroissant. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/sortDates.ts`.
- `DChrono.sortTimes` — Trier des durées par ordre croissant ou décroissant. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/sortTimes.ts`.
- `DChrono.subtractDays` — Soustraire un nombre de jours à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/subtractDays.ts`.
- `DChrono.subtractHours` — Soustraire un nombre d’heures à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/subtractHours.ts`.
- `DChrono.subtractMilliseconds` — Soustraire un nombre de millisecondes à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/subtractMilliseconds.ts`.
- `DChrono.subtractMinutes` — Soustraire un nombre de minutes à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/subtractMinutes.ts`.
- `DChrono.subtractMonths` — Soustraire un nombre de mois à une date en UTC. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/subtractMonths.ts`.
- `DChrono.subtractSeconds` — Soustraire un nombre de secondes à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/subtractSeconds.ts`.
- `DChrono.subtractTime` — Soustraire une durée à une date ou à une autre durée en conservant la nature de l’entrée. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/subtractTime.ts`.
- `DChrono.subtractWeeks` — Soustraire un nombre de semaines à une date. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/subtractWeeks.ts`.
- `DChrono.subtractYears` — Soustraire un nombre d’années à une date en UTC. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/chrono/operators/subtractYears.ts`.
- `DChrono.toDateISOString` — Convertir une date en chaîne ISO UTC. Forme : forme unique. Source : `packages/lang/scripts/chrono/toDateISOString.ts`.
- `DChrono.toNative` — Convertir une TheDate en Date native ou une TheTime en nombre de millisecondes. Forme : forme unique. Source : `packages/lang/scripts/chrono/toNative.ts`.
- `DChrono.toTimeValue` — Lire la valeur en millisecondes d’une TheTime ou d’une chaîne sérialisée. Forme : forme unique. Source : `packages/lang/scripts/chrono/toTimeValue.ts`.
- `DChrono.toTimestamp` — Lire le timestamp en millisecondes d’une TheDate ou d’une chaîne sérialisée. Forme : forme unique. Source : `packages/lang/scripts/chrono/toTimestamp.ts`.
- `DChrono.today` — Créer une TheDate correspondant au début du jour courant en UTC. Forme : forme unique. Source : `packages/lang/scripts/chrono/today.ts`.
- `DChrono.tomorrow` — Créer une TheDate correspondant au début du jour suivant en UTC. Forme : forme unique. Source : `packages/lang/scripts/chrono/tomorrow.ts`.
- `DChrono.yesterday` — Créer une TheDate correspondant au début du jour précédent en UTC. Forme : forme unique. Source : `packages/lang/scripts/chrono/yesterday.ts`.

## 9.12 Inventaire `DDataStructure`

Les helpers de ce domaine sont des fabriques de structures ; la « forme » détectée concerne l'application d'une contrainte à une structure (curry) et non une donnée métier.

- `DDataStructure.absolutePath` — Construire une contrainte de chemin absolu et l’appliquer à une structure de chaîne. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/absolutePath.ts`.
- `DDataStructure.allowedCharacters` — Construire une contrainte de caractères autorisés et l’appliquer à une structure de chaîne. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/allowedCharacters.ts`.
- `DDataStructure.array` — Construire une structure de tableau à partir de la structure de ses éléments. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/array.ts`.
- `DDataStructure.arrayLengthEqual` — Construire une contrainte de longueur exacte et l’appliquer à une structure de tableau. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/arrayLengthEqual.ts`.
- `DDataStructure.betweenThan` — Construire une contrainte de nombre strictement compris entre deux bornes. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/betweenThan.ts`.
- `DDataStructure.betweenThanOrEqual` — Construire une contrainte de nombre compris entre deux bornes inclusives. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/betweenThanOrEqual.ts`.
- `DDataStructure.bigint` — Construire une structure représentant des valeurs `bigint`. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/bigint.ts`.
- `DDataStructure.boolean` — Construire une structure représentant des valeurs booléennes. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/boolean.ts`.
- `DDataStructure.createCodec` — Définir la conversion entre la valeur interne d’un type fondamental et sa représentation encodée. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/common/codec/base.ts`.
- `DDataStructure.createCodecs` — Regrouper des codecs dans un contexte indexé par leurs types fondamentaux. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/common/codec/base.ts`.
- `DDataStructure.createErrorInterpreter` — Transformer les issues d’une erreur de validation ou de codec en messages interprétables. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/common/error/interpreter.ts`.
- `DDataStructure.date` — Construire une structure représentant les dates DuploJS. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/date.ts`.
- `DDataStructure.email` — Construire une contrainte d’adresse email et l’appliquer à une structure de chaîne. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/email.ts`.
- `DDataStructure.endsWith` — Construire une contrainte de suffixe et l’appliquer à une structure de chaîne. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/endsWith.ts`.
- `DDataStructure.even` — Construire une contrainte de nombre pair et l’appliquer à une structure numérique. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/even.ts`.
- `DDataStructure.extend` — Étendre une structure objet en ajoutant ou en remplaçant des propriétés. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/extend.ts`.
- `DDataStructure.greaterThan` — Construire une contrainte de nombre supérieur à un seuil. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/greaterThan.ts`.
- `DDataStructure.greaterThanOrEqual` — Construire une contrainte de nombre supérieur ou égal à un seuil. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/greaterThanOrEqual.ts`.
- `DDataStructure.include` — Construire une contrainte d’inclusion et l’appliquer à une structure de chaîne. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/include.ts`.
- `DDataStructure.integer` — Construire une contrainte de nombre entier et l’appliquer à une structure numérique. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/integer.ts`.
- `DDataStructure.isNullStructure` — Vérifier qu’une structure représente exactement le type `null`. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/isNullStructure.ts`.
- `DDataStructure.isNullable` — Vérifier qu’une structure accepte la valeur `null`. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/isNullable.ts`.
- `DDataStructure.isOptional` — Vérifier qu’une structure accepte la valeur `undefined`. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/isOptional.ts`.
- `DDataStructure.isUndefinedStructure` — Vérifier qu’une structure représente exactement le type `undefined`. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/isUndefinedStructure.ts`.
- `DDataStructure.lazy` — Construire une structure dont la résolution est différée. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/lazy.ts`.
- `DDataStructure.lessThan` — Construire une contrainte de nombre inférieur à un seuil. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/lessThan.ts`.
- `DDataStructure.lessThanOrEqual` — Construire une contrainte de nombre inférieur ou égal à un seuil. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/lessThanOrEqual.ts`.
- `DDataStructure.literal` — Construire une structure représentant une ou plusieurs valeurs littérales. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/literal.ts`.
- `DDataStructure.maxCharacters` — Construire une contrainte de longueur maximale pour une chaîne. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/maxCharacters.ts`.
- `DDataStructure.maxElements` — Construire une contrainte de cardinalité maximale pour un tableau. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/maxElements.ts`.
- `DDataStructure.minCharacters` — Construire une contrainte de longueur minimale pour une chaîne. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/minCharacters.ts`.
- `DDataStructure.minElements` — Construire une contrainte de cardinalité minimale pour un tableau. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/minElements.ts`.
- `DDataStructure.multipleOf` — Construire une contrainte de multiple numérique. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/multipleOf.ts`.
- `DDataStructure.negative` — Construire une contrainte de nombre négatif ou nul. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/negative.ts`.
- `DDataStructure.notEmpty` — Construire une contrainte qui refuse les chaînes vides. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/notEmpty.ts`.
- `DDataStructure.notZero` — Construire une contrainte qui refuse zéro. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/notZero.ts`.
- `DDataStructure.null` — Construire une structure représentant la valeur `null`. Forme : const/classe. Source : `(non localisé)`.
- `DDataStructure.nullable` — Ajouter `null` aux valeurs acceptées par une structure. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/nullable.ts`.
- `DDataStructure.number` — Construire une structure représentant des nombres. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/number.ts`.
- `DDataStructure.numberInString` — Construire une contrainte qui exige qu’une chaîne représente un nombre. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/numberInString.ts`.
- `DDataStructure.object` — Construire une structure objet à partir d’une forme de propriétés. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/object.ts`.
- `DDataStructure.odd` — Construire une contrainte de nombre impair. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/odd.ts`.
- `DDataStructure.optional` — Ajouter `undefined` aux valeurs acceptées par une structure. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/optional.ts`.
- `DDataStructure.partial` — Rendre optionnelles toutes les propriétés d’une structure objet. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/partial.ts`.
- `DDataStructure.path` — Construire une contrainte qui exige une chaîne représentant un chemin. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/path.ts`.
- `DDataStructure.positive` — Construire une contrainte de nombre positif ou nul. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/positive.ts`.
- `DDataStructure.record` — Construire une structure d’objet dont les clés et les valeurs sont structurées. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/record.ts`.
- `DDataStructure.refine` — Construire une contrainte personnalisée à partir d’un predicate DuploJS. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/refine.ts`.
- `DDataStructure.regex` — Construire une contrainte de correspondance avec une expression régulière. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/regex.ts`.
- `DDataStructure.required` — Rendre obligatoires les propriétés d’une structure objet qui peuvent être `undefined`. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/required.ts`.
- `DDataStructure.safe` — Construire une contrainte d’entier sûr JavaScript. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/safe.ts`.
- `DDataStructure.segmentPath` — Construire une contrainte qui exige un segment de chemin. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/segmentPath.ts`.
- `DDataStructure.startsWith` — Construire une contrainte de préfixe et l’appliquer à une structure de chaîne. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/startsWith.ts`.
- `DDataStructure.strictNegative` — Construire une contrainte de nombre strictement négatif. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/strictNegative.ts`.
- `DDataStructure.strictPositive` — Construire une contrainte de nombre strictement positif. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/strictPositive.ts`.
- `DDataStructure.string` — Construire une structure représentant des chaînes de caractères. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/string.ts`.
- `DDataStructure.stringLengthEqual` — Construire une contrainte de longueur exacte pour une chaîne. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/stringLengthEqual.ts`.
- `DDataStructure.time` — Construire une structure représentant les heures DuploJS. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/time.ts`.
- `DDataStructure.trimmed` — Construire une contrainte de chaîne sans espaces périphériques. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/trimmed.ts`.
- `DDataStructure.typeStructureIdentifier` — Identifier une structure de type et affiner son type TypeScript. Forme : curry si args.length===1, sinon data-first. Source : `packages/lang/scripts/dataStructure/helpers/typeStructureIdentifier.ts`.
- `DDataStructure.undefined` — Construire une structure représentant la valeur `undefined`. Forme : const/classe. Source : `(non localisé)`.
- `DDataStructure.union` — Construire une structure qui accepte plusieurs structures alternatives. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/union.ts`.
- `DDataStructure.unwrapLazy` — Résoudre une structure lazy et retourner la structure qu’elle contient. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/unwrapLazy.ts`.
- `DDataStructure.url` — Construire une contrainte d’URL valide. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/url.ts`.
- `DDataStructure.uuid` — Construire une contrainte d’UUID valide. Forme : forme unique. Source : `packages/lang/scripts/dataStructure/helpers/uuid.ts`.

---

# 10. Zones d'incertitude

- **Algorithme exact de `util.inspect`** (seuils de repli sur plusieurs lignes, calcul du nombre de colonnes) : énoncé de mémoire [HYPOTHÈSE] ; seuls les exemples de §2.3 sont vérifiés. À verrouiller par tests dorés sur chaque exercice, ou en portant `lib/internal/util/inspect.js` de la version de Node utilisée.
- **Version de Node et TTY** : la sortie dépend de la version (`engines >= 24.18.0` ; vérifications faites en 24.14.1) et de la présence d'un terminal (couleurs). Fixer la commande de référence (sortie redirigée).
- **Comportements Go** cités (formatage `strconv`, `math.Round`, `math.Mod`, `sync.OnceValue`) : non exécutés, Go absent de la machine [HYPOTHÈSE].
- **Version publiée vs monorepo** : le hackathon dépend de `@duplojs/lang@0.1.0-beta.11` ; cette note lit le HEAD du monorepo (`5c5ca34`). `print` date du 2026-11-13 ; des écarts mineurs avec le paquet publié sont possibles (non vérifiable : `node_modules` absent du dépôt hackathon).
- **`asyncFilter` sans `await`** et **`createExternalAsyncGenerator` à un seul élément** : comportements lus dans le code, peut-être des défauts qui seront corrigés en amont.
- **Domaines survolés** (`chrono`, `dataStructure`, `invocation`, `modeling`, `path`) : inventaire fiable, sémantique fine non vérifiée fichier par fichier.
- **Intentions de conception** : faute de JSDoc et de messages de commit détaillés, plusieurs « pourquoi » sont des inférences marquées [HYPOTHÈSE].
