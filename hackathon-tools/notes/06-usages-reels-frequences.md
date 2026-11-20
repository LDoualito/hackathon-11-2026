# 06 — Usages réels de DuploJS : fréquences d'API, motifs composés, constructions TypeScript

Notes de recherche (lecture seule) pour le transpileur TypeScript/DuploJS → Go. Objet : savoir quelles API `@duplojs/lang` (et son ancêtre `@duplojs/utils`) et quelles constructions TypeScript apparaissent réellement dans le code de l'écosystème, à quelle fréquence et dans quelles combinaisons.

Convention : **[VÉRIFIÉ]** = mesuré avec `rg` ou lu dans le source ; **[HYPOTHÈSE]** = inférence. Date des mesures : 2026-11-18.

Racine des sources analysées (abrégée `$D` dans tout le document) :
`/private/tmp/claude-502/-Users-j-neupert--claude-spares-spare-fytFim/08bcf94a-b274-45f9-8c9f-cee7cf3e984f/scratchpad/duplojs/`

---

## 1. Périmètre et méthode de mesure

**Corpus « lang » (génération actuelle, monorepo `ecosystem`)** [VÉRIFIÉ]
- Bibliothèque (`langLib`) : `$D/ecosystem/packages/{http,form,playwright,json-web-token,server,tools,agents-kit}/scripts` — 692 fichiers, 38 690 lignes.
- Tests (`langTests`) : mêmes paquets, dossiers `tests/` et `integrations/` (+ `form/dev`) — 544 fichiers.
- Docs/exemples (`langDocs`) : `$D/ecosystem/packages/agents-kit/{docs,skills}` (743 fichiers `.ts` d'exemples typés) et `$D/ecosystem/docs` — 784 fichiers, 26 560 lignes.
- Le paquet `ecosystem/packages/lang` lui-même est exclu (c'est l'implémentation, pas un consommateur).

**Corpus « utils » (génération précédente, un repo par paquet)** [VÉRIFIÉ]
- Bibliothèque (`utilsLib`) : `$D/{http,form,playwright,json-web-token,server-utils}/scripts` — 442 fichiers, 25 473 lignes (237 importent `@duplojs/utils`).
- Tests (`utilsTests`) : mêmes repos, `tests/` et `integration/`.
- Docs + applications : `docs/` de ces repos, `$D/discover`, `$D/backend-boilerplate`.
- Ancienne génération (`oldgen`) : `$D/core`, `$D/node`, `$D/http-client`, `$D/examples` (zod + classes, quasi aucune API fonctionnelle DuploJS).

**Commandes** [VÉRIFIÉ]
- Filtre commun : `rg -g '!node_modules' -g '!dist' -g '!*.d.ts' -g '*.ts' -g '*.tsx' -g '*.vue' -g '*.mts'`.
- Fréquences lang : `rg -N --no-filename -o '\bD[A-Z][A-Za-z]+\.[a-z]\w*' <dossiers> | sort | uniq -c | sort -rn` (toute référence `DNamespace.membreMinuscule`, appel ou passage par référence ; les types `DEither.Left<…>` commencent par une majuscule et sont donc exclus).
- Fréquences utils : même principe avec les alias `E|EE|A|AA|O|OO|S|SS|N|G|GG|P|PP|DP|DDP|DPE|DPC|D|DD|C|F|Path|DEither|DArray|…` (regex PCRE avec `(?<![.\w])`), plus les fonctions de `common` importées nues (`pipe(`, `unwrap(`, `justReturn(`…) comptées par `(?<![.\w])nom\(` dans les seuls fichiers qui importent `@duplojs/utils`. Dans les tableaux, `~nom` désigne une fonction de `common` importée nue.
- Motifs multi-lignes : `rg -U --count-matches -P`.
- Nombre d'étapes des pipes : petit script Python (découpe des arguments de premier niveau).

**Limites connues** [VÉRIFIÉ]
- Les accès imbriqués (`DCommon.DuploJSError.parentClass`, 255 occurrences) ne sont pas comptés dans le classement par fonction ; ils sont mesurés à part.
- Les comptages par regex confondent appel et référence, et ne voient pas les ré-exports locaux (`@scripts/...`).
- `langDocs` gonfle artificiellement certaines fonctions : chaque fonction a ses fichiers d'exemple (`DCommon.pipe` y apparaît 381 fois, dont 304 pipes à une seule étape).

---

## 2. Présentation des repos et paquets

### 2.1 Génération actuelle : monorepo `ecosystem` (consomme `@duplojs/lang`)

| Paquet | Rôle | Dépendances DuploJS | Taille (fichiers TS / fichiers important lang) |
|---|---|---|---|
| `ecosystem/packages/http` | Framework HTTP : routes par builder (`useRouteBuilder().extract().presetCheck().handler()`), Hub, plugins (OpenAPI, génération de types client, CORS, cookies, cache, static), client HTTP typé, interface Node | lang, server, tools | 402 / 233 |
| `ecosystem/packages/form` | Formulaires typés pour Vue (« Build complex forms without friction ») | lang | 131 / 56 |
| `ecosystem/packages/playwright` | Surcouche d'organisation Playwright (Website/Page/Component) | lang | 21 / 6 |
| `ecosystem/packages/json-web-token` | JWT typés : `tokenHandler`, Signer/Cipher interchangeables | lang | 82 / 19 |
| `ecosystem/packages/server` | Fichiers, système, variables d'environnement, CLI (`DSFile`, `DSCommand`, `DSCommon`, `DSDataStructure`) ; successeur de `server-utils` | lang | 212 / 166 |
| `ecosystem/packages/tools` | Transformateurs de DataStructure : vers TypeScript (`DStoTS`), JSON Schema (`DStoJS`), DataStructure (`DStoDS`) ; successeur de `data-parser-tools` | lang, server | 384 / 345 |
| `ecosystem/packages/agents-kit` | Skills et documentation pour agents IA ; contient `docs/API` (622 exemples) et `docs/concepts` (123) | tous | 809 / 708 |
| `ecosystem/docs/examples` | Exemples du site : seulement 2 fichiers (`v1/api/lang/array/map.ts`, `string/split.ts`) | — | 2 / 0 |

Statut : **actuel** (dernier commit 2026-11-14). [VÉRIFIÉ]

### 2.2 Génération précédente : repos séparés (consomment `@duplojs/utils` 1.x)

| Repo | Rôle | Statut | Dépendances DuploJS (package.json) |
|---|---|---|---|
| `$D/utils` | Bibliothèque fonctionnelle, **ancêtre de `lang`** (3 297 fichiers TS, dont 577 exemples de doc) | ancêtre (dernier commit 2026-07-12) | — |
| `$D/http` | Même framework HTTP que `ecosystem/packages/http`, version utils | ancêtre (2026-06-30) | utils ≥1.10.2, server-utils, data-parser-tools |
| `$D/form` | Ancêtre de `ecosystem/packages/form` | ancêtre (2026-06-05) | utils ≥1.9.2 |
| `$D/playwright` | Ancêtre du paquet playwright | ancêtre (2026-06-05) | utils ≥1.9.2 |
| `$D/json-web-token` | Ancêtre du paquet JWT | ancêtre (2026-07-02) | utils ≥1.10.3 |
| `$D/server-utils` | Ancêtre de `ecosystem/packages/server` | ancêtre (2026-07-07) | utils ≥1.10.1 |
| `$D/backend-boilerplate` | Squelette d'application back-end (clean architecture) : 11 fichiers, 68 lignes | exemple applicatif, encore en utils (2026-07-03) | http 0.13.2, server-utils 0.4.2, utils 1.10.3 |
| `$D/discover` | Site vitrine VitePress ; `app/examples/layers` = application complète « bibliothèque » (Book/Client) | exemple applicatif, encore en utils (2026-07-03) | form, http, jwt, playwright, server-utils, utils 1.10.3 |

### 2.3 Ancienne génération (archivée, style classes + zod)

| Repo | Rôle | Statut | Dépendances |
|---|---|---|---|
| `$D/core` | Premier moteur de routes (classes `Duplo`, `Route`, `Step`, zod) | archivé (2025-06-26) | utils 0.3.1, zod-accelerator |
| `$D/node` | Adaptateur Node de `core` | archivé (2025-07-17) | core, utils 0.2.1 |
| `$D/http-client` | Client HTTP de `core` | archivé de fait (2025-05-06) | core, utils 0.2.1 |
| `$D/examples` | Tutoriels `get-started` et exercices (`to-do`, `auth`) pour `core` | archivé de fait (2025-03-13) | core, zod |

[VÉRIFIÉ] Ces quatre repos n'utilisent de `@duplojs/utils` 0.x que des helpers nus : `simpleClone` (22), `stringToBytes` (13), `clone` (3), `getTypedEntries`, `hasKey`, et des types (`ExpectType`, `AnyFunction`, `MybePromise`). Aucun `Either`, aucun `pipe`. Ils sont sans intérêt pour le transpileur, sauf comme témoin du style « avant ».

---

## 3. De `@duplojs/utils` à `@duplojs/lang` : renommages et conventions d'import

### 3.1 Deux conventions d'import à couvrir dans une recherche

[VÉRIFIÉ] **Convention lang (actuelle)** : un import d'espace de noms par sous-module, alias long préfixé `D`.

```ts
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import type * as DPath from "@duplojs/lang/path";
```

Comptage des instructions d'import dans les 7 paquets consommateurs : `DCommon` 637 (+362 `import type`), `DDataStructure` 537, `DEither` 449, `DArray` 169, `DString` 139, `DPath` 124, `DChrono` 122, `DPattern` 88, `DModeling` 62, `DGenerator` 57, `DKind` 55, `DNumber` 49, `DObject` 48, `DInvocation` 29, `DTuple` 7, `DPrinter` 7. Aucun import nommé depuis la racine `@duplojs/lang` dans le code consommateur.

Alias inter-paquets : `DSFile`, `DSCommand`, `DSCommon`, `DSDataStructure` (`@duplojs/server/*`), `DStoTS`, `DStoJS`, `DStoDS` (`@duplojs/tools/*`).

[VÉRIFIÉ] **Convention utils (ancêtre)** : import nommé depuis la racine avec alias courts, fonctions de `common` importées nues.

```ts
import { E, unwrap, pipe, DP, DPE, A, O, justReturn } from "@duplojs/utils";
import * as EE from "@duplojs/utils/either";   // alias doublés dans le code de bibliothèque
import * as AA from "@duplojs/utils/array";
```

Spécificateurs : `"@duplojs/utils"` 1 316 fois, `/either` 81, `/dataParser` 36, `/date` 25, `/string` 16, `/array` 16, `/object` 15, `/generator` 12.

### 3.2 Table de correspondance des alias

| Domaine | utils (court / long / doublé) | lang (long / court exporté par l'index) | Remarque |
|---|---|---|---|
| Either | `E` / `DEither` / `EE` | `DEither` / `E` | |
| Array | `A` / `DArray` / `AA` | `DArray` / `A` | |
| Object | `O` / `DObject` / `OO` | `DObject` / `O` | |
| String | `S` / `DString` / `SS` | `DString` / `S` | |
| Number | `N` / `DNumber` | `DNumber` / `N` | contenu repensé (voir 3.3) |
| Generator | `G` / `DGenerator` / `GG` | `DGenerator` / `G` | |
| Pattern | `P` / `DPattern` / `PP` | `DPattern` / `P` | |
| Validation | `DP` / `DDataParser` / `DDP` ; `DPE` (extended) ; `DPC` (coerce) | `DDataStructure` / `DS` | **dataParser → dataStructure** |
| Dates | `D` / `DDate` / `DD` | `DChrono` / `C` | **date → chrono** ; attention `C` change de sens |
| Modélisation métier | `C` / `DClean` | `DModeling` / `M` | **clean → modeling** |
| Flux | `F` / `DFlow` | `DInvocation` | **flow → invocation** (flow + workflow, ports, evidence) |
| Common | fonctions nues (`pipe`, `unwrap`…) / `DCommon` | `DCommon` | en lang, toujours préfixé |
| Chemins | `Path` (dans common) | `DPath` (module dédié) | |
| Kind | `createKindNamespace`, `kindHeritage`, `builderKind` (common) | `DKind` (module dédié) : `createNamespace`, `parentClass` | |
| Printer | `Printer` (common) | `DPrinter` | |
| Tuple | `A.mapTuple`, `A.toTuple` | `DTuple` (nouveau module) | |

[VÉRIFIÉ] L'index de lang (`$D/ecosystem/packages/lang/scripts/index.ts`) exporte encore les alias courts (`E`, `A`, `O`, `S`, `DS`, `C`, `T`, `N`, `M`, `P`, `G`), mais aucun paquet de l'écosystème ne les utilise : la convention réelle est `import * as DX from "@duplojs/lang/x"`.

### 3.3 Fonctions renommées ou repensées (diff des dossiers `scripts/`)

[VÉRIFIÉ] par comparaison des listes de fichiers `$D/utils/scripts/<module>` et `$D/ecosystem/packages/lang/scripts/<module>` :

- **`unwrap`** (common, utils) disparaît de `common` : en lang on écrit `DEither.unwrapRight` / `DEither.unwrapLeft` (et `unwrapRightOrThrow`, `unwrapOr`, `unwrapOtherwise`).
- **`sleep`** (utils) → `DCommon.timeout` (lang).
- **Either** : utils avait les sous-familles `bool`, `nullable`, `nullish`, `optional`, `future` ; lang les retire et ajoute `some`/`none` (Maybe), `toMaybe`, `isSelected`, `extractErrorInLeft`, `rewriteInformation`, `matchInformationCombination(Otherwise)`, `unwrapOr`, `unwrapOtherwise`.
- **Number** : utils exposait l'arithmétique curryfiée (`add`, `subtract`, `multiply`, `divide`, `modulo`, `abs`, `floor`, `ceil`, `round`, `clamp`, `power`, `greater`, `less`, `between`…) ; lang ne garde que comparaisons et prédicats (`greaterThan`, `lessThanOrEqual`, `betweenThan`, `isEven`, `isInteger`, `isPositive`, `sum`, `min`, `max`, `minOf`, `maxOf`, `sort`).
- **Array** : lang retire `join`, `sum`, `maxOf`, `minOf`, `mapTuple`, `toTuple`, `castMaxElements`, `withMaxElements` ; ajoute `prepend` et un dossier `constraints`. `join` vit dans `DString.join`.
- **String** : lang retire `match`/`matchAll` ; ajoute `first`, `last`, `join`, `stringify`, `isNotEmpty`, `isEmail`, `isUrl`, `isUuid`, `isNumber`, `isComposedOf`, `lengthEqual`, `minCharacters`, `maxCharacters`.
- **Object** : lang retire `deepDiscriminate` ; ajoute `deepOverride`, `is`, `isSimple`.
- **Pattern** : lang ajoute `matchWithError(Otherwise)`, `matchWithTaggedObject(Otherwise)`, `matchWithEntity(Otherwise)`, `matchWithFact(Otherwise)`.
- **Generator** : lang ajoute `loopAccumulator`, `asyncLoopAccumulator`.
- **DataParser → DataStructure** : `DP.string()` + `DPE.string()` (API chaînée) → `DDataStructure.string([contraintes])` ; `DP.checkerNumberMin` → contraintes comme `DDataStructure.greaterThanOrEqual(1)` ; `DP.identifier`/`dataParserKind` → `constraintIdentifier`/`typeIdentifier`/`structureIdentifier`.
- **Classes d'erreur** : utils `class X extends kindHeritage(...)` (28 dans utilsLib) → lang `class X extends DCommon.DuploJSError.parentClass("information", Error) {}` (255 dans langLib).

[HYPOTHÈSE] Le déplacement de l'arithmétique hors de `DNumber` signifie que le code lang utilise les opérateurs natifs (`+`, `-`, `*`) pour le calcul : c'est plus simple à transpiler.

---

## 4. Fréquences `@duplojs/lang` — vue par espace de noms (code de bibliothèque)

[VÉRIFIÉ] 2 461 références dans `langLib` (692 fichiers). Répartition :

| Espace de noms | Références | Part |
|---|---|---|
| DEither | 634 | 26 % |
| DDataStructure | 609 | 25 % |
| DCommon | 328 | 13 % |
| DArray | 249 | 10 % |
| DString | 106 | 4 % |
| DPath | 88 | 4 % |
| DObject | 70 | 3 % |
| DGenerator | 62 | 3 % |
| DChrono | 59 | 2 % |
| DKind | 53 | 2 % |
| DPrinter | 52 | 2 % |
| DPattern | 43 | 2 % |
| DSFile / DSDataStructure / DSCommand / DSCommon (server) | 28 / 16 / 10 / 8 | 3 % |
| DModeling | 28 | 1 % |
| DInvocation | 9 | <1 % |
| DStoTS | 7 | <1 % |
| DTuple | 2 | <1 % |
| DNumber | 0 | 0 % |

Lecture : Either + DataStructure + Common + Array = 74 % des références. `DNumber` n'est jamais appelé dans le code de bibliothèque (uniquement dans la doc).

Par paquet (`langLib`) [VÉRIFIÉ] : http 705 références / 222 fichiers ; server 746 / 109 ; tools 731 / 220 ; agents-kit 99 / 9 ; form 96 / 66 ; json-web-token 81 / 58 ; playwright 3 / 8.

---

## 5. Fréquences `@duplojs/lang` — top 50 global (bibliothèque + tests + docs)

[VÉRIFIÉ] Colonnes : `lib` / `tests` / `docs` / total. 15 073 références au total (2 461 + 8 578 + 4 034).

| # | Fonction | lib | tests | docs | total |
|---|---|---|---|---|---|
| 1 | DCommon.infer | 6 | 920 | 12 | 938 |
| 2 | DDataStructure.string | 9 | 625 | 139 | 773 |
| 3 | DCommon.pipe | 92 | 9 | 381 | 482 |
| 4 | DEither.isRight | 12 | 335 | 30 | 377 |
| 5 | DDataStructure.number | 3 | 297 | 56 | 356 |
| 6 | DEither.unwrapRight | 78 | 190 | 62 | 330 |
| 7 | DEither.right | 115 | 176 | 14 | 305 |
| 8 | DEither.isLeft | 106 | 147 | 41 | 294 |
| 9 | DStoTS.defaultConstraintTransformers | 0 | 204 | 0 | 204 |
| 10 | DStoTS.defaultStructureTransformers | 0 | 204 | 0 | 204 |
| 11 | DEither.left | 138 | 39 | 21 | 198 |
| 12 | DStoTS.defaultTypeTransformers | 0 | 196 | 0 | 196 |
| 13 | DPath.declarePath | 5 | 158 | 27 | 190 |
| 14 | DDataStructure.object | 9 | 144 | 28 | 181 |
| 15 | DEither.unwrapByInformationOrThrow | 0 | 158 | 18 | 176 |
| 16 | DDataStructure.literal | 7 | 135 | 23 | 165 |
| 17 | DDataStructure.constraintIdentifier | 162 | 0 | 0 | 162 |
| 18 | DStoTS.render | 0 | 149 | 0 | 149 |
| 19 | DEither.unwrapLeft | 31 | 55 | 51 | 137 |
| 20 | DEither.success | 25 | 65 | 44 | 134 |
| 21 | DChrono.createDate | 1 | 37 | 94 | 132 |
| 22 | DCommon.cast | 19 | 82 | 26 | 127 |
| 23 | DSCommand.createArgument | 1 | 112 | 13 | 126 |
| 24 | DDataStructure.array | 3 | 95 | 14 | 112 |
| 25 | DArray.map | 53 | 27 | 23 | 103 |
| 26 | DStoJS.render | 0 | 103 | 0 | 103 |
| 27 | DCommon.asyncPipe | 17 | 60 | 24 | 101 |
| 28 | DEither.hasInformation | 13 | 77 | 11 | 101 |
| 29 | DCommon.when | 9 | 0 | 91 | 100 |
| 30 | DSCommand.createError | 0 | 92 | 0 | 92 |
| 31 | DPath.resolveRelative | 19 | 57 | 12 | 88 |
| 32 | DStoDS.render | 0 | 88 | 0 | 88 |
| 33 | DChrono.createDateOrThrow | 16 | 40 | 26 | 82 |
| 34 | DCommon.asserts | 1 | 78 | 2 | 81 |
| 35 | DSFile.createFileInterface | 4 | 70 | 2 | 76 |
| 36 | DArray.from | 5 | 37 | 31 | 73 |
| 37 | DChrono.createTime | 4 | 39 | 30 | 73 |
| 38 | DSCommand.create | 4 | 60 | 9 | 73 |
| 39 | DStoDS.defaultTypeTransformers | 0 | 73 | 0 | 73 |
| 40 | DCommon.isType | 20 | 4 | 46 | 70 |
| 41 | DCommon.timeout | 1 | 36 | 28 | 65 |
| 42 | DDataStructure.union | 3 | 55 | 7 | 65 |
| 43 | DSFile.readTextFile | 2 | 51 | 8 | 61 |
| 44 | DDataStructure.integer | 0 | 45 | 15 | 60 |
| 45 | DDataStructure.notEmpty | 0 | 56 | 2 | 58 |
| 46 | DPath.createOrThrow | 5 | 48 | 5 | 58 |
| 47 | DString.toUpperCase | 1 | 0 | 57 | 58 |
| 48 | DDataStructure.typeIdentifier | 53 | 4 | 0 | 57 |
| 49 | DEither.error | 15 | 32 | 9 | 56 |
| 50 | DDataStructure.uuid | 0 | 39 | 16 | 55 |

Lecture : le top global est dominé par les **tests** (schémas `DDataStructure.string()` fabriqués en masse, `DCommon.infer` pour les types, gardes `isRight`). Pour décider quoi transpiler, le classement « bibliothèque » (section 6) est plus représentatif du code de production.

---

## 6. Fréquences `@duplojs/lang` — top 50 du code de bibliothèque seul

[VÉRIFIÉ] `langLib` uniquement (c'est le classement le plus proche d'un « programme réel »).

| # | Fonction | n | # | Fonction | n |
|---|---|---|---|---|---|
| 1 | DDataStructure.constraintIdentifier | 162 | 26 | DPattern.when | 17 |
| 2 | DEither.left | 138 | 27 | DString.startsWith | 17 |
| 3 | DEither.right | 115 | 28 | DChrono.createDateOrThrow | 16 |
| 4 | DEither.isLeft | 106 | 29 | DChrono.isSafeTimestamp | 16 |
| 5 | DCommon.pipe | 92 | 30 | DEither.rightAsyncPipe | 16 |
| 6 | DEither.unwrapRight | 78 | 31 | DKind.createNamespace | 16 |
| 7 | DArray.map | 53 | 32 | DPrinter.colorizedBold | 16 |
| 8 | DDataStructure.typeIdentifier | 53 | 33 | DString.join | 16 |
| 9 | DDataStructure.structureIdentifier | 46 | 34 | DArray.find | 15 |
| 10 | DCommon.justReturn | 44 | 35 | DCommon.forward | 15 |
| 11 | DKind.parentClass | 33 | 36 | DCommon.innerPipe | 15 |
| 12 | DEither.unwrapLeft | 31 | 37 | DEither.error | 15 |
| 13 | DObject.entry | 27 | 38 | DObject.entries | 15 |
| 14 | DArray.coalescing | 26 | 39 | DCommon.justExec | 14 |
| 15 | DArray.filter | 26 | 40 | DEither.hasInformation | 13 |
| 16 | DEither.success | 25 | 41 | DString.replace | 13 |
| 17 | DEither.whenIsRight | 25 | 42 | DArray.minElements | 12 |
| 18 | DArray.reduce | 24 | 43 | DEither.isRight | 12 |
| 19 | DArray.reduceFrom | 24 | 44 | DPath.normalize | 12 |
| 20 | DGenerator.reduceFrom | 21 | 45 | DString.test | 12 |
| 21 | DCommon.isType | 20 | 46 | DGenerator.asyncReduce | 11 |
| 22 | DCommon.cast | 19 | 47 | DPath.getParentFolderPath | 11 |
| 23 | DPath.resolveRelative | 19 | 48 | DPattern.match | 11 |
| 24 | DPrinter.renderLine | 19 | 49 | DPrinter.renderParagraph | 11 |
| 25 | DCommon.asyncPipe | 17 | 50 | DArray.flatMap | 10 |

À ajouter hors classement regex : `DCommon.DuploJSError.parentClass(...)` = 255 occurrences (déclarations de classes d'erreur) [VÉRIFIÉ].

Note : `constraintIdentifier` / `typeIdentifier` / `structureIdentifier` (261 au total) sont concentrés dans `tools` (transformateurs de schémas) et `server/command/help.ts` ; c'est de la méta-programmation sur les DataStructure, pas de la logique métier.

---

## 7. Fréquences `@duplojs/lang` — top 15 par domaine

[VÉRIFIÉ] Format `fonction lib/tests/docs/total`. « distinct » = nombre de fonctions différentes du domaine rencontrées dans le corpus.

### 7.1 DEither (49 fonctions distinctes)

| Fonction | lib | tests | docs | total |
|---|---|---|---|---|
| isRight | 12 | 335 | 30 | 377 |
| unwrapRight | 78 | 190 | 62 | 330 |
| right | 115 | 176 | 14 | 305 |
| isLeft | 106 | 147 | 41 | 294 |
| left | 138 | 39 | 21 | 198 |
| unwrapByInformationOrThrow | 0 | 158 | 18 | 176 |
| unwrapLeft | 31 | 55 | 51 | 137 |
| success | 25 | 65 | 44 | 134 |
| hasInformation | 13 | 77 | 11 | 101 |
| error | 15 | 32 | 9 | 56 |
| unwrapRightOrThrow | 2 | 20 | 14 | 36 |
| rightAsyncPipe | 16 | 0 | 15 | 31 |
| whenIsRight | 25 | 0 | 6 | 31 |
| result | 0 | 0 | 22 | 22 |
| rightPipe | 7 | 0 | 13 | 20 |

Suivent (lib) : `whenIsLeft` 9, `fail` 8, `safeCallback` 7, `whenIsRightOtherwise` 6, `ok` 5, `matchInformation` 3 (15 en docs), `keepAsRightByInformation` 0 en lib (11 en docs), `toMaybe` 4 en étape de pipe.

### 7.2 DCommon (63 fonctions distinctes)

| Fonction | lib | tests | docs | total |
|---|---|---|---|---|
| infer | 6 | 920 | 12 | 938 |
| pipe | 92 | 9 | 381 | 482 |
| cast | 19 | 82 | 26 | 127 |
| asyncPipe | 17 | 60 | 24 | 101 |
| when | 9 | 0 | 91 | 100 |
| asserts | 1 | 78 | 2 | 81 |
| isType | 20 | 4 | 46 | 70 |
| timeout | 1 | 36 | 28 | 65 |
| justReturn | 44 | 1 | 5 | 50 |
| builderKind | 0 | 41 | 0 | 41 |
| forward | 15 | 13 | 11 | 39 |
| innerPipe | 15 | 3 | 9 | 27 |
| equal | 1 | 1 | 23 | 25 |
| justExec | 14 | 0 | 2 | 16 |
| truthy | 7 | 0 | 9 | 16 |

Suivent (lib) : `stringToBytes` 10, `callThen` 7, `simpleClone` 6, `memo` 6, `escapeRegExp` 5, `createEnum` 5.

### 7.3 DArray (54 fonctions distinctes)

| Fonction | lib | tests | docs | total |
|---|---|---|---|---|
| map | 53 | 27 | 23 | 103 |
| from | 5 | 37 | 31 | 73 |
| filter | 26 | 2 | 11 | 39 |
| reduce | 24 | 0 | 8 | 32 |
| coalescing | 26 | 0 | 4 | 30 |
| reduceFrom | 24 | 0 | 4 | 28 |
| find | 15 | 4 | 3 | 22 |
| minElements | 12 | 0 | 3 | 15 |
| push | 9 | 0 | 6 | 15 |
| concat | 7 | 0 | 7 | 14 |
| at | 0 | 0 | 13 | 13 |
| first | 4 | 0 | 9 | 13 |
| flatMap | 10 | 0 | 3 | 13 |
| includes | 9 | 0 | 4 | 13 |
| some | 7 | 0 | 4 | 11 |

### 7.4 DObject (22 fonctions distinctes)

| Fonction | lib | tests | docs | total |
|---|---|---|---|---|
| entry | 27 | 1 | 4 | 32 |
| entries | 15 | 1 | 4 | 20 |
| fromEntries | 9 | 1 | 3 | 13 |
| override | 8 | 0 | 3 | 11 |
| pick | 3 | 0 | 5 | 8 |
| discriminate | 0 | 0 | 7 | 7 |
| countKeys | 3 | 0 | 3 | 6 |
| getProperty | 0 | 0 | 6 | 6 |
| isSimple | 0 | 0 | 5 | 5 |
| omit | 0 | 1 | 4 | 5 |
| to | 2 | 0 | 3 | 5 |
| transformProperty | 0 | 0 | 5 | 5 |
| discriminateEntryKey | 0 | 0 | 4 | 4 |
| discriminateEntryValue | 0 | 0 | 4 | 4 |
| values | 2 | 0 | 2 | 4 |

### 7.5 DString (52 fonctions distinctes)

| Fonction | lib | tests | docs | total |
|---|---|---|---|---|
| toUpperCase | 1 | 0 | 57 | 58 |
| length | 4 | 0 | 32 | 36 |
| startsWith | 17 | 0 | 7 | 24 |
| trim | 1 | 2 | 20 | 23 |
| split | 4 | 1 | 17 | 22 |
| join | 16 | 0 | 4 | 20 |
| replace | 13 | 0 | 6 | 19 |
| test | 12 | 0 | 4 | 16 |
| toLowerCase | 0 | 0 | 16 | 16 |
| includes | 4 | 7 | 4 | 15 |
| sort | 0 | 10 | 3 | 13 |
| prepend | 0 | 0 | 11 | 11 |
| endsWith | 3 | 0 | 6 | 9 |
| isNotEmpty | 0 | 0 | 9 | 9 |
| to | 3 | 0 | 5 | 8 |

Remarque : `toUpperCase`, `trim`, `toLowerCase`, `length` (les fonctions des 10 exercices) sont des fonctions « de documentation » : presque absentes du code de bibliothèque, où dominent `startsWith`, `join`, `replace`, `test`.

### 7.6 DGenerator (23 fonctions distinctes)

| Fonction | lib | tests | docs | total |
|---|---|---|---|---|
| reduceFrom | 21 | 0 | 7 | 28 |
| map | 7 | 5 | 9 | 21 |
| filter | 7 | 7 | 5 | 19 |
| asyncReduce | 11 | 0 | 7 | 18 |
| reduce | 10 | 0 | 5 | 15 |
| asyncLoop | 2 | 0 | 5 | 7 |
| asyncMap | 0 | 0 | 6 | 6 |
| concat | 2 | 1 | 3 | 6 |
| flat | 2 | 0 | 4 | 6 |
| loop | 0 | 0 | 6 | 6 |
| loopAccumulator | 0 | 0 | 5 | 5 |
| execute | 0 | 0 | 4 | 4 |
| group | 0 | 0 | 4 | 4 |
| groupOutput | 0 | 0 | 4 | 4 |
| loopAccumulatorFrom | 0 | 0 | 4 | 4 |

### 7.7 DPattern (19 fonctions distinctes)

| Fonction | lib | tests | docs | total |
|---|---|---|---|---|
| matchWithErrorOtherwise | 2 | 0 | 37 | 39 |
| when | 17 | 3 | 13 | 33 |
| match | 11 | 0 | 17 | 28 |
| otherwise | 8 | 1 | 12 | 21 |
| isMatch | 0 | 0 | 11 | 11 |
| matchWithTaggedObject | 1 | 0 | 9 | 10 |
| exhaustive | 2 | 0 | 7 | 9 |
| union | 0 | 0 | 8 | 8 |
| whenNot | 0 | 0 | 8 | 8 |
| matchWithStringOtherwise | 2 | 0 | 5 | 7 |
| matchWithEntity(Otherwise) | 0 | 0 | 5 (+5) | 10 |
| matchWithFact(Otherwise) | 0 | 0 | 5 (+5) | 10 |
| matchWithString | 0 | 0 | 5 | 5 |
| matchWithTaggedObjectOtherwise | 0 | 0 | 5 | 5 |

Attention : la forme chaînée `DPattern.match(x).when(...).when(...).otherwise(...)` ajoute 107 `.when(` en début de ligne dans `langLib` (dont 40 dans `server/scripts/command/help.ts` et ~55 dans `tools/scripts/toJsonSchema/typeTransformer/defaults/*`) [VÉRIFIÉ].

### 7.8 DNumber, DChrono, DPath, DDataStructure, DModeling, DKind, DInvocation, DTuple, DPrinter

[VÉRIFIÉ] Top par domaine, format `lib/tests/docs/total` :

- **DNumber** (22 distinctes, 0 usage en bibliothèque) : `sum` 0/0/44/44, `greaterThan` 0/0/20/20, `isEven` 0/0/16/16, `greaterThanOrEqual` 0/0/9/9, `isPositive` 6, `lessThan` 6, `isInteger` 5, puis 4 chacun : `betweenThan`, `betweenThanOrEqual`, `isMultipleOf`, `isNegative`, `isNotZero`, `isOdd`, `isSafe`, `isStrictNegative`, `isStrictPositive`.
- **DChrono** (88 distinctes) : `createDate` 1/37/94/132, `createDateOrThrow` 16/40/26/82, `createTime` 4/39/30/73, `createTimeOrThrow` 0/6/35/41, `now` 5/13/6/24, `toTimestamp` 5/10/7/22, `isSafeTimestamp` 16/0/4/20, `formatDate` 3/6/7/16, `computeTime` 2/1/9/12, `round` 11, `addTime` 10, `serialize` 10, `eachDate` 9, `formatTime` 8, `addDays` 7.
- **DPath** (21 distinctes) : `declarePath` 5/158/27/190, `resolveRelative` 19/57/12/88, `createOrThrow` 5/48/5/58, `declareAbsolutePath` 0/21/12/33, `createAbsoluteOrThrow` 23, `resolveFrom` 8/5/10/23, `createMatcher` 22, `getParentFolderPath` 11/1/8/20, `getBaseName` 18, `normalize` 12/1/5/18, `computeRelative` 16, `declareSegment` 15, `createSegmentOrThrow` 14, `isAbsolute` 14, `createAbsolute` 13.
- **DDataStructure** (132 distinctes) : `string` 9/625/139/773, `number` 3/297/56/356, `object` 9/144/28/181, `literal` 7/135/23/165, `constraintIdentifier` 162/0/0/162, `array` 3/95/14/112, `union` 65, `integer` 60, `notEmpty` 58, `typeIdentifier` 53/4/0/57, `uuid` 55, `greaterThanOrEqual` 54, `record` 54, `structureIdentifier` 46/7/0/53, `email` 48.
- **DModeling** (15 distinctes) : `taggedObject` 9/12/0/21, `createTaggedObject` 0/6/11/17, `createFact` 12, `createFlag` 11, `createNewType` 10, `createEntityNamespace` 6, `createEntity` 3.
- **DKind** (5) : `parentClass` 33/7/1/41, `createNamespace` 16/0/0/16, `createKindIdentifier` 2, `hasSome` 2.
- **DInvocation** (11) : `appendEvidence` 3/2/2/7, `evidenceResult` 5, `consumeWorkflow` 4, `createPort` 4, `createReader` 4, `createWorkflow` 4, `debounce` 3/0/0/3, `flow` 3/0/0/3.
- **DTuple** (2) : `from` 1/1/8/10, `map` 1/0/5/6.
- **DPrinter** (5) : `renderLine` 19/0/5/24, `colorizedBold` 16/0/3/19, `renderParagraph` 11/0/4/15, `colorized` 9, `bold` 2.

---

## 8. Fréquences `@duplojs/utils` (génération précédente)

### 8.1 Par espace de noms

[VÉRIFIÉ]

| Segment | Fichiers | Références | Répartition |
|---|---|---|---|
| utilsLib (`{http,form,playwright,json-web-token,server-utils}/scripts`) | 237 | 1 349 | E 352, common nu 331, A 186, DP 151, O 77, D 57, P 50, G 44, S 41, Path 23, C 19, DPE 12 |
| utilsTests | 205 | 2 080 | E 742, common nu 441, DPE 321, DP 315, D 141, A 51, C 39 |
| docs des paquets | 184 | 231 | DPE 62, E 59, DP 52, common 32 |
| applications (`discover` + `backend-boilerplate`) | 35 | 97 | C 29, E 23, DPE 14, common 11, A 8, O 5 |
| `utils/docs/examples` (exemples de la lib elle-même) | 576 | 1 723 | E 306, common 296, D 289, DP 218, C 124, A 111, N 94, S 80, F 40 |
| oldgen (`core`, `node`, `http-client`, `examples`) | 99 | 39 | uniquement `simpleClone`, `stringToBytes`, `clone`, `escapeRegExp` |

### 8.2 Top 50 du code de bibliothèque utils

[VÉRIFIÉ] `~x` = fonction de `common` importée nue. Alias doublés (`EE`, `AA`…) fusionnés avec l'alias court.

| # | Fonction | n | # | Fonction | n |
|---|---|---|---|---|---|
| 1 | E.left | 107 | 26 | G.reduceFrom | 15 |
| 2 | ~pipe | 83 | 27 | DP.literal | 15 |
| 3 | ~unwrap | 71 | 28 | A.join | 15 |
| 4 | E.isLeft | 53 | 29 | DP.object | 14 |
| 5 | E.success | 51 | 30 | S.startsWith | 13 |
| 6 | E.ok | 41 | 31 | DP.string | 13 |
| 7 | A.map | 39 | 32 | A.flatMap | 13 |
| 8 | ~kindHeritage | 28 | 33 | ~createKindNamespace | 12 |
| 9 | P.when | 28 | 34 | P.otherwise | 12 |
| 10 | O.entry | 28 | 35 | ~stringToBytes | 10 |
| 11 | DP.identifier | 25 | 36 | S.replace | 10 |
| 12 | E.right | 21 | 37 | O.fromEntries | 10 |
| 13 | ~innerPipe | 20 | 38 | A.minElements | 10 |
| 14 | E.whenIsRight | 20 | 39 | Path.resolveRelative | 9 |
| 15 | A.filter | 20 | 40 | G.asyncReduce | 9 |
| 16 | A.coalescing | 20 | 41 | A.reduceFrom | 9 |
| 17 | ~justReturn | 18 | 42 | A.reduce | 9 |
| 18 | O.entries | 18 | 43 | A.concat | 9 |
| 19 | E.isRight | 18 | 44 | ~asyncPipe | 8 |
| 20 | E.error | 18 | 45 | DPE.lazy | 8 |
| 21 | ~isType | 16 | 46 | DP.optional | 8 |
| 22 | DP.dataParserKind | 16 | 47 | DP.addIssue | 8 |
| 23 | D.isSafeTimestamp | 16 | 48 | ~callThen | 7 |
| 24 | D.createOrThrow | 16 | 49 | ~asserts | 7 |
| 25 | G.reduceFrom / A.join (ex æquo) | 15 | 50 | G.map / E.safeCallback / A.find | 7 |

### 8.3 Top par domaine (utilsLib)

[VÉRIFIÉ]

- **E** : `left` 107, `isLeft` 53, `success` 51, `ok` 41, `right` 21, `whenIsRight` 20, `isRight` 18, `error` 18, `safeCallback` 7, `whenIsLeft` 4, `matchInformation` 3, `hasInformation` 3, `fail` 3. Plus `unwrap` nu : 71.
- **common nu** : `pipe` 83, `unwrap` 71, `kindHeritage` 28, `innerPipe` 20, `justReturn` 18, `isType` 16, `createKindNamespace` 12, `stringToBytes` 10, `asyncPipe` 8, `callThen` 7, `asserts` 7, `simpleClone` 6, `when` 5, `detachObjectMethod` 5.
- **A** : `map` 39, `filter` 20, `coalescing` 20, `join` 15, `flatMap` 13, `minElements` 10, `reduce` 9, `reduceFrom` 9, `concat` 9, `find` 7, `includes` 5, `from` 5, `push` 4, `some` 3.
- **O** : `entry` 28, `entries` 18, `fromEntries` 10, `override` 6, `countKeys` 5, `values` 4, `to` 3.
- **S** : `startsWith` 13, `replace` 10, `test` 4, `split` 3, `extract` 3, `extractAll` 2, `concat` 2.
- **G** : `reduceFrom` 15, `asyncReduce` 9, `map` 7, `reduce` 6, `flat` 3, `asyncLoop` 2.
- **P** : `when` 28, `otherwise` 12, `match` 6, `exhaustive` 4.
- **DP / DPE** : `identifier` 25, `dataParserKind` 16, `literal` 15, `object` 14, `string` 13, `optional` 8, `addIssue` 8, `DPE.lazy` 8, `objectKind` 6, `union` 5.
- **D** : `isSafeTimestamp` 16, `createOrThrow` 16, `toTimestamp` 5, `now` 5, `createTime` 4, `formatTime` 3, `format` 3.
- **Path** : `resolveRelative` 9, `getParentFolderPath` 5, `getBaseName` 5, `getExtensionName` 3.

### 8.4 Top des tests et des applications utils

[VÉRIFIÉ]
- **utilsTests** : `E.isRight` 289, `DPE.string` 177, `unwrap` 173, `E.isLeft` 164, `sleep` 152, `DP.string` 139, `E.success` 100, `E.right` 90, `asserts` 80, `DPE.number` 68, `D.createTime` 58, `A.from` 38, `E.left` 36, `E.hasInformation` 35.
- **Applications** (`discover`, `backend-boilerplate`) : `DPE.string` 11, `pipe` 8, `C.createUseCase` 6, `C.createNewType` 6, `E.matchInformation` 5, `E.rightPipe` 4, `E.result` 4, `C.createFlag` 4, `O.entries` 3, `E.left` 3, `E.keepAsRightByInformation` 3, `C.createPort` 3, `C.createEntity` 3, `A.reduce` 3, `promiseObject` 2, `O.override` 2.

Lecture : la hiérarchie est stable entre les deux générations (Either > pipe > Array.map/filter > Object.entry/entries > Pattern.when > reduce). Les applications, elles, privilégient la **modélisation** (`C`/`DModeling`) et l'aiguillage par information (`matchInformation`, `keepAsRightByInformation`, `rightPipe`).

---

## 9. Motifs composés : tableau de comptage

[VÉRIFIÉ] `rg -U --count-matches -P`. Colonnes : langLib / langTests / langDocs / utilsLib / utilsTests / utilsDocs+applications.

| Motif | langLib | langTests | langDocs | utilsLib | utilsTests | utilsDocs+apps |
|---|---|---|---|---|---|---|
| `pipe(` | 92 | 9 | 379 | 83 | 12 | 9 |
| `asyncPipe(` | 17 | 60 | 22 | 8 | 1 | 4 |
| `innerPipe(` | 15 | 3 | 8 | 20 | 4 | 0 |
| `E.rightPipe(` | 7 | 0 | 12 | 0 | 0 | 4 |
| `E.rightAsyncPipe(` | 16 | 0 | 14 | 1 | 0 | 1 |
| `E.whenIsRight(` | 25 | 0 | 5 | 20 | 0 | 6 |
| `E.whenIsLeft(` | 9 | 3 | 2 | 4 | 0 | 1 |
| `if (E.isLeft(x)) {` | 96 | 3 | 39 | 48 | 11 | 0 |
| … dont suivi immédiat de `return` | 70 | 0 | 4 | 26 | 0 | 0 |
| `if (E.isRight(x)) {` | 11 | 74 | 28 | 11 | 75 | 40 |
| `if (E.hasInformation(...))` | 8 | 0 | 8 | 3 | 0 | 0 |
| `unwrap` / `unwrapRight` / `unwrapLeft` | 103 | 245 | 93 | 71 | 173 | 23 |
| garde `isLeft(x)` puis `unwrap(x)` (≤ 6 lignes) | 30 | 3 | 4 | 36 | 33 | 0 |
| `return E.left/error/fail(` | 117 | 3 | 3 | 44 | 2 | 5 |
| `return E.right/success/ok(` | 50 | 4 | 7 | 30 | 4 | 4 |
| `=> E.left/error/fail(` | 14 | 5 | 3 | 71 | 9 | 0 |
| `=> E.right/success/ok(` | 84 | 7 | 8 | 11 | 11 | 1 |
| `A.reduce(` (toujours avec `A.reduceFrom`) | 24 | 0 | 5 | 9 | 0 | 3 |
| `G.reduce` / `G.asyncReduce` (avec `G.reduceFrom`) | 21 | 0 | 10 | 15 | 0 | 0 |
| callback reduce : `exit(` | 32 | 3 | 30 | 23 | 3 | 7 |
| callback reduce : `next(` | 66 | 22 | 43 | 44 | 27 | 7 |
| callback reduce : `nextWithObject(` | 67 | 0 | 2 | 12 | 0 | 0 |
| callback reduce : `nextPush(` | 13 | 0 | 1 | 5 | 0 | 0 |
| `P.match(` | 11 | 0 | 16 | 6 | 0 | 0 |
| `P.when(` (curryfié, dans un pipe) | 17 | 3 | 12 | 28 | 3 | 0 |
| `P.otherwise(` | 8 | 1 | 11 | 12 | 1 | 0 |
| `.when(` chaîné (builder de `P.match(x)`) | 107 | 0 | 1 | 25 | 0 | 0 |
| `P.matchWith*(` | 5 | 0 | 81 | 0 | 0 | 0 |
| `when(` / `whenNot(` / `whenElse(` de common | 12 | 0 | 72 | 8 | 2 | 1 |
| `promiseAll` / `promiseObject` | 0 (+4 par référence) | 0 | 5 | 0 | 0 | 2 |
| `Promise.all(` natif | 1 | 0 | 0 | 1 | 0 | 1 |
| `justReturn(` | 44 | 1 | 4 | 18 | 1 | 0 |
| `isType(` | 20 | 4 | 46 | 16 | 5 | 0 |
| `A.map(` | 53 | 27 | 21 | 39 | 2 | 1 |
| … dont forme « donnée d'abord » `A.map(x, fn)` | 22 | 15 | 6 | 8 | 0 | 0 |
| `safeCallback` / `asyncSafeCallback` | 8 | 0 | 7 | 8 | 0 | 0 |
| `matchInformation*(` | 3 | 0 | 21 | 3 | 0 | 5 |
| `unwrapByInformationOrThrow(` | 0 | 158 | 17 | 0 | 0 | 0 |
| `E.group` / `E.asyncGroup` | 0 | 0 | 11 | 0 | 0 | 1 |
| `keepAsRight*(` | 0 | 0 | 15 | 0 | 0 | 3 |

Lecture clé : dans le code de bibliothèque, la gestion d'erreur passe **4 fois plus souvent par une garde impérative** (`if (isLeft(x)) return x;`, 96) que par un combinateur (`whenIsRight` 25, `rightAsyncPipe` 16, `rightPipe` 7). Le combinateur `rightPipe`/`matchInformation`/`group` est surtout présent dans la doc et les applications.

---

## 10. Motifs composés : nombre d'étapes des pipes et étapes les plus fréquentes

[VÉRIFIÉ] Script de découpe d'arguments (le premier argument de `pipe` est la donnée ; `innerPipe` n'a pas de donnée).

| Fonction | Segment | Total | Distribution du nombre d'étapes | Moyenne |
|---|---|---|---|---|
| pipe | langLib | 92 | 1:19, 2:34, 3:25, 4:7, 5:5, 6:2 | 2,5 |
| pipe | utilsLib | 83 | 1:15, 2:27, 3:21, 4:12, 5:5, 6:3 | 2,7 |
| pipe | langDocs | 370 | 1:304, 2:43, 3:17, 4:6 | 1,3 |
| asyncPipe | langLib | 17 | 1:14, 2:1, 4:2 | 1,4 |
| asyncPipe | langTests | 60 | 1:16, 2:39, 3:3, 5:2 | 1,9 |
| innerPipe | langLib | 15 | 2:13, 3:2 | 2,1 |
| innerPipe | utilsLib | 20 | 1:1, 2:12, 3:5, 5:2 | 2,5 |
| E.rightAsyncPipe | langLib | 16 | 1:6, 2:4, 3:2, 4:2, 5:1, 6:1 | 2,4 |
| E.rightPipe | langLib | 7 | 1:5, 5:2 | 2,1 |

**Nature des étapes dans les pipes de `langLib`** (tête de chaque argument) : fonction fléchée en ligne 69 ; `DArray.map(...)` 28 ; identifiant de fonction nu 22 ; `DArray.filter(...)` 17 ; `DPattern.when(...)` 17 ; `DArray.reduce(...)` 13 ; `DEither.whenIsRight(...)` 12 ; `DCommon.when(...)` 9 ; `DString.join(...)` 9 ; `DPattern.otherwise(...)` 8 ; `DEither.whenIsLeft(...)` 8 ; `DObject.fromEntries` (référence) 8 ; `DObject.entries` (référence) 7 ; `DGenerator.map(...)` 7 ; `DString.replace(...)` 6 ; `DGenerator.filter(...)` 6 ; `DCommon.forward` 5 ; `DEither.unwrapRight` 5 ; `DArray.concat(...)` 5 ; `DArray.coalescing` 5 ; `DCommon.promiseAll` 4 ; `DEither.toMaybe` 4.

**Paires d'étapes consécutives les plus fréquentes (`langLib`)** : fléchée→fléchée 13 ; identifiant→fléchée 10 ; `DPattern.when`→`DPattern.otherwise` 8 ; `DPattern.when`→`DPattern.when` 7 ; `DArray.map`→`DArray.filter` 6 ; `DArray.filter`→`DArray.map` 6 ; `DArray.filter`→`DCommon.forward` 5 ; `DArray.map`→`DCommon.promiseAll` 4 ; `DCommon.when`→`DEither.whenIsRight` 4 ; `DObject.entries`→`DArray.map` 3 ; `DObject.entries`→`DArray.filter` 3 ; `DString.replace`→`DString.replace` 3.

**Idem pour `utilsLib`** : `P.when`→`P.when` 11 ; `P.when`→`P.otherwise` 9 ; identifiant→`E.success` 9 ; `A.filter`→`A.map` 8 ; `A.map`→`A.filter` 6 ; `A.map`→`O.fromEntries` 6 ; `O.entries`→`A.filter` 5 ; `A.map`→`A.join` 5 ; `P.when`→`P.exhaustive` 4.

Conséquence pour le transpileur : une étape de pipe est, par ordre de fréquence, (a) une fonction fléchée, (b) un appel curryfié `DX.f(args)` renvoyant une fonction, (c) une référence de fonction nue (`DObject.entries`, `DEither.unwrapRight`, fonction locale). Les trois formes doivent être acceptées.

---

## 11. Motif : garde `isLeft` + retour anticipé, puis `unwrapRight`

[VÉRIFIÉ] C'est le motif d'erreur dominant du code de bibliothèque : ~96 gardes `if (DEither.isLeft(x))` dans `langLib`, dont ~70 suivies d'un `return` ; 48 dans `utilsLib`.

Extrait réel — `$D/ecosystem/packages/tools/scripts/toTypescript/transformer.ts` (l. 185-189) :

```ts
if (DEither.isLeft(constraintResult)) {
	return constraintResult;
}

const result = DArray.map(constraintResult, DEither.unwrapRight);
```

Variante avec `hasInformation` et `throw` — `$D/ecosystem/packages/http/scripts/interfaces/node/bodyReaders/text/index.ts` (l. 56-60) :

```ts
if (DEither.hasInformation(result, "server-error")) {
	throw DEither.unwrapLeft(result);
}

return result;
```

Points pour le transpileur :
- Le `return x` renvoie le `Left` **tel quel** : le type de retour de la fonction est donc une union de tous les `Left` traversés et du `Right` final.
- Après la garde, TypeScript rétrécit `x` en `Right` ; `unwrapRight(x)` est alors sûr. En Go : `if x.IsLeft() { return x }` puis accès à la valeur. [HYPOTHÈSE] Traduction directe vers le motif `if err != nil { return }`.
- Dans les tests, la garde est inversée : `if (E.isRight(result)) { ... }` (74 lang, 75 utils).

---

## 12. Motif : `pipe` / `asyncPipe` + `whenIsRight` / `whenIsLeft`

[VÉRIFIÉ] `whenIsRight` : 25 dans `langLib` (13 dans le seul `http/scripts/client/promiseRequest.ts`), 20 dans `utilsLib`. `whenIsLeft` : 9 et 4.

Extrait réel — `$D/ecosystem/packages/server/scripts/file/fileInterface.ts` (l. 73-83) :

```ts
function localRename(newName: string & DPath.Segment) {
	return DCommon.asyncPipe(
		rename(path, newName),
		DEither.whenIsRight(
			DCommon.innerPipe(
				createFileInterface,
				(value) => DEither.right("file-system-rename", value),
			),
		),
	);
}
```

Extrait réel (génération utils, les deux branches dans un reduce) — `$D/http/scripts/core/router/index.ts` (l. 84-88) :

```ts
element,
routeBodyController.tryToCreateReader,
E.whenIsRight(exit),
E.whenIsLeft(justReturn(next(null))),
```

Extrait réel avec `whenIsLeft` + pattern — `$D/ecosystem/packages/agents-kit/scripts/bin/skills/skill.ts` :

```ts
return DCommon.asyncPipe(
	DSFile.remove(path, { recursive: true }),
	DEither.whenIsLeft(
		DPattern.matchWithErrorOtherwise(
			{ "file-system-remove-not-found": () => DEither.ok() },
			(error: DSFile.RemoveErrors) => DEither.left("file-system-remove-error", error),
		),
	),
);
```

Sémantique à reproduire : `whenIsRight(f)` appelle `f` avec la **valeur déballée** si l'entrée est un `Right`, sinon laisse passer le `Left` inchangé ; le résultat est l'union des deux.

---

## 13. Motif : `rightPipe` / `rightAsyncPipe` à N étapes

[VÉRIFIÉ] `rightAsyncPipe` : 16 dans `langLib` (1 à 6 étapes, moyenne 2,4), 14 dans `langDocs`, 1 dans `utilsLib`. `rightPipe` : 7 dans `langLib`, 12 dans `langDocs`, 4 dans les applications utils. C'est un motif **récent** : quasi absent de la génération utils (1 occurrence), il monte dans le code lang le plus neuf (`agents-kit/scripts` : 9 `rightAsyncPipe` pour 9 fichiers).

Extrait réel — `$D/ecosystem/packages/agents-kit/scripts/bin/skills/skill.ts` :

```ts
return DEither.rightAsyncPipe(
	getSkillPaths(agentType, skill),
	({ selectedSkillPath, skillsFolder, currentSkillFolder }) => DEither.rightAsyncPipe(
		DSFile.ensureDirectory(skillsFolder),
		() => removeSkill(currentSkillFolder),
		() => DSFile.symlink(
			DPath.computeRelative(skillsFolder, selectedSkillPath),
			currentSkillFolder,
		),
	),
);
```

Extrait réel côté application — `$D/discover/app/examples/layers/applications/useCases/clientBorrowBook.ts` :

```ts
}) => ({ book, client }: Input) => E.rightPipe(
	clientBorrowBook(client, book),
	({ book, client }) => promiseObject({
		book: bookPort.save(book),
		client: clientPort.save(client),
	}),
),
```

Particularités : imbrication fréquente (un `rightAsyncPipe` dans une étape d'un autre) pour garder en portée les variables déstructurées ; chaque étape reçoit la valeur déballée du `Right` précédent et s'arrête au premier `Left`. [HYPOTHÈSE] Se traduit en Go par une suite d'instructions avec retour anticipé — la même stratégie que la garde `isLeft` de la section 11.

---

## 14. Motif : `reduce` avec `reduceFrom` et les continuations `next` / `exit` / `nextWithObject` / `nextPush`

[VÉRIFIÉ] `DArray.reduce` 24 + `DGenerator.reduce`/`asyncReduce` 21 dans `langLib` ; **chaque** reduce est accompagné de `reduceFrom<T>(initial)` (24 et 21 occurrences, toujours avec générique explicite). Continuations dans `langLib` : `nextWithObject(` 67, `next(` 66, `exit(` 32, `nextPush(` 13.

Extrait réel — `$D/ecosystem/packages/tools/scripts/toTypescript/transformer.ts` (l. 160-183) :

```ts
const constraintResult = DArray.reduce(
	currentDataStructure.definition.constraints,
	DArray.reduceFrom<readonly TransformerSuccessEither[]>([]),
	({
		element: constraint,
		lastValue,
		nextPush,
		exit,
	}) => {
		const result = constraintTransformer(constraint, { /* ... */ });

		if (DEither.isLeft(result)) {
			return exit(result);
		}

		return nextPush(lastValue, result);
	},
);
```

Extrait réel sur générateur, avec mutation de l'accumulateur — `$D/ecosystem/packages/http/scripts/client/httpClient.ts` (l. 345-356) :

```ts
const headers = DGenerator.reduce(
	defaultHeaders.entries(),
	DGenerator.reduceFrom<ClientRequestParamsHeaders>({}),
	({ item, lastValue, next }) => {
		const value = item[1]();
		if (value !== undefined) {
			lastValue[item[0]] = `${value}`;
		}

		return next(lastValue);
	},
);
```

Points pour le transpileur :
- Le callback reçoit **un objet déstructuré** (`element`/`item`, `lastValue`, `index`, et les continuations). Renommage à la déstructuration fréquent (`element: constraint`, `element: [key, value]`).
- `exit(valeur)` court-circuite la boucle et change le type du résultat : le reduce renvoie `Accumulateur | TypeDeExit` (d'où la garde `isLeft` juste après).
- `DArray.reduce` nomme l'élément `element`, `DGenerator.reduce` le nomme `item`.
- [HYPOTHÈSE] Traduction naturelle : boucle `for ... range` avec `acc = ...` pour `next`, `append` pour `nextPush`, fusion de champs pour `nextWithObject`, `return`/`break` pour `exit`.

---

## 15. Motif : pattern matching (`DPattern`)

[VÉRIFIÉ] Deux formes coexistent.

**Forme curryfiée dans un pipe** (`when` 17, `otherwise` 8, `exhaustive` 2 dans `langLib` ; 28 / 12 / 4 dans `utilsLib`). Extrait réel — `$D/ecosystem/packages/http/scripts/core/functionsBuilders/steps/defaults/extractStep.ts` (l. 92-113) :

```ts
}) => DCommon.pipe(
	value,
	DPattern.when(
		DDataStructure.structureKind.has,
		(value) => DArray.push(lastValue, createExtractor(value, key, undefined)),
	),
	DPattern.otherwise(
		(value) => DCommon.pipe(
			value,
			DPattern.when(
				DCommon.isType("undefined"),
				DCommon.justReturn(lastValue),
			),
			DPattern.otherwise(
				DCommon.innerPipe(DObject.entries, /* ... */),
			),
		),
	),
),
```

**Forme chaînée (builder)** `DPattern.match(x).when(pred, fn).when(...).otherwise(fn)` : 11 `match(` et 107 `.when(` chaînés dans `langLib`. Extrait réel — `$D/ecosystem/packages/server/scripts/command/help.ts` (l. 85-95) :

```ts
.when(
	DDataStructure.typeIdentifier(DDataStructure.nullTypeKind),
	DCommon.justReturn([literal("null")]),
)
.when(
	DDataStructure.typeIdentifier(DDataStructure.stringTypeKind),
	DCommon.justReturn([typeLabel("string")]),
)
```

**Forme table** `matchWith*` (objet clé → handler) : 5 dans `langLib` (`matchWithTaggedObject` dans `server/scripts/command/error.ts:320`, `matchWithStringOtherwise` dans `server/scripts/implementor.ts:114` et `:140`), 81 dans `langDocs`. `DEither.matchInformation(result, { info: fn })` suit la même logique (3 lib, 21 docs, 5 dans les applications utils).

Le prédicat d'un `when` est soit une valeur littérale, soit un prédicat de type (`DCommon.isType("undefined")`, `kind.has`, `typeIdentifier(...)`), soit une fonction. [HYPOTHÈSE] Les trois formes se ramènent à une cascade `if / else if / else` ou à un `switch` Go ; `exhaustive` n'a pas d'équivalent à l'exécution (vérification de type seulement).

---

## 16. Motifs : `asyncPipe` + `unwrapByInformationOrThrow` (tests), `promiseAll`, `justReturn`, `DCommon.when`

[VÉRIFIÉ]

**Tests d'intégration : `asyncPipe` + `unwrapByInformationOrThrow`.** 60 `asyncPipe` dans `langTests`, dont 60 étapes `unwrapByInformationOrThrow` ; paires les plus fréquentes : `DSFile.readTextFile`→`unwrapByInformationOrThrow` 9, `DSFile.writeTextFile`→idem 6, `DSFile.ensureDirectory`→idem 6. Extrait réel — `$D/ecosystem/packages/agents-kit/integrations/skills.test.ts` (l. 15-20) :

```ts
const allSkills: readonly string[] = await DCommon.asyncPipe(
	DSFile.walkDirectory(skillsDirectory),
	DEither.unwrapByInformationOrThrow("file-system-walk-directory"),
	DGenerator.filter(DSFile.isFolderInterface),
	DGenerator.map((folder) => folder.getName()),
	DGenerator.filter(DCommon.isType("string")),
```

**`asyncPipe` + `promiseAll`.** Rare : `DArray.map(...)` → `DCommon.promiseAll` (par référence) = 4 occurrences dans `langLib` ; `promiseObject` dans les cas d'usage applicatifs (2). `Promise.all` natif : 1.

**`justReturn(valeur)`** (44 `langLib`, 18 `utilsLib`) : fabrique `() => valeur`, utilisé comme branche de `when`/`whenIsLeft`. Voir l'extrait `help.ts` section 15.

**`DCommon.when(prédicat, fn)`** (9 `langLib`, 91 `langDocs`) : étape conditionnelle d'un pipe. Extrait réel — `$D/ecosystem/packages/tools/scripts/toTypescript/transformer.ts` (l. 151-153) :

```ts
DCommon.when(
	DEither.hasInformation("buildSuccess"),
	(structureTypeNode) => { /* ... */ },
),
```

**`safeCallback`** (8 `langLib`) : enveloppe un appel pouvant lever une exception et renvoie un `Left("safe-callback-error")`. Extrait réel — `$D/ecosystem/packages/http/scripts/client/promiseRequest.ts` : `DEither.asyncSafeCallback(DEither.rightAsyncPipe(Promise.resolve(params), ...))` suivi de `if (DEither.hasInformation(result, "safe-callback-error"))`.

---

## 17. Motif : double style d'appel « donnée d'abord » et « curryfié »

[VÉRIFIÉ] La plupart des fonctions lang acceptent les deux formes, et les deux sont utilisées à parts à peu près égales dans le code de bibliothèque.

- `DArray.map` dans `langLib` : 53 références, dont 22 en forme « donnée d'abord » `DArray.map(tableau, fn)` et 28 comme étape curryfiée de pipe `DArray.map(fn)`.
- `DEither.hasInformation(result, "info")` (garde) contre `DEither.hasInformation("info")` (prédicat passé à `DCommon.when`).
- `DEither.matchInformation(result, {...})` contre `pipe(result, E.matchInformation({...}))` — les deux présents dans `$D/discover/app/examples/layers/infrastructure/` (`routes/clientBorrowBook.ts` et `checkers/book.ts`).
- Passage par référence sans appel : `DArray.map(constraintResult, DEither.unwrapRight)`, `DObject.entries`, `DString.trim`.

Conséquence : le transpileur doit distinguer les deux surcharges par **l'arité et le type du premier argument**, pas par le nom. [HYPOTHÈSE] Une table par fonction « arité donnée-d'abord = N ; arité curryfiée = N-1 » suffit pour la grande majorité des cas.

---

## 18. Constructions TypeScript : tableau de mesures

[VÉRIFIÉ] Comptages regex (ordres de grandeur ; quelques faux positifs possibles). Colonnes : `langLib` (38 690 lignes) / `langDocs` (26 560) / `utilsLib` (25 473) / applications `discover`+`backend-boilerplate` (2 063) / `oldgen` (14 654).

| Construction | langLib | langDocs | utilsLib | apps | oldgen |
|---|---|---|---|---|---|
| Fonction fléchée `=>` (toutes, types compris) | 1 581 | 758 | 1 006 | 61 | 874 |
| … à corps bloc `=> {` | 428 | 257 | 330 | 17 | 491 |
| … `async (...) =>` | 137 | 41 | 120 | 7 | 97 |
| Déclaration `function nom` | 484 | 33 | 288 | 7 | 71 |
| … `export function` | 329 | 18 | 229 | 5 | 52 |
| … `async function` | 55 | 20 | 53 | 0 | 4 |
| Signatures de surcharge (`function f(...): T;`) | 52 | — | 13 | — | — |
| `function*` / `yield` | 11 | 56 | 17 | 0 | 12 |
| `await` | 265 | 266 | 268 | 23 | 163 |
| `.then(` | 172 | 0 | 101 | 1 | 20 |
| `.catch(` | 80 | — | 81 | — | — |
| `new Promise` / `Promise.resolve|reject` | 6 / 82 | 0 | 6 / 18 | 0 | 20 |
| Déclarations de classe | 289 | 11 | 36 | 5 | 147 |
| … dont `extends DuploJSError.parentClass(` | 255 | — | 0 | 0 | 0 |
| … dont `extends X.parentClass(` (tous Kind) | 288 | 11 | 0 | 0 | 0 |
| … dont `extends kindHeritage(` | 0 | 0 | 28 | 0 | 0 |
| `constructor(` | 34 | — | 31 | — | — |
| Méthodes `public/private/protected` | 65 | — | 67 | — | — |
| `new X(` | 559 | 15 | 128 | 8 | 556 |
| `this.` | 107 | 1 | 125 | 4 | 312 |
| `interface` | 462 | 60 | 379 | 18 | 86 |
| Alias `type X =` | 362 | 1 671 | 234 | 16 | 141 |
| Paramètre générique `<GenericXxx …>` | 1 063 | 18 | 1 010 | 0 | 343 |
| `infer` (types conditionnels) | 61 | 2 | 49 | 0 | 25 |
| `as const` | 26 | 37 | 17 | 0 | 0 |
| `satisfies` | 36 | 7 | 17 | 1 | 4 |
| Cast `as X` (hors imports et `as const`) | 190 | — | 184 | — | — |
| … dont `as never` / `as any` | 90 / 4 | 1 / 0 | 81 / 5 | 0 | 14 / 39 |
| `const` | 1 619 | 2 570 | 1 179 | 96 | 845 |
| `let` | 173 | 2 | 109 | 0 | 23 |
| `var` | 0 | 0 | 0 | 0 | 0 |
| Déstructuration `const { … } =` | 34 | 14 | 25 | 3 | 41 |
| Déstructuration `const [ … ] =` | 28 | 3 | 8 | 2 | 8 |
| Déstructuration de paramètre objet `({ … }) =>` | 469 | 576 | 367 | 71 | 377 |
| Déstructuration de paramètre tuple `([a, b]) =>` | 16 | 0 | 15 | 0 | 21 |
| Spread `...x` | 371 | 32 | 278 | 6 | 156 |
| Paramètre rest `...args` | 78 | — | 58 | — | — |
| Chaînage optionnel `?.` | 189 | 0 | 175 | 0 | 42 |
| Coalescence `??` | 270 | 1 | 175 | 0 | 44 |
| Template string avec `${}` | 211 | 78 | 200 | 5 | 87 |
| `if (` | 1 122 | 181 | 469 | 14 | 192 |
| `else` | 400 | 13 | 81 | 0 | 68 |
| Ternaire | 37 | 4 | 31 | 1 | 53 |
| `switch` | 0 | 0 | 0 | 0 | 1 |
| `for (;;)` classique | 56 | 0 | 57 | 0 | 0 |
| `for … of` | 27 | 0 | 10 | 0 | 21 |
| `for await` | 8 | 1 | 8 | 0 | 0 |
| `for … in` | 1 | 0 | 1 | 0 | 0 |
| `while` | 6 | 0 | 5 | 0 | 0 |
| `break` / `continue` | 14 | 1 | 10 | 0 | 3 |
| `try {` … `catch` | 17 / 15 | 0 | 17 / 15 | 1 | 6 |
| `throw` | 41 | 3 | 40 | 4 | 25 |
| `typeof` | 194 | 1 722 | 156 | 15 | 152 |
| … dont `typeof x === "..."` à l'exécution | 64 | — | 50 | — | — |
| `instanceof` | 213 | 0 | 42 | 0 | 124 |
| `"clé" in objet` | 89 | 3 | 49 | 1 | 32 |
| Comparaison de discriminant `.type/.kind/.code/.information === "…"` | 294 | — | 11 | — | — |
| `===` / `!==` | 750 | 49 | 302 | 8 | 90 |
| `undefined` (littéral) | 596 | 183 | 294 | 17 | 391 |
| `null` (littéral) | 294 | 107 | 167 | 22 | 52 |
| `new Map` | 20 | 0 | 16 | 0 | 1 |
| `new Set` | 6 | 1 | 5 | 0 | 16 |
| `new Date` / `Date.x` | 3 | 8 | 3 | 0 | 4 |
| RegExp (littéral ou `new RegExp`) | 44 | 11 | 34 | 0 | 4 |
| `JSON.x` | 17 | 1 | 16 | 0 | 5 |
| `Object.x` natif | 20 | 0 | 20 | 2 | 13 |
| `Array.x` natif | 3 | 1 | 4 | 1 | 1 |
| Méthode native `.map(` | 16 | 9 | 13 | 1 | 20 |
| Méthodes natives `.filter/.find/.some/.every/.reduce(` | 7 | 1 | 3 | 2 | 48 |
| `.forEach(` | 11 | 0 | 11 | 0 | 33 |
| `.push(` natif (mutation) | 92 | 0 | 79 | 0 | 38 |
| `.join/.split/.replace(` natifs | 27 | 0 | 21 | 0 | 27 |
| Accès indexé `x[expr]` | 527 | — | 512 | — | — |
| `Buffer` / `Uint8Array` / `TextEncoder` | 50 | — | 39 | — | — |
| `Math.x` | 7 | — | 8 | — | — |
| `console.x` / `process.x` | 16 / 14 | — | 18 / 14 | — | — |
| `enum` | 0 | 0 | 0 | 0 | 0 |
| `namespace` | 6 | 5 | 6 | 3 | 0 |
| `declare module` (augmentation) | 78 | 1 | 88 | 0 | 5 |
| `import type` | 488 | 402 | 186 | 7 | 100 |
| `export *` (barils) | 538 | 44 | 369 | 14 | 102 |
| `export default` | 1 | 1 | 0 | 0 | 0 |
| Décorateurs | 0 | 0 | 0 | 0 | 0 |
| `delete` | 0 | 0 | 0 | 0 | 3 |

(« — » = non mesuré pour ce segment.)

---

## 19. Constructions TypeScript : lecture et conséquences pour le transpileur

**Fonctions.** [VÉRIFIÉ] Les fonctions nommées de premier niveau sont des **déclarations `function`** (484 dans `langLib`, dont 329 exportées) ; les fonctions fléchées servent de callbacks et d'étapes de pipe (corps expression dans ~73 % des cas : 428 corps bloc sur 1 581). 52 signatures de surcharge dans `langLib`. Les closures sont omniprésentes : les étapes fléchées capturent les paramètres de la fonction englobante (`path`, `params`, `lastValue`…), et les `rightAsyncPipe` imbriqués existent précisément pour capturer des variables.

**Déstructuration.** [VÉRIFIÉ] Dominée par la déstructuration **de paramètre** (469 dans `langLib` contre 62 déstructurations de `const`). Cas typiques : objet de callback de reduce (`({ element, lastValue, next })`), paramètre de handler (`({ book, client }, { response })`), tuple d'entrée (`([key, value])`, 16), renommage (`element: constraint`), déstructuration imbriquée (`element: [key, value]`).

**Spread, `?.`, `??`.** [VÉRIFIÉ] Fréquents dans le code de bibliothèque (371 / 189 / 270) mais **absents des exemples et des applications** (apps : 6 / 0 / 0). Un transpileur ciblant d'abord du code applicatif peut les traiter en second.

**Asynchrone.** [VÉRIFIÉ] `await` ~265, `async` fléché 137, `.then(` 172, `.catch(` 80, `Promise.resolve` 82 : le code de bibliothèque mélange `async/await` et chaînes de promesses. Les applications n'utilisent que `async/await` (23) et `E.rightPipe` sur promesses.

**Classes.** [VÉRIFIÉ] Oui, mais d'un usage très particulier. Sur 289 classes dans `langLib`, 255 sont des classes d'erreur d'une ligne `export class XError extends DCommon.DuploJSError.parentClass("information", Error) {}` et ~33 autres héritent d'un `Kind.parentClass`. Les « vraies » classes avec état et méthodes sont une dizaine, toutes dans `http` (`PromiseRequest extends Promise<…>`, `Hub`, `Response`, `PredictedResponse`, `HookResponse`, `Stream*PredictedResponse`…). 34 `constructor(`. La génération archivée (`core`) était au contraire orientée classes (147 classes, 312 `this.`). Les applications déclarent 5 classes (erreurs).

**Boucles natives.** [VÉRIFIÉ] Rares mais présentes dans les chemins chauds : 56 `for (;;)` (exécution de hooks : `for (let index = 0; index < hooks.length; index++)` dans `http/scripts/client`), 27 `for…of`, 8 `for await`, 6 `while`. **Zéro** dans les docs et les applications.

**Exceptions.** [VÉRIFIÉ] 17 `try`, 41 `throw` dans `langLib` : le `throw` est réservé aux erreurs de programmation / d'initialisation (`*OrThrow`, erreurs de configuration) ; l'erreur métier passe par `Either`.

**Unions discriminées.** [VÉRIFIÉ] 294 comparaisons `.type/.kind/.code/.information === "littéral"` dans `langLib`, plus 213 `instanceof` (classes d'erreur), 89 `"clé" in objet`, 64 `typeof x === "…"`. Le discriminant standard de DuploJS est l'« information » de l'Either (chaîne littérale kebab-case, ex. `"file-system-rename"`).

**Génériques.** [VÉRIFIÉ] Massifs dans les bibliothèques (1 063 paramètres nommés `GenericXxx`, 61 `infer`), **nuls dans les applications** (0). Le code applicatif s'appuie sur l'inférence.

**Collections et natifs.** [VÉRIFIÉ] `Map` 20, `Set` 6, RegExp 44, `Date` natif 3 (remplacé par `DChrono`), `JSON` 17, `Buffer`/`Uint8Array` 50. Les méthodes natives de tableau sont quasi bannies (16 `.map(`, 7 `.filter/.find/…`) **sauf `.push(` : 92** (mutation locale d'accumulateur).

**Absents.** [VÉRIFIÉ] `var` 0, `enum` 0 (remplacé par `DCommon.createEnum([...])` + `as const`), `switch` 0, décorateurs 0, `delete` 0, `export default` ~0.

**Modules.** [VÉRIFIÉ] 538 `export *` (fichiers barils `index.ts`), 488 `import type`, 78 `declare module` (augmentation de module, mécanisme d'extension des paquets), alias de chemins (`@scripts/...`, `@domains/...`, `@applications/...`).

---

## 20. À quoi ressemble une application DuploJS de bout en bout

[VÉRIFIÉ] Sources lues : `$D/backend-boilerplate` (squelette, 68 lignes utiles), `$D/discover/app/examples/layers` (application « bibliothèque » complète, génération utils), `$D/ecosystem/packages/agents-kit/skills/http-server/references/examples/*.ts` (équivalent génération lang).

### 20.1 Arborescence (clean architecture)

```
business/
  domains/entities/      namespace par entité : NewType, Entity, Flags, fonctions de règle
  domains/aggregates/    fonctions pures combinant des entités, renvoient un Either
  domains/repositories/
  applications/ports/    interfaces + createPort
  applications/useCases/ createUseCase(dépendances, (ports) => (entrée) => résultat)
infrastructure/
  adapters/ports/        implémentations des ports
  adapters/useCases/     C.useCaseInstances({...UseCases}, {...Ports})
  http/main.ts           createHub + plugins + createHttpServer
  http/routes/           useRouteBuilder(...)
  checkers/              useCheckerBuilder + createPresetChecker
  providers/envs.ts      environmentVariableOrThrow
  commands/
```

### 20.2 Couche domaine : entité

Extrait réel — `$D/discover/app/examples/layers/domains/entities/book.ts` :

```ts
export namespace Book {
	export const Id = C.createNewType("BookId", DPE.string(), C.Uuid);
	export type Id = C.GetNewType<typeof Id>;

	export const Entity = C.createEntity(
		"Book",
		({ nullable }) => ({ id: Id, name: Name, currentBorrowerId: nullable(Client.Id) }),
	);
	export type Entity = C.GetEntity<typeof Entity>;

	const Available = C.createFlag<Entity, "Available">("Available");

	export function isBorrowed<T extends Entity>(book: T) {
		if (book.currentBorrowerId !== null) {
			return E.result("book-is-borrow", Borrow.append(book, { currentBorrowerId: book.currentBorrowerId }));
		}

		return E.result("book-is-available", Available.append(book));
	}
}
```

Constructions : `namespace` TypeScript, fusion valeur/type du même nom (`const Id` + `type Id`), NewType validé, « flags » (types fantômes prouvant un état), `E.result("information", valeur)`.

### 20.3 Couche domaine : agrégat (fonction pure)

Extrait réel — `$D/discover/app/examples/layers/domains/aggregates/clientBorrowBook.ts` :

```ts
export function clientBorrowBook(
	client: Client.Entity & Client.CanRent,
	book: Book.Entity & Book.Available,
) {
	const borrowedBook = pipe(book, Book.Entity.update({ currentBorrowerId: client.id }));
	const { location } = Client.getAvailableLocation(client);
	const updatedClient = pipe(
		client,
		Client.Entity.update({
			borrowedBooks: O.override(client.borrowedBooks, { [location]: book.id }),
		}),
	);

	return E.right("client-borrow-book", { book: borrowedBook, client: updatedClient });
}
```

Constructions : types intersection comme préconditions, `pipe` à une étape, clé calculée `{ [location]: … }`, déstructuration, mise à jour immuable.

### 20.4 Couche application : port et cas d'usage

Extraits réels — `applications/ports/book.ts` et `applications/useCases/clientBorrowBook.ts` (même dossier `layers`) :

```ts
export interface BookPort {
	save<T extends Book.Entity>(entity: T): Promise<T>;
	findOne(bookId: Book.Id): Promise<C.Maybe<Book.Entity>>;
}
export const BookPort = C.createPort<BookPort>();

export const ClientBorrowBookUseCase = C.createUseCase(
	{ BookPort, ClientPort },
	({ bookPort, clientPort }) => ({ book, client }: Input) => E.rightPipe(
		clientBorrowBook(client, book),
		({ book, client }) => promiseObject({
			book: bookPort.save(book),
			client: clientPort.save(client),
		}),
	),
);
```

Constructions : injection de dépendances par fonction d'ordre supérieur (fonction renvoyant une fonction), `E.rightPipe` + `promiseObject`. Adaptateur : `BookPort.createImplementation({ findOne: (id) => Promise.resolve(C.none("Book")), save: (entity) => Promise.resolve(entity) })`.

### 20.5 Couche infrastructure : checker, route, serveur

Extrait réel — `$D/discover/app/examples/layers/infrastructure/routes/clientBorrowBook.ts` :

```ts
useRouteBuilder("POST", "/clients/{clientId}/borrow-book")
	.extract({
		params: { clientId: Client.Id.toExtractParser() },
		body: { bookId: Book.Id.toExtractParser() },
	})
	.presetCheck(iWantClientExist.indexing("client"), ({ clientId }) => clientId)
	.presetCheck(iWantBookExist.indexing("book"), ({ bookId }) => bookId)
	.handler(
		[
			ResponseContract.conflict("book.alreadyBorrowed"),
			ResponseContract.conflict("client.haveNotFreeLocation"),
			ResponseContract.noContent("client.borrowBook"),
		],
		async({ book, client }, { response }) => {
			const result = await E.rightPipe(
				E.group({
					book: E.keepAsRightByInformation(useCases.bookIsBorrowedUseCase(book), "book-is-available"),
					client: E.keepAsRightByInformation(useCases.clientCanRentUseCase(client), "client-can-rent"),
				}),
				useCases.clientBorrowBookUseCase,
			);

			return E.matchInformation(result, {
				"book-is-borrow": () => response("book.alreadyBorrowed"),
				"client-can-not-rent": () => response("client.haveNotFreeLocation"),
				success: () => response("client.borrowBook"),
			});
		},
	);
```

Point d'entrée — `$D/backend-boilerplate/infrastructure/http/main.ts` : `createHub({ environment })`, `.plug(codeGeneratorPlugin(...))`, `.plug(openApiGeneratorPlugin(...))`, `hub.register(routeStore.getAll())`, `await createHttpServer(hub, { host, port })` (`await` de premier niveau), import à effet de bord `import "./routes"`. Configuration — `infrastructure/providers/envs.ts` : `await environmentVariableOrThrow({ ENVIRONMENT: DPE.literal(["DEV", "PROD"]) }, { paths: [...] })`.

### 20.6 Équivalent génération lang

[VÉRIFIÉ] `$D/ecosystem/packages/agents-kit/skills/http-server/references/examples/user-checker.ts` :

```ts
export const userExist = useCheckerBuilder()
	.handler(async(id: User["id"], { output }) => {
		const result = await findUser(id);

		return DEither.matchInformation(result, {
			some: (user) => output("user.found", user),
			none: () => output("user.notFound", null),
		});
	});
```

Différences lang : `response.ok("profile.read", floor.user)` (méthodes de statut sur `response`), `.exec(process, { imports: ["user"] })`, `DDataStructure.number([DDataStructure.integer(), DDataStructure.greaterThanOrEqual(1)])` au lieu de `DPE.number().min(1)`.

### 20.7 Ce que cela implique pour un transpileur

[HYPOTHÈSE]
- Les **couches `domains` et `applications`** sont du code pur (Either, pipe, NewType, fonctions d'ordre supérieur) : ce sont les candidates réalistes à la transpilation.
- La **couche `infrastructure`** repose sur des builders chaînés fortement typés (`useRouteBuilder`), des imports à effet de bord, un store global de routes et de la génération de code : il faudrait un runtime Go équivalent, pas une simple traduction.
- Vocabulaire applicatif dominant : `E.result`, `E.right`, `E.rightPipe`, `E.group`, `E.keepAsRightByInformation`, `E.matchInformation`, `pipe`, `O.override`, `promiseObject`, `C.createNewType/createEntity/createFlag/createPort/createUseCase` — presque aucune de ces fonctions n'est dans le top 20 du code de bibliothèque.

---

## 21. Synthèse : ordre de priorité pour étendre le transpileur

Classement fondé sur l'usage mesuré dans `langLib` (code de production) pondéré par le vocabulaire des applications (section 20). [HYPOTHÈSE] pour l'ordre lui-même ; les chiffres cités sont [VÉRIFIÉ].

### Priorité 1 — socle Either (26 % des références, motif d'erreur n°1)
- Constructeurs : `left` (138), `right` (115), `success` (25), `error` (15), `fail` (8), `ok` (5), `result` (applications).
- Gardes et extraction : `isLeft` (106), `isRight`, `unwrapRight` (78), `unwrapLeft` (31), `hasInformation` (13, deux arités).
- Motif `if (isLeft(x)) return x;` puis `unwrapRight(x)` (≈ 96 gardes) : à traduire par retour anticipé avec propagation du type union.

### Priorité 2 — composition
- `pipe` (92, 1 à 6 étapes), `asyncPipe` (17), `innerPipe` (15) : accepter les trois formes d'étape (fléchée, appel curryfié, référence nue).
- `whenIsRight` (25), `whenIsLeft` (9), `rightPipe` (7), `rightAsyncPipe` (16), `DCommon.when` (9), `justReturn` (44), `forward` (15), `isType` (20).

### Priorité 3 — collections
- `DArray` : `map` (53), `filter` (26), `coalescing` (26), `find` (15), `flatMap` (10), `includes` (9), `push` (9), `some` (7), `concat` (7), `minElements` (12).
- `reduce` + `reduceFrom` + continuations `next`/`exit`/`nextWithObject`/`nextPush` (45 reduce, 178 continuations) — même mécanique pour `DArray` et `DGenerator`.
- `DObject` : `entry` (27), `entries` (15), `fromEntries` (9), `override` (8).
- `DGenerator` : `map`, `filter`, `reduce`, `asyncReduce`.

### Priorité 4 — chaînes et pattern matching
- `DString` de production : `startsWith` (17), `join` (16), `replace` (13), `test` (12), `split`, `includes`, `endsWith` ; puis celles de la doc : `toUpperCase`, `toLowerCase`, `trim`, `length`.
- `DPattern` : `when`/`otherwise`/`exhaustive` curryfiés, builder `match(x).when().otherwise()`, tables `matchWith*` et `DEither.matchInformation`.

### Priorité 5 — vocabulaire applicatif
- `E.group`, `E.keepAsRightByInformation`, `E.matchInformation`, `promiseObject`/`promiseAll`, `O.override`.
- `DModeling` (`createNewType`, `createEntity`, `createFlag`, `createPort`, `createUseCase`) et `DDataStructure` (`string`, `number`, `object`, `literal`, `array`, `union` + contraintes) : indispensables pour une vraie application, mais demandent un runtime Go de validation.

### Priorité basse
- `DNumber` (0 usage en production), `DTuple` (2), `DInvocation` (9), `DPrinter` (52, CLI seulement), `DChrono` (59, concentré), `DPath` (88, concentré dans `server`/`agents-kit`), `DKind`, identifiants de DataStructure (`constraintIdentifier`… : méta-programmation de `tools`).

### Constructions TypeScript à couvrir en premier
1. Déclarations `function` exportées, fléchées à corps expression et à corps bloc, closures.
2. Déstructuration de paramètres (objet, tuple, renommage, imbriquée) — 469 occurrences.
3. `if`/`else` + retour anticipé, `===`, `undefined`/`null`, ternaire.
4. Objets littéraux, spread d'objet et de tableau, clés calculées, template strings.
5. `async`/`await` (puis `.then`/`.catch`).
6. Unions discriminées par littéral de chaîne, `as const`, `satisfies`, `typeof x === "…"`, `instanceof`.
7. Classes d'erreur d'une ligne (`extends DCommon.DuploJSError.parentClass(...)`).
8. Ensuite seulement : `?.`, `??`, `for`/`for…of`/`while`, `try/catch`, `Map`/`Set`, RegExp, génériques explicites, surcharges, `namespace`, `declare module`.

---

## 22. Familles d'API pouvant partager une même stratégie de traduction

[HYPOTHÈSE] (regroupements déduits des signatures et des usages mesurés).

| Famille | Membres | Stratégie commune |
|---|---|---|
| Constructeurs d'Either | `right`, `left`, `success`, `ok`, `error`, `fail`, `result`, `some`, `none` | Littéral d'une structure Go `{côté, information, valeur}` ; `success`/`ok`/`error`/`fail` = information fixe |
| Gardes d'Either | `isLeft`, `isRight`, `hasInformation`, `isSelected` | Test booléen + rétrécissement ; forme curryfiée = prédicat |
| Extraction | `unwrapRight`, `unwrapLeft`, `unwrap*OrThrow`, `unwrapByInformationOrThrow`, `unwrapOr`, `unwrapOtherwise` | Accès au champ valeur ; variantes `OrThrow` = `panic` |
| Combinateurs conditionnels | `whenIsRight`, `whenIsLeft`, `whenHasInformation`, `when*Otherwise`, `DCommon.when/whenNot/whenElse`, `DPattern.when/otherwise` | `if cond { x = f(déballé) }` ; tous ont la forme « prédicat + fonction » |
| Pipelines | `pipe`, `asyncPipe`, `innerPipe`, `asyncInnerPipe`, `rightPipe`, `rightAsyncPipe` | Aplatissement en suite d'affectations ; les variantes `right*` insèrent un retour anticipé sur `Left` entre chaque étape ; les variantes `async` insèrent une attente |
| Aiguillage par table | `matchInformation(Otherwise)`, `matchWithError*`, `matchWithTaggedObject*`, `matchWithString*`, `matchWithEntity*`, `matchWithFact*` | `switch` sur le discriminant, une branche par clé de l'objet |
| Itération à continuation | `DArray.reduce`, `DGenerator.reduce`, `asyncReduce`, `loop`, `asyncLoop`, `loopAccumulator` avec `next`/`exit`/`nextPush`/`nextWithObject` | Boucle `for` + accumulateur ; `exit` = `return`/`break` |
| Transformations 1→1 de collection | `DArray.map/filter/flatMap/find/some/includes/concat`, `DGenerator.map/filter`, `DTuple.map` | Boucle `for range` ou helper générique Go ; une table d'arité règle « donnée d'abord » contre « curryfié » |
| Objets | `entries`, `entry`, `fromEntries`, `keys`, `values`, `override`, `pick`, `omit` | Structures Go si la forme est statique, `map` sinon |
| Chaînes | `toUpperCase`, `toLowerCase`, `trim`, `startsWith`, `endsWith`, `includes`, `split`, `replace`, `join`, `length` | Appel direct du paquet `strings` de Go |
| Fabriques de fonctions triviales | `justReturn`, `justExec`, `forward`, `truthy`, `falsy`, `isType`, `equal` | Fonction littérale en ligne (ou suppression pure pour `forward`) |
| Fonctions purement de type | `cast`, `infer`, `asserts`, `ExpectType`, `exhaustive`, `satisfies`, `as const` | Effacées à la transpilation (aucun effet à l'exécution, sauf `asserts` qui lève) |
| Classes d'erreur à Kind | `DCommon.DuploJSError.parentClass`, `DKind.parentClass`, `kindHeritage` | Type Go implémentant `error` avec une information constante |

---

## 23. Zones d'incertitude

- **Biais de corpus** : le code lang disponible est surtout du code de **bibliothèque** et de **tests** ; il n'existe aucune application complète en lang (les deux seules applications, `discover` et `backend-boilerplate`, sont en `@duplojs/utils`). Le profil « application lang » de la section 20.6 repose sur les exemples des skills `agents-kit`. [VÉRIFIÉ]
- **Docs surreprésentées** : `langDocs` contient un fichier d'exemple par fonction, ce qui lisse les fréquences (chaque fonction y apparaît 3 à 6 fois). Ne pas en déduire une popularité réelle. [VÉRIFIÉ]
- **Comptages par regex** : ordres de grandeur. Non comptés : accès imbriqués (`DCommon.DuploJSError.*`), fonctions ré-exportées localement, appels via alias `@scripts`. Le compteur `next(`/`exit(` peut inclure quelques homonymes hors reduce ; les compteurs de fléchées incluent les types fonction. [VÉRIFIÉ]
- **Correspondance utils → lang** : établie par comparaison de noms de fichiers ; une fonction « absente » peut avoir été déplacée dans un sous-dossier (`constraints`, `types`) ou renommée. Les renommages `sleep`→`timeout` et `unwrap`→`unwrapRight/unwrapLeft` sont cohérents avec les usages mais n'ont pas été confirmés par un changelog. [HYPOTHÈSE]
- **`ecosystem/docs/examples`** ne contient que 2 fichiers TypeScript : le gros des exemples de la doc actuelle est dans `agents-kit/docs`. Les dossiers `ecosystem/docs/fr` et `libs` (Markdown) n'ont pas été analysés. [VÉRIFIÉ]
- **Repos hors périmètre non analysés** : `data-parser-tools`, `lang-tools`, `types-codegen`, `zod-accelerator`, `zod-to-typescript`, `dev-tools`, `code-config`, `eslint`, ainsi que l'implémentation interne de `lang` et de `utils`.
