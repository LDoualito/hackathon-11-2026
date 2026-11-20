# 05 — Précédents DuploJS : génération de code, outillage serveur, règles de lint

Notes de recherche pour le transpileur TypeScript (DuploJS) → Go du hackathon 11-2026.
Sources : clones locaux de l'organisation GitHub `duplojs` (chemins donnés sous la forme
`<repo>/<chemin>`), lus le 2026-11-18. Tête de `ecosystem` : `5c5ca34` (2026-11-14).

Légende : **[VÉRIFIÉ]** = lu dans le code, un test, un README ou un commit.
**[HYPOTHÈSE]** = inférence non confirmée par une source écrite. Aucun code n'a été exécuté :
les comportements décrits sont établis par lecture.

Limite importante : seuls `lang-tools` (19 commits), `ecosystem` (306) et `lang` (166) ont un
historique complet. Tous les autres dépôts sont clonés à profondeur 1 (un seul commit) : leur
évolution interne n'est pas observable, seule la comparaison entre dépôts l'est.

---

## 1. Contrat de référence : le transformer du hackathon

**Fait [VÉRIFIÉ]** — `hackathon-11-2026/src/transpiler/createTransformer.ts`. Un transformer
reçoit `(data: TsAST.Node, context: BuildContext)` et renvoie (éventuellement en `Promise`) un
`Either` parmi quatre :

- `Right "transformation-success"` avec `{ result: GoAST.Node, before: readonly GoAST.Statement[] }` ;
- `Left "transformation-not-supported"` (payload `undefined`) : « ce nœud n'est pas pour moi » ;
- `Left "transformation-error"` : nœud reconnu mais intraduisible (payload : kind, parentKind,
  text, `getNode()`, `content`, chemin du fichier) ;
- `Left "notfound-transformer"` : produit par le dispatch, jamais par un transformer isolé.

Le dispatch `transform(data, transformers, context)` parcourt la liste, passe au suivant
uniquement sur `transformation-not-supported`, sort sur tout autre résultat, et convertit
« tout le monde a refusé » en `notfound-transformer` avec le diagnostic du nœud.

**Pourquoi c'est la référence** — toutes les sections suivantes comparent les outils DuploJS à
ce contrat. Le point qui le distingue des précédents est la séparation entre le refus interne
(`not-supported`, sans payload) et l'échec final (`notfound-transformer`, avec payload) : voir
section 9.

---

## 2. Vue d'ensemble : cinq générations d'outils de transformation

**Fait [VÉRIFIÉ]** — dates des derniers commits et état d'archivage (API GitHub) :

| Génération | Dépôt | Entrée | Sortie | Dernier commit | Archivé |
|---|---|---|---|---|---|
| 1 | `zod-accelerator` | schéma Zod 3 | fonction JS compilée (`eval`) | `3e4640d` 2025-02-25 | oui |
| 1 | `zod-to-typescript` | schéma Zod 3 | texte TypeScript | `792c2f7` 2025-05-13 | non (inactif) |
| 1 | `types-codegen` | routes `@duplojs/core` | fichier `.d.ts` | `ecc592a` 2025-05-13 | oui |
| 2 | `data-parser-tools` | `DP.DataParser` (`@duplojs/utils`) | TS, JSON Schema, DataParser | `2f7daff` 2026-06-30 | non |
| 3 | `lang-tools` | `DDataStructure.Structure` (`@duplojs/lang`) | TS, JSON Schema, DataStructure | `708d152` 2026-09-03 | non |
| 4 | `ecosystem/packages/tools` | idem | idem + `structureFinder` | actif (`fd6b4b5` 2026-10-25) | non |

**Pourquoi [HYPOTHÈSE]** — chaque génération suit le remplacement de la bibliothèque de schéma
sous-jacente : Zod → `dataParser` de `@duplojs/utils` → `dataStructure` de `@duplojs/lang`.
L'outil est réécrit à chaque fois, mais son squelette (liste de transformers, contexte `Map`,
hooks, identifiants) est conservé et raffiné. Aucun README ni CHANGELOG n'explique les
archivages ; aucun dépôt ne contient de CHANGELOG.

**Leçon pour le transpileur** — ce qui survit à quatre réécritures est le contrat du
transformer et la table de contexte, pas le code des transformers. Investir dans le contrat et
le dispatch, garder les transformers petits et jetables.

---

## 3. `zod-to-typescript` : le modèle d'origine (support / makeTypeNode)

**Fait [VÉRIFIÉ]** — `zod-to-typescript/scripts/ZodToTypescript.ts`.

- Entrée : `ZodType`. Pas de représentation intermédiaire propre : les transformers produisent
  directement des `ts.TypeNode` via `ts.factory`. Sortie : texte imprimé par `ts.createPrinter()`.
- Contrat : objet `{ support(zodSchema): boolean; makeTypeNode(zodSchema, tools): TypeNode }`.
  `tools` fournit `context` (la `Map`) et `findTypescriptTransformator(child)` pour déléguer les
  enfants. Aucun résultat d'échec : un transformer ne peut ni refuser après coup ni signaler une
  erreur.
- Enregistrement : tableau statique global `ZodToTypescript.typescriptTransformators`, rempli
  par effet de bord à l'import de chaque fichier (`scripts/index.ts`).
- Ordre : les transformers passés au constructeur sont placés avant les défauts. Le fichier
  `index.ts` commence par un commentaire `//priority` suivi de l'import de `overrideTypeNode`,
  qui doit passer avant tous les autres.
- Cas par défaut : si aucun transformer ne supporte le schéma, la fonction se rappelle avec
  `zod.unknown()` et émet `unknown` sans avertissement.
- Extensibilité : méthodes ajoutées au prototype de `ZodType` (`identifier(name)`,
  `overrideTypeNode(node)`), hooks `zodSchemaHooks` (`"stop" | "next"`) qui remplacent le schéma
  avant transformation.

**Comparaison avec le hackathon** — même idée de liste ordonnée et de délégation des enfants,
mais prédicat et construction sont deux méthodes séparées et il n'existe que le succès. Le
hackathon fusionne les deux en une fonction et ajoute refus et erreur.

**Leçon pour le transpileur** — le repli silencieux vers `unknown` est exactement ce que le
contrat du hackathon interdit : un nœud non reconnu doit remonter en `notfound-transformer`,
pas se transformer en `interface{}`/`any` Go. Ne jamais introduire de transformer « attrape-tout »
qui réussit.

---

## 4. `zod-to-typescript` : identifiants, récursion et contexte

**Fait [VÉRIFIÉ]** — `zod-to-typescript/scripts/ZodToTypescript.ts`, `scripts/utils/alias.ts`.

- Contexte : `Map<ZodType, NamedDeclaration>`, clé = identité de l'objet schéma.
- Récursion : quand un schéma porte un identifiant, une déclaration temporaire
  (`type X = null`, `createTempAlias`) est posée dans la `Map` avant de transformer les enfants.
  Un enfant qui retombe sur le même schéma trouve l'entrée et émet une référence `X`. Après
  coup, l'entrée est remplacée par la vraie déclaration.
- Identifiants automatiques : `Zod2ts_<compteur base 36>_duplojs`, compteur statique global.
- Limite : sans identifiant, un schéma récursif n'a pas d'entrée dans la `Map`.
  **[HYPOTHÈSE]** récursion infinie dans ce cas ; le README n'utilise la récursion qu'avec
  `.identifier(...)`.

**Leçon pour le transpileur** — le motif « poser un marqueur dans la table avant de descendre,
le remplacer en remontant » est repris tel quel par les quatre générations suivantes. Pour
Go, il s'applique aux types nommés récursifs et aux fonctions mutuellement récursives.

**Cas à anticiper** — un compteur global rend la sortie dépendante de l'ordre d'exécution et
des appels précédents du même processus. Le hackathon utilise un compteur par transpilation
(`context/transpilation.ts`, `Generated_<n>`), ce qui est déterministe à condition que l'ordre
de visite le soit.

---

## 5. `types-codegen` : un CLI de génération au-dessus de `zod-to-typescript`

**Fait [VÉRIFIÉ]** — `types-codegen/bin/index.ts`, `scripts/generateTypeFromRoutes.ts`,
`scripts/render.ts`.

- Chaîne : importer dynamiquement les fichiers du projet (ce qui enregistre les routes par
  effet de bord) → `useRouteBuilder.getAllCreatedRoute()` → chaque route devient un schéma Zod
  → union de tous → `ZodToTypescript` → un fichier texte.
- CLI : `commander`, options `--include`, `--output`, `--exclude`, `--watch`, `--import`,
  `--require`. Le mode watch relance le processus entier par `fork` à chaque changement.
- Extension par composition : deux transformers ajoutés (`instanceof`, `receiveFormData`) et un
  hook (`defaultToOptionalHook` : `ZodDefault` devient `ZodOptional`).
