# 04 — agents-kit, documentation et philosophie de l'écosystème DuploJS

Notes de recherche (lecture seule) pour le hackathon « transpiler du TypeScript DuploJS vers Go ».

- Monorepo étudié : `/private/tmp/claude-502/-Users-j-neupert--claude-spares-spare-fytFim/08bcf94a-b274-45f9-8c9f-cee7cf3e984f/scratchpad/duplojs/ecosystem` (noté `ecosystem/` ci-dessous), HEAD `5c5ca34` (2026-11-14), 306 commits du 2026-09-09 au 2026-11-14.
- Profil d'organisation : `scratchpad/duplojs/.github/profile/README.md`.
- Légende : **[VÉRIFIÉ]** = lu dans le fichier ou le commit cité. **[HYPOTHÈSE]** = inférence de ma part, à confirmer.
- Chaque section est autonome (pensée pour un découpage en chunks).

---

## 0. Écart de version à connaître avant de lire le reste

**Fait [VÉRIFIÉ]** Le projet du hackathon lie quatre skills depuis `@duplojs/agents-kit@0.1.0-beta.11` : `duplojs-command`, `duplojs-fundamental`, `duplojs-modeling`, `duplojs-server` (liens symboliques dans `/Users/j.neupert/hackathon-11-2026/.agents/skills/`). Le monorepo à HEAD en distribue sept : `command`, `fundamental`, `http-client`, `http-server`, `modeling`, `server`, `test` (`ecosystem/packages/agents-kit/skills/`).

**Fait [VÉRIFIÉ]** Au moment de la recherche, `node_modules` n'était pas installé dans le projet du hackathon : je n'ai pas pu comparer le contenu de la beta.11 au HEAD du monorepo.

**Conséquence** Tout ce qui suit décrit le HEAD du monorepo. Avant de s'appuyer sur une règle précise (noms de fonctions `loopAccumulator`, `keepAsRightByInformation`, etc.), vérifier qu'elle existe dans la version installée. Les boucles `loopAccumulator` datent du commit `1f65858` (2026-11-10), donc très récent.

---

## 1. Philosophie et principes de l'écosystème

### 1.1 Positionnement général : robuste, typé de bout en bout, opinioné

**Fait [VÉRIFIÉ]** Le profil d'organisation (`.github/profile/README.md`) annonce trois promesses : typage de bout en bout (« from user input all the way through to your business logic »), écosystème unifié et agnostique de l'environnement via des connecteurs modulaires, approche opinionée inspirée du DDD et de la programmation fonctionnelle.

**Fait [VÉRIFIÉ]** `ecosystem/AGENTS.md` : « L'écosystème vise à rendre le développement TypeScript plus robuste en s'appuyant sur la programmation fonctionnelle et le Type-Driven Development. » Le `README.md` racine dit « functional programming and Type-Driven Design ».

**Pourquoi** La robustesse est recherchée par le typage plutôt que par les tests seuls : un état invalide doit être irreprésentable ou refusé à la compilation.

**Conséquence pour le projet** Le transpileur est jugé par des gens pour qui « ça compile et ça passe » ne suffit pas : ils regardent si les garanties sont portées par les types et si les refus sont explicites.

### 1.2 Programmation fonctionnelle et immutabilité

**Fait [VÉRIFIÉ]** `ecosystem/packages/lang/AGENTS.md`, section Principes : programmation fonctionnelle, immutabilité, comportements explicites et prédictibles, forte exploitation du système de types, Type-Driven Development, Domain-Driven Development. Le package fournit « des alternatives fonctionnelles aux opérations pouvant introduire de la mutation ».

**Pourquoi [VÉRIFIÉ]** `docs/concepts/01-fundamental/01-constraint/20-manipulation.ts` : « Privilégier les transformations immuables : une mutation pourrait invalider une garantie. » L'immutabilité n'est donc pas un goût esthétique : une contrainte de type (longueur minimale, tri, format) ne reste vraie que si la valeur ne change pas sous elle.

**Fait [VÉRIFIÉ]** Skill `fundamental` : « Privilégier fonctions pures, immutabilité et transformations explicites ; isoler les interactions avec l'environnement. »

**Conséquence pour le projet** En Go, les slices et maps sont mutables et partagées. Le code Go généré doit préserver la sémantique « nouvelle valeur à chaque transformation » des `DArray.*`, sinon les garanties TypeScript sont fausses côté Go. **[HYPOTHÈSE]** C'est un point de fidélité sémantique que le jury peut tester.

### 1.3 Either pour le contrôle de flux, exceptions réservées à la frontière

**Fait [VÉRIFIÉ]** `docs/concepts/01-fundamental/03-either/50-external-results.ts` : une issue prévisible et exploitable (donnée invalide, absence, refus) appartient au contrat de résultat, y compris pour les opérations techniques. Les défaillances imprévues remontent implicitement. « Un throw explicite ou une conversion par OrThrow appartient à la consommation finale du résultat, lorsque la frontière d'exécution décide de sa conséquence. La distinction dépend du rôle de l'échec, pas de sa rareté ni du coût de propagation. »

**Fait [VÉRIFIÉ]** Un Either porte trois choses : un statut (Right ou Left), une **information** (littéral qui nomme le cas) et une valeur (`03-either/01-use.ts`). Variantes fournies : Right = `Success`, `Some`, `Result`, `Ok` ; Left = `Fail`, `Error`, `None`.

**Pourquoi** L'information obligatoire permet une discrimination exhaustive par le compilateur : ajouter un cas au contrat casse les consommateurs qui ne le traitent pas (`03-either/20-exhaustive-handling.ts` : « Cela place la décision dans la couche qui doit la prendre »).

**Conséquence pour le projet** C'est la correspondance la plus naturelle avec Go (`value, err`), mais l'Either DuploJS est plus riche : N variantes nommées, pas seulement deux. Une traduction en `(T, error)` perd l'information. Le commit `c9fe1ca` du projet hackathon (« generate Either success return types ») montre que le sujet est déjà actif.

### 1.4 Contraintes de typage : des preuves sans coût runtime

**Fait [VÉRIFIÉ]** `01-constraint/01-use.ts` : « Une contrainte existe uniquement dans le typage : elle ne modifie ni ne valide la valeur. » Elles se composent par intersection (`number & DNumber.Integer & DNumber.Positive`) et s'acquièrent par un prédicat runtime qui fait du narrowing.

**Fait [VÉRIFIÉ]** `lang/AGENTS.md` : « Les contraintes sont un mécanisme fondamental de `@duplojs/lang` » et « considérer le comportement runtime et le comportement TypeScript comme faisant partie du même contrat ».

**Pourquoi** Vérifier une fois à la frontière, puis faire circuler la preuve dans les types pour ne plus revérifier (« réutiliser les garanties établies », skill `fundamental`). Les fonctions de l'écosystème exploitent ces preuves : `DString.split(email, "@")` retourne un tableau `MinElements<2>`, `DArray.first` sur ce tableau retourne `string` et non `string | undefined`.

**Conséquence pour le projet** Les contraintes n'ont aucune trace runtime : en Go elles s'effacent (ou deviennent des types nommés). **[HYPOTHÈSE]** Le transpileur peut les ignorer à l'émission, mais doit les comprendre à l'analyse : elles changent les types de retour (absence de `undefined`), donc la forme du code Go correct.

### 1.5 Kinds : identité nominale dans un langage structurel

**Fait [VÉRIFIÉ]** `01-fundamental/08-kind/01-identity.md` : « De nombreux objets DuploJS portent des kinds pour être reconnus et distingués malgré le typage structurel de TypeScript. Ces clés textuelles au runtime, représentées sous un symbole dans les types, portent identité et métadonnées. »

**Fait [VÉRIFIÉ]** `08-kind/20-metadata.md` : un objet peut porter plusieurs kinds ; dans un `Right` ils contiennent le statut, l'information et la valeur. « Contrairement aux kinds, les contraintes de typage n'ajoutent aucune propriété à la valeur. »

**Pourquoi [VÉRIFIÉ]** `08-kind/30-transport.md` : les clés dépendent du nom et du namespace, donc un autre programme connaissant la convention reconnaît la donnée après désérialisation JSON, là où `instanceof` échoue faute de prototype.

**Fait [VÉRIFIÉ]** « Les kinds servent surtout à construire les outils ; utiliser DuploJS ne demande généralement pas de les manipuler directement. »

**Conséquence pour le projet** Distinction capitale pour un transpileur : **contrainte = type seul (effaçable), kind = donnée runtime (à représenter)**. Un `Either`, un `TaggedObject`, une `Entity`, une `DuploJSError` ont une identité runtime ; en Go cela correspond naturellement à des types nommés ou des unions scellées. **[HYPOTHÈSE]** Si la sortie Go doit rester interopérable en JSON avec du DuploJS, il faut préserver les clés de kind.

### 1.6 DDD devenu « Type-Driven Design »

**Fait [VÉRIFIÉ]** Skill `modeling` : « Ici, TDD signifie **Type-Driven Design**. Le domaine exprime le métier et impose ses garanties par ses types. »

**Fait [VÉRIFIÉ]** `05-type-driven-design/01-architecture/10-boundaries.md` : dépendances `Infrastructure → Application → Domaine` et `Infrastructure → Domaine`. « Une règle encore à décider dans un use case ou un adaptateur indique un contrat métier incomplet. »

**Pourquoi** Changer de base de données ou de protocole d'entrée ne doit pas changer les transitions du domaine. Les préconditions métier deviennent des exigences de typage (`Entity & Flag`, `Evidence`).

**Conséquence pour le projet** Les exercices du hackathon (commits `8162323`, `9e2995c` du projet) utilisent probablement ces primitives **[HYPOTHÈSE]** ; le transpileur doit au minimum savoir traverser `createNewType`, `createEntity`, `createTaggedObject`, `createFlag`, `createFact`, `createWorkflow`.

### 1.7 Agnosticisme du runtime

**Fait [VÉRIFIÉ]** `lang/AGENTS.md` : « `@duplojs/lang` ne dépend d'aucune plateforme d'exécution » ; navigateur, Node.js, Bun, Deno. `ecosystem/AGENTS.md` : `lang` « repose uniquement sur les API du langage JavaScript » ; `server` « abstrait les API serveur de Node.js, Bun et Deno ».

