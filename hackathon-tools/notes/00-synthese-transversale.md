# 00 — Synthèse transversale de la recherche

Date : 2026-11-18. Recherche sans code. Sources : les 26 repos de l'organisation GitHub `duplojs`, clonés hors projet, et le boilerplate local (identique à l'amont, commit `915b78a`).

Ce fichier est l'index et la lecture croisée des six notes. Il ne remplace pas leur détail.

Légende : [VÉRIFIÉ] lu ou mesuré directement ; [RAPPORTÉ] établi par une note, non recontrôlé ici ; [HYPOTHÈSE] inféré, jamais exécuté.

## 1. Index des notes

| Fichier | Contenu | Quand le consulter |
|---|---|---|
| `01-lang-either.md` | Représentation runtime d'un Either, chaque fonction exportée, familles et invariants | Avant de traduire toute API `DEither` |
| `02-lang-autres-domaines.md` | Conventions transversales (curry, kinds, immutabilité), `pipe`, `print`, `Array`, `String`, `Generator`, inventaires par domaine | Avant de traduire toute autre API `D*` |
| `03-boilerplate-hackathon.md` | Historique commit par commit, AST Go, printer, transpileur, lacunes par exercice, lecture critique | Avant de toucher `src/` |
| `04-agents-kit-docs-philosophie.md` | Philosophie, concepts, skills, règles imposées au code DuploJS | Avant d'écrire du code dans le transpileur |
| `05-precedents-codegen-outillage.md` | Les cinq générations d'outils de transformation de l'organisation, `@duplojs/server`, règles de lint | Pour les choix d'architecture et de tests |
| `06-usages-reels-frequences.md` | Fréquences mesurées des API et des constructions TypeScript dans le code réel | Pour décider quoi couvrir au-delà des exercices |
| `07-regles-de-conception.md` | Les 14 règles de conception fournies par l'utilisateur, avec leur transposition au transpileur | Avant toute décision de conception |

## 2. Carte de l'organisation

[VÉRIFIÉ] 26 repos. Trois générations coexistent :

- Actuelle : `ecosystem` (monorepo : `lang`, `server`, `agents-kit`, `tools`, `http`, `form`, `playwright`, `json-web-token`, `code-config`, `eslint`). C'est d'ici que viennent les paquets `0.1.0-beta.11` du hackathon.
- Précédente : repos séparés `lang`, `lang-tools`, `server`, `code-config`, puis `utils`, `server-utils`, `data-parser-tools`, `dev-tools`.
- Ancienne ou archivée : `core`, `node`, `zod-accelerator`, `types-codegen`, `zod-to-typescript`, `http-client`, `examples`.

## 3. Écart de version : mesuré

[VÉRIFIÉ] Le tag `v0.1.0-beta.11` du monorepo est le commit `029f2c4` (2026-11-13). Les notes ont lu `5c5ca34` (2026-11-14), soit un seul commit plus tard. Dans `packages/lang/scripts`, ce commit ne touche que 7 fichiers : `either/matchInformationOtherwise.ts` et six `pattern/matchWith*Otherwise.ts`.

Conséquence : les notes 01 et 02 valent pour la `beta.11`, sauf pour ces sept fonctions « Otherwise », à relire sur le tag avant de les traduire. L'écart sur `agents-kit` (7 skills lus contre 4 liés dans le projet) n'a pas été mesuré.

## 4. Contradiction entre notes, tranchée

La note 01 dit que `DCommon.print` appelle `console.log` ; la note 02 dit `console.info`.

[VÉRIFIÉ] `packages/lang/scripts/common/print.ts` : `console[params](input)` avec `params = "info"` par défaut, donc `console.info`. La note 02 a raison. L'effet est le même sur la sortie standard et le format ; `"warn"` et `"error"` partent sur la sortie d'erreur ; un objet `{ columns }` appelle `console.table`, un objet `{ depth }` appelle `console.dir`. `print` renvoie son entrée.

## 5. Les sept familles de problèmes

Chaque exercice est un représentant d'une famille. Traiter la famille, c'est traiter les cas suivants.

### 5.1 Représentation des valeurs