- Le fichier généré est enveloppé d'un en-tête fixe (`// Generated by`, `eslint-disable`,
  `@ts-nocheck`, `v8 ignore`).
- Un transformer peut injecter une déclaration partagée une seule fois dans le contexte
  (`receiveFormData.ts` : clé sentinelle `zod.never()`, interface `CodegenReceiveFormData`).

**Pourquoi archivé [HYPOTHÈSE]** — dépend de `@duplojs/core >=1 <2` (routes) et de
`@duplojs/zod-to-typescript 0.4.2` ; l'écosystème a quitté Zod. Aucune explication écrite.

**Leçon pour le transpileur** — l'injection « une seule fois » d'une déclaration partagée est
l'ancêtre de `registerSharedDependency` du hackathon (`context/build.ts`). L'en-tête de fichier
généré (désactivation du lint, marque « généré ») est à prévoir pour les fichiers Go.

**Cas à anticiper** — l'exécution du code utilisateur pour découvrir les entrées (import
dynamique) a disparu des générations suivantes ; le hackathon lit l'AST sans exécuter, ce qui
évite les effets de bord mais interdit de s'appuyer sur des valeurs runtime.

---

## 6. `zod-accelerator` : compilation d'un schéma en fonction JS

**Fait [VÉRIFIÉ]** — `zod-accelerator/scripts/accelerator.ts`, `content.ts`, `README.md`.

- Entrée : schéma Zod 3. Sortie : une fonction JavaScript construite comme une chaîne de
  caractères puis évaluée par `eval` indirect (`scripts/utils/shadowEval.ts`), enveloppée dans
  `ZodAcceleratorParser` (`parse`, `safeParse`, variantes async).
- Représentation intermédiaire : `ZodAcceleratorContent`, un tampon de fragments de code texte
  plus un dictionnaire `ctx` de valeurs runtime. Pas d'AST.
- Contrat d'un « accelerator » : classe abstraite avec `get support()` (une classe Zod, testée
  par `instanceof`) et `makeAcceleratorContent(zodSchema, zac)`.
- Enregistrement : décorateur `@ZodAccelerator.autoInstance` qui fait `unshift` dans un tableau
  statique. Le dernier importé est donc essayé en premier.
- Cas par défaut : `ZodTypeAccelerator` (`accelerators/type.ts`) supporte `ZodType`, donc tout.
  Il doit être importé en premier (`scripts/index.ts` : `// must be import at first`) pour finir
  dernier. Il n'accélère rien : il appelle le `safeParse` Zod d'origine depuis le code généré.
- Si aucun accelerator ne correspond : `throw new Error("No accelerator found for type: ...")`.

**Comparaison avec le hackathon** — ici le repli est fonctionnellement correct (le schéma
d'origine sait se valider lui-même). Un transpileur vers Go n'a pas cet échappatoire : il n'y a
pas de runtime TypeScript à appeler depuis Go.

---

## 7. `zod-accelerator` : optimisations et techniques de génération

**Fait [VÉRIFIÉ]** — `zod-accelerator/scripts/content.ts`, `accelerators/*.ts`.

- Aplatissement : le code de chaque enfant est inliné dans la fonction du parent
  (`exportContent`), pas d'appel de fonction par nœud.
- Hygiène des noms : chaque fragment reçoit un identifiant `duploj$<n>` ; les jetons `$input`,
  `$output`, `$this.`, `$id` sont remplacés textuellement par des noms préfixés.
- Valeurs non sérialisables (regex, fonctions `transform`/`refinement`, ensembles de clés) :
  rangées dans `ctx` et liées à `this` par `fnc.bind(...)`.
- Sortie anticipée : première erreur → `return {success: false, ...}`. Pas d'accumulation.
- Chemin d'erreur : jeton `$path` réécrit par concaténation à chaque niveau d'imbrication.
- Union : chaque branche est enveloppée dans un bloc étiqueté ; les lignes contenant
  `return /* cut_execution */` sont remplacées par `break <label>` via `split("\n")` et
  `includes` (`accelerators/union.ts`).
- Sync ou async : `zodSchemaIsAsync` parcourt le schéma ; pour un effet, il appelle la fonction
  utilisateur avec un `Proxy` universel et regarde si elle renvoie une `Promise`
  (`scripts/utils/zodSchemaIsAsync.ts`). La fonction générée devient `async` si son texte
  contient `await`.
- Récursion : `build` pose d'abord un parser factice sur `zodSchema.accelerator` ; une
  réapparition du même schéma émet un appel à `$this.zodSchema.accelerator.safeParse` au lieu
  d'inliner.
- Tests : un fichier par accelerator, comparaison comportementale
  `expect(accelerateSchema.parse(data)).toStrictEqual(schema.parse(data))`, plus des benchs
  `tinybench` contre joi, myzod, typebox, vine (`benchmark/*.bench.ts`).

**Leçon pour le transpileur** — le test différentiel (« la sortie compilée se comporte comme
la source ») est le test le plus fort de tous les précédents. Équivalent ici : exécuter le
programme TS et le programme Go généré et comparer les sorties.

**Cas à anticiper** — la réécriture de `return` en `break` par recherche de sous-chaîne ligne
par ligne ne tient que parce que chaque `return` généré tient sur une ligne avec un commentaire
marqueur. C'est la raison d'être du champ `before` du hackathon : remonter des instructions
préalables comme des nœuds, jamais par manipulation de texte.

---

## 8. `zod-accelerator` : limites reconnues et raisons probables de l'archivage

**Fait [VÉRIFIÉ]** — `zod-accelerator/README.md`, sections « The differences », « Caching
system? », « Skipping eval ? », « When should I use it ».

- L'analyse s'arrête à la première erreur ; les messages sont moins explicites que ceux de Zod.
- Les paramètres secondaires (messages personnalisés) ne sont pas tous implémentés.
- Les contextes de `ZodEffects` sont incomplets.
- Tous les types ne sont pas accélérés ; les autres retombent sur Zod.
- Pas de cache sur disque possible : le code généré dépend d'un contexte `this` (fonctions
  utilisateur) qui n'existe qu'en mémoire.
- `eval` est obligatoire ; « aucune autre méthode ne semble viable ».
- Construire la fonction coûte environ deux fois son exécution : inutile pour un usage unique.

**Pourquoi archivé [HYPOTHÈSE]** — couplage aux internes de Zod 3 (`_def`, classes `Zod*`,
`peerDependencies: zod >=3.0.0 <4.0.0`) et abandon de Zod par l'écosystème. Non documenté.

**Leçon pour le transpileur** — une compilation « pour la performance » accepte des écarts de
sémantique et les documente. Le transpileur Go doit tenir une liste équivalente d'écarts
assumés (ordre d'évaluation, messages d'erreur, entiers vs flottants) plutôt que de les laisser
implicites.

**Cas à anticiper** — tout ce qui est une valeur runtime (fermeture, regex construite
dynamiquement) n'est pas transportable dans du code généré autonome. `zod-accelerator` le
contourne par `this` ; un transpileur vers Go ne le peut pas et doit refuser explicitement
(`transformation-error`).

---

## 9. Contrat du transformer : évolution du résultat entre générations

**Fait [VÉRIFIÉ]** :

| Outil | Signature | Résultats possibles |
|---|---|---|
| `zod-to-typescript` | `support()` + `makeTypeNode()` | succès seulement (`TypeNode`) |
| `zod-accelerator` | `support` + `makeAcceleratorContent()` | succès, ou `throw` |
| `data-parser-tools` | `createTransformer(support, builder)` | `Right "buildSuccess"` · `Left "dataParserNotSupport"` · `Left "buildDataParserError"` · `Left "buildCheckerError"` |
| `lang-tools` / `tools` | `createStructureTransformer(support, builder)` | `Right "buildSuccess"` · `Left "dataStructureNotSupport"` · `Left "buildDataStructureError"` + erreurs de type et de contrainte |
| hackathon | `createTransformer(fn)` | `Right "transformation-success"` · `Left "transformation-not-supported"` · `Left "transformation-error"` · `Left "notfound-transformer"` |

Fichiers : `data-parser-tools/scripts/toTypescript/dataParserTransformer/create.ts`,
`ecosystem/packages/tools/scripts/toTypescript/structureTransformer/create.ts` et `result.ts`.

Dans `data-parser-tools` et `tools`, `createXTransformer(support, builder)` prend un prédicat de
type (`structure is GenericStructure`) et un constructeur ; la fabrique renvoie
`Left "...NotSupport"` quand le prédicat échoue. Le constructeur reçoit donc un nœud déjà
typé précisément.

**Pourquoi** — le passage de `boolean` à un `Either` nommé permet au dispatch de distinguer
« pas pour moi » de « pour moi mais impossible », ce que `zod-to-typescript` ne pouvait pas.

