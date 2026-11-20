# 03 — Boilerplate du hackathon DuploJS → Go : histoire, AST, printer, transpileur, exercices

Source étudiée : clone complet du dépôt `duplojs/hackathon-11-2026` (39 commits, du `ec61881` 2026-11-08 au `915b78a` 2026-11-18, auteur principal `mathcovax`).
Méthode : lecture de tout `src/`, `bin/`, `projects/`, des trois skills `.agents/skills/{go-ast,go-printer,typescript-to-go}` et de l'historique git (`git log --stat`, `git show`). Aucun build exécuté, aucune dépendance installée (`node_modules` absent) : tout Go « généré » ci-dessous est **déduit du code**.

Légende : **[VÉRIFIÉ]** = lu dans le code ou dans un diff ; **[HYPOTHÈSE]** = inféré, non exécuté ou dépendant d'une bibliothèque non lue (DuploJS, API TypeScript 7).

---

## 1. Vue d'ensemble du boilerplate

**Fait [VÉRIFIÉ].** Le dépôt contient quatre couches :

| Couche | Emplacement | Rôle |
|---|---|---|
| AST Go | `src/go/AST/` | Nœuds Go typés (objets taggés DuploJS `DModeling`), factories `createXxx` |
| Printer | `src/go/printer/` | `renderNode(node)` exhaustif → texte Go |
| Transpileur | `src/transpiler/` | Contextes, dispatch de « transformers » TS → AST Go, build multi-fichiers |
| CLI | `bin/index.ts` | Options `--tsconfig --input --output`, écrit les fichiers |

Alias `tsconfig.app.json` : `@go` → `src/go/index.ts` (`GoAST`, `GoPrinter`), `@typescript` → `src/typescript/index.ts` (`TsAST` = `typescript/ast`), `@transformer` → `src/transpiler/transformer.ts` (`createTransformer` + `sharedDependency`), `@transpiler` → `src/transpiler/index.ts`.

Dépendances (`package.json`) : `@duplojs/lang` et `@duplojs/server` `0.1.0-beta.11`, `typescript` `7.1.0-beta` (API `typescript/async` : **tout le checker est asynchrone**), `tsx`. pnpm `12.18.0`.

Scripts : `pnpm build` = `tsx --tsconfig tsconfig.app.json bin/index.ts` ; `build:00`, `build:01` (seuls scripts par exercice, il faut ajouter `build:02`…`build:10` soi-même) ; `test:types` (`tsc -p tsconfig.app.json` puis `tsconfig.config.json`) ; `test:lint` (`duplojs-oxlint --quiet`).

**Pourquoi.** Le README (`915b78a`) demande des « transformers génériques et composables », une justification des représentations (perf/mémoire/limites) et une distinction vérifié/hypothèse dans le README de chaque exercice.

**Conséquence.** Le rendu attendu n'est pas seulement du Go qui marche pour 10 fichiers, mais une famille de transformers ; chaque exercice est un prétexte pour une *classe* de constructions.

---

## 2. Historique — chronologie condensée des 39 commits

**Fait [VÉRIFIÉ].**

| Commit | Sujet | Ce que ça change |
|---|---|---|
| `ec61881` | first commit | Squelette, AST minimal (déclarations), tags plats `node-declaration-*` |
| `8aa68de` | add AST type | Types Go + skill `go-ast` |
| `2aa46bf` | Complete Go AST expressions and statements | Expressions, statements |
| `872e361` | update duplojs | Suppression de la factory maison `createFactory` au profit de `DModeling.createTaggedObjectFactory` ; skill `go-printer` |
| `564622c` | add go printer | Printer complet (110 fichiers) |
| `748d8e7` | init transpiler base | `factory.ts` : `Transformer{predicate, transformer}`, `transform()`, payload `{result, before, topLevelDeclarations}` |
| `15f7592` | shared and local contexts | `TransformerContext` global + `LocalTransformerContext{sourceFile}` + `ConstantDependency{name}` |
| `6be932d` | preserve result inference sync/async | `MaybePromise`, `TransformerResultNode`, `transform` async |
| `a2e59ac` | typed transformers + source file conversion | Suppression de `predicate` ; nouveau résultat `transformation-not-supported` ; listes `DCommon.memo` ; premiers transformers |
| `1d07780` | source naming, builtin types, guards | `createSourceIdentifier` (préfixe `Duplojs_`), `Generated_N`, gardes simplifiées |
| `03cf502` | split build/transpilation/file contexts | Trois contextes ; `SharedDependency` perd `name`, gagne `init` |
| `af04c62` | track file dependencies | `registerDependency(node)` → `file.dependencies` |
| `836a43f` | first build | `build.ts` : file `pending`/`built`, émission `.go` |
| `9ece668` | Migrate AST tags to groups | Tags `[node][declaration]:function` ; `hasTagGroup` possible |
| `81854ab` | refactor top-level declarations | `topLevelDeclarations` retiré du payload ; `createFile` + `init()` |
| `20995e2` | fix context | `FileContext{currentFilePath, dependencyFiles, topLevelDeclarations, imports}` ; `sharedDependencies: Set` |
| `385c753` | refine dependency resolution | Imports relatifs à `projectWorkDirectory` ; `_` autorisé dans les identifiants |
| `5d54f21` | add more tools on context | `resolvedReference.ts`, `sourcePackage.ts`, `go.mod`, `main.go`, un dossier par fichier ; **tous les transformers supprimés** ; entrée `unknown` |
| `e0d44bd` | restrict transformer input to TS nodes | Entrée `TS.Node` uniquement, suppression de `typescriptData.ts` |
| `e427570` | reorganize AST nodes | Dossiers `common/`, sous-dossiers `switch/`, `select/`, `range/` ; tags `[node][declaration]function` |
| `3b10d4e` | diagnostics with file and node context | Payload d'erreur `{node, content, filePath, projectWorkDirectory}` |
| `92901c6` | separate imports from declarations | `GoFile.imports` séparé ; `ImportDeclaration` sort de `Declaration` |
| `16c1db0` | direct exports + transformer alias | `GoAST`, `GoPrinter`, `TsAST`, alias `@transformer` |
| `de016c9` | standardize factory names | `functionDeclaration` → `createFunctionDeclaration` |
| `478c01d` | readable diagnostics with lazy access | `{kind, parentKind, text, getNode()}` ; `notSupport` sans payload |
| `c6c918e` | share AST nodes, remove expression statement wrapper | Dossier `shared/` ; `CallExpression` taggé expression **et** statement |
| `0036e68` | function arguments as AST nodes | Tuple `FunctionParameter` → nœud `FunctionArgument` |
| `35a3c8f` | literal choices as enums | Opérateurs, directions de canal, modes de string en `DCommon.createEnum` |
| `a4891a1` | transformers for exercise 00 | Réécriture : `function`, `binary`, `numericLiteral`, `call`, `block`, `return`, `float`, `identifier` |
| `a75fb0f` | exercise 00 with a file dependency | `add.ts` séparé ; `resolveDependencyFile` / `registerDependencyFile` ; `init()` omis si vide |
| `3ed0949` | shared defaults + type parameter nodes | `JSNull`, `JSUndefined` ; `TypeParameter` devient un nœud ; préfixe `Sourced_` |
| `a93ffe5` | complete project 00 | Routeur Either expression, handler `success`, dépendance `EitherSuccess` |
| `c9fe1ca` | **fix: generate Either success return types** | Routeur de type Either, résolution des nœuds synthétisés, garde `float` corrigée |
| `637454e` | update duplojs | Skill `typescript-to-go` réécrit (214 → ~100 lignes) |
| `8162323` / `9e2995c` | exercises 06-10, puis 01-05 | Énoncés ; correction des groupes de tags dans `shared/` |
| `915b78a` | add readme | README de rendu d'équipe |

**Conséquence.** La conception a été stabilisée en 5 jours par essais-révisions ; chaque révision ci-dessous révèle une contrainte qui s'appliquera aussi à nos transformers.

---

## 3. Historique — du `predicate` au résultat `notSupport`

**Fait [VÉRIFIÉ].** `748d8e7` : un transformer = `{ predicate(input): input is T, transformer(data: T, ctx) }`, et `transform()` retournait `notfound-transformer` si aucun prédicat ne matchait. `a2e59ac` supprime `predicate` : le transformer reçoit le nœud et retourne lui-même `context.notSupport()`.

**Pourquoi.** L'éligibilité n'est pas décidable par un simple type-guard synchrone : il faut souvent interroger le checker (asynchrone) — ex. « cet identifiant vient-il de `@duplojs/lang/either` ? ». Fusionner garde et traduction permet des gardes asynchrones et progressives.

