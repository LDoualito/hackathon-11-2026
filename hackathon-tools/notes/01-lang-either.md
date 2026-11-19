# 01 — `@duplojs/lang` : domaine `either` (et `kind` dont il dépend)

> Notes de recherche pour le transpileur TypeScript (DuploJS) vers Go.
> Source lue : monorepo `duplojs/ecosystem`, paquet `packages/lang` (HEAD du 2026-11-14, commit `5c5ca34`).
> Tous les chemins sont relatifs à la racine du repo `ecosystem`.
> Convention : **[VÉRIFIÉ]** = lu dans le code/les tests/la doc ; **[HYPOTHÈSE]** = inféré, non lu ni exécuté.
> Limite : la bibliothèque n'a pas été exécutée (aucune installation). Les sorties `console.log`/`JSON.stringify` montrées ont été obtenues avec Node 24 sur des objets littéraux reconstruits à l'identique d'après le code.

---

## 0. Carte du domaine either : liste exhaustive des exports

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/either/index.ts:1-30`, `left/index.ts`, `right/index.ts`, `types/index.ts`.

| Famille | Exports runtime |
|---|---|
| Constructeurs Right | `right`, `success`, `ok`, `some`, `result` |
| Constructeurs Left | `left`, `fail`, `error`, `none` |
| Prédicats | `isRight`, `isLeft`, `hasInformation`, `isSelected` |
| Transformation conditionnelle (passe-plat sinon) | `whenIsRight`, `whenIsLeft`, `whenHasInformation`, `whenIsSelected` |
| Transformation à deux branches | `whenIsRightOtherwise`, `whenIsLeftOtherwise`, `whenHasInformationOtherwise`, `whenIsSelectedOtherwise`, `matchInformation`, `matchInformationOtherwise`, `matchInformationCombination`, `matchInformationCombinationOtherwise` |
| Enchaînement court-circuit | `rightPipe`, `rightAsyncPipe` |
| Agrégation | `group`, `asyncGroup` |
| Extraction | `unwrapRight`, `unwrapLeft`, `unwrapOr`, `unwrapOtherwise`, `unwrapByInformation`, `unwrapSelection` |
| Extraction ou exception | `unwrapRightOrThrow`, `unwrapLeftOrThrow`, `unwrapByInformationOrThrow`, `unwrapSelectionOrThrow`, `forwardAssertsSelection` |
| Reclassement / renommage | `keepAsRightByInformation`, `keepAsRightSelection`, `rewriteInformation`, `extractErrorInLeft` |
| Conversion depuis l'extérieur | `safeCallback`, `asyncSafeCallback`, `toMaybe`, `expect` |
| Kinds exportés | `createKind`, `informationKind`, `valueKind`, `rightKind`, `leftKind`, `successKind`, `okKind`, `someKind`, `resultKind`, `failKind`, `errorKind`, `noneKind` |
| Classes d'erreur | `NotRightError`, `NotLeftError`, `HasNotInformationError`, `HasNotSelectedInformationError`, `ForwardAssertsSelectionError` |
| Types | `Right`, `Left`, `Success`, `Ok`, `Some`, `Result`, `Fail`, `Error`, `None`, `Maybe`, `GetValue`, `GetInformation`, `RequireInformationCombination`, `SafeCallbackSuccess`, `SafeCallbackError` |

**Pourquoi** — AGENTS.md du paquet : `either` = « représentation explicite d'une opération pouvant réussir ou échouer » (`packages/lang/AGENTS.md:55`).

**Conséquence transpileur** — Le runtime Go doit offrir un équivalent pour chaque ligne ; les exercices du hackathon utilisent surtout : `success`, `fail`, `left`, `right`, `none`, `some`, `isRight`, `isLeft`, `unwrapRight`, `whenIsRight`, `whenIsRightOtherwise`, `rightPipe`, `rightAsyncPipe`, `group`, `asyncGroup`, `matchInformation`, `whenHasInformation(+Otherwise)`, `keepAsRightByInformation`, `safeCallback`, types `Success`/`Fail`/`Left`/`Right`/`Maybe`/`GetValue`.

**Cas à anticiper** — Les fonctions non utilisées dans les exercices publics peuvent apparaître dans les exercices cachés ; elles partagent toutes les mêmes briques (voir familles §12).

---

## 1. Kind : le mécanisme sous-jacent (clé runtime textuelle)

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/kind/base.ts:82-139`.
- Un « kind » est une **propriété énumérable à clé string** posée sur un objet ordinaire. Clé = `"@duplojs/lang/kind/" + name` (`base.ts:82`, `:103`).
- `createNamespace(ns)` produit des kinds nommés `@${ns}/${name}` (`kind/namespace.ts:27`). Either utilise le namespace `DuplojsLangEither` (`either/kind.ts:3-5`).
- Donc la clé complète d'un kind Either = `@duplojs/lang/kind/@DuplojsLangEither/<nom>`.
- `handler.has(input)` = `Boolean(input && typeof input === "object" && runTimeKey in input)` (`base.ts:128-134`) : teste uniquement la **présence de la clé** (opérateur `in`, donc chaîne de prototypes incluse), jamais le contenu.
- `handler.getValue(input)` = `input[runTimeKey]` (`base.ts:135-137`).
- `addTo` copie (`{...input, [key]: value}`), `setTo` mute (déprécié) (`base.ts:111-127`).
- Côté types, les kinds vivent sous un `unique symbol` fantôme `KeySymbol` (`base.ts:70-80`) : aucune trace runtime de ce symbole.
- `isRuntimeKey(k)` = `k.startsWith("@duplojs/lang/kind/")` (`base.ts:141-143`) ; `DObject.entries` ignore ces clés (`scripts/object/entries.ts`, fin de fichier).

**Pourquoi [VÉRIFIÉ]** — `packages/agents-kit/docs/concepts/01-fundamental/08-kind/*.md` : les kinds servent à « être reconnus et distingués malgré le typage structurel de TypeScript » ; ce sont des « clés textuelles au runtime, représentées sous un symbole dans les types » ; leur reconnaissance « survit au transport si la sérialisation les préserve » (JSON), contrairement à `instanceof`. « Le `has` d'un gestionnaire vérifie seulement la présence de sa clé ».

**Conséquence transpileur** — En Go, un Either n'a pas besoin d'être une map : une struct suffit, MAIS tout ce qui est observable (affichage, sérialisation JSON, itération de clés, égalité structurelle) doit reproduire les clés textuelles et leur ordre (§2, §3).

**Cas à anticiper** — objet « forgé » portant les trois clés (reconnu comme Either) ; objet venant de `JSON.parse` ; objet portant à la fois les clés left et right ; `DObject.entries`/`keys` appliqué à un Either (les clés kind sont filtrées).

---

## 2. Représentation runtime exacte d'un Either

**Fait [VÉRIFIÉ]** — `either/right/create.ts:48-57`, `either/left/create.ts:48-57`, `either/kind.ts:7-14`.
Un Either est un **objet littéral plat** à 3 ou 4 propriétés string énumérables, créées dans cet ordre :

1. statut : `…/right` **ou** `…/left`, valeur `null` (marqueur) ;
2. `…/information` : string (discriminant) ;
3. `…/value` : la valeur portée (clé **toujours présente**, même si `undefined`) ;
4. (variantes seulement) marqueur de variante `…/success|ok|some|result|fail|error|none`, valeur `null`.

Exemple réel de `DEither.success(3)` :

```js
{
  "@duplojs/lang/kind/@DuplojsLangEither/right": null,
  "@duplojs/lang/kind/@DuplojsLangEither/information": "success",
  "@duplojs/lang/kind/@DuplojsLangEither/value": 3,
  "@duplojs/lang/kind/@DuplojsLangEither/success": null
}
```

`DEither.left("negative-operand")` (3 clés, pas de marqueur de variante) :

```js
{
  "@duplojs/lang/kind/@DuplojsLangEither/left": null,
  "@duplojs/lang/kind/@DuplojsLangEither/information": "negative-operand",
  "@duplojs/lang/kind/@DuplojsLangEither/value": undefined
}
```

Pas de prototype particulier, pas de méthode, pas de classe, pas de gel (`Object.freeze` absent) : l'objet est mutable.