**Leçon pour le transpileur** — le hackathon a retiré le prédicat séparé : le transformer
teste lui-même le nœud et appelle `context.notSupport()`. C'est plus souple (le refus peut
intervenir après analyse), mais le rétrécissement de type n'est plus garanti par la fabrique :
chaque transformer doit commencer par une garde de type explicite.

---

## 10. Piège du dispatch : un refus d'enfant pris pour un refus du parent

**Fait [VÉRIFIÉ à la lecture, non exécuté]** —
`ecosystem/packages/tools/scripts/toTypescript/structureTransformer/transformer.ts`. La boucle
continue vers le transformer suivant dès que le résultat est `Left "dataStructureNotSupport"`.
Or un transformer parent (objet, union, tableau) renvoie tel quel le `Left` de son enfant
(`defaults/object.ts` : `if (DEither.isLeft(valueResult)) return valueResult;`). Si l'enfant
n'est supporté par personne, le parent renvoie `dataStructureNotSupport(enfant)`, que la boucle
du parent interprète comme « ce transformer ne supporte pas le parent ». Elle essaie alors
tous les autres transformers, puis renvoie `dataStructureNotSupport(parent)`.

Conséquences : le diagnostic désigne le parent au lieu du nœud réellement fautif, et le
travail est refait pour rien. Même logique dans `toDataStructure`
(`structureTransformer/transformer.ts`) et dans `data-parser-tools`.

**Pourquoi le hackathon n'a pas ce défaut [VÉRIFIÉ]** — `transform` convertit le refus final
en `notfound-transformer` avant de le renvoyer. Un parent qui propage l'échec de son enfant
propage donc un `notfound-transformer`, sur lequel la boucle du parent sort immédiatement.

**Leçon pour le transpileur** — ne jamais laisser un transformer renvoyer lui-même
`transformation-not-supported` après avoir délégué un enfant qui a échoué : renvoyer le `Left`
de l'enfant tel quel. Réserver `notSupport()` à la garde d'entrée.

**Cas à anticiper** — un transformer qui commence à produire des effets (enregistrement
d'import, de dépendance partagée, incrément de compteur) puis refuse. Les effets restent. Le
refus doit précéder tout effet sur le contexte.

---

## 11. Ordre et priorité des transformers

**Fait [VÉRIFIÉ]** :

- `zod-to-typescript` : ordre d'import ; transformers utilisateur placés devant ; un
  transformer prioritaire signalé par commentaire.
- `zod-accelerator` : ordre d'import inversé (`unshift`), attrape-tout importé en premier.
- `data-parser-tools`, `lang-tools`, `tools` : tableau explicite exporté
  (`defaultStructureTransformers`, `defaultTypeTransformers`, `defaultConstraintTransformers`,
  `as const satisfies readonly StructureTransformer[]`), passé en paramètre à `render`. Plus
  d'état global ni d'effet de bord à l'import. L'utilisateur compose sa propre liste.
- Dans `tools`, chaque prédicat teste un « kind » précis
  (`DDataStructure.structureIdentifier(DDataStructure.objectStructureKind)`).
  **[HYPOTHÈSE]** les prédicats par défaut sont mutuellement exclusifs, donc l'ordre de la liste
  par défaut est sans effet ; seul compte le fait de placer un transformer personnalisé devant.
- Hackathon : listes par catégorie (`declarationTransformers`, `statementTransformers`, ...)
  mémoïsées par `DCommon.memo` et concaténées (`src/transpiler/transformers/index.ts`).

**Pourquoi** — le passage d'un registre global à une liste explicite rend l'ordre visible,
testable, et supprime la dépendance à l'ordre des imports.

**Leçon pour le transpileur** — contrairement aux kinds DuploJS, les `SyntaxKind` TypeScript ne
suffisent pas à rendre les transformers exclusifs : un `CallExpression` peut être un appel
quelconque ou un `DEither.right(...)`. L'ordre devient porteur de sens : le spécifique
(DuploJS) avant le générique. Cet ordre doit être écrit une seule fois, dans la liste, et
couvert par un test qui échoue si l'on inverse deux entrées.

**Cas à anticiper** — deux transformers spécifiques qui acceptent le même nœud. Aucun
précédent ne détecte ce cas ; le premier gagne en silence.

---

## 12. Trois familles de transformers : structure, type, contrainte

**Fait [VÉRIFIÉ]** — `ecosystem/packages/tools/scripts/toTypescript/` contient trois dispatchs
distincts, chacun avec sa fabrique, sa boucle et ses défauts :
`structureTransformer/` (objet, union, tableau, record, lazy, newType, entity, taggedObject),
`typeTransformer/` (string, number, littéraux, date, time, file...) et
`constraintTransformer/` (email, min, max...). Un transformer de structure reçoit dans ses
paramètres `transformer(child)`, `transformType(type)`, `transformConstraint(constraint)`.

Historique : `data-parser-tools` n'avait qu'une liste de transformers plus des « checker
refiners » optionnels. `lang-tools` sépare type et contrainte dès `525c447` (2026-08-16).
Dans `ecosystem`, `toDataStructure` reçoit à son tour un dispatch de types en `af90015`
(2026-09-17) : le fichier `structureTransformer/defaults/type.ts` perd 149 lignes de branches
internes au profit de 13 petits transformers.

**Pourquoi** — une famille par catégorie de nœud évite qu'un transformer de structure
contienne une cascade de `if` sur les types primitifs, et permet de remplacer un seul
primitif.

**Leçon pour le transpileur** — même découpage côté hackathon (déclaration, instruction,
expression, type). Le type de retour de `transform` y est inféré de la liste passée
(`TransformerResultNode`), ce qui garantit qu'un dispatch d'expressions ne renvoie pas une
instruction : c'est un progrès par rapport à `tools`, où tout renvoie `Typescript.TypeNode`.

---

## 13. Contraintes non prises en charge : de l'oubli silencieux à l'erreur

**Fait [VÉRIFIÉ]** :

- `data-parser-tools/scripts/toTypescript/dataParserTransformer/transformer.ts` : les
  « checkers » sont raffinés par une liste optionnelle `checkerRefiner`. Si aucun raffineur ne
  supporte un checker (`checkerNotSupport`), il est ignoré (`() => next(lastValue)`) et le type
  est émis sans lui.
- `ecosystem/packages/tools/scripts/toTypescript/transformer.ts` et
  `constraintTransformer/transformer.ts` : `constraintTransformers` est obligatoire ; une
  contrainte sans transformer renvoie `Left "constraintNotSupport"` et fait échouer tout le
  rendu.

**Pourquoi [HYPOTHÈSE]** — dans `@duplojs/lang`, les contraintes font partie du type (types
marqués `DString.Email`, `DNumber.Integer`). En oublier une produirait un type faux.

**Leçon pour le transpileur** — choisir explicitement, par catégorie de nœud, entre
« ignorer » et « échouer ». Le précédent a tranché vers l'échec dès que l'information perdue
change le sens. Pour Go : une contrainte DuploJS non traduite ne doit pas disparaître sans
trace.

---

## 14. Contexte de build : la table des déclarations

**Fait [VÉRIFIÉ]** — `ecosystem/packages/tools/scripts/toTypescript/context.ts` et
`transformer.ts`. Le contexte est une `Map<Structure, TypeAliasDeclaration | InterfaceDeclaration>`
indexée par identité d'objet. Elle sert à la fois de :

- cache : une structure déjà déclarée renvoie une référence par nom ;
- registre de sortie : `printer` imprime `context.values()` dans l'ordre d'insertion ;
- garde de récursion (section 15).

Elle est mutable et partagée par référence dans tout l'arbre. L'appelant peut fournir une
`Map` existante pour enchaîner plusieurs rendus dans le même fichier (`BuildContextParams.context`).

Détail : pour replacer une entrée en fin d'ordre d'impression, le code fait
`context.delete(key)` puis `context.set(key, ...)`. L'alias racine est inséré sous une clé
neuve `DDataStructure.undefined()` (`buildContext.ts`), simple moyen d'obtenir une clé unique.

**Comparaison avec le hackathon [VÉRIFIÉ]** — trois contextes emboîtés
(`context/transpilation.ts`, `context/file.ts`, `context/build.ts`) : global (type checker,
dépendances partagées, compteur), par fichier (`declarations`, `imports`, `dependencyFiles` en
`Set`), et l'objet `BuildContext` qui porte les fabriques `success`, `notSupport`, `error`,
`transform`.

**Leçon pour le transpileur** — l'ordre d'insertion dans la table détermine l'ordre du
fichier généré. Pour un `Set`/`Map` JS il est déterministe, mais dépend de l'ordre de visite :
toute visite concurrente (`Promise.all` sur des enfants) rendrait la sortie instable.

**Cas à anticiper** — dédoublonnage par identité d'objet : deux nœuds structurellement
identiques mais distincts produisent deux déclarations.

---

## 15. Références récursives et circulaires

**Fait [VÉRIFIÉ]** — `ecosystem/packages/tools/scripts/utils/getRecursiveDataStructure.ts`
et `toTypescript/transformer.ts`.

1. Pré-passe : `getRecursiveDataStructure(racine)` parcourt l'arbre en comptant les visites de
   chaque nœud sur le chemin courant ; un nœud revisité est marqué récursif. Le parcours est un
   `DPattern.match(...).exhaustive()` sur les kinds.
2. Transformation : un nœud marqué récursif (ou portant un identifiant utilisateur) reçoit une
   déclaration provisoire auto-référente (`type X = X`) dans la table avant de descendre.
3. Un enfant qui retombe sur ce nœud trouve l'entrée et émet la référence `X`.
4. En remontant, l'entrée provisoire est remplacée par la vraie déclaration.

Nom automatique : `RecursiveType<taille de la table>`. Snapshot de référence :
`ecosystem/packages/tools/tests/toTypescript/__snapshots__/recursion.test.ts.snap`
(`export type RecursiveType0 = number | readonly RecursiveType0[];`). Les tests couvrent la
récursion directe, mutuelle, et la propagation de `undefined` à travers une union récursive.

Historique [VÉRIFIÉ] : la première version de `lang-tools` (`525c447`) utilisait un module
`analysis.ts` de 342 lignes (objet `StructureAnalysis` avec `analyze`, `getIdentifier`,
`getRecursiveIdentifier`, `includesUndefined`). Il est supprimé deux jours plus tard par
`c6c4b79` (« fix(hf): transformer », −629 lignes) au profit de la simple liste
`recursiveDataStructures`. Correctif suivant `2501a73` : une branche renvoyait une fonction au
lieu de l'exécuter (`() => () => void 0`), avec 157 lignes de tests de récursion ajoutées.

**Pourquoi** — la pré-passe ne répond qu'à une question (« quels nœuds ont besoin d'un
nom ? ») ; tout le reste se décide pendant la transformation. L'objet d'analyse riche
dupliquait la logique des transformers.