**Fait [VÉRIFIÉ]** `02-server/30-environment/10-platform.ts` : les capacités proches entre runtimes passent par une même API ; les capacités liées au runtime passent par un connecteur (`@duplojs/http/node`). Skill `server` : « Utiliser cette abstraction sans ajouter de branchement par runtime ».

**Pourquoi** Ne pas enfermer l'utilisateur dans un runtime, et pouvoir remplacer les capacités dans les tests (`setEnvironment("TEST")`, `TESTImplementation.set`).

**Conséquence pour le projet** **[HYPOTHÈSE]** Go est, du point de vue des mainteneurs, « un runtime de plus ». Un transpileur qui mappe `DSFile.*`, `DSCommon.*` vers une petite bibliothèque Go équivalente prolonge exactement cette idée de connecteur, plutôt que d'inliner `os.ReadFile` partout.

### 1.8 Zéro dépendance externe et versions synchronisées

**Fait [VÉRIFIÉ]** `ecosystem/.agents/architecture.md` : les packages de production « doivent tendre vers zéro dépendance runtime externe à l'écosystème DuploJS ». Versionnement synchronisé, versions internes exactes, aucune plage `^` ou `~`. Quand une dépendance d'outil est nécessaire, elle est épinglée exactement (`@duplojs/tools` le fait pour TypeScript).

**Pourquoi [VÉRIFIÉ]** « Cette stratégie limite les changements de comportement non maîtrisés et l'exposition aux mises à jour inattendues de la chaîne de dépendances. »