**Pourquoi [VÉRIFIÉ]** — doc `concepts/01-fundamental/03-either/01-use.ts` : « Un résultat porte un statut, une information qui identifie le cas et une valeur ». Doc kind `20-metadata.md` : « Dans un `Right`, [les kinds] contiennent notamment le statut, l'information contextuelle et la valeur. Un kind peut aussi n'être qu'un marqueur, avec une valeur `null` ».
Différence avec l'ancêtre `@duplojs/utils` [VÉRIFIÉ] : préfixe `@duplojs/utils/kind/`, namespace `DuplojsUtilsEither`, valeur rangée via `wrapValue` et construction par `setTo` imbriqués (`utils/scripts/either/right/create.ts`, `utils/scripts/common/kind.ts:128`). Dans `lang`, la valeur est devenue un kind (`valueKind`) et l'objet est construit d'un seul littéral.

**Conséquence transpileur** — Modèle Go minimal : `{status: Right|Left, information: string, value: any, variant: ""|"success"|…}`. L'affichage doit régénérer les 3-4 clés dans l'ordre statut, information, value, variante.

**Cas à anticiper** — valeur `undefined` vs `null` (deux valeurs distinctes en JS ; `none()` porte `null`, `fail()`/`ok()` portent `undefined`) ; Either dans un Either (aucun aplatissement à la construction) ; valeur = fonction, tableau, objet, Promise (aucune restriction) ; mutation de la valeur portée (référence partagée, pas de clone).

---

## 3. Affichage et sérialisation d'un Either (`DCommon.print`, `console.log`, JSON)