**Leçon pour le transpileur** — préférer une pré-passe minimale qui produit un ensemble, plutôt
qu'un objet d'analyse interrogé pendant la transformation.

**Cas à anticiper** —
- `getRecursiveDataStructure` traite `recordStructureKind` comme une feuille (non parcouru).
  **[HYPOTHÈSE]** une récursion passant uniquement par la valeur d'un record n'est pas détectée
  et bouclerait ; non testé.
- En récursion mutuelle, seul le premier nœud revisité reçoit un nom ; l'autre est inliné
  (visible dans le snapshot « mutually recursive structures »).
- Pendant la descente, la déclaration provisoire ne contient pas l'information réelle
  (optionalité, forme). Toute décision prise à l'intérieur du cycle sur la base de la
  déclaration provisoire est faite à l'aveugle.

---

## 16. Identifiants générés et nommage

**Fait [VÉRIFIÉ]** :

- `tools/toTypescript/createIdentifier.ts` : nettoie une chaîne quelconque en identifiant
  PascalCase (suppression des caractères invalides, majuscule sur le caractère suivant,
  préfixe `_` si le premier caractère est invalide, repli `"Type"` si vide). Réécrit en
  `c69cfc8`.
- `tools/toDataStructure/structureTransformer/createIdentifier.ts` :
  `${uncapitalize(identifier)}Structure`. Le préfixe `data` a été retiré en `257f6db`
  (62 fichiers touchés, presque tous des snapshots).
- Noms automatiques : `RecursiveType<n>`, `recursive<n>Structure`, type associé
  `$<identifiant>`.
- L'utilisateur nomme une structure par `structure.addIdentifier("User")` (clone) ; l'ancienne
  variante mutante `setIdentifier` est marquée `@deprecated` (`toTypescript/override.ts`).
- Si l'identifiant demandé à `render` diffère de celui de la structure, un alias
  `export type Public = Interne;` est émis (`buildContext.ts`).
- Hackathon : `generateIdentifier()` → `Generated_<n>` ; `createSourceIdentifier(chemin)` →
  `Sourced_` + chaque caractère non alphanumérique remplacé par son code en base 36 sur 4
  chiffres (`context/build.ts`).

**Leçon pour le transpileur** — un changement de convention de nommage invalide tous les
snapshots d'un coup (62 fichiers pour un préfixe). Figer la convention tôt, ou tester le
nommage séparément de la structure.

**Cas à anticiper** —
- **[HYPOTHÈSE]** collisions : `createIdentifier` peut projeter deux entrées différentes sur
  le même nom (`"user-id"` et `"userId"`), et rien ne vérifie l'unicité ; un identifiant
  utilisateur `RecursiveType0` entrerait en collision avec un nom automatique.
- En Go, la casse du premier caractère décide de l'export : la convention de nommage est
  sémantique, pas cosmétique.
- Mots réservés et identifiants prédéclarés Go (`type`, `func`, `len`, `error`) : aucun
  précédent ne gère de liste de mots réservés.

---

## 17. Dépendances et imports du code généré

**Fait [VÉRIFIÉ]** — `ecosystem/packages/tools/scripts/toTypescript/importContext/`.

- `MapImportContext = Map<chemin, { namespace?, default?, direct? }>`.
- Les transformers reçoivent `addImport(path, name, kind = "direct")`, dédoublonné
  (`addImport.ts`). Exemple : la contrainte email appelle
  `addImport("@duplojs/lang/string", "DString", "namespace")` puis émet `DString.Email`.
- `createImportDeclaration` transforme la table en nœuds `ImportDeclaration`, imprimés avant
  les déclarations (`printer.ts`).
- Une structure peut déclarer ses propres imports :
  `structure.addMapImportContextEntries(...)`, appliqués avant sa transformation.

Historique [VÉRIFIÉ] dans `lang-tools` : `5ae94a3` introduit pour `toDataStructure` un second
suivi (`dependenciesImportsContext`, `mergeMaps`, `mergeImportContextValue`) ; quatre jours
plus tard `708d152` le supprime : chaque entrée de contexte porte désormais sa propre table
d'imports (`MapContextValue.import`) et un ensemble `dependencies`, fusionnés à l'impression
par `addImportToContext`.

**Pourquoi** — rattacher les imports à la déclaration qui les requiert permet d'émettre un
sous-ensemble de déclarations avec exactement leurs imports ; une table globale ne le permet
pas.

**Leçon pour le transpileur** — Go refuse de compiler un import inutilisé. Un import doit donc
être enregistré par le transformer qui émet le nœud qui l'utilise, au moment où il l'émet,
jamais « au cas où ». Si un nœud peut être abandonné après coup, ses imports doivent pouvoir
l'être aussi : le rattachement par déclaration du précédent est le bon modèle.

**Cas à anticiper** — alias d'import en conflit (deux paquets Go de même nom final) ; aucun
précédent ne le gère, les noms d'espace de noms étant fixés par convention (`DString`).

---

## 18. Extensibilité par l'utilisateur : quatre mécanismes

**Fait [VÉRIFIÉ]** — `ecosystem/packages/tools/scripts/toTypescript/override.ts`, `hook.ts`,
`render.ts` ; README de `data-parser-tools`.

1. **Liste de transformers** : paramètre obligatoire de `render`, que l'utilisateur compose.
2. **Hooks** : fonctions `({ structure, context, importContext, output }) => output("next" | "stop", structure)`
   exécutées avant le dispatch ; elles remplacent le nœud d'entrée par un autre. `"stop"`
   interrompt la chaîne. Les hooks sont rejoués à chaque descente d'enfant.
3. **Override par nœud** : `structure.addOverrideTypescriptTransformer(typeNode | builder)`.
   Le dispatch est court-circuité pour ce nœud. Pour éviter la boucle, le builder reçoit le
   nœud cloné sans son override (`addOverrideTypescriptTransformer(null)`).
4. **Contexte pré-rempli** : passer une `Map` déjà peuplée force l'émission de références vers
   des déclarations existantes.

Les méthodes sont greffées sur les structures par augmentation de module
(`declare module "@duplojs/lang/dataStructure"`) et `StructureClass.addToPrototype`.

**Comparaison avec le hackathon** — seul le mécanisme 1 existe. Les mécanismes 2 et 3
supposent que l'entrée soit un objet runtime que l'utilisateur peut annoter ; un nœud d'AST
TypeScript ne l'est pas.

**Leçon pour le transpileur [HYPOTHÈSE]** — l'équivalent d'un override par nœud serait une
annotation dans le source (commentaire ou appel marqueur) ou une table externe indexée par
symbole. À n'introduire que si un cas réel le demande.