**Conséquence.** Quatre issues possibles (voir §16). Le dispatch essaie les candidats **dans l'ordre de la liste** ; le premier qui ne répond pas `notSupport` gagne. L'ordre des listes est donc sémantique (DuploJS d'abord, puis `shared`, puis génériques).

**Cas à anticiper.** Un transformer générique placé avant un transformer spécialisé le masque. Un transformer qui répond `error` au lieu de `notSupport` empêche tous les suivants d'essayer.

---

## 4. Historique — `topLevelDeclarations` : du payload au contexte de fichier

**Fait [VÉRIFIÉ].** `748d8e7` : `TransformationSuccessPayload = { result, before, topLevelDeclarations }`. `81854ab` retire `topLevelDeclarations` du payload ; `20995e2` les place dans `FileContext.topLevelDeclarations: Set` (renommé `declarations` en `92901c6`).

**Pourquoi.** Chaque transformer parent devait recopier et concaténer les `topLevelDeclarations` de tous ses enfants (le diff `81854ab` supprime ces lignes dans `functionDeclaration`, `callExpression`, `block`). Or une déclaration de niveau package n'a pas d'ordre ni de portée locale : un ensemble mutable ambiant suffit.

**Conséquence.** Deux canaux de sortie distincts : (1) `before`, ordonné, local, remonté explicitement par les parents ; (2) `context.file.declarations` / `context.file.imports`, non ordonnés, écrits par effet de bord. Le canal (2) **n'est pas annulé** si le transformer finit en `notSupport` → règle du skill : vérifier l'éligibilité avant toute mutation.

**Cas à anticiper.** Types nommés générés (struct d'un objet littéral, interface d'une union), fonctions utilitaires locales au fichier : à pousser dans `context.file.declarations`, avec un nom déterministe et dédupliqué par nous (le `Set` déduplique par identité d'objet, pas par nom).

---

## 5. Historique — séparation en trois contextes (`03cf502`, `20995e2`)

**Fait [VÉRIFIÉ].** `15f7592` : un `TransformerContext` global + un `LocalTransformerContext { sourceFile }` passé en 3ᵉ argument à chaque transformer. `03cf502` : `TranspilationContext` (global), `FileContext` (par source), `BuildContext` (façade, un par fichier, seul argument reçu par les transformers).

**Pourquoi.** Le passage de deux contextes à chaque appel alourdissait toutes les signatures ; surtout, certaines données sont par build (compteur d'identifiants, dépendances partagées, checker), d'autres par fichier (imports, déclarations, fichiers dépendants). Les mélanger rendait impossible le build multi-fichiers (`836a43f`).

**Conséquence.** Le compteur `Generated_N` est global à la transpilation (jamais réinitialisé) ; imports et déclarations sont par fichier ; un transformer ne voit qu'un `BuildContext`.

**Cas à anticiper.** Il n'existe **pas de contexte de fonction ni de bloc** (type de retour attendu, variables capturées, étiquette de boucle courante, « suis-je dans une fonction async ? »). Tout besoin de ce genre (ex. convertir une valeur retournée vers le type union de la fonction englobante) devra soit remonter l'arbre TS via `node.parent`, soit interroger le checker, soit étendre le contexte.

---

## 6. Historique — tags plats → groupes de tags (`9ece668`, `e427570`, `9e2995c`)

**Fait [VÉRIFIÉ].** Tags initiaux : chaînes plates `node-declaration-function`. `transformSourceFile` testait `hasTagValue(result, "node-declaration-function")` — seule la fonction était reconnue comme déclaration. `9ece668` : `[node][declaration]:function` ; `81854ab` : `hasTagGroup(result, "declaration")`. `e427570` : format final `[node][declaration]function` avec `DModeling.ObjectTagWithGroup<"function", DeclarationGroup>`. `9e2995c` corrige les nœuds partagés (`[NodeGroup, ExpressionGroup, StatementGroup]`).

**Pourquoi.** Il faut pouvoir demander « ce nœud est-il une déclaration ? » sans énumérer tous les tags, et un même nœud peut appartenir à plusieurs familles grammaticales (un appel est expression **et** instruction ; `var`/`const`/`type` sont déclaration de package **et** instruction locale).

**Conséquence.** Groupes existants : `node`, `declaration`, `expression`, `statement`, `type`. Nœuds multi-groupes : `call` et `receive` = `[node][expression][statement]` ; `constant`, `type`, `type-alias`, `variable-zero-value`, `variable-initialized` = `[node][declaration][statement]`.

**Cas à anticiper.** Le routage top-level (§21) repose sur ce groupe : une `VariableDeclarationInitialized` retournée au top-level part dans les déclarations du package, pas dans `init()` — piège décrit en §33.

---

## 7. Historique — suppression du wrapper `ExpressionStatement` (`c6c918e`)

**Fait [VÉRIFIÉ].** Avant : `ExpressionStatement { expression: CallExpression | ReceiveExpression }` taggé `[node][statement]expression`. Après : supprimé ; `CallExpression` et `ReceiveExpression` portent directement le groupe `statement` et figurent dans `SimpleStatement` et `ForPostStatement`. `a93ffe5` adapte `callExpressionTransformer` : il accepte un `TsAST.ExpressionStatement` (qu'il déballe) **ou** un `CallExpression`.

**Pourquoi.** En Go, seuls appels et réceptions peuvent servir d'instruction-expression. Le wrapper obligeait à un transformer d'instruction dédié, dupliquant celui d'expression. Avec le double groupe, **un seul transformer** (`shared/call.ts`) est inscrit dans `sharedStatementTransformers` et `sharedExpressionTransformers`.

**Conséquence.** D'où le dossier `transformers/shared/` : transformers dont le résultat satisfait plusieurs contrats.

**Cas à anticiper.** Toute autre expression TS utilisée comme instruction (`a = b;`, `i++;`, `x && f();`, `await p;`, `cond ? f() : g();`) n'a pas d'équivalent « expression-statement » en Go : il faut un transformer **d'instruction** qui reconnaît `TsAST.ExpressionStatement` + la forme interne, et produit une instruction Go (assignation, `if`, etc.). Une expression pure utilisée comme instruction (`x;`) doit devenir `_ = x`.

---

## 8. Historique — imports séparés des déclarations (`92901c6`)

**Fait [VÉRIFIÉ].** `ImportDeclaration` appartenait à l'union `Declaration`/`TopLevelDeclaration` (tag `[node][declaration]import`) ; le contexte triait à la main imports et déclarations (`DArray.group` dans `a2e59ac`). Après : `GoFile { packageName, imports, declarations }`, tag `[node]import`, l'import n'est plus une `Declaration`.

**Pourquoi.** Go impose les imports avant toute déclaration ; rendre cette règle structurelle (deux champs) évite un tri et rend l'état invalide irreprésentable. Cohérent avec la règle du skill go-ast : « ce qui se vérifie localement va dans les types ».

**Conséquence.** `FileContext.imports` et `FileContext.declarations` sont deux `Set` distincts ; `SharedDependency` a aussi `imports` et `declarations` séparés.

**Cas à anticiper.** Imports de la bibliothèque standard (`fmt`, `strconv`, `math`, `encoding/json`, `sync`, `strings`) : créer **une seule instance** d'`ImportDeclaration` par chemin (constante de module ou `memo`), sinon doublon (§31).

---

## 9. Historique — arguments de fonction et paramètres de type comme nœuds (`0036e68`, `3ed0949`)

**Fait [VÉRIFIÉ].** `FunctionParameter` était un tuple `[identifier, type]` ; `TypeParameter` aussi. `0036e68` crée le nœud `FunctionArgument { identifier, type }` (`[node]function-argument`) et renomme `parameters`/`variadicParameter` en `arguments`/`variadicArgument` partout. `3ed0949` crée le nœud `TypeParameter { identifier, constraint }` (`[node]type-parameter`).

**Pourquoi.** Un `Transformer<X>` doit produire un `GoAST.Node` ; un tuple n'en est pas un, donc impossible d'écrire un transformer de paramètre, et le printer devait dérouler les tuples à la main. `3ed0949` en avait besoin pour écrire `EitherSuccess[T any]`.

**Conséquence.** On peut écrire un transformer « paramètre TS → `FunctionArgument` » (utile pour la déstructuration de l'exercice 08, les paramètres optionnels, rest).

**Attention [VÉRIFIÉ].** Le skill `go-ast` est en retard sur le code : il parle encore de « tuples `FunctionParameter` et `TypeParameter` », de propriétés `parameters`/`variadicParameter`, et situe les déclarations partagées dans `common/` alors qu'elles sont dans `shared/`. Se fier au code.

---

## 10. Historique — diagnostics enrichis puis paresseux (`3b10d4e`, `478c01d`, `c9fe1ca`)

**Fait [VÉRIFIÉ].** `3b10d4e` : les erreurs portent `{ node, content, filePath, projectWorkDirectory }` et `notSupport` porte aussi un payload. `478c01d` : remplace `node` par `{ kind, parentKind, text, getNode() }` ; `notSupport()` ne prend plus d'argument et porte `undefined`. `c9fe1ca` : dans `transform`, `text` est calculé via `DEither.safeCallback(() => data.getText())` avec repli `"DisplayError"`, et le `notfound-transformer` n'est construit **qu'après** l'échec de tous les candidats.

**Pourquoi.** (1) Un nœud TS porte `parent` et tout l'arbre : l'afficher dans l'erreur levée par `DEither.unwrapRightOrThrow` du CLI est illisible ; `kind`/`text` sont lisibles, `getNode()` garde l'accès sans sérialisation. (2) `notSupport` est créé pour chaque candidat refusé : il doit être gratuit. (3) `getText()` lève sur un nœud **synthétisé** (sans position), produit par `typeToTypeNode`.

**Conséquence / bug latent [VÉRIFIÉ].** `context.error(node, content)` (`context/build.ts`) appelle encore `node.getText()` **sans** garde. `functionDeclarationTransformer` appelle `context.error(returnTypeNode, …)` avec un nœud potentiellement synthétisé → exception au lieu d'un `Left` propre. À corriger avant de s'appuyer sur `context.error` avec des nœuds issus du checker.

**Cas à anticiper.** Diagnostics d'un nœud synthétisé : `text = "DisplayError"`, `parentKind = undefined`. Pour déboguer, logguer `kind` et le fichier.

---

## 11. Historique — entrée des transformers restreinte aux nœuds TS (`5d54f21` → `e0d44bd`)

**Fait [VÉRIFIÉ].** `5d54f21` élargit l'entrée à `unknown` et ajoute `typescriptData.ts` (`isTypescriptNode`, `isTypescriptType`) : l'idée était de pouvoir transformer directement un objet `Type` du checker. `e0d44bd` (commit suivant) revient à `TsAST.Node` et supprime ces gardes.

**Pourquoi.** Un seul genre d'entrée garde le dispatch, les gardes (`TsAST.isXxx`) et les diagnostics (`kind`, `parent`, `getText`) uniformes. Quand on n'a qu'un `Type` (type inféré), on le reconvertit en nœud avec `checker.typeToTypeNode(type, enclosingNode)` — c'est ce que fait `declaration/function.ts` pour le type de retour non annoté.

**Conséquence.** Les types inférés arrivent sous forme de **nœuds synthétisés** : `pos < 0`, pas de `parent`, `getText()` lève, `getSymbolAtLocation` inutilisable. D'où les branches `target.pos >= 0` / sinon `resolveName` de `resolveReferenceTarget` (§23). La forme du nœud dépend du checker : `DEither.Success<number>` (QualifiedName), ou `import("@duplojs/lang/either").Success<number>` (ImportTypeNode), ou type structurel développé.

**Cas à anticiper.** Tout transformer de type doit accepter les deux formes (annotée / synthétisée). `typeToTypeNode` peut tronquer ou renvoyer `any` sur des types trop gros [HYPOTHÈSE]. Les alias de type locaux peuvent être développés en type structurel (objet littéral de type) → il faut un transformer `TypeLiteral`.

---

## 12. Historique — dépendances : de `ConstantDependency{name}` à `SharedDependency` + `Set`

**Fait [VÉRIFIÉ].** `15f7592` : `ConstantDependency { name, imports, topLevelDeclarations }`, dédupliquée par `name` dans une liste. `a2e59ac` : renommée `SharedDependency`. `03cf502` : `name` supprimé, `init: Statement[]` ajouté, stockage dans un `Set`. `20995e2` : `useShardDependency(dep, identifier)` retournait un `SelectorExpression` ; `5d54f21` : `registerSharedDependency(dep)` retourne seulement l'identifiant du package. `3ed0949` : dossier `sharedDependency/` avec `defaults/` (`JSNull`, `JSUndefined`).

**Pourquoi.** (1) Dédupliquer par nom textuel est fragile ; l'identité d'objet suffit si la dépendance est un singleton → d'où l'obligation `DCommon.memo`. (2) `init` : certaines dépendances ont besoin de code d'initialisation. (3) Retourner l'identifiant du package plutôt qu'un sélecteur : une dépendance expose plusieurs symboles (un type **et** une fonction), l'appelant construit lui-même `SelectorExpression` ou `PackageTypeReference`.

**Conséquence.** Un seul package Go `shard_dependencies` (faute de frappe d'origine pour « shared », présente dans le code : `sharedDependencyPackageName`), fichier `shard_dependencies/shard_dependencies.go`, importé par `duplojs.local/transpiled/shard_dependencies`.

**Cas à anticiper.** Voir §25 pour les pièges (doublon des défauts, noms globaux à un seul package, dépendances entre dépendances).

---

## 13. Historique — layout de sortie : un package Go par fichier TS (`836a43f` → `5d54f21`)

**Fait [VÉRIFIÉ].** `836a43f` : fichiers à plat `<relatif>.go`, plus `main.generated.go` et `shared_dependencies.generated.go` en package `generated`. `81854ab` : nom de package = `createSourceIdentifier(sourceFile.path)` (avant : nom de base du fichier, `1d07780`). `20995e2` : imports en chemins relatifs au fichier courant ; `385c753` : relatifs à `projectWorkDirectory`. `5d54f21` : `sourcePackage.ts` → dossier par source (`index.ts/index.ts.go`), `go.mod` (`module duplojs.local/transpiled`, `go 1.27.4`), `main.go` avec import blanc de l'entrée.

**Pourquoi.** Contraintes Go : un seul package par dossier ; chemins d'import absolus depuis le module (pas de relatif) ; le package `main` ne peut pas être importé ; un module TS a sa propre portée de noms → un package par fichier TS préserve l'isolation et permet les références qualifiées `pkg.Nom`. Nom de package dérivé du **chemin complet** pour éviter la collision `a/index.ts` vs `b/index.ts`.

**Conséquence.** Le code top-level d'un module TS vit dans `func init()` de son package ; `main()` est vide ; l'exécution du programme = initialisation des packages (§34).

---

## 14. Historique — `fix(transpiler): generate Either success return types` (`c9fe1ca`)

**Fait [VÉRIFIÉ].** Avant ce commit : (a) `duploJSEitherTypeTransformer` était un stub `notSupport` ; (b) la garde de `float64TypeTransformer` était `if (!isKeywordTypeNode(node) && node.kind === NumberKeyword) return notSupport()` — condition jamais vraie → **tout type devenait `float64`** ; donc `add` était émise avec un retour `float64` alors qu'elle retourne un `EitherSuccess`. Le commit : corrige la garde (`node.kind !== NumberKeyword`), ajoute le routeur de type Either + `successTypeHandler` (→ `shard_dependencies.EitherSuccess[float64]`), ajoute `ModuleReference` (accepte `ImportTypeNode`) et les branches « nœud synthétisé » dans `resolveReferenceTarget`, élargit le contrat de la liste de types à `Transformer<GoAST.Type | GoAST.TypeReference>` (un `GenericTypeReference` n'est pas un `Type`), passe `BuildContext` entier aux résolveurs (besoin de `sourceFile`).

**Pourquoi / contrainte révélée.** Chaque valeur DuploJS traduite a deux faces à garder cohérentes : la **valeur** (`EitherSuccessOf(x)`) et le **type** (`EitherSuccess[T]`), et le type apparaît le plus souvent **inféré** (pas d'annotation dans `add.ts`), donc sous forme synthétisée.

**Conséquence.** Tout nouveau handler DuploJS vient par paire : handler d'expression + handler de type, alimentés par la même shared dependency. Une garde de type trop permissive masque silencieusement les types non gérés : préférer un `notfound` bruyant.

---

## 15. Historique — autres micro-décisions utiles

**Fait [VÉRIFIÉ].**
- `6be932d` / `a2e59ac` : `createTransformer<GenericResultNode = never>` avec paramètre `IsNever<…> extends true ? never : fn` + `NoInfer` → **oblige** à annoter la constante (`const x: Transformer<GoAST.Y> = createTransformer(...)`). *Pourquoi* : les transformers se référencent récursivement via les listes ; sans annotation explicite TypeScript tombe en inférence circulaire.
- `a2e59ac` : listes en `DCommon.memo(() => [...])`, lues par `.value`. *Pourquoi* : imports circulaires entre modules (`expression/index.ts` ↔ `expression/binary.ts`) ; la liste n'est construite qu'au premier accès.
- `16c1db0` : alias `@transformer` distinct de `@transpiler`. *Pourquoi* : `@transpiler` réexporte les transformers ; un transformer qui l'importerait créerait un cycle.
- `1d07780` : `generated_N` → `Generated_N` et préfixe majuscule pour les noms source. *Pourquoi* : en Go, l'export dépend de la majuscule initiale ; une fonction TS exportée doit être visible d'un autre package.
- `385c753` : regex `[^a-zA-Z0-9]` → `[^a-zA-Z0-9_]` (ne plus encoder `_`).
- `a75fb0f` : `createFile` n'émet `init()` que si `init` non vide.
- `5d54f21` : le build retire le chemin de `pending` même s'il est déjà `built` (avant : boucle infinie potentielle, `next(accumulator)` sans `shift`).
- `35a3c8f` : opérateurs en enums (`GoAST.binaryOperators.has(...)` possible).
- `de016c9` : factories génériques écrites `function createX<…>(properties) { return DModeling.taggedObject<X<…>>(tag, properties) }` pour conserver les paramètres de type.
- Exercice 01 d'origine (`385c753`, supprimé en `3ed0949`) : `createResult(isSuccess: boolean)` retournant `DEither.right("success", …)` ou `DEither.left("failure", …)`, puis `isLeft`/`unwrapLeft`, `isRight`/`unwrapRight`. **Indice** sur des variantes probables de la soutenance : `DEither.right(info, value)`, `isLeft`, `unwrapLeft`, `unwrapRight`.

---

## 16. AST Go — principes et invariants de typage

**Fait [VÉRIFIÉ]** (`src/go/AST/`, skill `go-ast`).
- Chaque nœud = interface étendant `DModeling.ObjectTagWithGroup<"nom", Groupe>` + factory `createXxx` (`DModeling.createTaggedObjectFactory<X>("[node][groupe]nom")`). Pas de classes.
- Unions exhaustives : `Node` (`base.ts`, 85 membres), `Declaration`, `Expression`, `Statement`, `SimpleStatement`, `Type`, `TypeReference`, `Literal`, `ConstantLiteral`, `CompositeLiteral`, `ConstantExpression`.
- `TypeReference = Identifier | PackageTypeReference | GenericTypeReference` ; `Type = Identifier | ArrayType | ChannelType | FunctionType | InterfaceType | MapType | PointerType | SliceType | StructType`. La plupart des emplacements de type acceptent `TypeReference | Type`.
- Les types builtin sont des `Identifier` : `GoAST.builtinTypeReferences.{any,bool,byte,comparable,complex64,complex128,error,float32,float64,int,int8…int64,rune,string,uint…uint64,uintptr}`.
- Règle du skill : **simplification syntaxique** (pas de déclarations groupées, pas de sucre) mais préservation des distinctions sémantiques (zéro-valeur vs initialisée, définition vs alias, fonction vs méthode) ; **validité locale seulement** (pas de résolution de noms, pas de vérification sémantique) ; pas de tests pour l'AST, seulement `pnpm test:types` et `pnpm test:lint` ; pas de `any`.

Invariants imposés par les types :
- `GoFile.imports` séparé de `declarations`.
- `AssignmentStatement.targets` et `.values` : au moins 1 élément (`DArray.MinElements<1>`) ; cibles limitées à `Identifier | SelectorExpression | IndexExpression | DereferenceExpression`.
- `GenericTypeReference.typeArguments`, `InstantiationExpression.typeArguments`, `ExpressionSwitchCase.expressions`, `TypeSwitchCase.types`, `InterfaceUnion.terms` : au moins 1 élément (d'où `DCommon.cast([x])` dans le code existant).
- `StructLiteral.elements` : soit tout positionnel, soit tout `KeyedElement<Identifier>`.
- `Switch`/`Select` : variantes `WithDefault { casesBeforeDefault, defaultCase, casesAfterDefault }` et `WithoutDefault { cases }` → au plus un `default`, position préservée.
- `MethodReceiver = [Identifier, Identifier | GenericTypeReference | PointerType<…>]` (pas de référence de package, pas de double pointeur).
- `StructEmbeddedField` : `TypeReference | PointerType<TypeReference>`.
- `MapKeyType` exclut slice, map, fonction (non comparables).
- `AddressOperand` limité aux opérandes adressables + littéraux composites.
- `ConstantDeclaration.initializer: ConstantExpression` (littéraux, identifiants, unaire/binaire/conversion constants, appels à identifiant).
- `IfStatement.elseBranch: BlockStatement | IfStatement` ; `ForStatement.initializer: SimpleStatement`, `post: ForPostStatement` (pas de déclaration courte en post).
- `GoStatement`/`DeferStatement.call: CallExpression`.

**Conséquence.** Une erreur de typage TypeScript sur une factory signale généralement une forme Go invalide : ne pas contourner par cast.

---

## 17. AST Go — inventaire complet des nœuds

**Fait [VÉRIFIÉ].**

Communs (`common/`) : `Identifier{value}` · `GoFile{packageName, imports, declarations}` · `ImportDeclaration{path, alias?: Identifier | "."}` · `FunctionArgument{identifier, type}` · `PackageTypeReference{packageName, identifier}` (`pkg.T`) · `GenericTypeReference{typeReference, typeArguments}` (`T[A, B]`) · `TypeConstraint{typeReference}` (`~T`) · `DefaultCase{statements}`.

Partagés (`shared/`) : `CallExpression{callee, typeArgument?, arguments, variadicArgument?}` (expr+stmt) · `ReceiveExpression{operand}` (expr+stmt) · `ConstantDeclaration{identifier, typeReference?, initializer}` · `TypeDeclaration{identifier, generic?, type}` (factory **`createTypeDefinition`**) · `TypeAliasDeclaration{identifier, generic?, type}` (factory **`createTypeAlias`**) · `VariableDeclarationZeroValue{identifier, typeReference}` · `VariableDeclarationInitialized{identifier, typeReference?, initializer}` (décl+stmt).

Déclarations (`declaration/`) : `FunctionDeclaration{identifier, generic, arguments, variadicArgument?, returnTypes, body}` · `MethodDeclaration{identifier, receiver, generic, arguments, variadicArgument?, returnTypes, body}`.

Expressions (`expression/`) : littéraux `IntegerLiteral{value: bigint}`, `FloatLiteral{value: string}`, `ImaginaryLiteral`, `RuneLiteral`, `StringLiteral{value, mode?: "text"|"bytes"}`, `BooleanLiteral`, `NilLiteral` · composites `ArrayLiteral`, `SliceLiteral`, `MapLiteral`, `StructLiteral` (+ `KeyedElement{key, value}`) · `FunctionLiteral{arguments, variadicArgument?, returnTypes, body}` · `ConversionExpression{typeReference, operand}` · `InstantiationExpression{target, typeArguments}` (`f[T]`) · `UnaryExpression{operator: + - ! ^, operand}` · `BinaryExpression{operator, left, right}` (`+ - * / % & | ^ &^ << >> && || == != < <= > >=`) · `AddressExpression` · `DereferenceExpression` · `SelectorExpression{target, identifier}` · `MethodExpression{receiverType, identifier}` · `IndexExpression` · `SliceExpression{target, low?, high?}` · `FullSliceExpression` · `TypeAssertionExpression{target, typeReference}`.

Instructions (`statement/`) : `AssignmentStatement{targets, values}` · `CompoundAssignmentStatement{operator, target, value}` (`+= -= *= /= %= &= |= ^= &^= <<= >>=`) · `ShortVariableDeclarationStatement{identifier, initializer}` · `BlockStatement` · `GoStatement` · `DeferStatement` · `SendStatement{channel, value}` · `ForStatement{initializer?, condition?, post?, body}` · `RangeStatement{binding?, expression, body}` (+ `RangeAssignment{key, value?}`, `RangeDeclaration{key, value?}`) · `IfStatement{initializer?, condition, body, elseBranch?}` · `ReturnStatement{values}` · `BreakStatement{label?}` · `ContinueStatement{label?}` · `GotoStatement{label}` · `FallthroughStatement` · `LabeledStatement{label, statement}` · `SelectStatement{With,Without}Default` (+ `SelectCase{communication, statements}`, `SelectReceiveAssignment`, `SelectReceiveDeclaration{value, ok?, receive}`) · `ExpressionSwitchStatement{With,Without}Default{initializer?, expression?, …}` (+ `ExpressionSwitchCase`) · `TypeSwitchStatement{With,Without}Default{initializer?, expression, identifier?, …}` (+ `TypeSwitchCase{types (dont NilLiteral), statements}`).

Types (`type/`) : `ArrayType{length, elementType}` · `SliceType{elementType}` · `MapType{keyType, valueType}` · `PointerType{typeReference}` · `ChannelType{elementType, direction: bidirectional|send|receive}` · `FunctionType{arguments, variadicArgument?, returnTypes}` · `StructType{fields}` (+ `StructField{identifier, typeReference, tag?}`, `StructEmbeddedField{typeReference, tag?}`) · `InterfaceType{elements}` (+ `InterfaceMethod{identifier, arguments, variadicArgument?, returnTypes}`, `InterfaceUnion{terms}` factory **`createTypeUnion`**) · `TypeParameter{identifier, constraint}`.

---

## 18. AST Go — ce qui est modélisé contrairement aux idées reçues, et ce qui manque

**Modélisé [VÉRIFIÉ]** : goroutines (`GoStatement`), canaux (type, send, receive, `select`), génériques (type parameters sur fonctions/types/alias, `GenericTypeReference`, `InstantiationExpression`, contraintes `~T` et unions), méthodes à receiver (valeur/pointeur), struct tags (`StructField.tag`), champs embarqués, labels + `goto`/`break`/`continue` étiquetés, `defer`, type switch, closures (`FunctionLiteral`), variadiques (déclaration et appel `xs...`), `make`/`new` (via `CallExpression.typeArgument`, rendu comme premier argument), retours multiples (`returnTypes[]`, `ReturnStatement.values[]`), `for range` sans liaison.

**Absent [VÉRIFIÉ]** :
- **Déclaration courte multiple** `a, b := f()` : `ShortVariableDeclarationStatement` n'a qu'un `identifier`. Donc pas de `v, ok := x.(T)`, `v, ok := m[k]`, `v, err := f()` directs. Contournement représentable : `var v T` + `var ok bool` + `AssignmentStatement{targets: [v, ok], values: [x.(T)]}` (rendu `v, ok = x.(T)`). Exceptions déjà prévues : `RangeDeclaration` (`k, v := range`) et `SelectReceiveDeclaration` (`v, ok := <-ch`).
- `var a, b T` / `var a, b = x, y` (une variable par déclaration).
- `i++` / `i--` (utiliser `CompoundAssignmentStatement` `+= 1`).
- Résultats nommés de fonction ; paramètres sans nom ; paramètres groupés.
- Commentaires, directives (`//go:build`), chaînes brutes (backticks), `[...]T{}`, `iota`, déclarations groupées, instruction vide.
- Nœud « expression parenthésée » (inutile : le printer parenthèse).
- Paramètres de type sur `FunctionLiteral` (conforme à Go).
- `MethodDeclaration.generic` existe et est rendu `func (r T) M[U any,](…)` : méthodes génériques, non valides dans les Go que je connais [HYPOTHÈSE : accepté par le Go 1.27 visé par `go.mod`, à vérifier avec la vraie toolchain].
- Alias d'import : oui ; import groupé : non (un `import "x"` par ligne).

**Conséquence.** Les lacunes qui gêneront les exercices sont la déclaration courte multiple (comma-ok pour assertions de type et maps) et l'absence de contexte ; tout le reste nécessaire aux exercices 01–10 est représentable. Toute extension de l'AST exige : interface + factory + ajout à l'union de famille + ajout à `Node` (`base.ts`) + renderer dans `renderNode` (sinon erreur de typage du matcher exhaustif).

---

## 19. Printer — architecture et garanties

**Fait [VÉRIFIÉ]** (`src/go/printer/`, skill `go-printer`).
- Une seule boucle récursive `renderNode(node, depth = 0)` (`renderNode.ts`) : `DPattern.matchWithTaggedObject(node, { "<tag>": printXxx(context), … })` sur l'union `Node` complète → **exhaustivité vérifiée au typage** : ajouter un nœud à `Node` casse la compilation tant que son renderer manque. Aucun fallback, aucun registre par `string`.
- Chaque renderer est créé par `createNodePrinter<NodeConcret>((node, context) => string)` ; il rend ses enfants **uniquement** via `context.renderNode(child, depth?)` (pas d'import de `renderNode` → pas de cycle).
- `PrinterContext { depth, indentation, renderNode }` immuable. Convention : un fragment n'ajoute ni indentation initiale ni saut de ligne final ; c'est le propriétaire de la ligne/du bloc (`renderBracedNodes`, `renderNodeLines`, `renderCaseBody`, `renderCompositeElements`) qui indente (tabulations, `DPrinter`).
- Entrée publique : `GoPrinter.printGoFile(file)`. `printFile` rend `package X`, puis les imports (un par ligne), puis les déclarations séparées par une ligne vide, puis `\n` final.
- Helpers hors nœuds : `renderArguments`, `renderReturnTypes`, `renderTypeParameters`, `renderOperand`, `renderSelectorTarget`, `escapeQuotedValue`.

**Garanties.** Pur, déterministe, syntaxe Go valide **si l'AST est localement valide** (parenthésage, séparateurs, échappements). **Non garanti** : résolution des noms, typage, imports/variables inutilisés, formatage `gofmt` (le skill interdit de compter sur `gofmt` pour corriger une syntaxe invalide).

**Pourquoi.** Séparer « quoi émettre » (transformers) de « comment l'écrire » (printer) ; l'exhaustivité typée évite les nœuds silencieusement non rendus.

---

## 20. Printer — précédences, parenthèses et particularités de rendu

**Fait [VÉRIFIÉ].**
- Précédences binaires (`getBinaryPrecedence`) : `||`=1, `&&`=2, comparaisons=3, `+ - | ^`=4, `* / % << >> & &^`=5. `getExpressionPrecedence` : unaire/adresse/déréférencement/réception **ou texte commençant par `-`/`+`** = 6, sinon 7.
- `printBinaryExpression` : gauche rendue avec minimum = précédence, droite avec précédence+1 (associativité gauche) ; `renderOperand` parenthèse si précédence < minimum.
- Parenthèses systématiques : unaire `-(x)`, `!(x)` ; adresse `&(x)` ; déréférencement `*(x)` ; réception `<-(ch)` ; conversion `(T)(x)` ; **tout littéral composite** `(T{...})` (évite l'ambiguïté `if x == T{}`) ; expression de méthode `(T).M` ; type canal `chan (T)`.
- `renderSelectorTarget` : littéral numérique parenthésé (`(1).M`).
- `printCallExpression` : `callee(typeArgument?, args…, variadic...)` — `typeArgument` est le **premier argument** (pour `make([]T, n)`, `new(T)`), pas une instanciation générique ; pour `f[T](x)` il faut un callee `InstantiationExpression`.
- `renderTypeParameters` : `[T any,]` avec virgule finale (distingue `[T *C,]` d'une longueur de tableau).
- `renderReturnTypes` : toujours entre parenthèses ` (T)` ; vide si aucun.
- Tags de struct : `escapeQuotedValue(tag)` → chaîne interprétée `"json:\"x\""`.
- Chaînes : `escapeQuotedValue` échappe `\`, le guillemet, les contrôles `\x00-\x1f`, `\x7f-\x9f`, `U+2028`, `U+2029`, `U+FEFF` en `\uXXXX` ; le reste (accents) est émis tel quel en UTF-8. Mode `bytes` : chaque caractère → `\xHH`.
- `FloatLiteral.value` et `ImaginaryLiteral.value` émis tels quels ; `IntegerLiteral` via `bigint`.
- `for` : `for init; cond; post {` si init ou post, sinon `for cond {` / `for {`.
- `if` : `if init; cond { … } else …`.
- Type switch : `switch init; id := expr.(type) {`.
- Struct/blocs vides : `struct {}`, `{}`.
- `LabeledStatement` : `Label: stmt` sur la même ligne.

Variantes `WithDefault` / `WithoutDefault` (switch d'expression, switch de type, select) : deux nœuds, deux renderers ; `WithDefault` concatène `casesBeforeDefault`, `defaultCase`, `casesAfterDefault`. *Pourquoi* : rendre « deux default » irreprésentable tout en conservant la position (utile avec `fallthrough`).

**Cas à anticiper.** Chaîne TS contenant un surrogate isolé → UTF-8 invalide non géré [HYPOTHÈSE]. `FloatLiteral` avec la valeur JS `Infinity`/`NaN` → identifiants invalides en Go (utiliser `math.Inf(1)`, `math.NaN()`). Littéral négatif : passer par `UnaryExpression` ou un `FloatLiteral` `"-1"` (géré par le test `startsWith("-")`).

---

## 21. Transpileur — contrat `Transformer` et dispatch

**Fait [VÉRIFIÉ]** (`src/transpiler/createTransformer.ts`).

```ts
interface Transformer<R extends GoAST.Node> {
  transformer(data: TsAST.Node, context: BuildContext): MaybePromise<
    | TransformationSuccess<R>      // Right "transformation-success" { result, before }
    | TransformationError           // Left  "transformation-error"   { kind, parentKind, text, getNode(), content, filePath, projectWorkDirectory }
    | NotfoundTransformer           // Left  "notfound-transformer"   { kind, parentKind, text, getNode(), filePath, projectWorkDirectory }
    | TransformationNotSupported    // Left  "transformation-not-supported" (undefined)
  >;
}
```

Sémantique :
- `context.success({ result, before? })` : terminé. `before` vaut `[]` par défaut.
- `context.notSupport()` : « pas pour moi », le dispatch passe au candidat suivant.
- `context.error(node, content?)` : erreur **terminale** ; aucun autre candidat n'est essayé.
- `notfound-transformer` : produit par `transform()` quand **tous** les candidats ont refusé ; un transformer qui le reçoit d'un enfant doit le **propager tel quel** (ne pas le convertir en `notSupport`).

`transform(data, transformers, context)` = `context.transform(node, liste)` : réduction asynchrone séquentielle sur la liste ; retourne `Success | Error | Notfound` (jamais `NotSupported`). Le type du résultat est l'union des `R` de la liste (`TransformerResultNode`).

Idiome d'appel d'un enfant [VÉRIFIÉ, partout dans le code] :

```ts
const child = await DCommon.asyncPipe(
  context.transform(node.x, expressionTransformers.value),
  DEither.unwrapRight,
);
if (DEither.isLeft(child)) { return child; }   // propage error / notfound
// child.result, child.before
```

**Pourquoi.** Chaîne de responsabilité ouverte : ajouter un cas = ajouter un transformer dans une liste, sans toucher aux autres. Le `Left` explicite « non trouvé » donne un diagnostic précis (kind + texte + fichier) du premier nœud non couvert — c'est l'outil principal pour avancer exercice par exercice.

**Conséquence.** Le dispatch ne restaure rien : compteur d'identifiants, `file.imports`, `file.declarations`, `file.dependencyFiles`, `sharedDependencies` restent modifiés si un candidat a muté puis refusé.

---

## 22. Transpileur — le mécanisme `before` (instructions préparatoires)

**Fait [VÉRIFIÉ].** `TransformationSuccessPayload { result: GoNode; before: readonly GoAST.Statement[] }`. `before` = instructions Go à exécuter **avant** l'évaluation de `result`, dans le même contexte d'exécution.

Usages actuels :
- `binary.ts` : `before = [...left.before, G_a := left, ...right.before, G_b := right]`, `result = G_a op G_b`.
- `shared/call.ts` : `before = [...callee.before, G_f := callee, puis pour chaque argument : ...arg.before, G_i := arg]`, `result = G_f(G_1, …)`.
- `return.ts` : transmet `expression.before`.
- `block.ts` : pour chaque instruction, insère `before` puis `result` dans le bloc.
- `transformSourceFile` : au top-level, `before` va dans `init()`.
- `function.ts` : **refuse** un `before` non vide sur un type de paramètre (`"un-support-before-on-parameter"`), sur le type de retour, sur le corps.

**Pourquoi.** (1) Beaucoup d'expressions TS n'ont pas d'équivalent *expression* en Go (ternaire, `??`, `?.`, `&&`/`||` à valeur, affectation-expression, `i++`, littéral objet avec spread, déstructuration, `await`) : elles deviennent des instructions + une variable résultat. (2) Go ne spécifie l'ordre d'évaluation que pour les appels, méthodes et opérations de canal ; JS évalue strictement de gauche à droite. Stocker chaque opérande dans un temporaire rend l'ordre explicite (README `projects/00`). (3) Si l'argument n° 2 a des `before`, l'argument n° 1 doit déjà avoir été évalué : d'où la capture **systématique** dans un temporaire avant de passer au suivant.

**Conséquence.** Le Go produit est une forme « à trois adresses » très verbeuse (un temporaire par sous-expression). Tout parent d'expression doit choisir : consommer les `before` (s'il est une instruction/un bloc) ou les remonter dans l'ordre.

**Cas à anticiper (contextes où remonter `before` est faux).**
- Évaluation conditionnelle : `a && b`, `a || b`, `a ?? b`, `c ? x : y`, `a?.b` → les `before` de la branche droite doivent être **dans** un `if`, pas avant.
- Répétition : condition/incrément de `for`/`while` → à réévaluer à chaque tour (`for { before…; if !(cond) { break }; … }`).
- Portée différée : corps de fonction fléchée → les `before` restent dans le `FunctionLiteral`.
- `case` de `switch`, clauses `else if` : les `before` de la 2ᵉ condition ne doivent s'exécuter que si la 1ʳᵉ est fausse (→ `else { before; if … }`).
- Temporaire inutilisé → erreur Go `declared and not used` (ex. appel dont le résultat est capturé puis ignoré).

---

## 23. Transpileur — les trois contextes et leurs outils

**Fait [VÉRIFIÉ].**

`TranspilationContext` (`context/transpilation.ts`, un par build) :
- `typeChecker` : `Checker` de `typescript/async` (toutes les méthodes sont `await`ées : `getSymbolAtLocation`, `getAliasedSymbol`, `isUnknownSymbol`, `getTypeFromTypeNode`, `getShorthandAssignmentValueSymbol`, `resolveName`, `getMemberInModuleExports`, `getSignatureFromDeclaration`, `getReturnTypeOfSignature`, `typeToTypeNode`).
- `projectWorkDirectory` : répertoire du `tsconfig` (canonique).
- `sharedDependencies: Set<SharedDependency>`.
- `increment()` : compteur global.

`FileContext` (`context/file.ts`, un par source) : `sourceFile`, `currentFilePath` (absolu), `dependencyFiles: Set<chemin absolu>`, `declarations: Set<GoAST.Declaration>`, `imports: Set<GoAST.ImportDeclaration>`.

`BuildContext` (`context/build.ts`, façade passée aux transformers) :
- `transpilation`, `file`.
- `transform(node, liste)`, `success(payload)`, `notSupport()`, `error(node, content?)`.
- `generateIdentifier()` → `Identifier("Generated_<n>")`, n global croissant. Réutiliser **l'objet** retourné pour la déclaration et les usages.
- `createSourceIdentifier(value)` → `"Sourced_" + value` où chaque caractère hors `[a-zA-Z0-9_]` est remplacé par son code en base 36 sur 4 chiffres (`/` → `001b`, `.` → `001a`, `-` → `0019`, espace → `000w`). À utiliser pour **tout** nom venant de TS (fonctions, paramètres, variables) et pour les noms de package (chemin absolu du fichier), à la déclaration et à chaque référence.
- `registerSharedDependency(dep)` → ajoute `dep` au `Set` global, ajoute l'import `duplojs.local/transpiled/shard_dependencies` au fichier courant, retourne l'identifiant de package `shard_dependencies`.
- `resolveDependencyFile(reference | Symbol)` → `Maybe<DependencyFile{ node, symbol, filePath }>` : `some` seulement si le symbole (alias résolu) a une `valueDeclaration` dans un **autre** fichier, hors `node_modules`, sous `projectWorkDirectory`. Pur (aucune mutation).
- `registerDependencyFile(dependencyFile)` → ajoute `filePath` à `file.dependencyFiles` (le build le transformera et le fichier courant l'importera) et retourne l'identifiant de package `createSourceIdentifier(filePath)`.
- `resolveReferenceModule(reference, moduleName, entryPattern?)` → `Maybe<ResolvedModuleReference{ node, symbol, packageName, entry, exportName }>` : `some` si la déclaration du symbole est dans `…/node_modules/<moduleName>/<entry>` et `entry` matche `entryPattern` (ex. `"@duplojs/lang"`, `/^dist\/either\//`). Pur.

`resolveReferenceTarget` (`resolvedReference.ts`), références acceptées : `Identifier | QualifiedName | PropertyAccessExpression | ElementAccessExpression` (+ `ImportTypeNode` et `Symbol` pour les modules). Nœud réel (`pos >= 0`) : `getSymbolAtLocation` (cas particuliers : propriété raccourcie `{ x }`, accès `obj["x"]`, `import("…").X`). Nœud synthétisé (`pos < 0`) : `resolveName(text, SymbolFlags.Type, sourceFile)` pour un identifiant ; namespace + `getMemberInModuleExports` pour `NS.X` ; recherche du spécificateur dans `sourceFile.imports` pour `import("mod").X`. Puis résolution d'alias et rejet des symboles inconnus.

**Pourquoi.** Séparation résoudre (pur) / enregistrer (mutation), depuis `5d54f21` : permet de tester l'éligibilité sans polluer le contexte. Identification des API par **symbole résolu**, jamais par texte : `import { success as ok }` ou `import * as E` doivent fonctionner.

**Limites [VÉRIFIÉ].** `resolveDependencyFile` exige `valueDeclaration` → un type/interface importé d'un autre fichier du projet n'est **pas** vu comme dépendance. Pour un `ImportTypeNode` synthétisé, la résolution exige que le fichier courant importe déjà ce module (`sourceFile.imports`) — un type inféré provenant d'un module non importé directement (ex. type de retour d'une fonction d'un autre fichier) ne se résout pas. Pour un identifiant synthétisé, `resolveName` ne cherche que `SymbolFlags.Type`.

---

## 24. Transpileur — build, parcours des fichiers et packages générés

**Fait [VÉRIFIÉ]** (`bin/index.ts`, `build.ts`, `transformSourceFile.ts`, `createFile.ts`, `sourcePackage.ts`, `createTypescriptInstance.ts`).

1. CLI : résout `tsconfig`, `input`, `output` ; **supprime récursivement `output`** ; `createTypescriptInstance` ouvre le projet (`new API({ cwd: dossier du tsconfig })`, `createSnapshot`, `getConfiguredProject`) ; `projectWorkDirectory = api.getCurrentDirectory()` canonique.
2. `build(typescriptInstance, input)` : générateur asynchrone à accumulateur `{ pending: [input], built: Set }`. Pour chaque chemin : `program.getSourceFile(path)` → `transformSourceFile` → émet `Right("build-source-file", { content, outputPath })` → ajoute `result.context.file.dependencyFiles` à `pending`. Un fichier déjà `built` est sauté. Toute erreur (`Left`) arrête le build.
3. `transformSourceFile` : pour chaque statement top-level — `ImportDeclaration` TS **ignorée** ; sinon `context.transform(item, sourceFileTransformers.value)` (= déclarations puis instructions). Si le résultat a le groupe `declaration` → `declarations` ; sinon → `init`. Les `before` vont toujours dans `init`. Fichier final : `package = createSourceIdentifier(currentFilePath)`, `imports = [imports des fichiers dépendants…, …file.imports]`, `declarations = [déclarations traduites…, …file.declarations]`, plus `func init() { … }` si `init` non vide.
4. Layout (`createSourcePackageLayout`) : source `<rel>` (relatif à `projectWorkDirectory`) → fichier `<rel>/<basename>.go` (ex. `index.ts/index.ts.go`), import `duplojs.local/transpiled/<rel>`. Refus si le fichier est hors du projet.
5. Fin : `main.go` (`package main`, `import _ "duplojs.local/transpiled/<entrée>"`, `func main() {}`), `go.mod` (`module duplojs.local/transpiled` / `go 1.27.4`), et, **si au moins une shared dependency a été enregistrée**, `shard_dependencies/shard_dependencies.go` = concaténation des défauts (`JSNull`, `JSUndefined`) puis des dépendances enregistrées (imports, déclarations, `init`).
6. Le CLI écrit chaque fichier (`ensureDirectory` + `writeTextFile`), s'arrête au premier `Left`, ferme l'API, puis `unwrapRightOrThrow`.

**Pourquoi.** Parcours guidé par les **usages** (seuls les fichiers réellement référencés par un identifiant traduit sont transpilés), pas par les `import` TS. Le programme Go est « exécuté » par l'initialisation des packages : c'est la traduction directe de « charger un module ES exécute son top-level ».

**Conséquence.** Un `import "./x"` à effet de bord seul (sans identifiant utilisé) n'est jamais transpilé. Un import TS de type uniquement ne crée pas de dépendance Go. Les imports cycliques TS deviendraient un cycle de packages Go (erreur de compilation).

---

## 25. Transpileur — dépendances partagées (`JSNull`, `JSUndefined`, `EitherSuccess`)

**Fait [VÉRIFIÉ].** Contrat (`sharedDependency/base.ts`) : `SharedDependency { imports, declarations, init }`, créée par `createSharedDependency`, toujours enveloppée dans `DCommon.memo(() => …)` et enregistrée par `context.registerSharedDependency(dep.value)`.

Défauts (`sharedDependency/defaults/`) :
- `JSNull` : `type JSNull struct {}` + `func (_ JSNull) MarshalJSON() ([]byte, error)` retournant `[]byte("null"), nil`.
- `JSUndefined` : `type JSUndefined struct {}` + `MarshalJSON` (retourne aussi `"null"`) + `func (_ JSUndefined) IsZero() (bool) { return true }`.

`EitherSuccess` (`transformers/duplojs/either/success/sharedDependency.ts`) :
- `type EitherSuccess[T any,] = struct { Right JSNull; Information string; Value T; Success JSNull }` — **alias générique vers une struct anonyme**, tags JSON `@duplojs/lang/kind/@DuplojsLangEither/{right,information,value,success}`.
- `func EitherSuccessOf[T any,](value T) (EitherSuccess[T])` qui remplit `Right: JSNull{}`, `Information: "success"`, `Value: value`, `Success: JSNull{}`.

**Pourquoi [HYPOTHÈSE, déduit des tags et des méthodes].** La représentation Go mime la forme **JSON** de l'objet DuploJS (clés de « kind » `@duplojs/lang/kind/@DuplojsLangEither/right` valant `null`, `information: "success"`, `value`). Le critère « conserver le comportement » passe donc vraisemblablement par la sortie de `DCommon.print` / la sérialisation : `JSNull` se sérialise en `null` ; `JSUndefined.IsZero()` prépare l'option de tag `omitzero` pour **omettre** une clé `undefined` comme `JSON.stringify` (aucun tag `omitzero` n'est posé pour l'instant). L'alias vers struct anonyme donne un typage **structurel** (deux formes identiques sont le même type, comme en TS) mais interdit d'y attacher des méthodes.

**Pièges [VÉRIFIÉ].**
- Les défauts ne sont émis **que si** une autre dépendance est enregistrée (`context.sharedDependencies.size === 0` → pas de fichier partagé).
- Les défauts sont **concaténés sans déduplication** (`DGenerator.concat(defaults, context.sharedDependencies)`, le `new Set(...)` a été retiré en `a93ffe5`) : enregistrer `nullShardDependency.value` via `registerSharedDependency` déclarerait `JSNull` deux fois → erreur Go. Pour utiliser `JSNull` depuis un fichier source, il faut l'import du package partagé (obtenu en enregistrant une *autre* dépendance) puis `shard_dependencies.JSNull`.
- Un seul package pour toutes les dépendances : les noms de déclarations doivent être globalement uniques ; deux dépendances ne peuvent pas déclarer le même helper. Une dépendance qui en utilise une autre (ex. `EitherSuccess` utilise `JSNull`) la référence sans qualificatif et suppose qu'elle sera émise — aucun mécanisme de dépendance entre dépendances.
- Les `imports` d'une dépendance sont concaténés tels quels : deux dépendances important `fmt` avec deux objets distincts → import dupliqué → erreur Go.

**Cas à anticiper.** Dépendances à écrire : `EitherFail`, `EitherLeft[Info, V]`/`EitherRight`, prédicats (`isRight`, `isLeft`), `whenIsRight…`, `matchInformation`, `group`, `print` (import `fmt`/`encoding/json`/`os`), `ToString` pour `number` (import `strconv`/`math`), `coalescing`, helpers de promesse.

---

## 26. Transpileur — schéma routeur → handler des domaines DuploJS

**Fait [VÉRIFIÉ]** (`transformers/duplojs/`, skill `typescript-to-go`).

Organisation : `duplojs/index.ts` expose une liste memo par catégorie (`duploJSDeclarationTransformers`, `…ExpressionTransformers`, `…StatementTransformers` (vide), `…TypeTransformers`), placées **en tête** des listes génériques. Par domaine (`either/index.ts`) : un **routeur** par catégorie ; par opération (`either/success/`) : `index.ts` (handlers) + `sharedDependency.ts`.

Routeur d'expression `duploJSEitherExpressionTransformer` :
1. `reference = isCallExpression(node) ? node.expression : node` ; refuse si ce n'est ni `Identifier` ni `PropertyAccessExpression`.
2. `context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/either\//)` ; `none` → `notSupport`.
3. `DPattern.match(symbol.name)` : `"success"` → `successExpressionHandler(node, context)` ; **sinon `context.error(node)`** (toute autre fonction Either est une erreur terminale tant qu'elle n'a pas de branche).

Routeur de type `duploJSEitherTypeTransformer` : accepte `TypeReferenceNode` (référence = `typeName`) ou `ImportTypeNode` ; même résolution ; `"Success"` → `successTypeHandler` ; **sinon `notSupport`** (asymétrie avec l'expression).

Handlers :
- `successExpressionHandler` : si le nœud est un appel → `context.transform(node, [callExpressionTransformer])` (le transformer d'appel générique re-transforme le callee, qui repasse par le routeur sous forme de référence nue) ; si c'est la référence nue → `registerSharedDependency(eitherSuccessDependency.value)` puis `shard_dependencies.EitherSuccessOf` (`SelectorExpression`).
- `successTypeHandler` : transforme le 1ᵉʳ argument de type, enregistre la dépendance, retourne `shard_dependencies.EitherSuccess[<arg>]` (`GenericTypeReference` sur `PackageTypeReference`).

Règles du skill et leur raison :
- Le routeur est le **seul** point d'entrée des handlers ; il établit la preuve d'appartenance (module + chemin d'entrée + export). *Raison* : ne jamais reconnaître une API par son texte (alias, renommage, homonymes).
- Un handler n'est pas inscrit dans les listes génériques et ne re-route pas. *Raison* : conserver le typage acquis, rendre le mappage symbole → handler explicite, éviter les boucles.
- Hors domaine → `notSupport` **avant** toute mutation.
- Un transformer = une opération/forme précise ; pas de transformer universel ni de dossier `helpers/` (un `helpers/typescriptExpression.ts` a existé puis été supprimé en `5d54f21`).
- Ne pas revalider ce que TypeScript a déjà validé ; le checker sert à **choisir** une représentation Go.
- Spécialiser par opération, pas par les valeurs/noms d'un exemple.

**Cas à anticiper.** Ajouter une fonction Either = une branche `DPattern.match` dans le(s) routeur(s) + un dossier d'opération. Ajouter un domaine (`DCommon`, `DArray`, `DString`) = un dossier, ses routeurs (motifs d'entrée probables `/^dist\/common\//`, `/^dist\/array\//`, `/^dist\/string\//` [HYPOTHÈSE : à confirmer dans `node_modules/@duplojs/lang/dist`]), et leur inscription dans `duplojs/index.ts`.

---

## 27. Transpileur — transformers existants (état à `915b78a`)

**Fait [VÉRIFIÉ].**

| Liste | Ordre des candidats |
|---|---|
| `declarationTransformers` | Either (stub `notSupport`), `functionDeclarationTransformer` |
| `statementTransformers` | `callExpressionTransformer`, `blockStatementTransformer`, `returnStatementTransformer` |
| `expressionTransformers` | routeur Either, `callExpressionTransformer`, `identifierTransformer`, `numericLiteralTransformer`, `binaryExpressionTransformer` |
| `typeTransformers` | routeur de type Either, `float64TypeTransformer` |
| `sourceFileTransformers` | déclarations puis instructions |

- `identifierTransformer` (`common/identifier.ts`) : `Identifier` → `Sourced_<nom>`, ou `PaquetDuFichier.Sourced_<nom>` si le symbole est déclaré dans un autre fichier du projet (+ `registerDependencyFile`).
- `numericLiteralTransformer` : `NumericLiteral` → `(float64)(<texte>)` (conversion explicite : sans elle `x := 1` serait un `int`).
- `binaryExpressionTransformer` : opérateurs `+ - * / % & | ^ << >> && || === !== < <= > >=` → même opérateur Go (`===` → `==`, `!==` → `!=`), opérandes dans des temporaires.
- `callExpressionTransformer` (`shared/call.ts`) : appel (ou instruction-appel) → temporaires pour le callee et chaque argument.
- `blockStatementTransformer`, `returnStatementTransformer` (refuse `return;` sans expression).
- `functionDeclarationTransformer` : exige nom + corps ; paramètres à nom identifiant (sinon `error "params-name-is-not-identifier"`) ; type de paramètre absent → `any` → non géré ; type de retour = annotation, sinon `typeToTypeNode(getReturnTypeOfSignature(…))` ; **toujours exactement un** type de retour ; `generic: []`.
- `float64TypeTransformer` : mot-clé `number` → `float64`.

**Défauts relevés [VÉRIFIÉ].**
- `&&` / `||` : les deux opérandes sont évalués dans des temporaires → **court-circuit perdu** (faux dès que l'opérande droit a un effet ou dépend d'une garde).
- `%`, `&`, `|`, `^`, `<<`, `>>` sur `float64` : erreur de compilation Go (il faut `math.Mod`, ou conversion `int32` façon JS).
- `===` / `!==` : `==` Go est interdit sur slices/maps/fonctions et compare les structs par valeur (JS : identité).
- `+` : aucune distinction addition / concaténation / mixte.
- `functionDeclarationTransformer` ignore silencieusement les modificateurs (`async`, `export`, `declare`), `asteriskToken`, `typeParameters`, `questionToken`, `dotDotDotToken`, `initializer` — la version `a2e59ac` refusait explicitement ces cas, la réécriture `a4891a1` a retiré ces gardes. Un paramètre optionnel ou à valeur par défaut serait émis comme obligatoire.
- `block.ts` et `call.ts` transforment les enfants **en parallèle** (`DArray.map(async …)` + `DCommon.promiseAll`) : voir §32.

---

## 28. Skills, AGENTS.md, lint : règles imposées et raisons

**Fait [VÉRIFIÉ].**

`AGENTS.md` (généré par `@duplojs/agents-kit`) : avant d'écrire un utilitaire ou d'utiliser une API native, chercher l'équivalent DuploJS dans le routeur API (`node_modules/.pnpm/@duplojs+agents-kit…/docs/API.llms.md`) ; consulter le routeur des concepts pour typage/composition/erreurs ; appliquer les contrats `Either` ; ne pas inventer d'API ni contourner le typage ; utiliser les skills DuploJS installés (`duplojs-fundamental`, `duplojs-modeling`, `duplojs-command`, `duplojs-server`, liens symboliques vers `node_modules`). *Raison* : le projet est une vitrine DuploJS ; le code du transpileur lui-même est écrit en style DuploJS (`DCommon.pipe`, `DArray.*`, `DEither.*`, `DGenerator.*`, `DPattern.match`, pas de boucles ni de mutations hors contextes).

`oxlint.config.ts` : `extends: [engineConfig]` de `@duplojs/code-config/oxlint`, override `ruleset: { open: true }` sur `src/**`, `projects/**`, `bin/**`. Indentation par tabulations (`.vscode/settings.json`).

Skill `go-ast` (résumé des règles) : unions discriminées exhaustives ; une interface + une factory `create<Nom>` par nœud ; pas de classes ; composer avec les groupes existants (`Type`, `TypeReference`) et n'énumérer localement que les exceptions ; ne pas modéliser le sucre syntaxique ; préserver les distinctions sémantiques ; validité **locale** seulement ; signaler une lacune par un commentaire français au-dessus de l'emplacement ; pas de tests, pas de README d'AST ; valider par `pnpm test:types` + `pnpm test:lint` ; jamais `any`. *Raison* : AST minimal, états invalides irreprésentables quand c'est décidable localement, le reste est laissé au compilateur Go.

Skill `go-printer` : un seul dispatch exhaustif sur `Node` ; un renderer par nœud via `createNodePrinter` ; enfants rendus via le contexte ; pas de fallback/cast/`any` ; helpers au plus près ; contexte immuable (profondeur) ; parenthésage selon précédence ; ne pas déléguer à `gofmt` ; pas de tests. *Raison* : qu'un nœud ajouté sans renderer soit une erreur de compilation TS, pas un trou silencieux.

Skill `typescript-to-go` : voir §21–§26, plus : contrat explicite sur chaque constante de transformer ; listes memo consommées par `.value` ; `shared/` pour les transformers multi-catégories ; propager `error`/`notfound` ; éligibilité avant mutation ; préserver ordre/portée/conditions/répétition des `before` ; `context.file.declarations.add` / `imports.add` pour le niveau package ; `createSourceIdentifier` pour les noms TS, `generateIdentifier` pour les temporaires ; réutiliser l'instance memo des dépendances ; vérifier les déclarations locales de `typescript/ast` et `typescript/async` plutôt que de supposer l'API d'une autre version ; « si un contrat ou un outil manque, décrire le besoin avant d'étendre une couche partagée ».

---

## 29. Exercice 00 — Go déduit du code (non exécuté)

**Entrées [VÉRIFIÉ].** `projects/00/add.ts` : `export function add(one: number, two: number) { return DEither.success(one + two); }`. `projects/00/index.ts` : `import { add } from "./add"; add(1, 2);`.

**Sortie déduite [HYPOTHÈSE — dérivée pas à pas du code, build non lancé].** `<P>` = `createSourceIdentifier` du chemin absolu canonique, ex. `/home/u/h/projects/00/index.ts` → `Sourced_001bhome001bu001bh001bprojects001b00001bindex001ats`.

`index.ts/index.ts.go` :

```go
package Sourced_<…>index001ats

import "duplojs.local/transpiled/add.ts"

func init() {
	Generated_1 := Sourced_<…>add001ats.Sourced_add
	Generated_2 := (float64)(1)
	Generated_3 := (float64)(2)
	Generated_1(Generated_2, Generated_3)
}
```

`add.ts/add.ts.go` :

```go
package Sourced_<…>add001ats

import "duplojs.local/transpiled/shard_dependencies"

func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.EitherSuccess[float64]) {
	Generated_4 := shard_dependencies.EitherSuccessOf
	Generated_5 := Sourced_one
	Generated_6 := Sourced_two
	Generated_7 := Generated_5 + Generated_6
	return Generated_4(Generated_7)
}
```

`shard_dependencies/shard_dependencies.go` : `package shard_dependencies`, `type JSNull struct {}` + `MarshalJSON`, `type JSUndefined struct {}` + `MarshalJSON` + `IsZero`, `type EitherSuccess[T any,] = struct { … 4 champs taggés … }`, `func EitherSuccessOf[T any,](value T) (EitherSuccess[T]) { return (EitherSuccess[T]{ Right: (JSNull{}), Information: "success", Value: value, Success: (JSNull{}), }) }`.

`main.go` : `package main` / `import _ "duplojs.local/transpiled/index.ts"` / `func main() {}`. `go.mod` : `module duplojs.local/transpiled` / `go 1.27.4`.

**Écart avec le README de l'exercice [VÉRIFIÉ dans le code, effet HYPOTHÈSE].** Le README `projects/00` montre `success := shard_dependencies.EitherSuccessOf[float64]` (fonction générique **instanciée**). Le code (`successExpressionHandler`) produit un simple `SelectorExpression` **sans** `InstantiationExpression`. Or `x := pkg.FonctionGénérique` sans instanciation est refusé par Go (« cannot use generic function … without instantiation ») : la solution fournie ne compilerait donc pas telle quelle. À vérifier en premier avec la toolchain ; le correctif attendu est d'envelopper le sélecteur dans `GoAST.createInstantiationExpression({ target, typeArguments: [float64] })`, le type venant du checker (signature résolue de l'appel).

**Autres points à vérifier à l'exécution.** Le nom de package dépend du **chemin absolu de la machine** (sortie non reproductible d'un poste à l'autre, noms très longs). `struct {}` et les parenthèses autour des types de retour sont valides mais non `gofmt`. L'alias générique exige Go ≥ 1.24.

---

## 30. Exercices 01 à 10 — constructions à traduire et manques

Acquis commun (exercice 00) [VÉRIFIÉ] : `number` → `float64`, littéral numérique positif, `+ - * /` et comparaisons sur nombres, déclaration de fonction top-level à paramètres simples, appel, identifiant local ou d'un autre fichier, `return expr`, bloc, `DEither.success(x)` + type `DEither.Success<T>`.

Manques transverses dès l'exercice 01 [VÉRIFIÉ] : aucun transformer pour `VariableStatement` (`const`), `IfStatement`, opérateur unaire préfixe (`-1`), littéraux chaîne/tableau/objet, fonction fléchée, expression conditionnelle, `await`, types union/tuple/tableau/fonction/littéral/`Promise` ; aucun domaine `DCommon`, `DArray`, `DString` ; dans Either seul `success` existe.

| Ex. | Constructions TypeScript nouvelles | API DuploJS nouvelles | Manques principaux |
|---|---|---|---|
| 01 | Retour annoté `(\| DEither.Success<number> \| DEither.Fail)` (type parenthésé + union) ; `const result = add(1, 2)` top-level ; `if (cond) { … }` top-level ; imports `* as` | Type `DEither.Fail` ; `DEither.isRight` (garde de type, rétrécit `result`) ; `DCommon.print` | Représentation Go d'une union ; conversion valeur → union au `return` ; transformer `const`, `if` ; narrowing ; dépendance `print` |
| 02 | Fonction passée en argument (référence nue `DArray.coalescing`) ; `const newResult` de type union mixte | `DEither.whenIsRight(either, fn)` (forme donnée-en-premier) ; `DArray.coalescing` | Fonction générique comme valeur (instanciation) ; union « Either ou tableau » |
| 03 | Appel curryfié : `DEither.whenIsRight(fn)` retourne une fonction | `DCommon.pipe(value, ...fns)` | Surcharge donnée-en-dernier ; pipe variadique hétérogène |
| 04 | Retour **inféré** union ; `if` avec `return` anticipé dans une fonction ; `one === -1` (unaire) ; `add(-1, 2)` | `DEither.fail()` | Type de retour union synthétisé ; plusieurs chemins de retour ; unaire |
| 05 | Fonction fléchée sans paramètre `() => [-12]` ; littéral tableau ; nombre négatif | `DEither.whenIsRightOtherwise(fnRight, fnOtherwise)` (curryfié) ; `DArray.map(fn)` (curryfié) ; `DString.to` | `FunctionLiteral` ; slice ; conversion nombre → chaîne fidèle à JS |
| 06 | Ternaire `one < 0 ? one : two` ; `\|\|` ; littéraux chaîne (dont accents) ; littéral objet à clés chaîne/identifiant et valeurs fonctions ; flèche à paramètre typé par contexte | `DEither.left("negative-operand", value)` ; `DEither.matchInformation(either, { info: fn, … })` | Ternaire → `if` + temporaire ; `Left<Info, V>` ; dispatch sur `Information` ; type du paramètre via le checker |
| 07 | 2ᵉ fichier `divide.ts` ; `/` ; flèche appelant une fonction du projet ; valeur de propriété = référence de fonction (`success: DString.to`) | `DEither.rightPipe(either, ...fns)` (enchaînement court-circuité) | Union à 3 variantes ; propagation du `Left` |
| 08 | `const inputs: [number, number, number][] = [[…], …]` (tuple, tableau, littéraux imbriqués) ; **déstructuration de paramètre** `([one, two, divisor]) => …` ; fermeture capturant `divisor` | `DArray.map(array, fn)` (donnée-en-premier) ; `DArray.map(DEither.whenIsRightOtherwise(…))` | Type tuple (`[3]float64` ou struct) ; pattern de liaison ; slice d'unions |
| 09 | Flèche `(values) => DArray.map(values, DString.to)` | `DEither.group(eithers)` ; `whenIsRightOtherwise(either, fnRight, fnOtherwise)` | Agrégation « tout réussi ou premier échec » [HYPOTHÈSE sur la sémantique exacte de `group`] |
| 10 | `async function` (déclarée dans `index.ts`) ; `Promise` ; `await` top-level dans un argument ; tableau de thunks `() => calculate(…)` ; `value * 2` | `DEither.rightAsyncPipe` ; `DEither.asyncGroup` ; `DCommon.asyncPipe` | Modèle d'asynchronisme Go ; ordre d'exécution |

**Nœuds AST manquants pour ces exercices [VÉRIFIÉ].** Aucun bloquant : struct, interface, méthode, type switch, assertion, closure, slice, tableau, map, goroutine, canal existent. Gênant : déclaration courte multiple (§18). **Dépendances partagées manquantes** : toutes sauf `EitherSuccess`.

**Remarque [VÉRIFIÉ].** `add.ts` est identique dans 01–03 (retour annoté), puis 04–05 (`fail()`), puis 06–10 (`left` + ternaire) ; `divide.ts` identique dans 07–10. Les exercices sont cumulatifs : chaque `index.ts` reprend le précédent et ajoute une construction.

---

## 31. Lecture critique — effets de bord non annulés, imports et identité d'objet

**Fait [VÉRIFIÉ].**
- `registerSharedDependency` ajoute l'import du package partagé au fichier **même si** le nœud produit est ensuite abandonné → risque `imported and not used` (erreur Go).
- `file.imports` est un `Set` d'objets : deux `createImportDeclaration({ path: "fmt" })` distincts = deux lignes `import "fmt"` = erreur Go. Idem dans l'agrégat des dépendances partagées.
- `file.declarations` : même logique d'identité ; un type généré deux fois sous le même nom = redéclaration.
- `generateIdentifier()` consomme un numéro même si le candidat refuse ensuite.

**Conséquence.** Discipline à tenir : (1) gardes pures d'abord, mutations ensuite ; (2) imports et dépendances en singletons memo ; (3) noms de déclarations générées dérivés de façon déterministe + registre par nom à ajouter si on génère des types.

---

## 32. Lecture critique — transformation parallèle (`promiseAll`) et identifiants générés

**Fait [VÉRIFIÉ].** `block.ts` (instructions d'un bloc) et `call.ts` (arguments) lancent toutes les transformations enfants en même temps puis `promiseAll`. `function.ts` fait de même pour les paramètres.

**Analyse.** L'ordre des instructions émises est préservé (la réduction qui assemble `before`/`result` est ordonnée). Mais les effets de bord sont entrelacés selon les `await` du checker : numéros `Generated_N` attribués dans un ordre dépendant du timing → **sortie non déterministe d'une exécution à l'autre** [HYPOTHÈSE : dépend de l'ordonnancement des réponses de l'API TS asynchrone], ordre d'insertion dans `file.imports`/`file.declarations` variable.

**Conséquence.** Les identifiants restent uniques, donc le programme reste correct ; mais (1) pas de comparaison de sortie stable (snapshots), (2) tout futur état « de portée » (ex. table des variables déclarées dans le bloc, narrowing courant, type de retour attendu) serait corrompu par ce parallélisme. `transformSourceFile` et `transform` sont, eux, séquentiels.

**Cas à anticiper.** Si l'on introduit un contexte de portée, repasser `block.ts` en réduction séquentielle. Autres propriétés des identifiants : `Generated_N` et `Sourced_x` commencent par une majuscule → tout est **exporté** en Go (pas d'encapsulation, sans conséquence ici) ; l'encodage base 36 n'est pas strictement injectif (`a.b` → `a001ab`, collision théorique avec un identifiant `a001ab`) ; le nom de package issu du chemin absolu rend la sortie dépendante de la machine.

---

## 33. Lecture critique — top-level, `init()` et variables de module

**Fait [VÉRIFIÉ].** Au top-level : résultat du groupe `declaration` → déclaration de package ; sinon → `init()` ; `before` → toujours `init()`.

**Problème.** `const result = add(1, 2)` (exercices 01–10) :
- Si le transformer retourne `VariableDeclarationInitialized` (groupe `declaration`) → `var Sourced_result = Generated_1(Generated_2, Generated_3)` au niveau package, alors que `Generated_1..3` sont des locales de `init()` → **ne compile pas** (et les initialisations de package s'exécutent avant `init`).
- Si le transformer retourne `ShortVariableDeclarationStatement` → la variable est locale à `init()` : correcte pour 01–10 (tout le top-level est dans le même `init`), mais **invisible** des fonctions du même fichier et des autres packages (un `export const` ne peut pas être importé).
- Forme générale correcte : `var Sourced_result T` au niveau package (via `context.file.declarations`, type obtenu du checker) + `Sourced_result = …` dans `init()`.
- Toute locale Go non lue est une erreur (`declared and not used`) : un `const` TS jamais utilisé, ou un temporaire `Generated_N` capturant un résultat ignoré, casse la compilation → émettre `_ = x` ou ne pas capturer.

**Cas à anticiper.** `export const`, `let` top-level modifiée par une fonction, fonctions qui référencent une constante de module déclarée plus bas (hoisting/TDZ), `await` top-level (exercice 10) dans `init()`.

---

## 34. Lecture critique — ordre d'initialisation Go entre packages vs modules ES

**Fait.** Chaque module TS devient un package dont le top-level est `init()` ; `main` importe l'entrée en import blanc [VÉRIFIÉ]. Go initialise un package après ses dépendances ; entre packages indépendants, l'ordre suit le tri des chemins d'import (Go ≥ 1.21) [connaissance Go, non vérifiée ici]. ES évalue les dépendances en profondeur d'abord, **dans l'ordre des `import`**.

**Conséquence.** Pour `index.ts` → `add.ts`, `divide.ts`, les deux ordres coïncident tant que les modules dépendances n'ont pas d'effets de bord top-level (c'est le cas : ils ne déclarent que des fonctions). Divergences possibles : deux modules à effets (`print`) importés dans un ordre non alphabétique ; module importé seulement pour ses effets (jamais transpilé, §24) ; cycles d'import (interdits en Go) ; module importé uniquement par type.

**Cas à anticiper.** Si un jour l'ordre compte : générer une fonction `Init()` explicite par package, appelée depuis `main()` dans l'ordre ES, au lieu de `init()` implicite.

---

## 35. Lecture critique — unions, narrowing, génériques, fermetures, asynchronisme

**Retour d'union (ex. 01, 04+) [VÉRIFIÉ pour l'existant, HYPOTHÈSE pour les options].** `function.ts` émet exactement un type de retour et le `return` ne convertit rien. `EitherSuccess[T]` est un alias de struct anonyme, sans méthode. Options : (a) interface scellée (méthode marqueur) + structs **définies** (il faut alors `createTypeDefinition` au lieu de `createTypeAlias`) et type switch ; (b) `any`/interface vide + type switch sur les structs anonymes (compatible avec l'alias actuel, typage faible) ; (c) struct unique étiquetée (`Information string` + champs optionnels), sans allocation d'interface mais perte du typage par variante. Le choix conditionne `isRight`, `whenIsRight`, `matchInformation`, `group` et la sérialisation ; à trancher **avant** l'exercice 01.

**Narrowing.** `if (DEither.isRight(result)) { print(result) }` : en TS `result` change de type dans le bloc ; en Go il faut une nouvelle liaison (`switch v := result.(type)` ou assertion). Aucun mécanisme de substitution d'identifiant par portée n'existe ; `identifierTransformer` émet toujours `Sourced_result`.

**Types littéraux.** `Left<"negative-operand", number>` : pas de type littéral en Go → `Information` devient une `string` à l'exécution ; l'exhaustivité de `matchInformation` n'est plus vérifiée par le compilateur.

**Génériques et surcharges.** Les fonctions DuploJS sont génériques, surchargées (donnée-en-premier / curryfiée) et variadiques (`pipe`). Go : pas de surcharge, pas de variadique hétérogène, inférence limitée, une fonction générique ne peut pas être une valeur sans instanciation. Direction probable [HYPOTHÈSE] : **monomorphiser au site d'appel** avec les types résolus par le checker (`getResolvedSignature`) et choisir le handler selon le nombre d'arguments/la signature résolue, plutôt que porter la bibliothèque en Go générique. `pipe(x, f, g)` → suite de temporaires `t1 := f(x); t2 := g(t1)` (réutilise `before`).

**Fermetures.** `FunctionLiteral` existe mais aucun transformer ; les `before` du corps doivent rester dans le littéral ; le type des paramètres non annotés vient du typage contextuel (checker) ; la capture de variables est naturelle en Go. Le motif « callee dans un temporaire » échoue pour les builtins Go (`len`, `append`, `make` ne sont pas des valeurs) → les envelopper dans des fonctions partagées.

**Nombres.** `float64` partout : indices de slice (conversion `int`), `DString.to(number)` doit reproduire `String(n)` de JS (`3` et non `3.000000`, exposants, `NaN`, `Infinity`, `-0`), `%`, opérateurs binaires, division par zéro (`Infinity` en JS comme en Go flottant : OK).

**Asynchronisme (ex. 10).** Rien n'existe. L'AST permet goroutines + canaux + `select`. Traduction séquentielle (appel direct, `await` = no-op) : simple, mais ne reproduit pas l'entrelacement microtâches ; `asyncGroup` avec des thunks lancés « en parallèle » en JS reste observablement séquentiel tant qu'aucune E/S réelle n'intervient [HYPOTHÈSE]. À justifier dans le README de l'exercice.

---

## 36. Cas à anticiper — transformers de déclaration

Formes TypeScript qui arriveront tôt ou tard au top-level ou en local :
- `function` : `export`, `export default`, `async`, générateur `function*`, génériques `<T>`, paramètres optionnels `x?`, valeur par défaut `x = 1`, rest `...xs`, déstructurés `({ a, b })` / `([a, b])`, `this` typé, surcharges (signatures sans corps → `node.body` absent → déjà refusé), retour `void` / `never` / union / `Promise<T>` / tuple / garde de type `x is T` / `asserts x`, fonctions imbriquées (hoisting, récursion → `var f func(…)` puis affectation), fonctions récursives mutuelles.
- `const` / `let` / `var` : avec ou sans annotation, plusieurs déclarateurs `const a = 1, b = 2`, déstructuration objet/tableau avec défauts et rest, sans initialiseur (`let x: T;` → zéro-valeur ≠ `undefined`), `export const`, `as const`, `satisfies`, fonctions fléchées assignées (`const f = () => …`), top-level vs local (§33), variable jamais lue.
- `type` / `interface` : alias d'union, d'intersection, d'objet, de fonction, génériques, récursifs, `typeof x`, `keyof`, types conditionnels/mappés (à effacer ou refuser), types importés d'un autre fichier (non vus par `resolveDependencyFile`).
- `enum`, `const enum`, `namespace`, `declare …` (à ignorer), `class` (champs, méthodes, `static`, héritage, accesseurs, privés `#x`).
- `import` : nommé, renommé `as`, `* as`, défaut, `import type`, effet de bord seul, dynamique `import()` ; `export { a }`, `export * from`, `export default expr`, réexports.

---

## 37. Cas à anticiper — transformers d'instruction

- `if` / `else if` / `else` : condition non booléenne (truthiness JS de `number`, `string`, objet, `undefined`), condition avec `before`, gardes de type (`typeof`, `in`, `instanceof`, prédicats DuploJS `isRight`/`isLeft`), corps sans accolades.
- `return` : sans valeur, avec valeur à convertir vers le type de retour (union), dans une flèche à corps-expression, depuis une branche (chemins multiples, fonction se terminant sans `return` → Go exige un `return` terminal).
- Instruction-expression : appel (existe), affectation `a = b`, composée `a += b`, `i++` / `--i`, `await f()`, `x && f()`, `cond ? f() : g()`, `delete o.k`, `void f()`, expression pure.
- Boucles : `for (;;)`, `for…of` (tableau, chaîne, `Map`, `Set`, générateur), `for…in`, `while`, `do…while`, `break`/`continue` étiquetés, fermeture capturant la variable de boucle.
- `switch` : fallthrough implicite JS vs `fallthrough` explicite Go, `default` en milieu, `case` à expression non constante, `switch (true)`.
- `throw` / `try` / `catch` / `finally` (→ `panic`/`recover`/`defer` ou valeurs d'erreur), instructions étiquetées, bloc nu `{ … }` (existe), instruction vide `;`, `debugger`.
- Déclarations locales : `const`/`let` dans un bloc (ombre d'une variable externe, redéclaration interdite par `:=` dans la même portée), fonction locale, type local.

---

## 38. Cas à anticiper — transformers d'expression

- Littéraux : nombres (`1`, `1.5`, `1e3`, `0x10`, `1_000`, `-1` = unaire, `NaN`, `Infinity`), `bigint`, chaînes (`'…'`, `"…"`, échappements, Unicode), gabarits `` `a${b}` `` et étiquetés, `true`/`false`, `null`, `undefined`, regex, tableaux (vides — type d'élément via le checker —, imbriqués, à trous, avec spread), objets (clés identifiant/chaîne/calculée, raccourci `{ x }`, spread, méthodes, accesseurs, valeurs fonctions).
- Identifiants : local, paramètre, variable capturée, import d'un autre fichier (existe), import de bibliothèque, `undefined`, `globalThis`, `this`, `arguments`, identifiant rétréci (narrowing).
- Accès : `a.b` (champ de struct, propriété de tuple, `length`, méthode liée), `a[i]` (index flottant → `int`, hors bornes → `undefined` en JS / panique en Go), `a?.b`, `a?.[i]`, `f?.()`, `a!`.
- Opérateurs : unaires `- + ! ~ typeof void delete`, `++`/`--` préfixe/suffixe ; binaires arithmétiques (dont `%`, `**`), comparaison (`===` sur chaînes/booléens/objets/`null`), `==`, logiques à court-circuit **à valeur** (`a || b` retourne `a` ou `b`, pas un booléen), `??`, binaires bit à bit, `in`, `instanceof`, virgule ; affectations `= += -= ??= ||= &&=` ; ternaire (imbriqué, branches de types différents → union).
- Fonctions : flèche à corps-expression ou bloc, `async`, générique, paramètres déstructurés/optionnels/défaut/rest, `function` expression nommée, IIFE, fermeture, fonction passée comme valeur (référence nue générique → instanciation), méthode détachée.
- Appels : positionnels (existe), spread `f(...xs)`, génériques explicites `f<T>(x)`, appel de méthode `o.m(x)`, appel curryfié `f(a)(b)`, appel d'un résultat d'appel, `new C()`, appel optionnel, callee builtin.
- Divers : `await`, `yield`, `as T`, `<T>x`, `satisfies`, parenthèses (`ParenthesizedExpression` — un transformer a existé en `a2e59ac`, supprimé depuis), `x as const`, expression de classe, `import.meta`.

---

## 39. Cas à anticiper — transformers de type

Chaque forme existe en version **annotée** (nœud réel) et **synthétisée** (`typeToTypeNode`, `pos < 0`, éventuellement `import("…").X`) :
- Mots-clés : `number` (existe), `string`, `boolean`, `bigint`, `void`, `undefined`, `null`, `never`, `any`, `unknown`, `object`, `symbol`.
- Littéraux : `"negative-operand"`, `-1`, `true`, gabarits de type.
- Composés : `T[]` / `Array<T>` / `readonly T[]`, tuples `[A, B, C]` (homogènes → `[3]T`, hétérogènes → struct ; optionnels, rest, nommés), unions `A | B` (dont `T | undefined`, `T | null`, unions de littéraux, unions discriminées, unions d'Either), intersections `A & B`, types parenthésés (ex. 01 : `( | A | B )`), objets `{ a: T; b?: U }`, signatures d'index, `Record<K, V>`, `Map`, `Set`.
- Fonctions : `(a: A) => B`, génériques, surchargées, constructeurs.
- Références : alias local, interface, type importé d'un autre fichier, paramètre de type `T`, `typeof x`, `keyof T`, accès indexé `T["k"]`, conditionnels, mappés, `infer`, utilitaires (`Partial`, `Pick`, `ReturnType`, `Awaited`).
- Asynchrone : `Promise<T>`, `PromiseLike<T>`, `MaybePromise<T>` de DuploJS.
- DuploJS : `DEither.Success<T>` (existe), `Fail`, `Left<Info, V>`, `Right<Info, V>`, `Ok`, `Maybe`/`Some`/`None`, types « kind »/tags de `DModeling`, et les types **développés structurellement** par le checker au lieu d'être nommés.

Règle héritée de `c9fe1ca` : un transformer de type qui ne reconnaît pas son nœud doit répondre `notSupport`, jamais un type par défaut.

---

## 40. Cas à anticiper — transformers DuploJS

Vu dans les exercices [VÉRIFIÉ] et variantes probables [HYPOTHÈSE] :
- `DEither` : `success` (existe), `fail`, `left(info, value?)`, `right(info, value?)` et `isLeft`/`unwrapLeft`/`unwrapRight` (vus dans l'ancien exercice 01, `385c753`), `ok`, `isRight`, `whenIsRight`, `whenIsLeft`, `whenIsRightOtherwise`, `whenHasInformation`, `whenHasInformationOtherwise`, `matchInformation`, `rightPipe`, `rightAsyncPipe`, `group`, `asyncGroup`, `unwrapRightOrThrow`, `toMaybe`, `some`/`none`, `safeCallback`, `keepAsRightByInformation` (les dernières sont utilisées par le transpileur lui-même, donc existent dans la bibliothèque).
- `DCommon` : `pipe`, `asyncPipe`, `print`, `equal`, `forward`, `tap`, `memo`, `justExec`, `promiseAll`, `cast`, `truthy`, `isType`.
- `DArray` : `map`, `coalescing`, `reduce`, `push`, `concat`, `first`, `find`, `some`, `every`, `from`, `shift`, `lengthEqual`, `includes`, `group`.
- `DString` : `to`, `replace`, `replaceAll`, `prepend`, `padStart`, `includes`, `startsWith`, `extract`, `search`.
- `DPattern.match` / `otherwise`, `DObject`, `DGenerator`.

Axes de variation de **chaque** fonction :
1. Forme d'appel : donnée-en-premier `f(data, cb)` vs curryfiée `f(cb)` (utilisée dans `pipe` ou passée à `map`).
2. Position : appelée directement, passée comme valeur (`DArray.map(DString.to)`, `success: DString.to`), stockée dans une variable.
3. Import : `import * as DEither`, import nommé, renommé, réexporté par un fichier du projet.
4. Callback : référence nue (générique ou non), flèche en ligne, fonction du projet, résultat d'un autre appel curryfié.
5. Types : entrée déjà rétrécie ou union complète ; résultat union de variantes hétérogènes (`string[] | number[]`, `Left | T[]`).
6. Synchrone vs asynchrone (`rightPipe` / `rightAsyncPipe`, `group` / `asyncGroup`, `pipe` / `asyncPipe`) et mélange de callbacks synchrones/asynchrones dans une même chaîne.

Chaque opération exige : branche dans le routeur d'expression (et de type si elle a un type nommé), handler(s), shared dependency memo, et cohérence valeur/type/sérialisation (§14, §25).

---

## 41. Zones d'incertitude à lever en priorité

- **[HYPOTHÈSE]** L'exercice 00 fourni compile-t-il ? (`Generated_4 := shard_dependencies.EitherSuccessOf` sans instanciation, §29.) Premier test à faire avec `pnpm build:00` puis `go build`.
- **[HYPOTHÈSE]** Forme exacte renvoyée par `typeToTypeNode` pour les types Either inférés (QualifiedName vs `import("…")` vs structure développée), et pour les unions.
- **[HYPOTHÈSE]** Critère de « comportement conservé » : sortie de `DCommon.print` ? Format exact (JSON, `console.log`, inspect) à lire dans `@duplojs/lang`.
- **[HYPOTHÈSE]** Sémantique précise de `coalescing`, `group`, `asyncGroup`, `whenIsRight` sur un non-Either, `fail()` (information portée ?), à lire dans `@duplojs/lang/dist`.
- **[HYPOTHÈSE]** Chemins d'entrée des domaines dans `node_modules/@duplojs/lang/dist/` (motifs des routeurs).
- **[HYPOTHÈSE]** Version Go réellement visée (`go 1.27.4` dans `go.mod`) : alias génériques, méthodes génériques, `omitzero`.
- **[HYPOTHÈSE]** Déterminisme de la numérotation `Generated_N` sous `promiseAll`.
- **[VÉRIFIÉ]** Skill `go-ast` partiellement obsolète (noms `parameters`, tuples, dossier `common/`) ; `context.error` non protégé contre les nœuds synthétisés ; défauts partagés non dédupliqués ; `&&`/`||` sans court-circuit ; gardes de `function.ts` retirées.