**Fait [VÉRIFIÉ]** — `packages/lang/scripts/common/print.ts` : `print(input, params = "info")` appelle `console[params](input)` (ou `console.table` / `console.dir`) et **retourne `input`**. Aucun formatage propre à Either : c'est `util.inspect` de Node. Sortie Node 24 pour `DCommon.print(DEither.success(3))` :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
```

`fail()` affiche `'…/value': undefined` (la clé apparaît). `JSON.stringify(fail())` **omet** la clé value :
`{"@duplojs/lang/kind/@DuplojsLangEither/left":null,"@duplojs/lang/kind/@DuplojsLangEither/information":"fail","@duplojs/lang/kind/@DuplojsLangEither/fail":null}`.

**Pourquoi [VÉRIFIÉ]** — doc kind `30-transport.md` : « une propriété valant `undefined` est omise » par JSON ; les kinds sont « internes, mais restent observables dans l'objet JavaScript ».

**Conséquence transpileur** — Les exercices font `DCommon.print(result)` sur des Either (projets 01-07 du hackathon) : la sortie attendue est le format `util.inspect` (clés entre quotes simples car non-identifiants, retour à la ligne car > 72 colonnes, indentation 2 espaces, imbrication jusqu'à profondeur 2 par défaut puis `[Object]`). Le runtime Go doit avoir un formateur « inspect » qui connaît ces clés.

**Cas à anticiper** — Either dans un tableau (`[ {…}, {…} ]` multi-lignes) ; Either imbriqué à profondeur > 2 (`[Object]`) ; valeur string (quotes simples), nombre, tableau court (`[ 1, 2 ]`), `undefined` ; `JSON.stringify` d'un `ok()`/`fail()`/`left("x")` puis re-parse : la clé value disparaît, donc `isRight`/`isLeft` deviennent **faux** (les 3 clés sont exigées, §5).

---

## 4. Constructeurs : `right`, `left`, `success`, `ok`, `some`, `result`, `fail`, `error`, `none`

**Fait [VÉRIFIÉ]**

| Fonction | Signature TS | Objet créé | Fichier |
|---|---|---|---|
| `right(info)` / `right(info, value)` | `Right<I, undefined>` / `Right<I, V>` (`const V`) | right, information=info, value | `either/right/create.ts:28-57` |
| `left(info)` / `left(info, value)` | `Left<I, undefined>` / `Left<I, V>` | left, information=info, value | `either/left/create.ts:28-57` |
| `success(value)` | `Success<V>` = `Right<"success", V>` + kind success | info `"success"` | `either/right/success.ts:20-35` |
| `ok()` | `Ok` = `Right<"ok", void>` + kind ok | info `"ok"`, value `undefined` | `either/right/ok.ts:16-25` |
| `some(value)` | `Some<V>` = `Right<"some", V>` + kind some | info `"some"` | `either/right/some.ts:17-28` |
| `result(info, value)` / `result(info)` **curryfié** | `Result<I, V>` = `Right<I, V>` + kind result | info libre | `either/right/result.ts:25-65` |
| `fail()` | `Fail` = `Left<"fail", void>` + kind fail | info `"fail"`, value `undefined` | `either/left/fail.ts:16-25` |
| `error(value)` | `Error<V>` = `Left<"error", V>` + kind error | info `"error"` | `either/left/error.ts:20-35` |
| `none()` | `None` = `Left<"none", null>` + kind none | info `"none"`, value **`null`** | `either/left/none.ts:15-22` |

- `right`/`left` : paramètre par défaut `value = undefined` ; pas de currying. `right("x")` et `right("x", undefined)` sont identiques.
- `result` : `args.length === 1` ⇒ renvoie `(value) => result(information, value)` (`result.ts:51-55`). Donc `result("x")` n'est **pas** un Either mais une fonction ; `result("x", undefined)` est un Either.
- `success`, `some`, `error` : un seul argument obligatoire ; `success()` sans argument (hors typage) donnerait value `undefined`.
- `const GenericValue` : le type de la valeur est inféré **littéral** (`success(42)` : `Success<42>`).
- `Fail`/`Ok` typés `void` pour la valeur, runtime `undefined`.
- Aucune validation : `information` peut être n'importe quelle string, y compris vide.

**Pourquoi [VÉRIFIÉ]** — doc `01-use.ts` : « Les variantes fournies reposent sur Right (Success, Some, Result, Ok) ou Left (Fail, Error, None). Result décrit un état contextualisé sans décider s'il constitue un succès ou un échec. » ; « Dès qu'une branche d'une fonction renvoie un Right ou un Left, toutes ses branches renvoient un Either […] y compris avec ok() pour une réussite sans valeur ». Doc `60-contextual-state.ts` : avec `Result`, « isRight ne permet pas de distinguer ces états. La discrimination repose sur l'information ». Historique : commit `792e119` (« add more test and fix bug ») a corrigé `none()` qui était construit comme un Right ; commit `2e0a236` a retiré l'argument par défaut générique au profit de deux overloads.

**Conséquence transpileur** — Le type de retour d'une fonction TS du genre `Success<number> | Fail` est une **union discriminée par l'information littérale** ; en Go il faut un type somme (interface scellée ou struct générique + tag) et conserver l'information comme constante. Le marqueur de variante doit être conservé pour l'affichage (4e clé).

**Cas à anticiper** — `result(info)` utilisé en data-last dans un pipe (`DCommon.pipe(value, DEither.result("valid"))`) ; `right("x")` sans valeur ; `success(undefined)` ; `success(success(1))` (imbrication conservée) ; information dynamique (variable string, type `string` non littéral) ; même information portée par un Right et un Left (possible : le statut est indépendant de l'information).

---

## 5. Prédicats : `isRight`, `isLeft`

**Fait [VÉRIFIÉ]** — `either/right/is.ts:10-16`, `either/left/is.ts:10-16`.
`isRight(x)` = `rightKind.has(x) && informationKind.has(x) && valueKind.has(x)` ; `isLeft` idem avec `leftKind`. Un seul argument, **pas de forme curryfiée** (utilisable tel quel comme étape de pipe ou prédicat de `filter`). Type : `input is Extract<GenericInput, Right>`.
- Toute valeur non-objet (nombre, string, `null`, `undefined`, booléen) ⇒ `false`. Une fonction ⇒ `false` (`typeof` vaut `"function"`).
- Les trois clés sont exigées : un objet désérialisé de JSON dont la value était `undefined` n'est plus reconnu.
- `isRight` et `isLeft` ne sont pas mutuellement exclusifs au runtime (objet forgé avec les deux clés) ; ils le sont pour tout objet issu des constructeurs.
- Une `Promise<Either>` n'est **pas** un Either.

**Pourquoi [VÉRIFIÉ]** — doc `10-discrimination.ts` : « Choisir Right ou Left lorsque seul le statut du résultat compte » ; « isRight et isLeft réduisent aussi le type selon le statut du résultat ».

**Conséquence transpileur** — `if (DEither.isRight(r)) {…}` est un **rétrécissement de type** : en Go, il faut un type-switch / test de tag, et dans la branche la valeur a le type de la branche Right. Sur une entrée de type `unknown`/union avec des non-Either, le test doit rester dynamique.

**Cas à anticiper** — `isLeft` utilisé comme callback (`DArray.filter(DEither.isLeft)`, `DCommon.when(DEither.isLeft, …)`, `whenNot(isLeft, …)`) ; retour anticipé `if (DEither.isLeft(r)) return r;` (propagation du même objet) ; négation `!isRight(x)` sur une union contenant des valeurs brutes ; test sur une Promise non attendue (toujours faux).

---

## 6. Currying : comment le runtime distingue data-first et data-last

**Fait [VÉRIFIÉ]** — Toutes les fonctions à double forme utilisent `...args` et testent **uniquement `args.length`** (jamais le type des arguments). Forme courte ⇒ renvoie `(input) => fn(input, ...args)`.

| Fonction | Longueur ⇒ forme curryfiée | Longueur ⇒ forme directe |
|---|---|---|
| `whenIsRight`, `whenIsLeft` | 1 `(fn)` | 2 `(input, fn)` |
| `whenIsRightOtherwise`, `whenIsLeftOtherwise` | 2 `(fn, otherwise)` | 3 |
| `whenHasInformation`, `whenIsSelected` | 2 `(info/selector, fn)` | 3 |
| `whenHasInformationOtherwise`, `whenIsSelectedOtherwise` | 3 | 4 |
| `matchInformation`, `matchInformationCombination` | 1 `(matcher)` | 2 |
| `matchInformationOtherwise`, `matchInformationCombinationOtherwise` | 2 | 3 |
| `hasInformation`, `isSelected`, `unwrapByInformation(OrThrow)`, `unwrapSelection(OrThrow)`, `forwardAssertsSelection`, `keepAsRightByInformation`, `keepAsRightSelection`, `rewriteInformation`, `extractErrorInLeft` | 1 | 2 |
| `unwrapOr`, `unwrapOtherwise` | 1 `(fallback)` | 2 `(input, fallback)` |
| `result` | 1 `(information)` | 2 |

Fonctions **sans** forme curryfiée (toujours data-first, un seul argument « donnée ») : `isRight`, `isLeft`, `unwrapRight`, `unwrapLeft`, `unwrapRightOrThrow`, `unwrapLeftOrThrow`, `toMaybe`, `expect`, `safeCallback`, `asyncSafeCallback`, `group`, `asyncGroup`, `rightPipe`, `rightAsyncPipe` (variadiques), `right`, `left`, `success`, `ok`, `some`, `fail`, `error`, `none`.

Références : `either/right/when.ts:50-57`, `either/right/whenOtherwise.ts:77-85`, `either/whenHasInformation.ts:75-83`, `either/matchInformation.ts:91-94`, `either/unwrapOr.ts:35-39`.

**Pourquoi [VÉRIFIÉ]** — doc `concepts/01-fundamental/02-currying/10-built-in-function.ts` : « Les fonctions `Either` sont elles aussi composables avec les pipes » ; « Les fonctions n'ont pas besoin d'être curifiées lorsqu'elles reçoivent déjà la donnée comme unique argument : elles peuvent être utilisées directement comme étape du pipe ».

**Conséquence transpileur** — La forme est **décidable statiquement** par le nombre d'arguments au site d'appel (et par l'overload choisi par TypeScript). En Go : générer deux fonctions (`WhenIsRight(input, fn)` et `WhenIsRightC(fn)`), ou inliner. La forme curryfiée fige ses arguments à la création (les callbacks ne sont pas appelées tant que la fonction retournée n'est pas appelée).

**Cas à anticiper** — piège `unwrapOr(either)` avec un seul argument : c'est la forme curryfiée (renvoie une fonction) ; argument spread (`fn(...args)`) où l'arité n'est pas statique ; forme curryfiée stockée dans une variable et réutilisée plusieurs fois ; forme curryfiée passée à `DArray.map` (projet 08 : `DArray.map(DEither.whenIsRightOtherwise(DString.to, () => "échec"))`) ; `DArray.map` passant éventuellement plus d'un argument à la callback [HYPOTHÈSE : à vérifier dans la note sur `array`] ; un argument explicitement `undefined` compte dans `args.length`.

---

## 7. `whenIsRight` / `whenIsLeft`

**Fait [VÉRIFIÉ]** — `either/right/when.ts:45-66`, `either/left/when.ts:45-66`.
`whenIsRight(input, fn)` : si `isRight(input)` ⇒ retourne `fn(value)` (la **valeur déballée**, pas le wrapper) ; sinon retourne `input` **inchangé (même référence)**. `whenIsLeft` symétrique.
Type : `Exclude<Input, Right> | Output`. Le résultat de `fn` n'est **pas** ré-emballé : si `fn` renvoie une valeur brute, la sortie mélange valeur brute et Left.
`fn` est appelée au plus une fois, de façon synchrone, avec exactement un argument.

**Pourquoi [VÉRIFIÉ]** — doc `10-discrimination.ts` : « whenIsRight transforme la valeur contenue dans un Right et transmet les Left tels quels ». Doc `50-external-results.ts` : « None est transmis sans exécuter la callback ».

**Conséquence transpileur** — Type de retour = union (valeur brute | Either restant) : en Go, soit `any`, soit un type somme généré par site d'appel. Préserver l'identité de l'entrée non concernée (pas de copie).

**Cas à anticiper** — `fn` renvoie un Either (chaînage type flatMap : `whenIsRight((user) => success(user.name))`) ; `fn` renvoie `void`/`undefined` (type `EscapeVoid` accepté) ; entrée non-Either (nombre, string) renvoyée telle quelle ; `fn` async (retourne une Promise, non attendue) ; `fn` qui lève (exception propagée) ; fonction existante passée par référence (`DEither.whenIsRight(DString.to)`).

---

## 8. `whenIsRightOtherwise` / `whenIsLeftOtherwise`

**Fait [VÉRIFIÉ]** — `either/right/whenOtherwise.ts:65-94`, `either/left/whenOtherwise.ts:65-94`.
`whenIsRightOtherwise(input, fn, otherwise)` : si `isRight(input)` ⇒ `fn(value déballée)` ; sinon ⇒ `otherwise(input)` où `input` est passé **entier** (le wrapper Left complet, ou la valeur non-Either). Une seule des deux callbacks est exécutée. Type : `Output1 | Output2`.

**Pourquoi [VÉRIFIÉ]** — doc `10-discrimination.ts` : « Les variantes Otherwise traitent aussi les cas non ciblés, au lieu de les transmettre ».

**Conséquence transpileur** — Asymétrie à respecter : la branche ciblée reçoit la valeur, la branche « otherwise » reçoit l'Either. C'est un `if/else` exhaustif ; le type de retour est l'union des deux retours (souvent un type unique, ex. `string`).

**Cas à anticiper** — `otherwise` qui ignore son argument (`() => "échec"`, `() => [-12]`) ; `otherwise` qui inspecte l'information du Left (`matchInformation` imbriqué) ; entrée non-Either routée vers `otherwise` ; utilisation après `asyncGroup` dans `DCommon.asyncPipe` (projet 10).

---

## 9. `hasInformation`

**Fait [VÉRIFIÉ]** — `either/hasInformation.ts:44-61`.
`hasInformation(input, info | info[])` = `informationKind.has(input) && valueKind.has(input) && liste.includes(information)`. `DArray.coalescing` transforme une string en tableau à un élément. Ne vérifie **pas** le statut left/right. Comparaison par égalité stricte de strings. Garde de type : rétrécit l'union aux membres portant cette information (statut et valeur affinés).

**Pourquoi [VÉRIFIÉ]** — doc `10-discrimination.ts` : « Choisir une information lorsque le cas précis compte, quel que soit son statut ».

**Conséquence transpileur** — Discrimination par tag string : `switch e.information`. L'information littérale doit exister au runtime Go.

**Cas à anticiper** — tableau vide d'informations (toujours `false`) ; non-Either (`false`) ; plusieurs informations ; information partagée par un Right et un Left de l'union.

---

## 10. `whenHasInformation` / `whenHasInformationOtherwise`

**Fait [VÉRIFIÉ]** — `either/whenHasInformation.ts:63-103`, `either/whenHasInformationOtherwise.ts:65-104`.
- `whenHasInformation(input, info | info[], fn)` : si `(isLeft(input) || isRight(input))` **et** information dans la liste ⇒ `fn(value déballée)` ; sinon `input` inchangé. Accepte `readonly` tableaux (`instanceof Array`).
- `whenHasInformationOtherwise(input, info, fn, otherwise)` : condition `informationKind.has && valueKind.has && includes` (sans test left/right) ⇒ `fn(value)` ; sinon `otherwise(input entier)`.
- Type de retour de la première : `Output | Exclude<Input, Kind<information, I>>`.
- La callback reçoit l'union des valeurs de toutes les variantes ciblées.

**Pourquoi [VÉRIFIÉ]** — doc `10-discrimination.ts` : la callback « reçoit ici l'Error contenue dans le Left "fail-task" » ; « Les variantes non ciblées sont conservées dans le résultat et dans son type ».

**Conséquence transpileur** — Cible indépendante du statut : sert typiquement à récupérer un Left précis (`whenHasInformation("fail", () => 0)`) en laissant passer le reste.

**Cas à anticiper** — information ciblant un Left pour le convertir en valeur par défaut ; liste d'informations ; information absente de l'union (refusée par le typage, possible avec `string`) ; chaînage de plusieurs `whenHasInformation` successifs dans un pipe (chaque étape retire un membre de l'union) ; entrée déjà déballée par une étape précédente (passe-plat).

---

## 11. `matchInformation` / `matchInformationOtherwise`

**Fait [VÉRIFIÉ]** — `either/matchInformation.ts:86-106`, `either/matchInformationOtherwise.ts:119-152`.
- `matchInformation(input, matcher)` : si `input` n'a pas les kinds information+value ⇒ retourne `input` inchangé ; sinon `matcher[information](value déballée)`.
- Le typage impose **une clé par information** de l'union et interdit les clés en trop (`ForbiddenMoreKey`). Au runtime, clé absente ⇒ `TypeError` (appel d'`undefined`) — pas de garde.
- Type : `ReturnType<matcher[keyof matcher]> | Exclude<Input, Either>`.
- `matchInformationOtherwise(input, matcher, otherwise)` : non-Either ⇒ `otherwise(input)` ; clé absente (`=== undefined`) ⇒ `otherwise(input entier)` ; sinon `callback(value)`. Le typage refuse les handlers `undefined` explicites (commit `5c5ca34` « reject undefined matcher handlers »).
- Une seule callback est exécutée ; les autres ne sont jamais appelées.

**Pourquoi [VÉRIFIÉ]** — doc `20-exhaustive-handling.ts` : « matchInformation impose une callback pour chaque information » ; « Ajouter une variante au contrat oblige à réviser la sélection à cet endroit. Cela place la décision dans la couche qui doit la prendre, plutôt que de transmettre involontairement un nouveau résultat à une couche qui ne sait pas le traiter. »

**Conséquence transpileur** — Se traduit en `switch` exhaustif sur l'information ; l'exhaustivité est garantie par TypeScript, donc le `default` Go peut paniquer. Les handlers peuvent être des références de fonctions (`success: DString.to`, projet 07) recevant exactement un argument.

**Cas à anticiper** — handler ignorant la valeur (`() => "texte"`) ; handler = fonction de bibliothèque ; handlers aux types de retour différents (union) ; clés entre guillemets avec tirets (`"negative-operand"`) ; forme curryfiée dans un pipe ; entrée non-Either renvoyée telle quelle ; information portée par plusieurs variantes (un seul handler, valeur = union) ; clé d'information qui collisionne avec `Object.prototype` (`"toString"`, `"constructor"`) [HYPOTHÈSE : le lookup `matcher[info]` trouverait la méthode héritée].

---

## 12. Familles de comportement et invariants communs

**Fait [VÉRIFIÉ]** (synthèse des implémentations lues)

| Famille | Membres | Invariant |
|---|---|---|
| Constructeurs | §4 | Objet neuf à chaque appel ; ordre des clés fixe ; valeur stockée par référence, sans clone ; aucune validation. |
| Prédicats | `isRight`, `isLeft`, `hasInformation`, `isSelected` | Jamais d'exception ; `false` pour tout non-objet ; présence de clés uniquement. |
| « when » passe-plat | `whenIsRight`, `whenIsLeft`, `whenHasInformation`, `whenIsSelected` | Cible ⇒ `fn(valeur déballée)` **sans ré-emballage** ; non-cible ⇒ **même référence** renvoyée ; non-Either = non-cible. |
| « Otherwise » | `when*Otherwise`, `match*Otherwise`, `unwrapOtherwise` | Exactement une callback exécutée ; la branche de repli reçoit l'**entrée entière** (sauf `unwrapOtherwise` : aucun argument). |
| Extraction passe-plat | `unwrapRight`, `unwrapLeft`, `unwrapByInformation`, `unwrapSelection` | Cible ⇒ valeur ; sinon entrée inchangée (Either non ciblé ou valeur brute). |
| Extraction stricte | `*OrThrow`, `forwardAssertsSelection` | Cible ⇒ valeur (ou entrée) ; sinon `throw` d'une `DuploJSError` portant `value`. |
| Court-circuit | `rightPipe`, `rightAsyncPipe` | Premier Left rencontré renvoyé **tel quel** ; étapes suivantes non exécutées ; sortie toujours un Either. |
| Agrégation | `group`, `asyncGroup` | Évaluation dans l'ordre ; premier Left renvoyé tel quel ; getters postérieurs non appelés ; sinon `Success` de la collection des valeurs. |
| Reclassement | `keepAsRight*`, `rewriteInformation`, `extractErrorInLeft` | Inchangé ⇒ même référence ; modifié ⇒ **nouvel** Either « pur » (3 clés, marqueur de variante perdu). |
| Conversion | `safeCallback`, `asyncSafeCallback`, `toMaybe`, `expect` | Un Either déjà construit est renvoyé tel quel. |

**Pourquoi [VÉRIFIÉ]** — fil directeur de la doc : contrôle de flux sans exception (« le code applicatif n'ajoute pas de throw dans les fonctions réutilisables », `50-external-results.ts`), exceptions réservées aux `OrThrow` à « la consommation finale du résultat ».

**Conséquence transpileur** — Trois primitives suffisent pour presque tout : (a) test de statut/information, (b) accès à la valeur, (c) identité (retour du même pointeur). Tout le reste est du sucre.

**Cas à anticiper** — Toute fonction de la famille « passe-plat » appliquée à une union contenant des valeurs brutes : le type résultat est une union hétérogène.

---

## 13. `rightPipe`

**Fait [VÉRIFIÉ]** — `either/right/pipe.ts:564-591` (15 overloads `:38-562`).

```ts
if (isLeft(input)) return input;
let acc = isRight(input) ? value(input) : input;
for (const pipe of pipes) {
    acc = pipe(isRight(acc) ? value(acc) : acc);
    if (isLeft(acc)) return acc;
}
return isRight(acc) ? acc : success(acc);
```

- Entrée Left ⇒ renvoyée telle quelle, aucune étape exécutée.
- Entrée Right ⇒ déballée (un seul niveau) ; entrée brute ⇒ utilisée telle quelle.
- Chaque étape reçoit la **valeur déballée** du résultat précédent ; si elle renvoie un Left ⇒ arrêt, ce Left est le résultat (même référence).
- Fin : si le dernier résultat est un Right ⇒ renvoyé tel quel (information et variante conservées) ; sinon ⇒ `success(acc)`.
- 1 à 15 étapes typées ; l'implémentation est variadique. Avec zéro étape (hors typage), un Right d'entrée ressort **ré-emballé en `success(value)`** (information d'origine perdue).
- Type : `Extract<toutes les sorties d'étapes | entrée, Left> | Exclude<dernière sortie est Either ? elle-même : Success<elle>, Left>`. Les étapes sont typées avec `GetValue<Exclude<Input, Left>>` en paramètre.