**Cas à anticiper** — un hook qui remplace un nœud change la clé utilisée dans la table de
contexte : le cache est indexé sur le nœud remplacé, pas sur l'original (test
`ecosystem/packages/tools/tests/toTypescript/hooks.test.ts`, « caches a shared structure »).

---

## 19. Optionnels : l'information qui se perd derrière une référence

**Fait [VÉRIFIÉ]** — trois traitements successifs d'un même problème (une propriété
optionnelle doit s'écrire `clé?: T`).

- `zod-to-typescript` et `tools/toTypescript` : le transformer d'objet inspecte le nœud
  produit par l'enfant (`includesUndefinedTypeNode`, recherche de `undefined` dans une union).
  Quand l'enfant a renvoyé une référence par nom, l'information n'est plus dans le nœud :
  `defaults/object.ts` va relire la déclaration dans la table
  (`contextDeclarationIncludesUndefined`).
- `tools/toJsonSchema` avant `4ea71f2` : toutes les clés étaient mises dans `required`.
- `tools/toJsonSchema` après `4ea71f2` (« fix:tools(hf): optional support », 2026-09-18) : le
  payload de succès passe de `JsonSchema` à `{ schema, isOptional }`. Le transformer d'objet
  lit `isOptional` et ne remplit `required` que pour les autres clés. La table de contexte
  stocke aussi `isOptional`.
- `data-parser-tools` : paramètre `mode: "in" | "out"`, car un optionnel avec valeur de repli
  est `T | undefined` en entrée et `T` en sortie (`defaults/optional.ts`). Les transformers
  `transform` et `pipe` dépendent aussi du mode.

**Pourquoi** — ré-inspecter la sortie pour retrouver une propriété de l'entrée est fragile dès
qu'il y a indirection. Enrichir le payload de succès supprime l'inspection.

**Leçon pour le transpileur** — le payload `{ result, before }` du hackathon suit la bonne
direction : ce que le parent doit savoir de l'enfant voyage dans le succès, pas dans la forme
du nœud généré. Si un parent se met à inspecter le `GoAST` renvoyé pour deviner quelque chose
(pointeur ou non, peut être nil, type déjà nommé), c'est le signal qu'un champ manque au
payload.

**Cas à anticiper** — optionnel vers Go : pointeur, valeur zéro, ou `Either`/option générique.
Le choix doit être fait une fois et porté par le contexte, comme le `mode` de
`data-parser-tools`.

---

## 20. Unions

**Fait [VÉRIFIÉ]** :

- `tools/toTypescript/structureTransformer/defaults/union.ts` : transforme chaque membre,
  sort au premier échec, émet `createUnionTypeNode`.
- `tools/toJsonSchema/.../union.ts` : `{ anyOf: [...] }`.
- `zod-accelerator/accelerators/union.ts` : essaie chaque branche dans un bloc étiqueté,
  valeur sentinelle `Symbol("empty")` pour savoir si une branche a réussi.
- `tools/toTypescript/.../record.ts` (183 lignes, le plus gros transformer) : cas particuliers
  quand la clé est une union de littéraux chaîne et quand la valeur contient `undefined`.

**Leçon pour le transpileur** — l'union est triviale quand la cible a des unions (TypeScript,
JSON Schema) et coûteuse sinon. Go n'en a pas : c'est le cas où le transpileur ressemblera le
plus à `zod-accelerator` (discrimination explicite, sentinelle) et le moins à `tools`.

**Cas à anticiper** — union de littéraux, union discriminée par tag (les `taggedObject` de
DuploJS), union contenant `undefined`/`null`, union d'un seul membre après filtrage
(`record.ts` gère explicitement 0, 1 et N membres restants).

---

## 21. Génériques et abstractions abandonnées

**Fait [VÉRIFIÉ]** — dans `lang-tools`, `525c447` introduit
`createDefaultConstraintTransformer(kind, { domain, references })` : une fabrique générique
paramétrée par domaine (`array | number | string`) qui lisait `constraint.definition as Record<string, unknown>`.
Le commit suivant `5c8076f` la supprime (−117 lignes) et réécrit chaque contrainte en fichier
explicite de 24 à 65 lignes, typé par son prédicat.

De même `scripts/utils/typeStructureIdentifier.ts` (ajouté en `20c89fa`) est supprimé en
`71197f4`, et `createTypeAliasDeclaration.ts` en `c6c4b79`.

Côté règles d'écriture, `lang-tools/.agents/rules/code.md` contient une section
« 8. Éviter les abstractions prématurées » ; `typescript.md` impose « 1. Nommer explicitement
les génériques » (préfixe `Generic...`) et « 2. Toujours contraindre les génériques ».

**Pourquoi [HYPOTHÈSE]** — la fabrique générique obligeait à un cast vers
`Record<string, unknown>`, donc perdait le typage de `definition`. Trente petits fichiers
répétitifs mais typés ont été préférés.

**Leçon pour le transpileur** — accepter la répétition entre transformers. Une fabrique
« transformer générique paramétré par une table » perd le rétrécissement de type du nœud et
finit en cast.

**Cas à anticiper** — les génériques TypeScript du code source à transpiler ne sont traités
par aucun précédent (les structures DuploJS sont des valeurs runtime déjà monomorphes). C'est
un terrain sans précédent dans l'organisation.

---

## 22. Impression : AST de la cible puis printer

**Fait [VÉRIFIÉ]** :

- `zod-to-typescript`, `data-parser-tools`, `lang-tools`, `tools` : les transformers
  construisent des nœuds avec `ts.factory`, et un unique `printer.ts` appelle
  `ts.createPrinter().printNode(...)` puis joint par `"\n\n"`. Aucun transformer ne manipule de
  texte.
- `zod-accelerator` : concaténation de chaînes et remplacements textuels (section 7).
- `tools/toJsonSchema` : la représentation est un objet JS ; `render.ts` assemble
  `$ref` + définitions selon la version (`jsonSchema4`, `jsonSchema7`, `jsonSchema202012`,
  `openApi3`, `openApi31`).
- Hackathon : AST Go maison (`src/go/AST/`) et printer maison (`src/go/printer/`), qui utilise
  `@duplojs/lang/printer`.
- `tools` embarque deux TypeScript : `typescript@6.0.3` pour `factory`/printer et
  `@typescript/native-API` = `typescript@7.1.0-beta` (`fd6b4b5`, 2026-10-25,
  `scripts/typescript/nativeAPI.ts`). Le hackathon dépend de `typescript@7.1.0-beta` seul.

**Pourquoi** — séparer construction et impression permet de tester les transformers sur des
nœuds et de changer la mise en forme en un seul endroit.

**Leçon pour le transpileur** — Go n'ayant pas de `factory` disponible côté TypeScript, l'AST
maison est le bon équivalent. Le précédent montre le prix du raccourci texte : dès que deux
fragments doivent s'imbriquer (union de `zod-accelerator`), il faut réanalyser du texte.

**Cas à anticiper** — incohérence type/runtime relevée dans
`ecosystem/packages/tools/scripts/toJsonSchema/render.ts` [VÉRIFIÉ à la lecture] : le type
`RenderResult` annonce `$ref: "#/$defs/..."` avec `definitions` pour `jsonSchema4/7`, et
`"#/definitions/..."` avec `$defs` pour `jsonSchema202012`, alors que `buildRef` et le corps
font l'inverse ; de plus `$schema` reçoit `params.version` (la clé) au lieu de l'URL pour
`jsonSchema202012`. L'implémentation est typée `any` derrière une surcharge, ce qui masque
l'écart. Hors périmètre, à signaler seulement.

---

## 23. `@duplojs/lang/printer` et `dataStructure` sous l'angle génération

**Fait [VÉRIFIÉ]** — `ecosystem/packages/lang/scripts/printer/` (206 lignes au total).

Ce domaine n'est pas un imprimeur de code : c'est un utilitaire de mise en forme de texte.

- `renderLine(values, { indent?, indentLevel?, joinCharacter? })` : joint les valeurs
  imprimables par un espace (ou `joinCharacter`), préfixe l'indentation.
- `renderParagraph(values, { indent?, indentLevel?, back? })` : joint par saut de ligne
  (`Back.LF` ou `Back.CRLF`) et indente chaque ligne ; existe en forme curryfiée
  `renderParagraph(params)(values)`.
- `RenderInput = string | boolean | null | undefined | readonly RenderInput[]` : les tableaux
  sont aplatis, `false`/`null`/`undefined` sont ignorés, `true` devient `"true"`. Permet
  d'écrire `condition && "texte"`.
- `Indent` : `tab | space1 | space2 | space3 | space4`. Un niveau non entier ou non positif
  donne une indentation vide.
- `colorized`, `colorizedBold`, `bold`, `dash` : codes ANSI pour la console.