**Conséquence pour le projet** Ajouter une dépendance npm au transpileur va contre la culture maison. Préférer `@duplojs/lang` et `@duplojs/tools` (qui expose l'API TypeScript, commit `fd6b4b5`).

---

## 2. Carte des concepts (`docs/concepts.llms.md`)

Source : `ecosystem/packages/agents-kit/docs/concepts.llms.md` (généré au build, 22 Ko) et les fichiers sous `docs/concepts/`. Le routeur affiche en clair le premier exemple de chaque domaine (fichier `01-*`) et met les autres en liens.

### 2.1 Contraintes de typage (`01-fundamental/01-constraint/`)

**Résumé [VÉRIFIÉ]** Garanties sur les valeurs. Cinq pages : acquisition (`01-use.ts`), composition des contraintes fournies (`10-built-in-constraint.ts`), manipulation (`20-manipulation.ts`), compatibilité statique (`30-cast.ts`), contraintes personnalisées (`40-custom-constraint.ts`).

**Règles**
- Une contrainte déclarée ne valide rien ; seule une vérification runtime (prédicat, `DataStructure`) établit la preuve.
- Avant de créer une contrainte, vérifier celles du domaine concerné.
- `DCommon.cast` ne valide pas : TypeScript doit prouver l'implication (`MinCharacters<15>` implique `MinCharacters<10>` ; `LessThan<10>` implique `LessThan<20>`), ou la valeur doit être un littéral.
- `DCommon.infer` fait la même chose en conservant le type littéral.
- Dans un paramètre générique, `cast` n'a pas de cible : écrire `DCommon.cast("...") satisfies string & DString.MinCharacters<10>`.
- Contrainte personnalisée : `interface Adult extends DCommon.Constraint<"example-adult"> {}` + prédicat réel + augmentation de `ComputeCastConstraintNumberRule` (`unknown` accepte, `CastError` refuse, `never` ignore).

**Erreurs signalées**
- `const age: Age = 12` est une erreur : le littéral seul ne porte pas la contrainte.
- Après `split`, les fragments ne sont plus typés `Email` : chaque transformation conserve, adapte ou supprime les contraintes.
- Une longueur minimale ne garantit pas les indices au-delà du minimum (`DArray.at(x, 10)` reste `string | undefined`).

### 2.2 Currification (`01-fundamental/02-currying/`)

**Résumé [VÉRIFIÉ]** Chaque opération existe en forme directe `op(data, params)` et curifiée `op(params)(data)`, la seconde étant faite pour `DCommon.pipe`. Pages : `01-use.ts`, `10-built-in-function.ts`, `20-inner-pipe.ts`, `30-async-pipe.ts`.

**Règles**
- Écrire l'appel curifié **directement** comme étape du pipe : c'est le pipe qui fournit le contexte d'inférence.
- Formater chaque pipe sur plusieurs lignes, un argument par ligne, fermeture sur sa propre ligne, même pour une donnée et une étape.
- Privilégier `pipe` dès qu'une donnée subit plusieurs transformations.
- Une fonction déjà unaire se passe telle quelle (`DArray.map(DString.trim)`, `DSFile.readTextFile`).
- `innerPipe` / `asyncInnerPipe` composent là où une callback est attendue.
- `asyncPipe` attend chaque **étape**, pas chaque élément : `DArray.map(asyncFn)` donne un tableau de promesses, à résoudre par `DCommon.promiseAll`.

**Erreurs signalées**
- Préparer une étape curifiée dans une variable puis la passer au pipe : l'inférence est perdue.
- Forcer cette préparation par génériques explicites, annotations ou casts.

**Pourquoi [VÉRIFIÉ]** `ecosystem/.agents/curried-functions.md` : « Les formes curifiées de l'écosystème ne sont pas principalement conçues pour préparer une fonction qui sera exécutée ultérieurement. » C'est une adaptation à `pipe`, pas de l'application partielle générale.

**Conséquence pour le projet** Un transpileur peut traiter `pipe(x, f(a), g(b))` comme du sucre pour `g(f(x, a), b)` : la forme curifiée a toujours un équivalent direct de même comportement (« le comportement et l'inférence de types doivent rester cohérents entre la forme directe et la forme curifiée »).

### 2.3 Either (`01-fundamental/03-either/`)

**Résumé [VÉRIFIÉ]** Sept pages : représentation (`01-use.ts`), discrimination et extraction (`10`), décisions exhaustives (`20`), composition avec propagation (`30`), adaptation au contexte (`40`), conversion des absences et exceptions (`50`), états contextualisés `Result` (`60`).

**Règles**
- Dès qu'une branche renvoie un Either, toutes en renvoient un ; `DEither.ok()` pour une réussite sans valeur. Ne pas mélanger Either et valeurs brutes.
- `rightPipe` / `rightAsyncPipe` transmettent la valeur déballée des Right et s'arrêtent au premier Left ; une valeur finale brute est enveloppée en `Success`.
- `group` / `asyncGroup` rassemblent des Right ou retournent le premier Left ; les getters sont appelés dans l'ordre, sans parallélisme.
- `keepAsRightSelection` (exhaustif) et `keepAsRightByInformation` (partiel) reclassent les statuts en conservant information et valeur.
- `rewriteInformation` renomme une information pour l'adapter au vocabulaire de l'appelant.
- `toMaybe` convertit `null` / `undefined` en `None`.
- `safeCallback` / `asyncSafeCallback` convertissent une exception en `SafeCallbackError` (valeur `unknown`).
- `Result<Info, Value>` est un Right marqué : il constate un état sans décider s'il est favorable.

**Erreurs signalées**
- Tous les `Result` sont des Right : `isRight` ne distingue rien, il faut `hasInformation`.
- Dans un `rightPipe`, l'étape suivante reçoit la valeur déballée, sans l'information : la sélection d'un état doit se faire dans la même callback (`innerPipe`).
- Un pipe ordinaire ne s'arrête pas sur un Left.
- `safeCallback` capture large : ne pas requalifier une panne technique en refus métier.
- Les valeurs calculées avant `group` ne peuvent pas être annulées.

### 2.4 DataStructure (`01-fundamental/04-data-structure/`)

**Résumé [VÉRIFIÉ]** « Une structure porte le même contrat dans TypeScript et au runtime. L'utiliser aux frontières du logiciel. » Pages : composition (`10`), contraintes (`20`), validation (`30`), codecs (`40`), récursivité (`50`), interprétation des erreurs (`60`).

**Règles**
- `check` valide une donnée déjà dans sa représentation interne ; `decode` transforme depuis une représentation externe puis valide ; `encode` fait l'inverse ; `is` est un prédicat sans détail d'erreur. Tous sauf `is` retournent un Either.
- Variantes `asyncCheck`, `asyncDecode`, `asyncEncode` ; une opération synchrone rencontrant une Promise retourne un Left `"async-error"`.
- Les contraintes d'une structure sont vérifiées au runtime **et** enrichissent le type (`StructureValue`).
- Un codec associe une transformation à un `FundamentalType` (`TheNumber`, `TheString`, `TheBigint`) : une seule structure décrit la donnée, les codecs changent sa représentation.
- Structure récursive : déclarer le type en amont, utiliser `lazy`, et `contract()` pour comparer strictement le type déclaré à la structure.
- Réutiliser les structures déjà définies pour en composer de plus grandes.

**Erreurs signalées**
- Appliquer une contrainte incompatible (`positive` sur une string) est une erreur de type.
- `is` retourne `false` sur une validation asynchrone.

**Conséquence pour le projet** **[HYPOTHÈSE]** Une `DataStructure` est une valeur runtime qui décrit un type : c'est à la fois une déclaration de struct Go et un validateur à générer. C'est le point où le transpileur doit produire deux artefacts depuis une seule expression.

### 2.5 Chrono (`01-fundamental/05-chrono/`)

**Résumé [VÉRIFIÉ]** `TheDate` = instant absolu, `TheTime` = durée. Pages : création, manipulation, sérialisation, fuseaux.

**Règles**
- Privilégier ces types aux `Date` et `number` natifs dans le domaine.
- `createDate("2026-09-30")` avec un littéral vérifié par le typage retourne directement `TheDate` ; avec une valeur runtime (`{ value: input }`) il retourne un Either. Même surcharge pour `createTime`.
- Les transformations produisent une nouvelle valeur.

**Erreur signalée** Ne pas supposer le retour : selon l'argument, la même fonction renvoie une valeur ou un Either.

### 2.6 Modélisation (`01-fundamental/06-modeling/`)

**Résumé [VÉRIFIÉ]** Six pages : `NewType` (`10`), `Entity` et hydratation (`20`), `TaggedObject` (`30`), cycle de vie avec `Flag` et `Fact` (`40`), `Evidence` (`50`), `SignedFunction` (`60`).

**Règles**
- `createNewType(nom, structure, contraintes)` donne une identité de typage sans changer la représentation runtime.
- `Entity` : identité explicite, propriétés en `NewType` ; `createEntityNamespace` préfixe les `NewType`.
- `new` quand les propriétés ont déjà leur typage ; `map` hydrate une donnée externe (Either) ; `decodeMap` décode d'abord avec des codecs ; `update` ne remplace pas une propriété par `undefined`.
- `Flag` certifie une condition actuelle ; `Fact` représente une création ou modification ; la shape de l'entité reste fixe, les variations passent par une union de `TaggedObject`.
- `Evidence` n'existe que dans le typage ; `appendEvidence` ne fait aucun contrôle ; `GetEvidenceResult` extrait d'un contrat de méthode la valeur portant l'évidence demandée.
- `SignedFunction` porte son identité **au runtime**, contrairement à une Evidence.

**Erreurs signalées**
- Deux méthodes annonçant même valeur et même évidence restent compatibles : pour distinguer les provenances, donner des noms d'évidence distincts.
- L'implémentation doit avoir réellement établi la garantie avant `appendEvidence`.

### 2.7 Discrimination (`01-fundamental/07-discrimination/`)

**Résumé [VÉRIFIÉ]** Sept pages : par entité, par fait, par tag, par erreur, par littéral, par forme, par prédicat.

**Règles**
- Chaque matcher dédié (`matchWithEntity`, `matchWithFact`, `matchWithTaggedObject`, `matchWithError`, `matchWithString`, `matchWithNumber`) est exhaustif et refuse les clés étrangères à l'union ; chacun a une variante `Otherwise` et une forme curifiée.
- « La sélection exhaustive crée un point d'ancrage dans le typage » : ajouter une variante force à compléter le matcher.
- `DPattern.match` (par forme) existe en builder (`.with().exhaustive()` / `.otherwise()`) et en pipe (`match`, `match`, `exhaustive`).
- `when` / `whenNot` discriminent par prédicat ; avec un type predicate la branche est retirée du type restant.

**Erreurs signalées**
- La discrimination par forme est « généralement à éviter dans le domaine » ; préférer une identité explicite quand le modèle est contrôlable.
- Un prédicat qui retourne seulement `boolean` n'élimine aucune variante : `exhaustive` devient indisponible, il faut `otherwise`.
- `matchWithError` exige des `DuploJSError` à identifiant littéral ; `Error` natif ne fournit pas ce contrat.

### 2.8 Kind (`01-fundamental/08-kind/`)

Voir la section 1.5. Trois pages Markdown : identité, métadonnées, transport. **Erreur signalée [VÉRIFIÉ]** : la présence d'un kind ne valide pas les données ; une propriété `undefined` est omise par JSON et une fonction n'est pas transportée.

### 2.9 Serveur (`02-server/`)

**Résumé [VÉRIFIÉ]** Fichiers (`10-file/`), HTTP (`20-http/`), environnement (`30-environment/`), commandes (`40-command/`).

**Règles**
- Les fonctions de `@duplojs/server/file` prennent des chemins contraints et retournent un Either ; le Left porte l'échec, sa valeur porte l'erreur précise.
- Un chemin reste une string enrichie de contraintes (`Path`, `Absolute`, `Segment`) ; une string dynamique doit être validée.
- `environmentVariableOrThrow` est adaptée au démarrage.
- Une commande avec sous-commandes ne déclare pas d'arguments au même niveau.

**Erreur signalée** Traiter toutes les erreurs de lecture comme une absence au lieu de conserver les autres.

### 2.10 Client, Tests, Type-Driven Design

**Résumé [VÉRIFIÉ]** `03-client/` (client HTTP typé, formulaires Vue), `04-tests/` (tests d'Either, mocking serveur, E2E Playwright), `05-type-driven-design/` (frontières, entités, agrégats, repositories, refinements, use cases, ports, infrastructure) avec des fixtures complètes d'une bibliothèque de prêt de livres sous `05-type-driven-design/fixtures/`.

**Règles TDD [VÉRIFIÉ]** (`02-domains/10-entities.md`, `20-aggregates.md`)
- Un agrégat est une **fonction pure** qui conduit une opération métier ; il n'appelle ni repository ni callback impure.
- Un fait modifie une seule entité cible ; deux cibles = deux faits coordonnés par l'agrégat.
- Le workflow (`createWorkflow`, générateur) déclare trois demandes : `commit` (confier une donnée), `resolve` (obtenir un contexte), `iterate` (appliquer à chaque élément d'un flux). L'application les satisfait avec `consumeWorkflow`.
- `Flag.append` appartient aux qualifications et aux faits qui établissent réellement la condition.

**Conséquence pour le projet** Peu pertinent pour le client et les formulaires. Pertinent pour les tests : `DCommon.ExpectType<A, B, "strict">` est l'outil standard de vérification de type et il apparaît dans presque tous les exemples (c'est un alias de type, effaçable en Go).

---

## 3. Carte du routeur API (`docs/API.llms.md`)

### 3.1 Comment retrouver une fonction

**Fait [VÉRIFIÉ]** Trois niveaux (`ecosystem/packages/agents-kit/.agents/skills/agents-kit-docs/SKILL.md`, commit `fe7d029`) :
1. `docs/API.llms.md` : sommaire des packages et domaines, avec une phrase par domaine.
2. `docs/API/<NN-package>/<NN-domaine>/index.llms.md` : une ligne par fonction (`### [DArray.map](10-map.ts)` + une phrase).
3. `docs/API/.../10-<fonction>.ts` : fichier TypeScript typé, avec JSDoc `@title` et exemples vérifiés par `DCommon.ExpectType`.

**Pourquoi [VÉRIFIÉ]** « Ce parcours évite de charger l'inventaire de toute la documentation pour trouver une ressource. »

**Depuis un projet consommateur [VÉRIFIÉ]** exports du package : `./docs/concepts.llms.md`, `./docs/API.llms.md`, `./docs/API/*/index.llms.md` (`packages/agents-kit/package.json`). Commande de repli donnée par chaque skill : `node --input-type=module -e 'import { fileURLToPath } from "node:url"; console.log(fileURLToPath(import.meta.resolve("@duplojs/agents-kit/docs/concepts.llms.md")))'`.

### 3.2 Domaines absents du routeur API

**Fait [VÉRIFIÉ]** Le routeur API couvre `10-lang`, `20-server`, `40-json-web-token`, `50-form`, `60-playwright`. Il n'y a pas de dossier `30-*` et aucune page API pour `@duplojs/http`.

**Fait [VÉRIFIÉ]** `@duplojs/lang` expose aussi `invocation`, `kind` et `modeling` (`lang/AGENTS.md`), mais ces trois domaines n'ont **aucune page** dans `docs/API/10-lang/`. Ils ne sont documentés que par les concepts (`06-modeling/`, `08-kind/`, TDD).

**Conséquence pour le projet** Pour `DModeling.*` et `DInvocation.*`, la seule source de vérité agent est la page de concept et les `.d.ts`. La consigne « ne pas inventer d'API » y est la plus risquée. **[HYPOTHÈSE]** `30` est réservé à `http`.

### 3.3 `@duplojs/lang` — fonctions par domaine

Listes extraites des `index.llms.md` **[VÉRIFIÉ]**.

- **DArray** : at, chunk, coalescing, concat, copyWithin, every, fill, fillAll, filter, find, findAndReplace, findAndSpliceDelete, findAndSpliceInsert, findAndSpliceReplace, findDuplicates, findIndex, findLast, findLastIndex, first, flat, flatMap, from, group, groupOutput, includes, indexOf, insert, is, isLastIndex, last, lastIndexOf, length, lengthEqual, map, maxElements, minElements, notIncludes, pop, prepend, push, reduce, reduceFrom, reduceRight, reverse, select, set, shift, slice, some, sort, spliceDelete, spliceInsert, spliceReplace, unshift.
- **DChrono** : addDays/Hours/Milliseconds/Minutes/Months/Seconds/Time/Weeks/Years, subtract* (mêmes unités), applyTimezone, betweenThan(OrEqual)Date/Time, closestTo, computeTime, createDate, createDateOrThrow, createTime, createTimeOrThrow, eachDate, equalDate, equalTime, formatDate, formatTime, getDayOfMonth/Week/Year, getDifference, getFirstDayOfMonth/Week, getLastDayOfMonth/Week, getHour, getMinute, getSecond, getMilliseconds, getMonth, getYear, getWeekOfYear, getTimezoneOffset, greaterThan(OrEqual)Date/Time, lessThan(OrEqual)Date/Time, isDate, isTime, isSafeTimeValue, isSafeTimestamp, isSerializedTheDate, isSerializedTheTime, makeSafeTimeValue, makeSafeTimestamp, maxDate, maxTime, minDate, minTime, now, round, serialize, sortDates, sortTimes, toDateISOString, toNative, toTimeValue, toTimestamp, today, tomorrow, yesterday.
- **DCommon** : and, asserts, asyncInnerPipe, asyncLoop, asyncLoopAccumulator, asyncPipe, callThen, cast, clone, createAsyncRetry, createBuilder, createEnum, createExternalPromise, createFormData, createInterpolation, createQueue, createTransformer, detachObjectMethod, equal, escapeRegExp, falsy, forward, forwardAsserts, forwardLog, infer, innerPipe, instanceOf, isType, justExec, justReturn, loop, loopAccumulator, loopAccumulatorFrom, memo, memoObject, memoPromise, or, pipe, pipeCall, prepareAsyncPipe, preparePipe, promiseAll, promiseObject, removeConstraint, shameOnYou, simpleClone, stringToBytes, stringToMillisecond, tap, timeout, toCurriedPredicate, toJSON, toNative, toRegExp, transformer, truthy, useAsyncRetry, when, whenElse, whenNot.
- **DDataStructure** : absolutePath, allowedCharacters, array, arrayLengthEqual, betweenThan, betweenThanOrEqual, bigint, boolean, createCodec, createCodecs, createErrorInterpreter, date, email, endsWith, even, extend, greaterThan, greaterThanOrEqual, include, integer, isNullStructure, isNullable, isOptional, isUndefinedStructure, lazy, lessThan, lessThanOrEqual, literal, maxCharacters, maxElements, minCharacters, minElements, multipleOf, negative, notEmpty, notZero, null, nullable, number, numberInString, object, odd, optional, partial, path, positive, record, refine, regex, required, safe, segmentPath, startsWith, strictNegative, strictPositive, string, stringLengthEqual, time, trimmed, typeStructureIdentifier, undefined, union, unwrapLazy, url, uuid.
- **DEither** : asyncGroup, asyncSafeCallback, error, expect, extractErrorInLeft, fail, forwardAssertsSelection, group, hasInformation, isLeft, isRight, isSelected, keepAsRightByInformation, keepAsRightSelection, left, matchInformation, matchInformationCombination, matchInformationCombinationOtherwise, matchInformationOtherwise, none, ok, result, rewriteInformation, right, rightAsyncPipe, rightPipe, safeCallback, some, success, toMaybe, unwrapByInformation, unwrapByInformationOrThrow, unwrapLeft, unwrapLeftOrThrow, unwrapOr, unwrapOtherwise, unwrapRight, unwrapRightOrThrow, unwrapSelection, unwrapSelectionOrThrow, whenHasInformation(Otherwise), whenIsLeft(Otherwise), whenIsRight(Otherwise), whenIsSelected(Otherwise).
- **DGenerator** : asyncChunk, asyncConcat, asyncFilter, asyncFlat, asyncGroup, asyncLoop, asyncLoopAccumulator, asyncMap, asyncReduce, chunk, concat, createExternalAsyncGenerator, execute, filter, flat, group, groupOutput, loop, loopAccumulator, loopAccumulatorFrom, map, reduce, reduceFrom.
- **DNumber** : betweenThan, betweenThanOrEqual, greaterThan, greaterThanOrEqual, isEven, isInteger, isMultipleOf, isNegative, isNotZero, isOdd, isPositive, isSafe, isStrictNegative, isStrictPositive, lessThan, lessThanOrEqual, max, maxOf, min, minOf, sort, sum.
- **DObject** : assign, countKeys, deepOverride, discriminate, discriminateEntryKey, discriminateEntryValue, entries, entry, fromEntries, getDeepProperty, getProperty, hasKeys, isSimple, keys, omit, override, pick, to, transformProperties, transformProperty, values.
- **DPath** : computeRelative, concatSegment, create, createAbsolute, createAbsoluteOrThrow, createMatcher, createOrThrow, createSegment, createSegmentOrThrow, declareAbsolutePath, declarePath, declareSegment, getBaseName, getExtensionName, getParentFolderPath, is, isAbsolute, isSegment, normalize, resolveFrom, resolveRelative.
- **DPattern** : exhaustive, isMatch, match, matchWithEntity(Otherwise), matchWithError(Otherwise), matchWithFact(Otherwise), matchWithNumber(Otherwise), matchWithString(Otherwise), matchWithTaggedObject(Otherwise), otherwise, union, when, whenNot.
- **DPrinter** : constantes et types, bold, colorized, colorizedBold, renderLine, renderParagraph.
- **DString** : at, capitalize, charAt, concat, endsWith, extract, extractAll, first, includes, indexOf, isComposedOf, isEmail, isIn, isKeyof, isNotEmpty, isNumber, isTrimmed, isUrl, isUuid, join, last, lastIndexOf, length, lengthEqual, maxCharacters, minCharacters, normalize, padEnd, padStart, pop, prepend, repeat, replace, replaceAll, search, shift, slice, sort, sortCompare, split, startsWith, stringify, substring, test, to, toLowerCase, toUpperCase, trim, trimEnd, trimStart, uncapitalize.
- **DTuple** : from, map.

### 3.4 `@duplojs/server` — fonctions par domaine

**[VÉRIFIÉ]**
- **File** (`DSFile`, `@duplojs/server/file`) : appendFile, appendTextFile, copy, createEntryInterface, createFileInterface, createFolderInterface, createUnknownEntryInterface, ensureDirectory, ensureFile, exists, link, linkStat, makeDirectory, makeTemporaryDirectory, makeTemporaryFile, move, readDirectory, readFile, readJsonFile, readLink, readTextFile, realPath, relocate, remove, rename, setMode, setOwner, setTime, stat, symlink, truncate, walkDirectory, writeFile, writeJsonFile, writeTextFile.
- **Common** (`DSCommon`, `@duplojs/server/common`) : environmentVariable, environmentVariableOrThrow, exitProcess, getCurrentDirectoryName, getCurrentWorkDirectory, getCurrentWorkDirectoryOrThrow, getProcessArguments, setCurrentWorkingDirectory, setCurrentWorkingDirectoryOrThrow.
- **DataStructure** (`DSDataStructure`, `@duplojs/server/dataStructure`) : file, fileExist, folder, folderExist, mimeType, size.
- **Command** (`DSCommand`, `@duplojs/server/command`) : create, createArgument, createArrayOption, createBooleanOption, createOption, exec, execOptions.

### 3.5 Autres packages du routeur

**[VÉRIFIÉ]** `@duplojs/json-web-token` (TokenHandler, Signer HS256/HS512/RS256/RS512, Cipher RSA-OAEP, utilitaires base64/PEM/AES-GCM), `@duplojs/form` (Vue : createForm, createFormField, layouts `use*Layout`, design system `use*Input`), `@duplojs/playwright` (createWebsite, createPage, createComponent, Actions, Assertions). Hors périmètre du transpileur.

### 3.6 Deux fonctions révélatrices

**Fait [VÉRIFIÉ]** `DCommon.shameOnYou` (`docs/API/10-lang/10-common/10-shameOnYou.ts`) : « Contourner explicitement une contrainte attendue dans un contrat de type. » L'échappatoire existe, mais son nom porte le jugement.

**Fait [VÉRIFIÉ]** `DCommon.removeConstraint` existe pour le sens inverse.

**Conséquence pour le projet** Dans le code du transpileur, un `shameOnYou`, un `as` ou un `!` sera lu comme un aveu. À réserver aux cas réellement impossibles et à justifier.

---

## 4. Les skills : règles imposées à un agent qui écrit du DuploJS

Sources : `ecosystem/packages/agents-kit/skills/<nom>/SKILL.md` et `references/`. Ces règles s'appliquent au **code du transpileur lui-même**.

### 4.1 Convention commune à tous les skills

**Fait [VÉRIFIÉ]** Chaque `SKILL.md` commence par la même section « Trouver les concepts » : appliquer la démarche, lire les ressources **quand leur condition est rencontrée**, et chercher dans `docs/concepts.llms.md` ce qui n'est pas couvert.

**Fait [VÉRIFIÉ]** Bloc injecté dans `AGENTS.md` par `duplojs-agents-kit setup` (`instructions/coding-conventions.md`) : chercher dans le routeur API avant d'écrire un utilitaire ou d'utiliser une API native ; consulter le routeur des concepts pour un problème de composition, typage ou erreur ; « Ne pas inventer d'API ni contourner le typage pour résoudre un doute. »

**Pourquoi [VÉRIFIÉ]** `.agents/skills/agents-kit-skills/SKILL.md` : « Un modèle moins performant peut ignorer qu'une connaissance lui manque : "lire si tu as un doute" ne suffit pas pour une garantie importante. » Les lectures sont donc déclenchées par une situation observable, pas par le doute.

### 4.2 Skill `fundamental` — utiliser les API DuploJS

**Règle [VÉRIFIÉ]** « Utiliser obligatoirement l'équivalent DuploJS avant une API native, tierce ou un nouvel utilitaire, y compris dans les tests. » Ordre de recherche : `lang`, puis `server`, puis packages spécialisés.

**Règle [VÉRIFIÉ]** Importer le sous-export du domaine avec son namespace long : `import * as DArray from "@duplojs/lang/array"`. Pas d'import depuis l'index, pas d'alias court (`ecosystem/.agents/importations.md` ; règle de lint `prefer-namespace-import`, commits `97f1233`, `4f93285`).

**Pourquoi [VÉRIFIÉ]** Limiter l'import au domaine utilisé et préserver le tree-shaking.

### 4.3 Skill `fundamental` — inférence et annotations

**Règle [VÉRIFIÉ]** « Laisser TypeScript inférer les valeurs et les retours des implémentations. Annoter un retour uniquement pour résoudre une récursivité. » Les signatures d'interfaces décrivent des contrats ; ce n'est pas la même chose qu'annoter une implémentation.

**Pourquoi [HYPOTHÈSE]** Les types de retour DuploJS sont des unions d'Either et d'intersections de contraintes calculées ; les réécrire à la main les dégrade ou les fige.

**Conséquence pour le projet** Le transpileur doit lire le type **inféré** via le checker TypeScript, pas l'annotation : il n'y en aura souvent pas.

### 4.4 Skill `fundamental` — composition

**Règles [VÉRIFIÉ]** (`SKILL.md` + `references/composition.md`)
- Appel curifié écrit dans l'étape du pipe ; jamais préparé dans une variable ni forcé par génériques, annotations ou casts.
- Un argument par ligne, virgule finale, fermeture séparée, même pour une donnée et une étape.
- Un appel simple peut rester direct ; préparer séparément les données de sources indépendantes avant de les combiner.
- `asyncPipe` : un seul `await` final.
- Pour réutiliser un traitement : écrire une fonction recevant la donnée et construisant son pipe, ou utiliser la forme directe.

### 4.5 Skill `fundamental` — pas de boucle impérative

**Règle [VÉRIFIÉ]** « Ne pas écrire de `for`, de `while` ni leurs variantes. »

| Besoin | Outil |
| --- | --- |
| Parcourir un tableau avec accumulateur | `DArray.reduce` |
| Parcourir un autre itérable | `DGenerator.reduce` |
| Parcours asynchrone, même sur un tableau | `DGenerator.asyncReduce` |
| Répétition conditionnelle | `DCommon.loop` / `asyncLoop` |
| Répétition avec état transporté | `DCommon.loopAccumulator` / `asyncLoopAccumulator` |
| Produire une séquence | `DGenerator.loop` / `asyncLoop` et leurs `loopAccumulator` |
| Simple transformation ou sélection | `DArray.map`, `DArray.filter` |

**Détails [VÉRIFIÉ]** (`references/iterations.md`)
- `reduce` : callback reçoit `element`, `index`, `lastValue` ; `next(état)` poursuit, `next(lastValue)` ignore l'élément, `exit(résultat)` arrête et **peut changer le type de sortie**.
- État structuré : initialiser avec `DArray.reduceFrom<Type>(valeur)`.
- `DCommon.loop` : `count` part de zéro ; la donnée passée à `next` **n'est pas** transmise au tour suivant.
- `DGenerator.loop` : `next(...valeurs)` **émet** des valeurs.
- Conserver la condition avant le traitement pour un `while`, après pour un `do...while`.
- Pour une répétition par compteur, utiliser `loop` « sans fabriquer un tableau ».

**Conséquence pour le projet** Double impact : (a) le code du transpileur ne doit contenir aucun `for`/`while` ; (b) le code source à transpiler exprimera ses boucles ainsi, et le transpileur doit reconnaître ces formes pour émettre des `for` Go idiomatiques avec `break`/`return` pour `exit`. **[HYPOTHÈSE]** C'est un critère de qualité visible du Go généré.

### 4.6 Skill `fundamental` — validation et garanties

**Règles [VÉRIFIÉ]** (`references/constraints-and-validation.md`)
- Valider les données externes avec une `DDataStructure`, via l'intégration du module récepteur quand elle existe.
- Choisir selon la preuve disponible : littéral ou garantie compatible → déclaration sûre ou `cast` / `infer` ; valeur runtime sans preuve → validation puis traitement de l'Either ; refus du compilateur → vérifier l'inférence, « ne pas la fabriquer avec `as`, `!` ou un helper sans preuve ».
- Pour une constante spécialisée, chercher une déclaration sûre du domaine avant `OrThrow` (`DPath.declarePath("resources/config.json")`, `DChrono.createDate("2026-09-30")`).
- Suivre les garanties restantes après chaque transformation ; pas de garde redondante sur un accès garanti.

### 4.7 Skill `fundamental` — résultats et erreurs

**Règles [VÉRIFIÉ]** (`references/results-and-errors.md`)
- Fonction qui constate des états sans décider → `DEither.result` nommés.
- Fonction qui décide d'une réussite ou d'un refus prévisible → `Right` / `Left`, y compris pour absences et refus techniques.
- Consommateur : `keepAsRightByInformation` (autoriser certaines informations, refuser les autres, même futures), `keepAsRightSelection` (décision explicite par variante), `isSelected`, `matchInformation`.
- Patron de retour anticipé : sélection → `unwrapRight` → garde `isLeft`.
- « Une fonction réutilisable n'ajoute pas de `throw`, même appelée depuis cette frontière. La rareté du refus ou son coût de propagation ne changent pas cette règle. »
- `throw` et `OrThrow` réservés au code qui décide de la conséquence finale (réponse, diagnostic, arrêt). Dans un test, `OrThrow` est admis.
- Exception capturée : conserver sa cause jusqu'à la consommation finale, ne pas la requalifier ni la relancer.

**Conséquence pour le projet** Dans le transpileur : un nœud AST non supporté, un type non résolu, un fichier illisible sont des `Left` nommés, propagés jusqu'au callback de la commande CLI qui choisit le message et le code de sortie. Aucune fonction interne ne lève.

### 4.8 Skill `fundamental` — modifier à l'endroit responsable

**Règle [VÉRIFIÉ]** « Lire les contrats, définitions et appelants concernés ; intégrer le besoin dans la fonction, le modèle ou le module responsable. Limiter le remaniement au besoin, adapter les usages et vérifier les garanties conservées. »

### 4.9 Skill `command` — choisir la forme

**Règles [VÉRIFIÉ]** Imports : `DSCommand` depuis `@duplojs/server/command`, `DDataStructure` depuis `@duplojs/lang/dataStructure`.

| Besoin | Construction |
| --- | --- |
| Commande racine avec entrées | `DSCommand.exec` |
| Plusieurs actions nommées | `DSCommand.create` placées dans les `subjects` du parent exécuté par `exec` |
| Script à options seules | `DSCommand.execOptions` |

Exécuter la racine une seule fois au point d'entrée.

### 4.10 Skill `command` — déclarer les entrées

**Règles [VÉRIFIÉ]** (`SKILL.md` + `references/inputs.md`)
- Les entrées du terminal sont externes : les faire décoder et valider par les data structures des déclarations, pas par un cast ou une conversion dans le callback.
- `createArgument` : positionnel, obligatoire par défaut ; les `optional: true` après les obligatoires.
- `createOption` : facultative par défaut (`undefined`) ; `required: true` ; syntaxes `--format=json`, `--format json`, alias `-f json` ; noms et alias déclarés sans tirets.
- `createBooleanOption` : présence ; `--overwrite=false` est invalide.
- `createArrayOption` : le schéma décrit **un élément** ; séparateur virgule par défaut (`--include=src,tests`) ; répéter le flag n'accumule pas ; `min`/`max` ne rendent pas la liste obligatoire.
- Noms uniques par ensemble ; conserver `help` / `h` pour l'aide intégrée.
- Option facultative ≠ valeur par défaut : appliquer le repli sur le résultat validé.
- Le décodage string → number est intégré.

### 4.11 Skill `command` — assembler, exécuter, raccorder

**Règles [VÉRIFIÉ]** (`SKILL.md` + `references/execution.md`)
- Un même `subjects` contient soit des arguments, soit des sous-commandes.
- Le parent n'est ni un middleware ni une source d'options communes : ses options ne sont pas héritées ; son callback ne traite que l'invocation sans sous-commande.
- Pas de découverte automatique : exporter la commande et l'importer explicitement.
- Décrire commandes et entrées pour l'aide `--help` / `-h` ; `displayName` sur la racine.
- Le callback est un **point d'entrée d'infrastructure** : il adapte les données validées, appelle l'application, interprète les résultats. Il retourne `void` ; lui retourner un Either métier ne propage rien à `exec`.
- Erreur de validation : callback non appelé, `exec` retourne un `DEither.Error<DSCommand.Error>` **déjà affiché**, sans fixer de code de sortie. À la frontière : `if (DEither.isLeft(result)) DSCommon.exitProcess(1)`. Ne pas afficher le diagnostic une seconde fois.
- `exec` ne convertit pas les exceptions du callback en erreurs de validation.
- `execOptions` a trois branches : `success`, `log-help` (aussi un Right), Left ; discriminer avec `DEither.hasInformation(result, "success")`.
- Binaire : shebang + champ `bin` ; le concept `40-command/10-use.ts` montre `#!/usr/bin/env -S tsx` pour un `.ts` exécutable.
- Vérifier : typage, aide, appel valide, entrée invalide, entrée obligatoire absente, chemin complet vers la sous-commande, code de sortie en échec.

### 4.12 Skill `server` — capacités système

**Règles [VÉRIFIÉ]**
- Chercher d'abord dans `@duplojs/server` ; API native seulement si la capacité n'est pas couverte.
- `DSFile` pour les ressources, `DSCommon` pour configuration/arguments/processus, `DSDataStructure` pour valider fichier/dossier, `DPath` pour construire un chemin sans accès disque.
- Valider un chemin externe avec `DPath.create` (ou `createAbsolute`, `createSegment`). « Un chemin valide ne prouve ni l'existence ni la nature de la ressource. »
- Conserver les Either des I/O ; discriminer l'erreur par son identifiant (`DPattern.matchWithError` ou `matchWithErrorOtherwise`), jamais par le message ni le code natif.
- Identifiants à deux niveaux : information du Left (`file-system-read-text-file-error`) et identifiant de la `DuploJSError` contenue (`file-system-read-text-file-not-found`, `...-permission-denied`).
- Traiter le résultat de l'opération effective même après une vérification d'existence ; `exists` retourne un Either, pas un booléen.
- Opérations dépendantes : `DEither.rightAsyncPipe`.
- `readJsonFile` retourne un `DCommon.Json` : le faire vérifier ensuite par une data structure.
- Distinguer `getCurrentWorkDirectory()` (dossier de travail, Either) de `getCurrentDirectoryName(import.meta)` (dossier du module).
- `exitProcess(code)` décidé au point d'entrée.
- `environmentVariable` (Either) dans une fonction réutilisable, `environmentVariableOrThrow` au démarrage.
- `DSDataStructure.file()` / `folder()` portent des `FileInterface` / `FolderInterface` ; contraintes `fileExist()`, `folderExist()`, `size()` demandent une validation asynchrone ; fournir `DSDataStructure.codecsString` explicitement.

**Conséquence pour le projet** Le transpileur lit des `.ts` et écrit des `.go` : toute cette section s'applique à lui (lecture avec `DSFile.readTextFile`, écriture avec `writeTextFile`, parcours avec `walkDirectory`, chemins `DPath`).

### 4.13 Skill `modeling` — Type-Driven Design

**Règles [VÉRIFIÉ]** (`SKILL.md`, `references/domain.md`, `references/orchestration.md`)
- Domaine : n'importe ni application ni infrastructure ; agrégats purs. Application : importe le domaine, définit ses ports. Infrastructure : importe les deux.
- L'entrée d'une opération métier est un agrégat appelé par un use case ; ne pas appeler directement un fait ou un agrégat depuis un point d'entrée. Une lecture seule ne demande pas de use case de relais.
- Choix des garanties : `DataStructure` (vérifier au runtime), `NewType` (distinguer deux valeurs de même représentation), `Entity` (identité + shape stable), union de `TaggedObject` (forme variable), `Flag` (condition actuelle), `Fact` (création ou modification, une seule cible), `Evidence` (passage ou provenance), `SignedFunction` (opération identifiée), `Resolver` (effets déclarés par l'agrégat).
- Ne pas inventer un cycle de vie plus détaillé que le besoin ; ne pas transformer chaque combinaison de flags en état exclusif.
- `Entity.update` ne conserve ni les anciens flags ni le fait courant ; ne pas les réintroduire par spread ou cast ; `update` ne valide pas ses valeurs.
- « Un cast ne produit aucune garantie. » « Ne pas transformer un échec de typage en cast ni apposer une preuve à la place de l'opération requise. »
- Ports déclarés avec `DInvocation.createPort`, use cases avec `createReader`, implémentations avec `Port.createImplementation`, résolution par `Reader.run` ou `resolveReaders`.

**Conséquence pour le projet** **[HYPOTHÈSE]** Pour le transpileur lui-même, l'architecture en couches s'applique modestement : un domaine pur (AST Go, règles de traduction), une application (orchestration), une infrastructure (CLI, fichiers). Ne pas sur-modéliser : la règle « ne pas inventer un cycle de vie plus détaillé que le besoin » vaut aussi ici.

### 4.14 Skills non installés dans le hackathon : `test`, `http-server`, `http-client`

**Fait [VÉRIFIÉ]** Skill `test` : sélectionner la branche attendue avec `DEither.unwrapByInformationOrThrow`, puis écrire une assertion sur le contenu ; `unwrapSelectionOrThrow` pour surveiller l'évolution d'un contrat ; `DCommon.ExpectType<…, "strict">` à côté des assertions runtime ; isoler `@duplojs/server` par `setEnvironment("TEST")` et `TESTImplementation.set` plutôt que par mocks de modules ; une implémentation absente lève, sans repli natif.

**Conséquence pour le projet** Même non installé, ce skill décrit la façon attendue de tester : utile pour les tests du transpileur.

---

## 5. `agents-exercises` : ce que les mainteneurs jugent être du bon code

### 5.1 Contenu

**Fait [VÉRIFIÉ]** Un seul exercice : `ecosystem/packages-private/agents-exercises/todo/` (package privé `@duplojs/agents-exercises-todo`, description : « Exercice pour évaluer la qualité des skills des agents. »). Dépendances : `@duplojs/lang`, `@duplojs/http` ; dev : `@duplojs/code-config`, `@duplojs/agents-kit`.

**Fait [VÉRIFIÉ]** Le **domaine est fourni et complet** : entités `Task`, `List`, `User` avec leurs faits (`create`, `assign`, `complete`), agrégats (`createTask`, `createList`, `assignList`, `completeTask`, `completeLinkedTask`), refinement (`refineLinkedTaskState`), contrats de repositories (`TaskRepository`, `ListRepository`).

**Fait [VÉRIFIÉ]** Les couches **à écrire par l'agent** sont vides : `src/business/applications/.gitkeep`, `src/infrastructure/adapters/.gitkeep`, `src/infrastructure/useCases/.gitkeep`, `src/infrastructure/http/routes/.gitkeep`. Un faux stockage est fourni (`src/infrastructure/providers/database.ts`, des `Map`).

### 5.2 Mécanique d'évaluation

**Fait [VÉRIFIÉ]** `.gitignore` de l'exercice ignore exactement les zones à produire (`src/business/applications/**/*.ts`, `src/infrastructure/adapters/**/*.ts`, `src/infrastructure/useCases/**/*.ts`, `src/infrastructure/http/routes/**/*.ts`). Le script `clear` fait `git clean -fdX -- src` : on efface la production de l'agent et on recommence.

**Fait [VÉRIFIÉ]** Les seules vérifications automatiques sont `test:types` (`tsc -p tsconfig.app.json`) et `test:lint` (`duplojs-oxlint`). Aucun test runtime, aucune grille de notation dans le dépôt.

**Fait [VÉRIFIÉ]** Les sept skills sont liés par symlinks relatifs dans `.agents/skills/` (commit `543d17e`) et `AGENTS.md` contient le bloc de conventions généré par `setup`.

**Interprétation [HYPOTHÈSE]** C'est un banc d'essai de **skills**, pas d'agents : on fixe un domaine exigeant, on laisse un agent écrire l'application et l'infrastructure, on regarde si ça type et on relit. Le protocole voulu est décrit dans `packages/agents-kit/.agents/skills/agents-kit-skills/references/skill-design-research.md` : sessions indépendantes répétées, modèle et effort fixés, et observation des « API inventées, assertions injustifiées, garanties fabriquées ou effets exécutés après un refus ».

### 5.3 Ce que le domaine fourni exige de l'agent

**Fait [VÉRIFIÉ]** `aggregates/completeLinkedTask.ts` exige en entrée `DInvocation.GetEvidenceResult<typeof refineLinkedTaskState, "pending-and-Assigned-task-with-opened-linked-list">` : l'agent ne peut pas appeler l'agrégat sans avoir réellement exécuté `ListRepository.findLinkedList` puis `refineLinkedTaskState` et sélectionné la bonne branche. L'agrégat est un générateur (`createWorkflow`) qui fait `yield *commit("task", …)` puis `yield *resolve("allTaskAreCompleted", …)`.

**Fait [VÉRIFIÉ]** `refinements/refineLinkedTaskState.ts` utilise `DEither.matchInformationCombinationOtherwise` avec la clé `"PendingAndAssigned/Open"` : combinaison des informations de deux Either.

**Conséquence pour le projet** Le critère implicite de « bon code » est : **le typage empêche de tricher, et l'agent ne contourne pas le typage**. Un jury issu de cette équipe cherchera les `as`, les `!`, les `shameOnYou`, les API inventées.

### 5.4 Comment les mainteneurs pensent l'usage des agents

**Fait [VÉRIFIÉ]** Cible explicite : « un agent qui développe une application avec DuploJS, notamment un modèle moins performant » ; premières cibles évoquées : « Luna en effort moyen et élevé, ainsi que des versions précises de GLM et d'autres modèles économiques ».

**Fait [VÉRIFIÉ]** Tout exemple TypeScript doit vivre dans un `.ts` vérifié par le typage, lié depuis le Markdown ; pas de bloc TypeScript dans `SKILL.md`. Garanties illustrées avec `DCommon.ExpectType` strict et `@ts-expect-error` expliqué (commits `2b2323e`, `dd44da6`).

**Fait [VÉRIFIÉ]** Honnêteté épistémique affichée : « Les choix proposés pour AgentKit n'ont pas encore été évalués sur DuploJS avec les modèles cibles », « distinguer recommandations non mesurées et résultats observés », « La compilation et les tests d'installation ne prouvent pas l'efficacité pédagogique ».

**Conséquence pour le projet** **[HYPOTHÈSE]** Un rendu qui distingue clairement « vérifié » de « supposé », qui documente ses limites et dont les exemples sont exécutables parle le langage du jury.

### 5.5 `jsdoc-include` : un outil interne écrit en DuploJS

**Fait [VÉRIFIÉ]** `ecosystem/packages-private/jsdoc-include/` résout des directives `{@include chemin[debut,fin]}` dans les JSDoc pour injecter des exemples vérifiés dans les `.d.ts` (plugin `unplugindts`). Migré vers une implémentation DuploJS au commit `52b03db`.

**Fait [VÉRIFIÉ]** `scripts/resolver.ts` est un exemple réel de code d'outillage maison : erreurs déclarées par `class X extends DCommon.DuploJSError.parentClass("invalid-include-path-error")`, parcours par `DCommon.pipe(source, DString.extractAll(pattern), DGenerator.asyncReduce(DGenerator.reduceFrom(source), async({ lastValue, item, next }) => …))`, validation de chemin par `DPath.create` puis `DEither.isLeft`.

**Conséquence pour le projet** C'est le meilleur modèle disponible pour « un outil de transformation de texte écrit en DuploJS par les mainteneurs ». À lire avant d'écrire le transpileur.

---

## 6. Trajectoire historique et décisions

Tous les hashes ci-dessous viennent de `git log` dans `ecosystem/`.

### 6.1 Naissance du monorepo (2026-09-09 → 2026-09-12)

**Fait [VÉRIFIÉ]** `97432ed` (2026-09-09) premier commit avec `code-config` ; `d9ae43d` le même jour « add lang » : 1436 fichiers, 87 750 insertions d'un coup. Puis `2013579` server, `3d696ca` tools, `c29f328` json-web-token, `3b23792` playwright, `c34369a` eslint, `cd51e92` form, `75a6315` http.

**Fait [VÉRIFIÉ]** Les anciens dépôts séparés existent à côté du monorepo (`scratchpad/duplojs/utils`, `core`, `http`, `server-utils`, `zod-accelerator`, `data-parser-tools`, etc.).

**Pourquoi un monorepo [VÉRIFIÉ]** `ecosystem/.agents/architecture.md` (créé par `e99eb59`, 2026-09-12) : versionnement synchronisé, « une version représente un ensemble de packages conçus et validés pour fonctionner ensemble », versions internes exactes, consommation par `dist` et non par sources, workspaces `integrations/` qui testent chaque package comme un consommateur externe.

**Ce que ça révèle** Priorité à la cohérence d'ensemble sur la vitesse de livraison d'un package isolé.

### 6.2 `utils` devient `lang`

**Fait [VÉRIFIÉ]** Le renommage est antérieur au monorepo : `lang` y arrive tout fait (`d9ae43d`). L'ancien `@duplojs/utils` (`scratchpad/duplojs/utils/README.md`) se décrit comme « the TypeScript utility toolbox » avec `DataParser`, `kind`, `Either`, « Clean-domain building blocks ».

**Fait [VÉRIFIÉ]** `lang/AGENTS.md` : « Son objectif est de compléter TypeScript avec les primitives, utilitaires et structures nécessaires », « des utilitaires génériques absents ou insuffisants dans le langage ».

**Pourquoi [HYPOTHÈSE]** Le nom passe de « boîte à outils » à « extension du langage » : le package n'est plus un complément optionnel mais la base obligatoire sur laquelle tout s'écrit (d'où la règle « API DuploJS avant le natif »). `DataParser` est devenu `DataStructure` : on ne parse plus, on décrit un contrat valable au typage et au runtime. Le commit du renommage lui-même n'est pas dans ce dépôt : je n'ai pas lu sa justification.

**Conséquence pour le projet** **[HYPOTHÈSE]** Si `lang` est un langage au-dessus de TypeScript, « transpiler DuploJS vers Go » est une cible de compilation de ce langage, pas une conversion TS→Go générique. Un transpileur qui traite `DArray.map` comme une primitive du langage source (et non comme un appel de fonction opaque) est dans l'esprit.

### 6.3 La documentation pour agents : de `ai-docs` à `agents-kit`

**Fait [VÉRIFIÉ]** Chronologie :
- `e99eb59` (09-12) fichiers `.agents/` racine ; `55ab709`, `42b1f8d` (09-12/14) premiers skills internes (tests unitaires, implémentation).
- `ecd5b02` (09-25) `ai-docs` : documentation conceptuelle en fichiers `.ts` typés.
- `cf11868` (10-03) `ai-docgen` : générateur, avec un `LLMS.md` racine de 1210 lignes.
- `43a68e7` (10-14) package `skills`.
- `17e4c1c` (10-15) `skills` renommé `agents-kit` ; `ba7e3b5` (10-15) `ai-docs` déplacé dans `agents-kit` ; `0266765` (10-15) suppression d'`ai-docs` (164 fichiers) ; `a90a05b` (10-15) `ai-docgen` supprimé, remplacé par une commande d'`agents-kit` ; `4b152cc` (10-15) commande `setup`.
- `fe7d029` (10-19) routage hiérarchique : `generate-summary` + `generate-table-of-content`.
- `73c95c2` → `5987299` (10-16 → 11-10) pages API par domaine.
- `8012423` (11-10) commandes `skills install` / `skills update`, refonte du skill fondamental.

**Pourquoi [VÉRIFIÉ]** Message de `fe7d029` : « Split local documentation generation into summary and table-of-content commands. Generate API domain routers ». Le `LLMS.md` monolithique a été abandonné au profit d'un routage à niveaux pour ne pas charger tout l'inventaire.

**Pourquoi un agents-kit [HYPOTHÈSE]** DuploJS est trop récent et trop idiosyncratique pour être connu des modèles ; sans documentation dédiée, un agent écrit du TypeScript natif (boucles, `throw`, `Array.prototype`). L'agents-kit est le moyen d'obtenir du code conforme, y compris de modèles économiques.

**Ce que ça révèle** En cinq semaines, l'équipe a investi autant dans la documentation pour agents que dans les bibliothèques. L'usage par des agents est un objectif de premier rang, pas un accessoire.

### 6.4 Exemples vérifiés par le typage

**Fait [VÉRIFIÉ]** `2b2323e` (11-04) « verify example types and native API use » : 41 fichiers de concepts modifiés pour ajouter des `ExpectType`. `dd44da6` (11-04) « require strict type checks for illustrated results ». `test:types` du package vérifie `docs/` et `skills/` via `tsconfig.doc.json`.

**Ce que ça révèle** Une documentation qui ne compile pas est considérée comme fausse. **[HYPOTHÈSE]** Pour le hackathon : chaque affirmation sur le transpileur gagne à être appuyée par un exemple exécuté (entrée TS → sortie Go compilée).

### 6.5 Erreurs identifiables : `DuploJSError`

**Fait [VÉRIFIÉ]** `1992ec1` (10-09) ajoute `DuploJSError` et `matchWithError` ; `25f790e` « rework error » ; `5542333` refonte des erreurs de fichiers ; `338430b` (10-23) `extractErrorInLeft`.

**Ce que ça révèle** Les erreurs sont discriminées par identifiant littéral, jamais par message ou par classe.

### 6.6 Boucles : remaniement tardif

**Fait [VÉRIFIÉ]** `84529d9` (10-09) arguments sur le flow controller ; `6498963`, `a8a3879` (10-22) reduce ; `c90d77e` (11-06) flow controller exclusif ; `1f65858` (11-10) « fix:lang(hf): loop » : 36 fichiers, ajout de `loopAccumulator`, `asyncLoopAccumulator`, `loopAccumulatorFrom` dans `DCommon` et `DGenerator`.

**Ce que ça révèle** L'API d'itération a bougé une semaine avant le hackathon. **[HYPOTHÈSE]** Zone à risque de divergence entre la beta.11 installée et ce HEAD.

### 6.7 Modélisation : faits, flags, workflow, objets taggés

**Fait [VÉRIFIÉ]** `e384d3d` (09-24) fact + signature ; `dfdb70d` (11-03) « add workflow » (39 fichiers, réécriture des agrégats de l'exercice en générateurs) ; `35b2d13` (11-03) déclaration des faits et flags ; `7895656` (11-09) fabrique d'objets taggés ; `8a6c90b` (11-10) tags groupés ; `fc50b4f`, `b67025b`, `cecaf88` (11-11/12) trois corrections successives des groupes de tags.

**Ce que ça révèle** La modélisation est la partie la plus mouvante du HEAD. **[HYPOTHÈSE]** Ne pas en dépendre plus que les exercices du hackathon ne l'exigent.

### 6.8 Suppressions et renommages notables

**[VÉRIFIÉ]**
- `3c28f8b` (11-10) supprime `DObject.deepDiscriminate`, `discriminate` passe aux prédicats.
- `fe7d029` renomme `DPath.createPattern` en `DPath.createMatcher`.
- `4cd0d46` supprime `getCurrentDirectoryNameOrThrow`.
- `f957819` renomme la contrainte de fichier en `fileExist`.
- `3e323fd` puis `8012423` : commande `install` → `install-skill` → `skills install`.
- `eddddfb` (10-26) « remove generato by contract » dans `http` (33 fichiers), au profit de la génération de types par inférence (`f1a16d6`, `eeb09cb`, `93e8184`).
- `2e0a236` : Either, suppression d'un argument de valeur par défaut.

**Ce que ça révèle** Les mainteneurs suppriment sans état d'âme une API quand une formulation plus générale existe, et préfèrent l'inférence à la génération par contrat.

### 6.9 Qualité outillée

**Fait [VÉRIFIÉ]** `.agents/commands.md` : ordre imposé build → typage + lint → tests unitaires. Toolchain : Rolldown, TypeScript 7, Oxlint, Vitest. `9d391f7` refonte Oxlint. `.agents/skills/unit-tests/SKILL.md` : objectif minimal 100 % de couverture, et « les garanties apportées par le typage doivent également être testées ».

**Fait [VÉRIFIÉ]** Commits au format `type:scope(ref): message` avec scopes fermés (`commitlint.config.ts`) ; presque tous portent la référence `hf`. **[HYPOTHÈSE]** `hf` désigne un commit sans ticket (les rares autres références sont des numéros : `feat:http(4)`, `feat:ecosystem(2)`).

### 6.10 Site de documentation humain : encore vide

**Fait [VÉRIFIÉ]** `ecosystem/docs/fr/` ne contient que 8 fichiers (4,8 Ko) : page d'accueil, « Guide v1 » (« La documentation detaillee sera ajoutee progressivement »), index API, et deux pages (`array/map`, `string/split`). `docs/libs/v1/` contient des instantanés `.d.ts` des packages renommés `@duplojs-v1/*` pour versionner les exemples (`docs/bin/snapshotDist/README.md`).

**Conséquence** Il n'existe pas de page « philosophie » pour humains dans ce dépôt. La doctrine est dans `agents-kit` et dans les `AGENTS.md`. Les trois slogans de la page d'accueil : « Versionnee », « TypeScript » (extraits vérifiés), « Fonctionnelle ».

### 6.11 Ce qu'un jury issu de cette équipe valorisera

**[HYPOTHÈSE]**, déduite des sections 6.1 à 6.10 :
1. **Respect des règles maison dans le code du transpileur** : pas de boucle, pas de `throw` interne, Either nommés, imports par namespace long, pas de cast.
2. **Généricité et composabilité** : petites règles de traduction composées plutôt qu'un gros `switch` ; ils ont supprimé `deepDiscriminate` au profit de prédicats composables.
3. **Garanties portées par les types** : unions exhaustives sur les nœuds AST, matchers exhaustifs qui cassent à l'ajout d'un nœud.
4. **Justification** : chaque choix de mapping TS→Go expliqué.
5. **Limites assumées** : une liste explicite de ce qui n'est pas traduit, sous forme de `Left` nommés, vaut mieux qu'une sortie Go silencieusement fausse.
6. **Exemples vérifiés** : sorties Go réellement compilées.
7. **Zéro dépendance externe ajoutée.**

---

## 7. Patterns idiomatiques (extraits courts et sources)

Chemins relatifs à `ecosystem/packages/agents-kit/`. Tous **[VÉRIFIÉ]**.

### 7.1 Pipe simple

Source : `docs/concepts/01-fundamental/02-currying/01-use.ts`.

```ts
const normalizedTags = DCommon.pipe(
	" TypeScript, DuploJS, Functional " as const,
	DString.split(","),
	DArray.map(DString.trim),
	DArray.filter(DString.isNotEmpty),
	DArray.map(DString.toLowerCase),
);
```

Type obtenu : `readonly (Lowercase<string> & DString.MinCharacters<1>)[] & DArray.MaxElements<3>`. Les contraintes suivent les transformations.

### 7.2 Pipe dans une callback (`innerPipe`)

Source : `docs/concepts/01-fundamental/02-currying/20-inner-pipe.ts`.

```ts
DArray.map(
	DCommon.innerPipe(
		DString.trim,
		DString.toLowerCase,
	),
),
```

### 7.3 Pipe asynchrone

Source : `docs/concepts/01-fundamental/02-currying/10-built-in-function.ts`.

```ts
const fileContent = await DCommon.asyncPipe(
	filePath,
	DSFile.readTextFile,
	DEither.unwrapOr(""),
	DString.trim,
);
```

### 7.4 Antipattern : étape préparée hors du pipe

Source : `skills/fundamental/references/examples/composition.ts`.

```ts
const preparedNames = DArray.map<typeof users, string>((user) => user.name);
const namesFromPreparedStep = DCommon.pipe(
	users,
	preparedNames,
);
```

Marqué « À éviter » dans le fichier.

### 7.5 Gestion d'erreur : propager un Left

Source : `skills/fundamental/references/examples/error-propagation.ts`.

```ts
async function loadText(path: string & DPath.Path) {
	const result = await DSFile.readTextFile(path);
	if (DEither.isLeft(result)) {
		return result;
	}

	return DEither.right("text-loaded", DEither.unwrapRight(result));
}
```

Pas d'annotation de retour : le type inféré est l'union des Left de `readTextFile` et de `Right<"text-loaded", string>`.

### 7.6 Gestion d'erreur : sélection puis retour anticipé

Source : `skills/fundamental/references/examples/result-selection.ts`.

```ts
function prepareItem(item: Item) {
	const selected = DCommon.pipe(
		item,
		classifyItem,
		DEither.keepAsRightByInformation("ready"),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(selected)) {
		return selected;
	}

	return DEither.right("prepared", selected);
}
```

`classifyItem` retourne des `DEither.result("ready" | "blocked", item)`.

### 7.7 Gestion d'erreur : chaîne qui s'arrête au premier Left

Source : `skills/fundamental/references/examples/result-selection.ts`.

```ts
const saved = await DEither.rightAsyncPipe(
	loadItem("item"),
	DCommon.innerPipe(
		classifyItem,
		DEither.keepAsRightSelection({
			ready: true,
			blocked: false,
		}),
	),
	(item) => saveItem(item),
);
```

Type : `DEither.None | DEither.Left<"blocked", Item> | DEither.Right<"saved", Item>`.

### 7.8 Traitement exhaustif d'un résultat

Source : `docs/concepts/01-fundamental/03-either/60-contextual-state.ts`.

```ts
const description = DEither.matchInformation(state, {
	"valid-email": (email) => `Format reconnu : ${email}`,
	"invalid-email": (value) => `Format à corriger : ${value}`,
});
```

### 7.9 Erreur identifiable et discrimination

Source : `docs/concepts/01-fundamental/07-discrimination/40-error.ts`.

```ts
class InvalidInputError extends DCommon.DuploJSError.parentClass("invalid-input") {}

const matchedError = DPattern.matchWithError(
	error,
	{
		"invalid-input": (invalidInput) => invalidInput.message,
		"unavailable-service": (unavailableService) => unavailableService.cause,
	},
);
```

### 7.10 Réduction avec sortie anticipée

Source : `skills/fundamental/references/examples/iterations.ts`.

```ts
const totalOrStop = DCommon.pipe(
	[2, -1, 4],
	DArray.reduce(
		0,
		({ element, lastValue, next, exit }) => element < 0
			? exit("negative-value")
			: next(DNumber.sum([lastValue, element])),
	),
);
```

Résultat `"negative-value"`, type `number | string` : `exit` change le type de sortie.

### 7.11 Réduction avec accumulateur structuré

Source : `skills/fundamental/references/examples/iterations.ts`.

```ts
DArray.reduce(
	DArray.reduceFrom<RunningTotals>({
		total: 0,
		subtotals: [],
	}),
	({ element, lastValue, nextWithObject }) => {
		const total = DNumber.sum([lastValue.total, element]);
		return nextWithObject(lastValue, {
			total,
			subtotals: DArray.push(lastValue.subtotals, total),
		});
	},
),
```

### 7.12 Boucle conditionnelle avec état (équivalent `while`)

Source : `skills/fundamental/references/examples/iterations.ts`.

```ts
const reachedValue = DCommon.loopAccumulator(0, ({ accumulator, next, exit }) => {
	if (accumulator >= 3) {
		return exit(accumulator);
	}

	return next(DNumber.sum([accumulator, 1]));
});
```

### 7.13 Boucle par compteur sans état

Source : `docs/API/10-lang/10-common/10-loop.ts`.

```ts
const result = DCommon.loop<"done">(({ count, next, exit }) => {
	if (count === 3) {
		return exit("done");
	}

	return next();
});
```

### 7.14 Parcours asynchrone séquentiel

Source : `skills/fundamental/references/examples/iterations.ts`.

```ts
const loadedTotal = await DCommon.asyncPipe(
	["first", "second"],
	DGenerator.asyncReduce(
		0,
		async({ item, lastValue, next }) => {
			const amount = await loadAmount(item);
			return next(DNumber.sum([lastValue, amount]));
		},
	),
);
```

Ici la callback reçoit `item` (et non `element` comme `DArray.reduce`).

### 7.15 Objet taggé et union discriminée

Source : `docs/concepts/01-fundamental/06-modeling/30-tagged-object.ts`.

```ts
const EmailNotification = DModeling.createTaggedObject(
	"EmailNotification",
	{
		email: DDataStructure.string(),
		subject: DDataStructure.string(),
	},
);
type EmailNotification = DDataStructure.StructureValue<typeof EmailNotification>;

const destination = DPattern.matchWithTaggedObject(
	notification,
	{
		EmailNotification: (emailNotification) => emailNotification.email,
		SmsNotification: (smsNotification) => smsNotification.phone,
	},
);
```

Construction : `EmailNotification.new({...})` (données déjà typées) ou `.map(données externes)` (retourne `Left<"map-error"> | Left<"async-error"> | Right<"map-success">`). Lecture du tag : `DModeling.getTagValue(x)`, `DModeling.hasTagValue(x, "EmailNotification")`. Convention : la constante et le type portent le même nom.

### 7.16 Union de littéraux

Source : `docs/concepts/01-fundamental/07-discrimination/50-literal.ts`.

```ts
const matchedStatus = DPattern.matchWithString(
	status,
	{
		pending: () => "wait" as const,
		ready: () => "run" as const,
		failed: () => "error" as const,
	},
);
```

### 7.17 Validation d'une entrée externe

Source : `skills/fundamental/references/examples/input-validation.ts`.

```ts
const requestStructure = DDataStructure.object({
	name: DDataStructure.string([
		DDataStructure.minCharacters(3),
		DDataStructure.maxCharacters(40),
	]),
	age: DDataStructure.number([
		DDataStructure.integer(),
		DDataStructure.greaterThanOrEqual(18),
	]),
});
type Request = DDataStructure.StructureValue<typeof requestStructure>;

const result = requestStructure.check(input);
if (DEither.isRight(result)) {
	const request = DEither.unwrapRight(result);
}
```

### 7.18 Constante sûre plutôt que `OrThrow`

Source : `skills/fundamental/references/examples/safe-declarations.ts` et `examples/cast.ts`.

```ts
const configPath = DPath.declarePath("resources/config.json");
const releaseDate = DChrono.createDate("2026-09-30");
const age: number & DNumber.GreaterThanOrEqual<18> = DCommon.cast(20);
```

### 7.19 Commande CLI avec sous-commande et code de sortie

Sources : `skills/command/references/examples/cli.ts` et `preview-command.ts`.

```ts
export const previewCommand = DSCommand.create(
	"preview",
	{
		description: "Preview export parameters without writing files",
		subjects: [
			DSCommand.createArgument("source", DDataStructure.string()),
			DSCommand.createArgument("destination", DDataStructure.string(), { optional: true }),
		],
		options: [
			DSCommand.createOption("format", DDataStructure.literal(["json", "text"]), {
				required: true,
				aliases: ["f"],
				description: "Export format",
			}),
			DSCommand.createBooleanOption("overwrite", { description: "Allow replacement" }),
		],
	},
	({ args, options }) => {
		console.log({ ...args, ...options });
	},
);
```

```ts
const result = await DSCommand.exec(
	{
		displayName: "my-cli",
		description: "Preview application operations",
		subjects: [previewCommand],
	},
	() => {
		console.log("Use my-cli preview --help to inspect export parameters.");
	},
);

if (DEither.isLeft(result)) {
	DSCommon.exitProcess(1);
}
```

Le fichier d'entrée commence par un shebang (`#!/usr/bin/env node` pour un build, `#!/usr/bin/env -S tsx` pour un `.ts` direct).

### 7.20 Script à options seules

Source : `skills/command/references/examples/options-only.ts`.

```ts
const result = await DSCommand.execOptions([
	DSCommand.createOption("format", DDataStructure.literal(["json", "text"])),
	DSCommand.createBooleanOption("verbose"),
]);

if (DEither.isLeft(result)) {
	DSCommon.exitProcess(1);
} else if (DEither.hasInformation(result, "success")) {
	const options = DEither.unwrapRight(result);
}
```

### 7.21 Configuration au démarrage

Source : `skills/fundamental/references/examples/environment-initialization.ts`.

```ts
const environment = await DSCommon.environmentVariableOrThrow({
	PORT: DDataStructure.number([
		DDataStructure.integer(),
		DDataStructure.greaterThanOrEqual(1),
		DDataStructure.lessThanOrEqual(65535),
	]),
});
```

Seul endroit où un `OrThrow` est idiomatique hors tests : le point d'initialisation du programme.

### 7.22 Vérification de type dans un exemple ou un test

Source : omniprésent, par exemple `docs/concepts/01-fundamental/01-constraint/20-manipulation.ts`.

```ts
type _CheckFirst = DCommon.ExpectType<typeof first, string, "strict">;
```

Convention : alias préfixé `_Check`, troisième argument `"strict"`, et `// @ts-expect-error` suivi d'une explication pour un usage qui doit être refusé.

---

## 8. Zones d'incertitude

- **Version** : contenu de `@duplojs/agents-kit@0.1.0-beta.11` non comparé au HEAD étudié (voir section 0).
- **Renommage `utils` → `lang`** : motif inféré des deux README, commit d'origine non lu (hors monorepo).
- **Critères du jury** : aucune grille dans les dépôts ; la section 6.11 est une déduction.
- **`DModeling`, `DInvocation`, `DKind`** : pas de pages API ; je n'ai lu que les concepts et les fixtures, pas les `.d.ts`.
- **Concepts lus partiellement** : pour `04-data-structure`, `05-chrono`, `06-modeling/20` et `40`, `07-discrimination/10`, `20`, `60`, `70`, `02-server/10-file`, `04-tests`, j'ai lu les commentaires explicatifs et les titres, pas chaque ligne de code. Non lus : `02-server/20-http`, `03-client`, `04-tests/02-e2e`, `05-type-driven-design` hors `10-boundaries.md`, `10-entities.md` (début) et `20-aggregates.md` (début) ; skills `http-server` et `http-client`.
- **Signification de `hf`** dans les commits : hypothèse.