**Pourquoi [VÉRIFIÉ]** — doc `30-composition.ts` : « `rightPipe` transmet aux étapes la valeur contenue par les Right, jamais le wrapper `Right` lui-même. Dès qu'un Left apparaît, les étapes suivantes sont ignorées et ce Left est retourné. Une valeur finale brute est enveloppée dans Success ; un Right final est conservé. » Implémentation identique à l'ancêtre `utils/scripts/either/right/pipe.ts` (même algorithme, `unwrap` remplacé par `valueKind.getValue`).

**Conséquence transpileur** — Équivalent Go : suite de `if isLeft { return }` (retour anticipé). À préserver : ordre strict des étapes, non-exécution après Left, identité du Left propagé, conservation du Right final, emballage `success` final seulement si brut. Le type de retour est l'union de **tous** les Left possibles de toutes les étapes + le Right final.

**Cas à anticiper** — première valeur = appel de fonction renvoyant `Success | Fail` (projets 08, 10) ; étapes mêlant fonctions brutes (`DString.split("")`) et fonctions renvoyant un Either ; étape renvoyant `right("autre-info", v)` au milieu (déballé pour la suite, information oubliée) ou à la fin (conservé) ; étape renvoyant `ok()` (la suivante reçoit `undefined`) ; étape renvoyant un Right contenant un Right (un seul niveau déballé par étape, le second niveau le sera à l'étape suivante) ; étape qui lève une exception (propagée, non convertie) ; étape async dans le `rightPipe` synchrone (la Promise est traitée comme valeur brute, donc `success(Promise)`) ; entrée brute non-Either.

---

## 14. `rightAsyncPipe`

**Fait [VÉRIFIÉ]** — `either/right/asyncPipe.ts:600-629`.
Même algorithme que `rightPipe` avec : `const awaitedInput = await input` avant tout, et `acc = await pipe(...)` à chaque étape. Fonction `async` ⇒ **retourne toujours une Promise**, y compris quand l'entrée est un Left synchrone. Type : `Promise<Left possibles | Right final ou Success<…>>` (`RightAsyncPipeResult`, `:25-43`).
- Les étapes peuvent être synchrones ou asynchrones (le `await` est inconditionnel).
- Une étape qui rejette / lève ⇒ la Promise retournée est rejetée (pas de conversion en Left).
- Exécution strictement séquentielle.

**Pourquoi [VÉRIFIÉ]** — doc `30-composition.ts` : « `rightAsyncPipe` applique le même arrêt sur Left et attend chaque étape asynchrone. » ; mise en garde : « Si une étape intermédiaire produit un `Result` dont une information doit être sélectionnée, composez sa sélection dans cette même callback […]. Une étape séparée de `rightAsyncPipe` recevrait la valeur du `Right`, et non le `Result` qui porte l'information. »

**Conséquence transpileur** — En Go, pas de Promise : soit exécution synchrone directe (si aucun parallélisme observable), soit goroutine + channel/future. Comme tout est séquentiel et attendu, une traduction synchrone est fidèle **tant que l'ordre relatif avec d'autres tâches asynchrones concurrentes n'est pas observable** [HYPOTHÈSE à valider par exercice]. La valeur retournée reste « une promesse » pour le code TS appelant (`await`, `DCommon.asyncPipe`).

**Cas à anticiper** — entrée = `Promise<Either>` (appel d'une fonction async) ou Either synchrone ; étapes sync et async mélangées ; résultat passé à `asyncGroup` via getter (projet 10 : `() => calculate(1, 2, 1)`) ; résultat consommé par `await` au top-level ; rejet d'une étape ; microtâches : chaque `await` cède la main même sur valeur synchrone (ordre des `print` entre deux chaînes async concurrentes).

---

## 15. `group`

**Fait [VÉRIFIÉ]** — `either/right/group.ts:62-125` ; `scripts/array/reduce.ts` (`reduceTools`, boucle `:140-185`) ; `scripts/object/override.ts:32-56` ; `scripts/object/entries.ts`.
Entrée : tableau/tuple **ou** objet dont chaque élément est un Either **ou un getter `() => Either`** (`MayBeGetter`).
- Branche tableau (`group instanceof Array`) : `reduce` de gauche à droite depuis `[]`. Pour chaque élément : si `typeof === "function"` ⇒ appelé sans argument ; puis `whenIsRightOtherwise(data => nextPush(acc, data), exit)`. `exit(x)` interrompt la boucle et fait renvoyer `x`. À la fin : `whenNot(isLeft, success)` ⇒ `success(tableauDesValeurs)`.
- Branche objet : `DObject.entries(group)` (ordre des clés JS, clés kind exclues), accumulateur `{}`, `nextWithObject(acc, {[key]: data})` = `DObject.override`.
- Premier Left ⇒ renvoyé **tel quel** (test `expect(result).toBe(error)`, `tests/either/right/group.test.ts:26-37`), les getters suivants **ne sont pas appelés** (spy non appelé).
- Les éléments non-getter sont déjà évalués avant l'appel (arguments JS).
- Groupe vide : `group([])` ⇒ `success([])` ; `group({})` ⇒ `success({})`.
- Chaque itération crée un nouveau tableau/objet (immutabilité : `push` fait `slice()`, `override` fait `{...object}`).
- Particularité objet : `override` **ignore les valeurs `undefined`** (`override.ts:48`) ⇒ une entrée `ok()` ou `success(undefined)` ne crée **pas** de clé dans l'objet résultat (alors que le type l'annonce). La branche tableau, elle, pousse bien `undefined`.
- Élément non-Either (hors typage) : `exit(valeur)` puis `success(valeur)` — la valeur brute remplace toute la collection.
- Type : `Success<{ clé: valeur du Right }>` | union des Left possibles de chaque entrée. Une entrée qui ne peut être que Left a le type `never` dans l'objet résultat.

**Pourquoi [VÉRIFIÉ]** — doc `30-composition.ts` : « group rassemble les valeurs des Right dans un Success, ou retourne le premier Left. Les getters sont appelés dans l'ordre et ceux placés après un Left ne sont pas exécutés. Les valeurs déjà calculées avant l'appel à group ne peuvent pas être annulées. » Doc API `10-group.ts` : « Les getters permettent de différer le calcul de chaque résultat. »

**Conséquence transpileur** — Boucle avec retour anticipé. À préserver : ordre d'évaluation (index croissant ; ordre d'insertion des clés), paresse des getters, identité du Left renvoyé, résultat `Success` (information `"success"`, 4 clés) contenant un tableau ou un objet. En Go l'objet résultat doit garder l'ordre des clés pour l'affichage (struct générée ou map ordonnée).