Indentation et sauts de ligne configurables ajoutés en `217a820` (2026-11-09).
`DCommon.print(input, "info" | "warn" | "error" | { columns } | { depth })` ajouté en `029f2c4`
(2026-11-13) : journalise et renvoie l'entrée, utilisable dans un `pipe`.

`dataStructure` (`ecosystem/packages/lang/scripts/dataStructure/`) fournit ce sur quoi `tools`
s'appuie : un kind par structure/type/contrainte (`createKind`), des prédicats de type
(`structureIdentifier(kind)`, `typeIdentifier`, `constraintIdentifier`), une `definition`
ouverte à l'augmentation de module, et `StructureClass.addToPrototype` pour greffer des
méthodes.

**Leçon pour le transpileur** — `renderLine` avec `value === true → "true"` est un piège pour
de la génération de code : un booléen passé par erreur s'imprime au lieu d'être ignoré.
`renderParagraph` indente par remplacement de `(^|\n)` : une chaîne Go multi-ligne (littéral
brut entre accents graves) verrait son contenu indenté, donc modifié.

---

## 24. Stratégie de tests des précédents

**Fait [VÉRIFIÉ]** :

- `zod-to-typescript` : un fichier `*.test.ts` à côté de chaque transformer, plus un snapshot
  global (`scripts/__snapshots__/ZodToTypescript.test.ts.snap`).
- `zod-accelerator` : un test par accelerator, comparaison différentielle avec Zod, messages
  d'erreur vérifiés en dur, benchs séparés.
- `types-codegen` : un test par fonction, snapshots pour le rendu.
- `tools` : dossier `tests/` miroir de `scripts/` — 160 fichiers de test, 222 assertions
  `toMatchSnapshot`. Un fichier par transformer par défaut (`tests/toTypescript/structure/union.test.ts`,
  `tests/toTypescript/constraint/email.test.ts`...), plus des tests transverses
  (`recursion.test.ts`, `hooks.test.ts`, `override.test.ts`, `importContext/`).
- `tools/integrations/toTypescript.test.ts` (463 lignes) : teste le paquet construit via ses
  points d'entrée publics, avec chaînes attendues en dur (`toBe([...].join("\n"))`) et non des
  snapshots.
- `vitest.config.ts` de `tools` : `typecheck.enabled` avec fichiers `*.test-d.ts`.
- Chaque test passe par le point d'entrée complet (`render`) avec les listes par défaut,
  rarement par un transformer isolé ; chaque fichier ajoute un scénario « métier » composé.
- `lang-tools` versionne un skill `write-unit-tests` (`.agents/skills/write-unit-tests/`).
- Dans `lang-tools`, les tests sont arrivés le lendemain du code (`511d4de`, 2026-08-17, après
  `525c447` du 2026-08-16) ; le commit suivant (`c6c4b79`, 2026-08-18) réécrit le cœur.
  **[HYPOTHÈSE]** lien de cause à effet entre les deux.

**Leçon pour le transpileur** — combinaison qui a tenu : (1) snapshot par transformer à
travers le point d'entrée réel, (2) quelques sorties attendues en dur pour ce qui ne doit
jamais bouger, (3) tests dédiés aux mécanismes transverses (récursion, imports, ordre),
(4) test différentiel de comportement. Les snapshots seuls valident la stabilité, pas la
justesse : aucun précédent ne compile le TypeScript généré dans ses tests unitaires.

**Cas à anticiper** — pour Go, ajouter ce que les précédents n'ont pas : faire passer la sortie
par `gofmt`/`go vet`/`go build`. Un snapshot peut figer du code qui ne compile pas.

---

## 25. Évolution `lang-tools` → `ecosystem/packages/tools`

**Fait [VÉRIFIÉ]** — historiques git des deux dépôts.

- `lang-tools` s'arrête au 2026-09-03 (`708d152`). `ecosystem/packages/tools` apparaît le
  2026-09-11 (`3d696ca`, « feat(hf): add tools ») avec la même arborescence : migration vers le
  monorepo pnpm.
- Ajouts dans le monorepo : `structureFinder` (`9684571`), dispatch de types pour
  `toDataStructure` (`af90015`), support du type fichier serveur (`5fbc57c`), optionnels
  JSON Schema (`4ea71f2`), types `date`/`time` (`08d37c4`), API native TypeScript 7 (`fd6b4b5`).
- Correctif d'erreurs `b962858` : les types d'`Either` d'erreur sont unifiés entre
  `toTypescript` et `toJsonSchema`.
- Renommages : `DataStructureToJSON` → `toJsonSchema` et espace de noms des kinds (`2cee7eb`).
- `structureFinder` (`scripts/structureFinder/index.ts`) : parcours générique qui collecte les
  structures satisfaisant un prédicat ; même motif de liste (`researchers`) avec
  `createResearcher(predicate, researcher)` et garde anti-cycle par `Set` (`ignore`).

**Pourquoi [HYPOTHÈSE]** — regrouper `lang`, `server`, `tools` et `code-config` dans un même
dépôt permet de faire évoluer ensemble la structure de données et ses transformers (les
commits `fix:lang` et `fix:tools` alternent le même jour).

**Leçon pour le transpileur** — `structureFinder` montre qu'un parcours sans transformation
réutilise le même motif (liste de visiteurs + prédicat + ensemble des visités). Utile pour une
pré-passe d'analyse (collecte des symboles, des imports, des fonctions récursives).

---

## 26. `@duplojs/server` : organisation et abstraction multi-runtime

**Fait [VÉRIFIÉ]** — `ecosystem/packages/server/scripts/implementor.ts`, `index.ts`,
`package.json`.

- Quatre points d'entrée : `@duplojs/server/command`, `/file`, `/common`, `/dataStructure`.
  Espaces de noms imposés par le lint : `DSCommand`, `DSFile`, `DSCommon`, `DSDataStructure`.
- Chaque fonction système est déclarée par `implementFunction(nom, { NODE, BUN?, DENO? })` ;
  l'implémentation Node sert de repli pour Bun et Deno.
- Détection de l'environnement : `Deno` défini → `DENO`, sinon `Bun` → `BUN`, sinon `NODE`.
  `setEnvironment("TEST")` bascule sur des implémentations fournies par
  `TESTImplementation.set(nom, fn)` ; une fonction non fournie lève
  `Missing function implementation "<nom>" in TEST environment.`
- Modules Node chargés paresseusement par `process.getBuiltinModule` (`require` sous Bun).
- Les chemins sont des chemins virtuels POSIX typés (`DPath.AnyPath`) ; `toPlatformPathOrThrow`
  les convertit pour Windows et lève `InvalidPlatformPathError` s'ils sont irreprésentables.

Ascendance : `server-utils` (`@duplojs/utils >=1.10.1`, module `dataParser`) → dépôt `server`
(`@duplojs/lang`, module `dataStructure`) → `ecosystem/packages/server`.

**Leçon pour le transpileur** — le mode `TEST` permet de tester le CLI sans toucher au disque :
remplacer `writeTextFile`, `ensureDirectory`, `remove` par des fonctions en mémoire.

**Cas à anticiper** — la conversion de chemin lève une exception au lieu de renvoyer un
`Left` : c'est le seul endroit de l'API fichier où une erreur n'est pas un `Either`.

---

## 27. `@duplojs/server/file` : forme des résultats et des erreurs

**Fait [VÉRIFIÉ]** — `ecosystem/packages/server/scripts/file/*.ts`.

Toutes les fonctions sont asynchrones et renvoient un `Either` de la forme :

- succès : `DEither.Right<"file-system-<operation>", valeur>` ;
- échec : `DEither.Left<"file-system-<operation>-error", ErreurTypée>`.

L'erreur est une instance d'une classe par cause, construite à partir du code système :
par exemple `RemoveErrorNotFound`, `RemoveErrorPermissionDenied`, `RemoveErrorIsDirectory`,
`RemoveErrorNotDirectory`, `RemoveErrorDirectoryNotEmpty`, `RemoveErrorReadOnly`,
`RemoveErrorInvalidArgument`, `RemoveErrorBusy`, et `RemoveError` pour le reste. Chaque classe
dérive de `DCommon.DuploJSError.parentClass("<kind>", Error)` et encapsule l'erreur native.

Fonctions utiles à un CLI de génération :