- `number` → `float64` (acquis de l'exercice 00).
- Chaînes : JS compte en unités UTF-16, Go en octets. Sans effet tant qu'on ne fait ni `length`, ni indexation, ni découpe.
- Tableaux et tuples (exercice 08) : un tuple `[number, number, number]` a une cardinalité fixe ; un tableau non.
- `undefined` et `null` sont deux valeurs distinctes. [RAPPORTÉ] La bibliothèque signale l'absence par `undefined`, jamais par `-1`.
- Contraintes (`DNumber.Integer`, `DArray.MinElements<2>`) : types fantômes, effaçables en Go, mais elles modifient les types de retour.

### 5.2 Unions et discrimination

C'est le nœud du projet, dès l'exercice 01.

- [RAPPORTÉ] Un Either est un objet plat à 3 ou 4 clés dans un ordre fixe : `right` ou `left`, `information`, `value`, puis un marqueur de variante.
- Une fonction renvoie `Success<number> | Fail` (01), ou une union inférée à plusieurs Left nommés (06, 07).
- La discrimination se fait par l'information (`matchInformation`, `whenHasInformation`) ou par le côté (`isRight`, `isLeft`).
- [RAPPORTÉ] Dans le code réel, le motif dominant est la garde `if (isLeft(x)) return x;` puis `unwrapRight` (environ 96 occurrences), donc le rétrécissement de type après un `if` est un besoin de premier rang, pas un cas marginal.
- [VÉRIFIÉ] L'actuel `EitherSuccess[T]` est une struct générique par variante. Une struct par variante ne suffit pas à typer une valeur de retour qui peut être l'une ou l'autre.

Décision à prendre avant tout code : une seule struct Either générique avec discriminant, une interface Go avec une struct par variante, ou une union générée par signature. Chaque option a un coût mémoire, un coût d'appel et un effet sur l'affichage.

### 5.3 Fonctions comme valeurs

- Référence nue passée en argument : `DArray.coalescing`, `DString.to` (02, 05, 07).
- Fonctions fléchées, avec capture de variables (`divisor` dans 08).
- Déstructuration dans les paramètres (`([one, two, divisor])`, 08). [RAPPORTÉ] 469 occurrences dans le code réel.
- [RAPPORTÉ] `DArray.map` appelle son callback avec `(element, { index, self })`. Passer par référence une fonction dont la forme dépend du nombre d'arguments est un piège ; `DString.to` et `coalescing` n'ont qu'une forme.
- Les fonctions de la bibliothèque sont génériques ; en Go il faut les instancier. [VÉRIFIÉ] Le transpileur émet aujourd'hui `shard_dependencies.EitherSuccessOf` sans instanciation.

### 5.4 Forme d'appel : donnée d'abord ou curryfiée

- [RAPPORTÉ] La bibliothèque tranche par le nombre exact d'arguments (187 fichiers). C'est donc décidable statiquement au site d'appel.
- Exceptions qui tranchent par le type du premier argument : `DArray.slice`, `DArray.copyWithin`, `DString.substring`, `DChrono.closestTo`, `DPrinter.renderParagraph`. `DPattern.match` a trois arités. `right` et `left` ne sont pas curryfiés.
- Les exercices 02 et 03 sont la même opération sous les deux formes : `whenIsRight(result, f)` et `pipe(result, whenIsRight(f))`. Les deux styles sont à parts presque égales dans le code réel.

Conséquence : une API doit être décrite une fois, et ses deux formes dérivées, sinon chaque fonction se code deux fois.

### 5.5 Flux de contrôle et ordre d'évaluation

- `if`, plusieurs `return` (01, 04), ternaire (06).
- [RAPPORTÉ] `&&` et `||` perdent aujourd'hui leur court-circuit, car les deux opérandes sont hissés dans des temporaires. L'exercice 06 utilise `||`.
- Le mécanisme `before` du boilerplate linéarise l'évaluation. Toute construction conditionnelle (ternaire, court-circuit, `??`, `?.`) doit placer les instructions préparatoires de ses branches dans la branche, pas avant.
- Enchaînements à arrêt anticipé : `rightPipe` (07), `group` (09), et la famille `reduce` avec `next` / `exit`.

### 5.6 Asynchronisme

- Exercice 10 : `async`, `Promise`, `await`, `rightAsyncPipe`, `asyncGroup`, `asyncPipe`.
- [RAPPORTÉ] `asyncGroup` est strictement séquentiel ; `asyncPipe` attend son entrée puis chaque étape.
- [HYPOTHÈSE] Une traduction synchrone est fidèle tant qu'aucun entrelacement n'est observable. Dès qu'il y a `promiseAll`, des minuteries ou des entrées-sorties, il faut un vrai modèle (goroutines et canaux, ou une struct de promesse).

### 5.7 Effets observables et structure du programme

- [RAPPORTÉ] `print` produit le format d'inspection de Node. `success(3)` s'affiche sur plusieurs lignes avec les clés complètes des kinds. Le critère « même comportement » impose de reproduire ce format.
- [RAPPORTÉ] `DString.to` suit la conversion JS : `-0` donne `"0"`, `1e21` donne `"1e+21"`. Le formatage Go par défaut diffère.
- Code de premier niveau : le boilerplate le place dans `init()` de chaque package. [RAPPORTÉ] Une déclaration de premier niveau dont l'initialisation a besoin d'instructions préparatoires ne compilera pas telle quelle.
- [HYPOTHÈSE] L'ordre d'initialisation des packages Go et l'ordre d'évaluation des modules ES peuvent diverger.

## 6. Matrice exercice × famille

| Ex. | Valeurs | Unions | Fonctions | Forme d'appel | Flux | Async | Effets |
|---|---|---|---|---|---|---|---|
| 00 | number | Success seul | appel simple | — | return | — | — |
| 01 | — | Success \| Fail | — | — | if | — | print d'un Either |
| 02 | tableau | when sur union | référence nue | donnée d'abord | — | — | print |
| 03 | — | idem | idem | curryfiée dans pipe | — | — | — |
| 04 | — | union inférée | — | — | deux return, `===` | — | — |
| 05 | tableau, chaîne | Otherwise | fléchée, map | les deux | — | — | `String.to` |
| 06 | chaîne | Left nommé, match | objet de handlers | — | ternaire, `\|\|` | — | — |
| 07 | — | union de deux Left | fléchée | — | arrêt anticipé | — | — |
| 08 | tuple | Either par élément | capture, déstructuration | les deux | — | — | — |
| 09 | — | group | — | — | arrêt anticipé | — | — |
| 10 | — | group | fléchées async | — | — | oui | — |

## 7. Leçons des précédents de l'organisation

[RAPPORTÉ] Note 05.

- Ce qui a tenu sur quatre réécritures : liste ordonnée de petits transformers, délégation des enfants, cache indexé par identité, AST cible puis printer unique.
- Ce qui a été abandonné : registre global rempli à l'import, repli silencieux vers `unknown`, contraintes non prises en charge ignorées, table d'imports globale.
- Aucun précédent ne compile sa sortie. Le seul test de comportement est le test différentiel de `zod-accelerator`. Pour TS → Go, c'est la vérification à mettre en place : exécuter le TypeScript, exécuter le Go, comparer les sorties.

## 8. État du boilerplate : points à vérifier en premier

Tous [HYPOTHÈSE] tant qu'aucun build n'a tourné, sauf mention.

1. [VÉRIFIÉ le 2026-11-18, Go 1.27.4 en conteneur] L'exercice 00 ne compile pas en Go. `pnpm build:00` réussit, puis `go build ./...` échoue sur une seule erreur : `add.ts/add.ts.go:6:17: cannot use generic function shard_dependencies.EitherSuccessOf without instantiation`. Sur une copie hors projet, remplacer `EitherSuccessOf` par `EitherSuccessOf[float64]` suffit : `go build`, `go vet` et `go run .` passent (code 0, aucune sortie, comme le TypeScript). `gofmt -l` signale `add.ts.go` et `shard_dependencies.go` comme non formatés. Le transpileur n'a pas été corrigé.
2. `%` et les opérateurs bit à bit sur `float64` ne compilent pas en Go.
3. `context.error` lève sur un nœud synthétisé.
4. La déclaration de fonction ignore sans erreur `async`, les génériques, les paramètres optionnels, par défaut et rest.
5. `JSNull` et `JSUndefined` peuvent être déclarés deux fois ; les imports sont dédupliqués par identité d'objet.
6. Les enfants sont transformés en parallèle : la numérotation `Generated_N` peut varier d'un build à l'autre.
7. [RAPPORTÉ] `bin/index.ts` ne lit pas le résultat de `DSCommand.exec` ni celui de `DSFile.remove`.
8. [RAPPORTÉ] Le skill `go-ast` est en retard sur le code.

## 9. Règles qui s'imposent au code du transpileur

[RAPPORTÉ] Notes 04 et 05.

- Pas de `for` ni de `while` : `DArray.reduce`, `DCommon.loop`, `loopAccumulator`.
- Pas de `throw` dans une fonction réutilisable ; `OrThrow` réservé à la frontière.
- Pas d'annotation de type de retour, pas de `as`, pas de `!`.
- Imports en espace de noms par sous-chemin : `import * as DArray from "@duplojs/lang/array"`.
- Lint : `max-params: 4`, `id-length`, `init-declarations`, `no-param-reassign`, `noUncheckedIndexedAccess`.
- Zone à risque d'API inventée : `modeling`, `invocation` et `kind` n'ont aucune page dans le routeur API.

## 10. Ce qui reste inconnu

- Rien n'a été exécuté : ni `pnpm install`, ni build, ni Go. Go n'est pas installé sur cette machine ; Node 24.14.1 et pnpm le sont.
- La sortie réelle de chaque exercice en TypeScript n'a pas été capturée. C'est la référence dont dépend toute comparaison.
- L'algorithme complet du format d'inspection de Node (seuils de repli sur une ligne, largeur) n'est connu que par exemples.
- La forme exacte des nœuds de type renvoyés par le type-checker pour un retour inféré.
- Aucune grille d'évaluation du jury n'existe dans les dépôts.
- Les 9 forks du boilerplate (autres équipes) n'ont pas été consultés.
- `chrono`, `dataStructure`, `invocation`, `modeling`, `path` ont été lus par échantillonnage.

## 11. Préparation du RAG

Les notes sont déjà découpées en sections autonomes sous des titres `##`. Métadonnées utiles par chunk : fichier, titre de section, domaine (`either`, `array`, `transpiler`, `go-ast`…), famille de problème (§5), exercices concernés, statut (vérifié, rapporté, hypothèse), version lue.

Deux vocabulaires à indexer ensemble : la convention `lang` (`DEither`, `DArray`) et la convention `utils` (`E`, `A`, `O`, `DP`), avec les renommages de domaine (dataParser → dataStructure, clean → modeling, flow → invocation, date → chrono).