**Cas à anticiper** — tableau dynamique (`DArray.map(inputs, …)` puis `group(calculations)`, projet 09 : tous les éléments sont déjà calculés, aucun court-circuit d'effets) ; tuple hétérogène (types par position) ; objet mêlant getters et valeurs ; getter à effets de bord (print) placé après un Left (ne doit pas s'exécuter) ; clés d'objet numériques (`{2: …, 1: …}` : JS itère les clés entières en ordre croissant d'abord) ; entrée `ok()` dans la forme objet (clé absente du résultat) ; plusieurs Left (seul le premier compte) ; résultat consommé par `whenIsRightOtherwise(values => …, () => […])`.

---

## 16. `asyncGroup`

**Fait [VÉRIFIÉ]** — `either/right/asyncGroup.ts:61-130` ; `scripts/generator/asyncReduce.ts` (boucle `for await`, `await theFunction(...)`).
Même contrat que `group` avec des éléments `Either | Promise<Either> | () => Either | () => Promise<Either>`. Retourne **toujours une Promise**.
- Par élément (dans l'ordre) : `DCommon.asyncPipe(item, when(isType("function"), g => g()), when(isLeft, exit), whenIsRight(data => nextPush/nextWithObject))`. `asyncPipe` attend l'élément puis chaque étape.
- **Séquentiel** : le getter n+1 n'est appelé qu'après résolution de l'élément n. Aucun `Promise.all`.
- Premier Left ⇒ renvoyé tel quel, getters suivants non appelés.
- Les Promises passées directement (non-getters) sont déjà démarrées ; elles ne sont simplement plus attendues après un Left.
- Rejet d'un élément ⇒ la Promise d'`asyncGroup` est rejetée (pas de conversion en Left).
- Différence d'implémentation avec `group` : ici `when(isLeft, exit)` puis `whenIsRight(...)` (comme dans l'ancêtre `utils`), alors que `group` utilise `whenIsRightOtherwise(..., exit)`. Pour des entrées bien typées le résultat est identique ; pour un élément non-Either le comportement diverge (ici : l'élément brut est pris pour un résultat de reduce, ce qui donne une erreur ou un accumulateur `undefined`) [VÉRIFIÉ par lecture, non exécuté].

**Pourquoi [VÉRIFIÉ]** — doc `30-composition.ts` : « asyncGroup attend chaque résultat dans l'ordre, sans lancer les getters en parallèle. » ; index API : « Regrouper séquentiellement des résultats synchrones ou asynchrones dans un Success. »

**Conséquence transpileur** — Ne **pas** paralléliser en goroutines : l'ordre d'exécution et l'arrêt au premier Left sont observables (effets de bord des getters). Traduction fidèle = boucle séquentielle avec attente.

**Cas à anticiper** — tableau de getters async (projet 10) dont le 3e échoue (`division par zéro`) : les deux premiers s'exécutent, résultat = le Left du 3e ; mélange de Promises déjà lancées et de getters ; getter synchrone dans `asyncGroup` ; résultat passé à `DCommon.asyncPipe(calculations, whenIsRightOtherwise(...))` puis `print(await …)` ; forme objet avec `ok()` (clé omise, comme `group`).

---

## 17. Extraction simple : `unwrapRight`, `unwrapLeft`, `unwrapOr`, `unwrapOtherwise`

**Fait [VÉRIFIÉ]**
- `unwrapRight(input)` : `isRight` ⇒ valeur ; sinon `input` inchangé (`either/right/unwrap.ts:14-22`). Type conditionnel distributif : `Input extends Right ? GetValue<Input> : Input`.
- `unwrapLeft(input)` : symétrique (`either/left/unwrap.ts:14-22`).
- `unwrapOr(input, fallback)` : `isRight` ⇒ valeur ; sinon `fallback` (valeur évaluée d'avance) (`either/unwrapOr.ts:30-48`). Le Left est **abandonné**. Type : `GetValue<Extract<Input, Right>> | Fallback`.
- `unwrapOtherwise(input, () => fallback)` : idem mais fallback paresseux, appelé sans argument et seulement si non-Right (`either/unwrapOtherwise.ts:30-48` ; test « should lazily return the fallback »).
- Un seul niveau de déballage.

**Pourquoi [VÉRIFIÉ]** — doc `10-discrimination.ts` : « unwrapLeft extrait la valeur des Left et conserve les autres résultats enveloppés » ; doc API : « Un Left n'est pas extrait et reste présent dans la sortie ».

**Conséquence transpileur** — `unwrapRight` sur une union Right|Left donne un type `valeur | Left` : après un `if (isRight(r))`, le type est simplement la valeur (cas dominant dans les exercices : 22 usages). Hors rétrécissement, il faut une union.

**Cas à anticiper** — `unwrapRight` dans une branche déjà rétrécie ; `unwrapRight` sur un Left (renvoie le Left lui-même, pas d'erreur) ; sur une valeur brute ; `unwrapOr("anonymous")` curryfié dans un pipe ; `unwrapOr` avec fallback d'un autre type (union) ; Right imbriqué (reste un Right après un déballage) ; `unwrapRight` sur `ok()` ⇒ `undefined`.

---

## 18. Extraction stricte : `unwrapRightOrThrow`, `unwrapLeftOrThrow`, `unwrapByInformationOrThrow`, `unwrapSelectionOrThrow`, `forwardAssertsSelection`

**Fait [VÉRIFIÉ]**
- `unwrapRightOrThrow(input)` : Right ⇒ valeur ; sinon `throw new NotRightError(input)` — identifiant `"either-not-right-error"`, message `"Value is not Right."`, propriété publique `value` = l'entrée (`either/right/unwrapOrThrow.ts:7-29`). Pas de forme curryfiée. Type : `GetValue<Extract<Input, Right>>`.
- `unwrapLeftOrThrow` : `NotLeftError`, `"either-not-left-error"`, `"Value is not Left."` (`either/left/unwrapOrThrow.ts:7-29`).
- `unwrapByInformationOrThrow(input, info | info[])` : `hasInformation` ⇒ valeur ; sinon `HasNotInformationError(input, information)`, message `Value has not information "a or b".` (join `" or "`) (`either/unwrapByInformationOrThrow.ts:9-80`).
- `unwrapSelectionOrThrow(input, selector)` : kinds information+value présents et `selector[info] === true` ⇒ valeur ; sinon `HasNotSelectedInformationError(input, selector)`, message `"Value information is not selected."` (`either/unwrapSelectionOrThrow.ts:9-101`).
- `forwardAssertsSelection(input, selector)` : si l'entrée a une information et `selector[info] !== true` ⇒ `throw ForwardAssertsSelectionError(input, selector)` (`"Either information is not selected."`) ; sinon renvoie `input` **inchangé, non déballé** ; une valeur non-Either passe (`either/forwardAssertsSelection.ts:87-108`).
- Toutes ces erreurs étendent `DCommon.DuploJSError.parentClass(identifiant)` : sous-classes de `Error` portant les kinds `@duplojs/lang/kind/@DuplojsLangCommon/duplojs-error` (= identifiant) et `…/duplojs-error-<identifiant>` (= `null`) (`scripts/common/error.ts`, `scripts/kind/parentClass.ts:57-78`).

**Pourquoi [VÉRIFIÉ]** — doc `10-discrimination.ts` : « Les variantes OrThrow extraient les cas ciblés et lèvent une exception pour les autres. Utile notamment pour affirmer le résultat attendu dans un test unitaire. » ; doc `50-external-results.ts` : « Un throw explicite ou une conversion par OrThrow appartient à la consommation finale du résultat ». Commit `25f790e` « rework error » : passage aux `DuploJSError` identifiées.

**Conséquence transpileur** — En Go : `panic` avec une valeur d'erreur typée (identifiant + message + value), récupérable par l'équivalent de `try/catch`/`safeCallback`. Le message et le nom de classe sont observables si l'erreur non rattrapée est affichée.

**Cas à anticiper** — `unwrapRightOrThrow` sur un Left non rattrapé (crash du programme : trace Node sur stderr, code de sortie 1) ; `OrThrow` à l'intérieur d'un `safeCallback` (devient `Left<"safe-callback-error", NotRightError>`) ; `extractErrorInLeft` en aval ; type de retour sans union (les Left sont exclus du type).

---

## 19. Sélection exhaustive : `isSelected`, `whenIsSelected(+Otherwise)`, `unwrapSelection`, `keepAsRightSelection`

**Fait [VÉRIFIÉ]** — Le « selector » est un objet `Record<information, boolean>` ; le typage exige **toutes** les informations de l'union et interdit les clés en trop. Le runtime teste `selector[information] === true`.
- `isSelected(input, selector)` : `informationKind.has(input) && selector[info] === true` (ne teste pas `valueKind`) (`either/isSelected.ts:60-80`).
- `whenIsSelected(input, selector, fn)` : sélectionné ⇒ `fn(value)` ; sinon `input` (`either/whenIsSelected.ts:109-142`).
- `whenIsSelectedOtherwise(input, selector, fn, otherwise)` : sinon ⇒ `otherwise(input)` (`either/whenIsSelectedOtherwise.ts:86-122`).
- `unwrapSelection(input, selector)` : sélectionné ⇒ valeur ; sinon `input` (`either/unwrapSelection.ts:94-117`).
- `keepAsRightSelection(input, selector)` : voir §20.
- Une valeur de selector typée `boolean` (non littérale) est traitée, côté types, comme « peut-être sélectionnée » (`GetPropsWithValue<…, boolean>`).

**Pourquoi [VÉRIFIÉ]** — doc `20-exhaustive-handling.ts` : « Chaque information doit apparaître dans le sélecteur, même lorsqu'elle vaut false. Ajouter une variante au contrat oblige à réviser la sélection à cet endroit. »

**Conséquence transpileur** — Le selector est presque toujours un littéral objet : compilable en ensemble constant d'informations (`switch`). S'il est dynamique, il faut une map.

**Cas à anticiper** — selector littéral ; selector dans une variable ; valeurs booléennes calculées ; non-Either (passe-plat ou `otherwise`).

---

## 20. Reclassement : `keepAsRightByInformation`, `keepAsRightSelection`

**Fait [VÉRIFIÉ]** — `either/keepAsRightByInformation.ts:60-95`, `either/keepAsRightSelection.ts:86-121`.
`keepAsRightByInformation(input, info | info[])` :
1. si `hasInformation(input, info)` : Left ⇒ **nouveau** `right(information, value)` ; Right ⇒ `input` inchangé ;
2. sinon : Right ⇒ **nouveau** `left(information, value)` ; Left ou non-Either ⇒ `input` inchangé.

Autrement dit : « les informations listées sont Right, toutes les autres sont Left », information et valeur conservées. Les objets recréés sont des Right/Left **purs à 3 clés** : le marqueur de variante est perdu (`fail()` reclassé devient `Right<"fail", undefined>` sans clé `…/fail` ; `success(3)` non listé devient `Left<"success", 3>` sans clé `…/success`).
Type : `Right<Info, Value>` / `Left<Info, Value>` pour les membres basculés, type d'origine pour les membres inchangés.
`keepAsRightSelection` : même logique pilotée par `selector[info] === true`, selector exhaustif.

**Pourquoi [VÉRIFIÉ]** — doc `40-result-adaptation.ts` : « Réinterpréter les statuts selon le contexte : true donne Right, false donne Left. L'information et la valeur sont conservées » ; « keepAsRightByInformation sélectionne seulement les informations à considérer comme Right. Toutes les autres deviennent Left, sans imposer de sélecteur exhaustif. » Doc API : « Un Right dont l'information n'est pas ciblée devient un Left ».

**Conséquence transpileur** — Usage typique : placé avant un `rightPipe`/`whenIsRight` pour qu'un Left « acceptable » continue la chaîne. Attention à l'affichage : l'objet reclassé a 3 clés, pas 4.

**Cas à anticiper** — reclasser `fail` en Right puis `unwrapRight` (valeur `undefined`) ; reclassement qui transforme un `Success` en Left (piège fréquent : il faut lister `"success"` pour le garder Right) ; print du résultat ; plusieurs informations ; entrée non-Either.

---

## 21. `rewriteInformation`, `extractErrorInLeft`

**Fait [VÉRIFIÉ]**
- `rewriteInformation(input, { ancienne: "nouvelle" })` : non-Either ⇒ inchangé ; information absente du matcher ⇒ inchangé (même référence) ; sinon **nouveau** `right(nouvelle, value)` ou `left(nouvelle, value)` selon le statut — variante perdue (test « should rewrite a specialized right as a pure right ») (`either/rewriteInformation.ts:80-114`).
- `extractErrorInLeft(input, identifiant | identifiant[])` : si `input` est un Left dont la valeur est une `DuploJSError` ayant l'un des identifiants ⇒ nouveau `left(identifiantDeLErreur, erreur)` ; sinon inchangé (`either/extractErrorInLeft.ts:80-107`). Ajouté par le commit `338430b`.

**Pourquoi [VÉRIFIÉ]** — doc `40-result-adaptation.ts` : « Renommer une information adapte le vocabulaire du résultat au contexte appelant. rewriteInformation conserve le statut et la valeur ; les variantes non ciblées restent identiques. »

**Conséquence transpileur** — Change le discriminant du type somme : le type Go de sortie diffère de celui d'entrée.

**Cas à anticiper** — renommer `success` (l'objet n'a plus le kind success : 3 clés) ; renommer vers une information déjà existante dans l'union (fusion de variantes) ; `extractErrorInLeft` après `safeCallback`.

---

## 22. `safeCallback`, `asyncSafeCallback`

**Fait [VÉRIFIÉ]** — `either/safeCallback.ts:35-66`, `either/asyncSafeCallback.ts:30-50`.
`safeCallback(fn)` :
1. appelle `fn()` dans un `try` ; exception synchrone ⇒ `left("safe-callback-error", exception)` (retour **synchrone**) ;
2. si le résultat est `instanceof Promise` ⇒ renvoie une Promise : résolue en Either ⇒ tel quel ; résolue en valeur brute ⇒ `right("safe-callback-success", valeur)` ; rejetée ⇒ `left("safe-callback-error", raison)` ;
3. sinon, résultat Either (Right **ou Left**) ⇒ renvoyé tel quel ; valeur brute ⇒ `right("safe-callback-success", valeur)`.

Ce sont des Right/Left purs (3 clés), informations `"safe-callback-success"` / `"safe-callback-error"`. La valeur de l'erreur est typée `unknown` (ce qui a été lancé, pas forcément une `Error`).
`asyncSafeCallback(fnOuPromise)` : accepte une fonction **ou** une Promise (`typeof === "function"`), `await` dans un `try`, retourne **toujours une Promise** d'Either.

**Pourquoi [VÉRIFIÉ]** — doc `50-external-results.ts` : « Une API qui lève sur un refus prévisible doit être adaptée pour le rendre exploitable comme résultat » ; « La capture est large : distinguer le refus documenté d'une cause technique » ; « safeCallback gère aussi les promesses, mais une exception synchrone peut produire directement un Left : préférer asyncSafeCallback pour un retour toujours asynchrone. »

**Conséquence transpileur** — Go : `defer/recover` autour de l'appel ; la valeur récupérée devient la valeur du Left. Tout ce que le code transpilé « lève » (`throw` TS ⇒ `panic` Go) doit transporter la valeur JS d'origine pour être restituée à l'identique. Le type de retour dépend du type de retour de `fn` (Either conservé / Promise / brut).

**Cas à anticiper** — callback qui lève une `Error`, une string, un objet ; callback appelant une fonction `OrThrow` ; callback renvoyant déjà un Either (pas de double emballage) ; callback renvoyant un Left (reste Left, information d'origine) ; callback async ; affichage d'un Left contenant une `Error` (trace de pile dans `util.inspect` — non reproductible à l'identique en Go) ; erreurs runtime JS natives (`TypeError` sur accès à `undefined`, `JSON.parse` invalide) qui n'ont pas d'équivalent Go direct.

---

## 23. `toMaybe`, `expect`, type `Maybe`

**Fait [VÉRIFIÉ]**
- `toMaybe(input)` : Either ⇒ tel quel ; `null` ou `undefined` ⇒ `none()` ; sinon `some(input)` sans clone (`either/toMaybe.ts:18-30`). Les valeurs falsy `0`, `""`, `false` deviennent `some(...)`.
- `expect(input)` : identité, purement pour le typage (« matérialise dans le type qu'une valeur est déjà un `Either` », doc `04-tests/01-unit/10-either.ts`) (`either/expect.ts:10-14`).
- `Maybe<V>` = `Some<V> | None` (`either/types/mayBe.ts`). `Some` est un Right (info `"some"`), `None` un Left (info `"none"`, valeur `null`).

**Pourquoi [VÉRIFIÉ]** — doc `50-external-results.ts` : « Maybe représente une présence ou une absence : Some<Value> est un Right, None est un Left. »

**Conséquence transpileur** — `Maybe` n'est pas un type à part : toutes les fonctions Right/Left s'y appliquent (`whenIsRight` sur un `Maybe`). `expect` s'efface à la compilation.

**Cas à anticiper** — fonction retournant `DEither.Maybe<T>` avec `some(x)` / `none()` (exercices) ; `unwrapRight` sur `None` (renvoie l'objet None) ; `unwrapLeft(none())` ⇒ `null`.

---

## 24. `matchInformationCombination(+Otherwise)`, `unwrapByInformation`

**Fait [VÉRIFIÉ]**
- `matchInformationCombination(tupleDEither, matcher)` : clé = informations jointes par `"/"` dans l'ordre du tuple ; appelle `matcher[clé](tableauDesValeurs)` (`either/matchInformationCombination.ts:115-138`). Aucune garde non-Either. Le typage exige un tuple fini (`RequireInformationCombination`) et toutes les combinaisons.
- `matchInformationCombinationOtherwise(tuple, matcher, otherwise)` : clé absente ⇒ `otherwise(tuple d'Either, non déballé)` (`either/matchInformationCombinationOtherwise.ts:151-178`).
- `unwrapByInformation(input, info | info[])` : `hasInformation` ⇒ valeur ; sinon inchangé (`either/unwrapByInformation.ts:40-61`).

**Pourquoi [VÉRIFIÉ]** — index API : « Appliquer un traitement pour chaque combinaison d'informations d'une collection d'Either. »

**Conséquence transpileur** — `switch` sur la clé composée ; produit cartésien des informations.

**Cas à anticiper** — information contenant `/` (ambiguïté de clé) ; tuple de longueur 1 (clé sans `/`) ; valeurs falsy dans le tableau transmis (tests « unwraps falsy payloads »).

---

## 25. Types utilitaires : `GetValue`, `GetInformation`, `Right`, `Left`, variantes

**Fait [VÉRIFIÉ]**
- `GetValue<E>` = type de la valeur portée (`either/types/getValue.ts`) ; **distributif par indexation** : `GetValue<Success<1> | Left<"x", string>>` = `1 | string`. Usage courant : `GetValue<Extract<T, Right>>`, `GetValue<ReturnType<typeof fn>>`.
- `GetInformation<E>` = union des informations littérales (`either/types/getInformation.ts`).
- `Right<I = string, V = unknown>` / `Left<I = string, V = unknown>` : interfaces = intersection de trois `Kind` (statut, information, valeur) (`right/create.ts:6-26`, `left/create.ts:6-26`).
- `Success<V>` ⊂ `Right<"success", V>` ; `Ok` ⊂ `Right<"ok", void>` ; `Some<V>` ⊂ `Right<"some", V>` ; `Result<I, V>` ⊂ `Right<I, V>` ; `Fail` ⊂ `Left<"fail", void>` ; `Error<V>` ⊂ `Left<"error", V>` ; `None` ⊂ `Left<"none", null>`.
- `Left<"x">` sans second paramètre a une valeur `unknown` ; `left("x")` produit `Left<"x", undefined>`.
- Les fonctions rétrécissent via `Extract<Input, Right>` / `Exclude<Input, Left>` : tout repose sur des **unions de membres discriminés**.

**Pourquoi [VÉRIFIÉ]** — doc `01-use.ts` : « Un contrat exprime les résultats possibles par une union, avec des informations personnalisées ou des variantes fournies. »

**Conséquence transpileur** — Les types n'existent pas au runtime : le transpileur doit résoudre `GetValue<…>` via le type-checker TypeScript (type résolu), pas le traduire syntaxiquement. Le commit `c9fe1ca` du repo hackathon (« generate Either success return types ») montre que le typage de retour des Success est déjà un point sensible.

**Cas à anticiper** — alias `type R = DEither.GetValue<ReturnType<typeof add>>` ; annotation de retour explicite `DEither.Success<number> | DEither.Fail` ; type inféré sans annotation ; `Left<"info", T>` à valeur typée ; valeur littérale (`Success<3>`) vs élargie (`Success<number>`) ; `void` vs `undefined` pour `Ok`/`Fail`.

---

## 26. Intentions de conception (le « pourquoi » global)

**Fait [VÉRIFIÉ]** (citations de `packages/agents-kit/docs/concepts/01-fundamental/03-either/`)
1. **Contrôle de flux sans exception** : « Une issue prévisible et exploitable par le traitement appartient à son contrat de résultat » ; « le code applicatif n'ajoute pas de throw dans les fonctions réutilisables » (`50-external-results.ts`).
2. **L'information littérale est le discriminant** : « Choisir une information lorsque le cas précis compte, quel que soit son statut » (`10-discrimination.ts`) ; `Result` existe pour des états où Right/Left n'a pas de sens (`60-contextual-state.ts`).
3. **Exhaustivité vérifiée par le compilateur** : selectors et matchers doivent couvrir toutes les informations (`20-exhaustive-handling.ts`).
4. **Propagation implicite des échecs** : `rightPipe`/`group` « en arrêtant le traitement au premier Left » (`30-composition.ts`).
5. **Homogénéité** : « ne pas mélanger des Either et des valeurs brutes dans le contrat de retour » (`01-use.ts`) — mais les fonctions tolèrent toutes les valeurs brutes au runtime (passe-plat).
6. **Composabilité par pipe** : double forme data-first / data-last partout (`02-currying/10-built-in-function.ts`).
7. **Identité portée par les données** (kinds textuels) plutôt que par des classes, pour survivre à la sérialisation (`08-kind/30-transport.md`).

**Conséquence transpileur** — Le modèle Go idiomatique `(value, error)` ne suffit pas : un Either est une **valeur de première classe** (stockée dans des tableaux, passée à `map`, affichée). Il faut un type valeur explicite.

**Cas à anticiper** — tableaux d'Either (`DArray.map` produisant `(Success|Fail)[]`), Either comme champ d'objet, Either comme argument de fonction utilisateur.

---

## 27. Synthèse « traduction vers Go » par famille

**Fait / Conséquence transpileur**

| Famille | À préserver | Piège |
|---|---|---|
| Constructeurs | ordre des clés à l'affichage ; présence de la clé value même `undefined` ; marqueur de variante ; `null` ≠ `undefined` | Go n'a pas `undefined` : il faut une sentinelle distincte de `nil` pour afficher `undefined` vs `null`. |
| Prédicats | `false` sur non-Either sans erreur ; rétrécissement de type dans la branche | assertion de type Go dans la branche ; union avec valeurs brutes. |
| when / unwrap passe-plat | identité de l'entrée non ciblée ; pas de ré-emballage de la sortie de `fn` | type de retour hétérogène (`T \| Left`) ⇒ interface/`any` ou type somme généré. |
| Otherwise / match | une seule branche évaluée ; branche de repli reçoit l'Either entier ; branche ciblée reçoit la valeur | exhaustivité garantie côté TS seulement ; handlers passés par référence avec arité 1. |
| rightPipe | ordre, court-circuit, identité du Left, Right final conservé, `success()` final | union de tous les Left intermédiaires dans le type ; déballage d'un seul niveau par étape. |
| group | ordre, paresse des getters, premier Left tel quel, `Success` d'un tableau/objet, clé omise si valeur `undefined` (forme objet) | ordre des clés d'objet ; getters vs valeurs déjà calculées. |
| async | séquentialité stricte ; toujours une Promise ; rejet non converti | ne pas paralléliser ; ordre des microtâches entre chaînes concurrentes. |
| OrThrow / safeCallback | classe, identifiant, message, `value` de l'erreur ; capture large de tout `throw` | `panic/recover` doit transporter la valeur JS d'origine ; trace de pile non reproductible. |
| Reclassement | nouvel objet pur à 3 clés quand modifié ; même référence sinon | perte du marqueur de variante visible à l'affichage. |
| Affichage | format `util.inspect` exact des clés kind | quotes simples, largeur 72, profondeur 2, `undefined` affiché mais omis en JSON. |

**Pourquoi** — L'objectif du hackathon est l'équivalence comportementale observable : sortie standard, ordre des effets, valeurs.

**Cas à anticiper (liste large, transverse)**
1. Fonction utilisateur retournant `success(x)` dans une branche et `fail()`/`left("info")`/`left("info", payload)` dans une autre (type somme à plusieurs Left).
2. Plusieurs Left d'informations différentes issus de fonctions différentes et fusionnés par `rightPipe`.
3. `print` d'un Right, d'un Left, d'un Either reclassé, d'un tableau d'Either, d'un `Success` contenant un tableau/objet.
4. `if (isRight(r)) { print(r) }` (affichage conditionnel, aucune sortie sinon).
5. Pipe `DCommon.pipe(r, whenIsRightOtherwise(f, g), DArray.map(...))` où les deux branches doivent produire le même type.
6. `whenIsRight` dont la callback renvoie un nouveau Either (chaînage) vs une valeur brute.
7. `matchInformation` avec handlers à zéro paramètre, à un paramètre, ou référence de fonction de bibliothèque.
8. `whenHasInformation` ciblant un Left pour produire une valeur de repli, suivi d'un `unwrapRight`.
9. `keepAsRightByInformation` puis `rightPipe` (un Left « toléré » continue la chaîne avec sa valeur, souvent `undefined`).
10. `group` sur tableau calculé par `map` (pas de paresse) vs sur getters (paresse, effets de bord sautés).
11. `asyncGroup` de getters appelant `rightAsyncPipe` (imbrication async, projet 10).
12. `safeCallback` autour d'un code qui lève ; inspection ensuite par `isLeft`/`matchInformation` avec les informations `safe-callback-*`.
13. Either imbriqué (`success(success(1))`), `unwrapRight` simple niveau.
14. Valeurs `undefined` (`ok`, `fail`, `left("x")`) vs `null` (`none`).
15. Fonctions curryfiées stockées dans des constantes, passées en argument, ou composées avec `DCommon.innerPipe`.
16. Information non littérale (variable `string`) : discrimination uniquement dynamique.
17. Promise d'Either passée à une fonction synchrone (`isRight(promise)` ⇒ `false`).
18. Exceptions non rattrapées (`unwrapRightOrThrow` sur Left) : sortie d'erreur et code de retour.
19. Mutation de la valeur portée par référence après construction (alias).
20. Comparaison d'identité entre Either (`===`) : vraie seulement pour le même objet ; deux `fail()` sont distincts.

---

## 28. Zones d'incertitude

- **[HYPOTHÈSE]** Les sorties `util.inspect` ont été reproduites sur objets littéraux équivalents, pas via la bibliothèque installée ; la forme de l'objet est en revanche lue dans le code.
- **[HYPOTHÈSE]** Comportement de `asyncGroup`/`group` sur éléments non-Either (hors contrat typé) : lu, non exécuté.
- **[HYPOTHÈSE]** Collision d'une information avec une propriété héritée d'`Object.prototype` dans `matchInformation`/selectors.
- **[HYPOTHÈSE]** Équivalence d'une traduction synchrone de `rightAsyncPipe`/`asyncGroup` : valable seulement si aucun entrelacement de microtâches n'est observable dans les exercices.
- **Non couvert ici** : le détail de `DCommon.pipe`/`asyncPipe`/`when`/`whenNot`, `DArray.reduce`, `DObject.override` (lus uniquement pour ce qu'en fait `group`), et la version publiée de `@duplojs/lang` réellement utilisée par les exercices (les notes décrivent le HEAD du monorepo ; aucun `node_modules` n'était installé dans le projet hackathon pour comparer).
- La version historique `@duplojs/utils` diffère par le préfixe des clés (`@duplojs/utils/kind/`, namespace `DuplojsUtilsEither`) et le stockage de la valeur : ne pas mélanger les deux formats.