| Fonction | Succès | Remarques |
|---|---|---|
| `remove(path, { recursive? })` | `"file-system-remove"` | Node : `fs.rm` avec `force: true`, un chemin absent n'est pas une erreur. Deno : pas de `force`. |
| `ensureDirectory(path)` | `"file-system-ensure-directory"` | `mkdir` récursif, idempotent |
| `writeTextFile(path, data)` | `"file-system-write-text-file"` | UTF-8 ; forme curryfiée `writeTextFile(data)(path)` ; ne crée pas le dossier parent |
| `readTextFile(path)` | `"file-system-read-text-file"` → `string` | |
| `readJsonFile(path)` | `"file-system-read-json-file"` → `DCommon.Json` | |
| `exists(path)` | `"file-system-exists"` | l'absence est un `Left` (`ExistsErrorNotFound`), pas `false` |
| `stat(path)` | `"file-system-stat"` → `StatInfo` (`isFile`, `isDirectory`...) | |
| `readDirectory`, `walkDirectory` | liste / générateur | |
| `copy`, `move`, `rename`, `relocate`, `makeTemporaryDirectory` | idem | |

`createFileInterface(path)` / `createFolderInterface(path)` : objets portant `path`,
`getName()`, `getExtension()`, `getMimeType()`, `getParentPath()`, `exists()`, `stat()`,
`remove()`, `isFile()`.

Historique [VÉRIFIÉ] : dans `server-utils` et le dépôt `server`, l'échec était
`left("file-system-remove", erreurNativeBrute)` et le succès `E.ok()`. Les classes d'erreur
typées et le suffixe `-error` arrivent avec `3f50686` (2026-09-24, « api file curried
declaration + error handler ») et `5542333` (2026-10-09, « refactor:server(hf): file error »).

**Leçon pour le transpileur** — dans `bin/index.ts` du hackathon, le résultat de
`DSFile.remove(output, { recursive: true })` n'est pas inspecté. Sous Node c'est sans
conséquence pour un dossier absent (`force: true`), mais une erreur de permission passerait
inaperçue. À signaler, hors périmètre de cette note.

**Cas à anticiper** — `mimeType` et `getMimeType()` déduisent le type de l'extension du nom,
pas du contenu.

---

## 28. `@duplojs/server/command` : `exec`, options, arguments

**Fait [VÉRIFIÉ]** — `ecosystem/packages/server/scripts/command/exec.ts`, `create.ts`,
`options/`, `argument.ts`, `error.ts`.

- `exec(params, execute)` ou `exec(execute)` : construit une commande racine (nom d'affichage
  `"root"` par défaut), lit `DSCommon.getProcessArguments()`, exécute. Renvoie
  `Promise<DEither.Ok | DEither.Error<Error>>`.
- En cas d'erreur d'analyse : affiche le message interprété sur `console.error` et renvoie
  `DEither.error(error)`. `exec` ne modifie pas le code de sortie du processus. Aucun
  `try/catch` autour du callback : une exception levée dans `execute` rejette la promesse.
- `params` : `description`, `options` (tuple), `subjects` (tuple d'arguments positionnels ou
  de sous-commandes créées par `create(name, params, execute)`), `displayName`,
  `dataStructureErrorInterpreter`.
- `createOption(name, dataStructure, { required?, description?, aliases? })` : option à
  valeur. Si `required: true`, le type du résultat exclut `undefined`.
- `createBooleanOption`, `createArrayOption` : variantes drapeau et liste.
- `createArgument(name, dataStructure, { optional?, description? })` : positionnel.
- `execOptions(options, params)` : analyse d'options sans commande.
- Syntaxe reconnue : `--nom valeur`, `--nom=valeur` ; les alias ne sont acceptés qu'avec un
  seul tiret. L'option intégrée `--help` (alias `-h`, `command/help.ts`) affiche l'aide et
  n'exécute pas le callback.
- Contraintes au niveau des types : noms en double interdits (`ForbiddenDuplicateName`),
  identifiants invalides interdits (`ForbiddenInvalidIdentifier`), argument optionnel avant un
  obligatoire interdit (`ForbiddenBadOrderArguments`).
- Les valeurs sont décodées par `dataStructure.asyncDecode(DSDataStructure.codecsString, valeur)`.

Forme de l'erreur : objet `Error` avec `issues` (objets tagués) et `currentPath`. Tags :
`RequiredOptionIssue`, `RequiredOptionValueIssue`, `UnexpectedOptionValueIssue`,
`DataStructureOptionIssue` (porte `dataStructureError`), `RequiredArgumentIssue`,
`DataStructureArgumentIssue`, `TooMuchCommandArgumentIssue`, `UnknownOptionIssue`,
`UnknownSubCommandIssue`. Toutes les erreurs d'options sont collectées avant de s'arrêter
(`1202ccb`, « keep all options error ») ; options et sous-commandes inconnues détectées depuis
`cf03f81`.

**Leçon pour le transpileur** — `bin/index.ts` fait `await DSCommand.exec(...)` sans lire le
résultat : avec des options invalides, le message s'affiche mais le processus sort avec le
code 0. Pour un outil utilisé en CI, il faut tester le `Left` et appeler
`DSCommon.exitProcess(1)`. Les erreurs de transpilation, elles, sortent bien en erreur grâce à
`DEither.unwrapRightOrThrow` dans le callback.

---

## 29. `@duplojs/server/dataStructure` et `/common`

**Fait [VÉRIFIÉ]** — `ecosystem/packages/server/scripts/dataStructure/`, `common/`.

`dataStructure` :

- `file(constraints?)` : structure dont la valeur est un `FileInterface`.
- `folder(constraints?)` : structure dont la valeur est un `FolderInterface`. Sans contrainte,
  le dossier n'a pas à exister (adapté à un dossier de sortie).
- `fileExist()` : contrainte asynchrone ; `stat()` doit réussir et `isFile` être vrai.
- `folderExist()`, `size(...)` : contraintes analogues.
- `mimeType(motif)` : contrainte synchrone ; teste une regex contre le type MIME déduit de
  l'extension (chaîne vide si inconnu).
- `codecsString` : étend les codecs chaîne de `@duplojs/lang` ; pour `file`/`folder`, décode
  une chaîne par `DPath.normalize` puis `createFileInterface`/`createFolderInterface`, et
  renvoie une erreur si le chemin n'est pas normalisable.

Renommages : `file` (contrainte) → `fileExist` (`f957819`), ajout de `folder` (`17922a1`,
`587ca94`), le 2026-10-08.

`common` :

- `getCurrentWorkDirectory()` : `DEither.Success<string & DPath.Absolute> | DEither.Error<unknown>`.
- `getCurrentWorkDirectoryOrThrow()` : lève `GetCurrentWorkDirectoryError`.
- `setCurrentWorkingDirectory(path)` : `DEither.Ok | DEither.Fail`.
- `getProcessArguments()` : `string[]` (arguments après le script, mis en cache).
- `exitProcess(code?)`.
- `environmentVariable(shape, params)` : lecture et validation de variables et fichiers `.env`.
- `getCurrentDirectoryName(import.meta)`.

**Leçon pour le transpileur** — une option `DSDataStructure.file([fileExist(), mimeType("application/json")])`
valide l'existence et l'extension avant même d'entrer dans le callback : l'échec est rapporté
comme `DataStructureOptionIssue`. Mais le chemin reçu est celui tapé par l'utilisateur
(normalisé, pas résolu) : il faut le résoudre soi-même contre le répertoire courant, ce que
fait `bin/index.ts` avec `DPath.resolveFrom`.

**Cas à anticiper** — `mimeType("application/json")` rejette un `tsconfig` nommé autrement
qu'en `.json` (par exemple `.jsonc`).

---

## 30. `code-config` : configuration TypeScript imposée

**Fait [VÉRIFIÉ]** — `ecosystem/packages/code-config/tsconfig/base.json`, étendu par
`hackathon-11-2026/tsconfig.app.json`.

- `target`/`module`/`lib` : `ESNext` ; `moduleResolution: "Bundler"` ; `moduleDetection: "force"`.
- `noEmit: true`, `isolatedModules: true`, `skipLibCheck: true`.
- `strict: true` et toutes les options strictes répétées explicitement.
- `noUncheckedIndexedAccess: true` : tout accès indexé est `T | undefined`.
- `noImplicitReturns: true`, `noImplicitOverride: true`, `useUnknownInCatchVariables: true`.
- `build.json` : émet `dist` avec déclarations et `stripInternal`.

Aucune justification écrite dans le dépôt pour ces choix.

**Leçon pour le transpileur** —
- `noUncheckedIndexedAccess` explique les `[0]!` dans les sources lues
  (`createIdentifier.ts`, `record.ts`) et s'applique au code du transpileur.
- Ce tsconfig décrit aussi le TypeScript que les projets d'entrée respecteront
  **[HYPOTHÈSE]** : un accès indexé y est typé `T | undefined`, ce que le type checker
  rapportera et qu'il faudra traduire.
- `isolatedModules` : pas de `const enum` ni de ré-export de type sans `type`.

---

## 31. `code-config` : règles de lint structurantes

**Fait [VÉRIFIÉ]** — `ecosystem/packages/code-config/scripts/oxlint/base.ts`, `engine.ts`.
Moteur : oxlint avec analyse typée (`typeAware: true`, `oxlint-tsgolint`), plugins
`typescript`, `eslint`, `@stylistic` et `duplojs-plugin`. Toutes les catégories par défaut
d'oxlint sont désactivées : seules les règles listées s'appliquent.
`reportUnusedDisableDirectives: "error"`.

Règles qui contraignent la façon d'écrire :

- `func-style: declaration` — fonctions déclarées, pas de `const f = () =>`.
- `max-params: 4` — d'où les objets de paramètres omniprésents.
- `no-magic-numbers` — nombres littéraux interdits hors énumérations et types.
- `id-length` — pas d'identifiant d'une lettre.
- `init-declarations: always` — toute variable initialisée à la déclaration.
- `no-param-reassign`, `no-nested-ternary`, `no-bitwise`, `no-eval`, `no-var`, `prefer-const`.
- `no-use-before-define`, `max-classes-per-file`, `new-cap`.
- `curly`, `eqeqeq`, `prefer-template`, `arrow-body-style: as-needed`.
- `typescript/no-explicit-any`, `no-unsafe-argument`, `no-unsafe-call`,
  `no-unsafe-member-access`.
- `typescript/no-floating-promises`, `require-await`, `return-await`.
- `typescript/consistent-type-imports` (imports de type en ligne),
  `consistent-type-definitions`, `method-signature-style: method`,
  `explicit-member-accessibility`.
- `typescript/ban-ts-comment` : `@ts-expect-error` uniquement avec description.
- `typescript/no-confusing-void-expression` avec `ignoreVoidOperator` — d'où les `void expr`
  dans les callbacks.
- `no-console: warn`, `no-unused-vars: warn` (préfixe `_` toléré).
- Désactivées notables : `no-non-null-assertion`, `no-await-in-loop`, `no-continue`,
  `no-shadow`, `no-labels`, `switch-exhaustiveness-check`, `prefer-nullish-coalescing`,
  `strict-boolean-expressions`.

Aucune justification règle par règle n'est écrite dans le dépôt.

---

## 32. `code-config` : règles de style, règles maison et jeux `open`/`test`

**Fait [VÉRIFIÉ]** — `ecosystem/packages/code-config/scripts/oxlint/base.ts`, `open.ts`,
`test.ts`, `plugin/rules/`, `createOxlintOverride.ts`.

Style (`@stylistic`) : indentation par tabulation, guillemets doubles, point-virgule
obligatoire, virgule finale en multi-ligne, `max-len: 120` (chaînes, gabarits et regex
exclus), parenthèses toujours autour des paramètres de flèche, opérateur en début de ligne
(sauf `=`), une propriété d'objet par ligne, pas d'espace avant la parenthèse de fonction,
une ligne vide au plus, fins de ligne Unix, commentaires au-dessus de la ligne.

Règles du plugin maison `duplojs-plugin` :

- `prefer-namespace-import` : `@duplojs/lang/array` s'importe en `import * as DArray` ; table
  complète des alias (`DCommon`, `DEither`, `DPath`, `DPrinter`, `DSFile`, `DSCommand`...).
- `prefer-namespace-from-barrel` : interdit d'importer ces espaces de noms depuis le barrel
  `@duplojs/lang` ou `@duplojs/server`.
- `prefer-import-path` : les symboles non exemptés s'importent du sous-chemin
  (`@duplojs/lang/common`).
- `camelcase`, `dot-notation`, `prefer-destructuring` (tableaux), `no-unreachable-loop`.

Ces trois règles d'import sont auto-corrigeables (`fixable: "code"`) ; elles remplacent une
ancienne `no-restricted-import` supprimée en `9d391f7` (« rework Oxlint », 2026-10-15).

Jeux optionnels composés par `createOxlintOverride({ files, ruleset, customRules })`, dans
l'ordre `base`, `open`, `test`, `customRules` :

- `open` désactive `func-style`, `max-classes-per-file`, `new-cap`, `no-bitwise`, `no-eval`,
  `no-magic-numbers`, `no-use-before-define`, `typescript/await-thenable`,
  `typescript/no-explicit-any`, `use-unknown-in-catch-callback-variable`.
- `test` désactive en plus les règles `no-unsafe-*` et `no-unused-vars`.

Le hackathon applique `ruleset: { open: true }` à `src/**`, `projects/**`, `bin/**`
(`hackathon-11-2026/oxlint.config.ts`).

**Leçon pour le transpileur** — même en jeu `open`, restent actifs : `max-params: 4`,
`id-length`, `init-declarations`, `no-param-reassign`, `no-nested-ternary`,
`no-floating-promises`, `no-unsafe-call`/`-member-access`/`-argument`, les imports en espace
de noms et tout le style. Le convertisseur TS → Go doit donc s'attendre, dans les projets
d'entrée, à du code sans réassignation de paramètre, sans ternaire imbriqué, avec imports
`import * as DX from "@duplojs/lang/x"` : c'est une forme d'entrée très régulière qu'un
transformer peut exploiter (résolution d'un appel `DArray.map` par le nom d'espace de noms et
le module).

**Cas à anticiper** — l'alias d'espace de noms est une convention de lint, pas une garantie :
un projet peut désactiver la règle. Résoudre par le module d'origine (type checker), pas par
le nom `DArray`.

---

## 33. `code-config` : commits, binaires, ascendance et `dev-tools`

**Fait [VÉRIFIÉ]** — `ecosystem/packages/code-config/scripts/commitlint/index.ts`,
`scripts/bin/oxlint.ts`, `package.json`.

- Format de commit imposé : `type(:scope)?(référence): sujet`, par exemple
  `feat:tools(hf): add structure finder`. Types : `feat`, `fix`, `docs`, `refactor`,
  `config`, `test`, `ci`. La partie entre parenthèses est une référence (numéro d'issue ou mot
  comme `hf`), pas un scope. En-tête de 100 caractères au plus, sans point final.
- Binaires : `duplojs-oxlint` (positionne `OXLINT_TSGOLINT_PATH` puis lance oxlint) et
  `duplojs-commitlint`.
- Commandes du hackathon : `.commands/test-lint.sh` → `duplojs-oxlint --quiet` ;
  `.commands/test-types.sh` → `tsc -p tsconfig.app.json` puis `tsc -p tsconfig.config.json`.
- Ascendance : dépôt `eslint` (`@duplojs/eslint`, ESLint flat config, jeux
  `duplojsEslintBase`/`duplojsEslintOpen`/`duplojsEslintTest`, dernier commit `7d81c48`
  2025-08-16) → dépôt `code-config` (oxlint, `52deb8e` 2026-09-08) →
  `ecosystem/packages/code-config`. Les trois jeux `base`/`open`/`test` existent depuis la
  version ESLint.
- Vérification de types ajoutée au lint en `127fe00` (2026-09-14).

`dev-tools` (`d45bb23`, 2026-07-09) : deux plugins de build, `generateMetadata` et
`declarationIncludes` (`dev-tools/scripts/`). README réduit au badge npm ; non étudié en
détail, sans lien direct avec la transformation de code.

**Pourquoi [HYPOTHÈSE]** — passage d'ESLint à oxlint pour la vitesse et l'analyse typée
native ; non documenté.

---

## 34. Synthèse : ce qui a tenu, ce qui a été abandonné

**A tenu sur quatre générations [VÉRIFIÉ]** :

- liste ordonnée de petits transformers, un fichier par cas ;
- délégation des enfants par une fonction fournie au transformer ;
- table `Map` indexée par identité, à la fois cache, garde de récursion et registre de sortie ;
- marqueur provisoire posé avant la descente, remplacé à la remontée ;
- construction d'un AST de la cible, impression en un seul endroit ;
- hooks de remplacement du nœud d'entrée et override par nœud ;
- un test snapshot par transformer à travers le point d'entrée public.

**A été abandonné [VÉRIFIÉ]** :

- registre global rempli à l'import → liste explicite passée en paramètre ;
- prédicat booléen sans notion d'échec → `Either` nommé à trois issues ;
- repli silencieux vers `unknown` → `Left "...NotSupport"` ;
- contraintes ignorées si non supportées → erreur ;
- génération par concaténation de texte et `eval` → dépôt archivé ;
- objet d'analyse préalable riche (`analysis.ts`) → simple liste de nœuds récursifs ;
- fabrique générique de transformers avec cast → fichiers explicites typés ;
- table d'imports globale → imports rattachés à chaque déclaration ;
- inspection du nœud produit pour retrouver l'optionalité → champ dans le payload de succès ;
- erreurs fichier natives brutes → classes d'erreur typées par cause.

**Reste ouvert, sans précédent dans l'organisation** : génériques du code source, absence
d'unions dans la cible, mots réservés de la cible, validation du code généré par le
compilateur cible, et entrée sous forme d'AST non annotable par l'utilisateur.
