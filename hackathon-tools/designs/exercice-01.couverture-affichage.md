# Couverture — exercice 01, tranche « affichage par `DCommon.print` »

Document examiné : `hackathon-tools/designs/exercice-01.md` (§5, §7.4, §10). Date : 2026-11-19. Node v24.14.1, sortie non-TTY.

## 1. Comment la population a été établie

| Source | Outil | Chiffre |
|---|---|---|
| Surcharges de `print` | `h signatures DCommon.print` | 1 signature, 2 paramètres, `params` par défaut `"info"` ; 5 formes de `PrintParams` (`"info"`, `"warn"`, `"error"`, `{ columns }`, `{ depth }`) |
| Usages réels | `h usages DCommon.print limit=60` | 29 sites : 26 à un argument, 3 à deux arguments (tests de `lang` : niveau, `columns`, `depth`), 0 référence nue |
| Répartition | idem | 18 dans les exercices, 7 dans les épreuves `unions`, 4 dans les tests de `lang` |
| Ce qui est affiché dans les exercices | lecture de `projects/01` à `10` et exécution | 7 sites : Either sous garde `isRight` (01 à 07) ; 3 sites : Either ou `number[]` (02, 03, 04) ; 6 sites : `string[]` (05 à 10) ; 2 sites : chaîne au premier niveau (06, 07) |
| Constructeurs d'Either affichables | `h api_list namespace=DEither` | 50 entrées, dont 9 constructeurs : `success`, `ok`, `some`, `right`, `result`, `fail`, `error`, `none`, `left` |
| Autres sorties de `DCommon` | `h api_list namespace=DCommon` | 61 entrées ; `forwardLog` et `tap` touchent à l'affichage |
| État réel | `h coverage` | 00 échoue à la compilation Go, 01 à 10 échouent à la transpilation : aucun cas n'est géré de bout en bout par le transpileur aujourd'hui |

Sens des classes dans ce rapport, puisque rien n'est encore transpilé :

- **géré** : le document le traite et le corpus du formateur livré (`verify/out/design-01/inspect-stage01`, 243 lignes, valeurs Go construites à la main) le rejoue, identique à Node. J'ai revérifié : `corpus.node.txt` et `corpus.go.txt` sont identiques dans `inspect/` et dans `inspect-stage01/`.
- **géré sur parole** : annoncé « fait » ou « livré », sans valeur correspondante dans le corpus du formateur livré.
- **refusé** : erreur de transpilation prévue.
- **différé** : reporté ; « essai » signale que le portage complet non livré (`inspect/`, 435 lignes) l'a rejoué.
- **oublié** : le document n'en dit rien.

Toutes les épreuves citées sont dans `hackathon-tools/verify/epreuves/affichage/`, s'exécutent avec `tsx` et passent `tsc --noEmit`.

## 2. Ce qui n'est pas géré, par fréquence dans le code réel

| Rang | Cas | Sites réels | Classe | Pourquoi c'est grave |
|---|---|---|---|---|
| 1 | Affichage d'un tableau | 9 sites sur 18 dans les exercices (02 à 10), 7 sur 7 dans les épreuves `unions` | différé (essai) | Le formateur livré n'a pas de branche tableau : `panic` à l'exécution dès l'exercice 02. Le code existe mais importe `reflect` et n'est pas celui qui sera livré |
| 2 | Either autre que `success` et `fail` (`left(info, v)`, `right(info, v)`, `ok`, `some`, `result`, `error`, `none`) | 3 sites dans les épreuves `unions` (tableaux de variantes nommées) ; 7 constructeurs sur 9 | différé à l'exercice 06, sans essai pour 6 des 7 | Seul `left("negative-operand", -1)` a été rejoué. `right("x")` et `left("x")` n'ont que 3 clés, `none()` porte `null`, `ok()` porte `undefined` |
| 3 | Deuxième paramètre de `print` | 3 sites (tests de `lang`) | refusé | `"warn"` et `"error"` écrivent sur stderr, que `verify.sh` ne compare pas : quand ils seront faits, une divergence restera invisible. `print(x, "info")` est refusé alors qu'il est identique à `print(x)` |
| 4 | Objet littéral affiché | 1 site (épreuve `six-succes`, `{ value }` dans un Either) | différé (formateur géré, transformer absent) | Clés entières remises en tête par JavaScript : « non prévu », sans erreur de transpilation annoncée, donc ordre faux en silence |
| 5 | `print` ailleurs qu'en instruction de premier niveau : dans un rappel fléché, dans un `return`, dans une expression arithmétique, comme argument | 0 site dans les exercices | oublié | Le §7.4 ne liste que l'instruction et `const y = print(x)` |

Oublis sans occurrence dans le code réel mais sans détection annoncée :

- constantes numériques : `-0` littéral et `0.1 + 0.2` littéral. [HYPOTHÈSE] si l'opération est émise entre deux `float64(...)` constants, Go calcule en arithmétique exacte : `0` au lieu de `-0`, `0.3` au lieu de `0.30000000000000004`, en silence ; `0 / 0` et `1e308 * 10` ne compilent pas. Le document a vu le phénomène (§5.3) et l'a classé comme défaut du test ;
- substitut isolé dans une chaîne (`"\ud83d"`) : Node affiche `'\ud83d'`, une chaîne Go ne peut pas le contenir ;
- chaîne imbriquée de plus de 10 000 caractères : Node tronque et ajoute `... 1 more character` ;
- `bigint`, résultat de `DArray.group` (`[Object: null prototype]`), résultat de `DCommon.memo` (`[Getter]`), `Date`, `RegExp` ;
- couleurs quand la sortie est un terminal.

## 3. Tableau complet

### 3.1 Nombres

| # | Cas | Axe | Source | Classe | Épreuve |
|---|---|---|---|---|---|
| 1 | Entier, décimal au premier niveau | Valeurs | corpus livré | géré | |
| 2 | `-0`, `NaN`, `Infinity`, `-Infinity` produits à l'exécution | Valeurs limites | corpus livré | géré | `nombre-limites-calcules` |
| 3 | Exposants `1e21`, `1e-7`, bornes `0.000001` et `123456789012345680000`, `2 ** 53` | Valeurs limites | corpus livré | géré | |
| 4 | `5e-324`, `1.7976931348623157e308`, `1.0000000000000001e-7` | Valeurs limites | inventaire propre | géré sur parole | `nombre-limites-calcules` |
| 5 | Littéraux constants `-0`, `0.1 + 0.2`, `0 / 0`, `1e308 * 10`, `2 ** 53 + 1` | Forme d'écriture | inventaire propre | oublié | `nombre-litteraux-constants` |
| 6 | `bigint` seul et en tableau aligné à droite | Hétérogénéité | inventaire propre | oublié | `valeur-bigint-date-map` |

### 3.2 Chaînes, booléens, `null`, `undefined`

| # | Cas | Axe | Source | Classe | Épreuve |
|---|---|---|---|---|---|
| 7 | Chaîne au premier niveau : simple, vide, multiligne | Valeurs | corpus livré ; 2 sites (06, 07) | géré | |
| 8 | Chaîne au premier niveau avec apostrophe, guillemet, accent, émoji, tabulation, barre oblique inverse | Valeurs limites | inventaire propre | géré sur parole | `chaine-premier-niveau` |
| 9 | Chaîne imbriquée : trois styles de guillemets, échappements, `\x7F`, `\x85` | Valeurs limites | corpus livré | géré | |
| 10 | Chaîne imbriquée longue découpée aux sauts de ligne | Valeurs limites | corpus livré | géré | |
| 11 | Substitut isolé | Valeurs limites | inventaire propre | oublié | `chaine-substitut-isole` |
| 12 | Chaîne imbriquée de plus de 10 000 caractères | Valeurs limites | inventaire propre | oublié | `chaine-plus-de-dix-mille` |
| 13 | `true`, `false`, `null`, `undefined` au premier niveau | Valeurs | corpus livré | géré | |

### 3.3 Either

| # | Cas | Axe | Source | Classe | Épreuve |
|---|---|---|---|---|---|
| 14 | `success(v)`, v scalaire, chaîne, `null`, `undefined`, booléen | Valeurs | corpus livré ; 7 sites (01 à 07) | géré | |
| 15 | `success(NaN)`, `success(-0)` | Valeurs limites | inventaire propre | géré sur parole | `either-valeurs-de-toutes-sortes` |
| 16 | `fail()` | Symétrie | 1 site (04) ; corpus complet seulement | géré sur parole | `either-variantes-left` |
| 17 | `left(info, v)` | Symétrie | `api_list` ; corpus complet | différé (essai) | `either-variantes-left` |
| 18 | `left(info)` sans valeur (3 clés) | Cardinalité 0 | `api_list` | différé | `either-variantes-left` |
| 19 | `error(v)`, `none()` | Symétrie | `api_list` | différé | `either-variantes-left` |
| 20 | `ok()`, `some(v)`, `result(info, v)` | Symétrie | `api_list` | différé | `either-variantes-right` |
| 21 | `right(info)`, `right(info, v)` (3 clés) | Cardinalité 0 | `api_list` | différé | `either-variantes-right` |
| 22 | Right imbriqués, profondeur 2, 3, 4 (`[Object]`) | Profondeur | corpus livré | géré | `either-profondeur-quatre` |
| 23 | Left imbriqués sur 4 niveaux | Profondeur, symétrie | inventaire propre | différé | `either-profondeur-quatre` |
| 24 | Either portant un objet | Composition | corpus livré | géré | |
| 25 | Either portant un tableau court ou de plus de 6 éléments | Composition | exercice 02 ; corpus complet | différé (essai) | `either-valeurs-de-toutes-sortes` |
| 26 | Either dans un tableau, à profondeur 1, 2, 3 | Profondeur | 3 sites (épreuves `unions`) ; corpus complet | différé (essai) | `tableau-d-either` |
| 27 | Either dans un tableau dans un Either (`[Array]`) | Profondeur | corpus complet | différé (essai) | `either-profondeur-quatre` |

### 3.4 Tableaux

| # | Cas | Axe | Source | Classe | Épreuve |
|---|---|---|---|---|---|
| 28 | Vide, 1 élément, 6 éléments | Cardinalité | 9 sites (02 à 10) ; corpus complet | différé (essai) | `tableau-vide-et-court` |
| 29 | 7 nombres et plus : colonnes, alignement à droite, négatifs | Cardinalité 6+ | corpus complet | différé (essai) | `tableau-sept-en-colonnes` |
| 30 | Plus de 6 éléments restant sur une ligne (une seule colonne calculée, types mêlés) | Hétérogénéité | corpus complet (1 valeur) | différé (essai) | `tableau-long-sur-une-ligne` |
| 31 | Chaînes en colonnes alignées à gauche ; nombres et `null` mêlés | Hétérogénéité | corpus complet | différé (essai) | `tableau-chaines-en-colonnes` |
| 32 | 100, 101, 102 éléments (`... N more items`, singulier et pluriel) | Valeurs limites | corpus complet | différé (essai) | `tableau-plus-de-cent` |
| 33 | Imbrication, `[Array]`, tableaux vides imbriqués | Profondeur | corpus complet | différé (essai) | `tableau-imbrique-profondeur` |
| 34 | Seuil exact une ligne ou plusieurs (72 et 73 caractères de contenu) | Valeurs limites | inventaire propre | différé | `tableau-seuil-de-ligne` |
| 35 | Largeur d'affichage : pleine largeur, signes combinants, émoji composé | Valeurs limites | document, hypothèse déclarée | différé | `tableau-largeur-unicode` |
| 36 | Tableau troué | Valeurs limites | document, « non prévu » | différé, sans détection annoncée à la transpilation | `tableau-troue` |

### 3.5 Objets et autres valeurs

| # | Cas | Axe | Source | Classe | Épreuve |
|---|---|---|---|---|---|
| 37 | Objet vide, court, long sur plusieurs lignes | Cardinalité | corpus livré pour le formateur ; aucun transformer d'objet littéral | différé (essai) | `objet-vide-court-long` |
| 38 | Objet imbriqué (`[Object]`), objet portant un tableau de plus de 6 éléments | Profondeur | corpus livré et complet | différé (essai) | `objet-imbrique-profondeur` |
| 39 | Seuils de la règle une ligne ou plusieurs, comptés en unités UTF-16 | Valeurs limites | corpus livré | géré | |
| 40 | Clés entre apostrophes (`b-c`, `$no`, `1a`) | Valeurs limites | corpus livré | géré | |
| 41 | Clés `é`, vide, avec apostrophe | Valeurs limites | inventaire propre | géré sur parole | `objet-cles-speciales` |
| 42 | Clés entières remises en tête et triées | Valeurs limites | document, « non prévu » | différé, sans détection annoncée | `objet-cles-entieres` |
| 43 | Objet sans prototype (`DArray.group`) | Composition | note 02 §2.3 | oublié | `valeur-groupe-prototype-nul` |
| 44 | Accesseur (`DCommon.memo`), avant et après lecture | Composition | note 02 §2.3 | oublié | `valeur-memo-getter` |
| 45 | Fonction, nommée ou anonyme, seule ou imbriquée | Hétérogénéité | document, « non prévu » | différé (panique annoncée) | `valeur-fonction` |
| 46 | Promesse non attendue | Position asynchrone | document, « non prévu » ; exercice 10 à un `await` près | différé (panique annoncée) | `valeur-promesse-non-attendue` |
| 47 | `Map`, `Set` | Hétérogénéité | document, « non prévu » | différé (panique annoncée) | `valeur-bigint-date-map` |
| 48 | `Date`, `RegExp` | Hétérogénéité | inventaire propre | oublié | `valeur-bigint-date-map` |
| 49 | Référence circulaire | Profondeur | document, « non prévu » | différé (panique annoncée) | aucune |

### 3.6 Modes de `print`

| # | Cas | Axe | Source | Classe | Épreuve |
|---|---|---|---|---|---|
| 50 | `print(x, "info")` | Forme d'écriture | `signatures` | refusé | `mode-info-explicite` |
| 51 | `print(x, "warn")`, `print(x, "error")` : stderr | Symétrie | 1 site (test de `lang`) | refusé | `mode-warn-error` |
| 52 | Niveau calculé à l'exécution | Forme d'écriture | `signatures` | refusé | `mode-variable` |
| 53 | `{ depth }` : 0, 1, `null`, 10 ; chaîne au premier niveau, alors entre apostrophes | Valeurs limites | 1 site (test de `lang`) | refusé | `mode-depth` |
| 54 | `{ columns }` : colonnes présentes, liste vide, colonne absente, entrée scalaire | Cardinalité | 1 site (test de `lang`) | refusé | `mode-columns` |
| 55 | Comparaison de stderr par `verify.sh` | Symétrie | lecture de `verify.sh` | oublié | `mode-warn-error` |

Les épreuves des cas refusés sont gardées parce qu'une épreuve est réussie quand le transpileur la refuse avec l'erreur prévue (`print-params-not-supported`).

### 3.7 Positions et formes d'appel

| # | Cas | Axe | Source | Classe | Épreuve |
|---|---|---|---|---|---|
| 56 | Instruction de premier niveau, dans une branche rétrécie | Position | 18 sites | géré sur parole | exercices 01 à 10 |
| 57 | `const y = print(x)` puis `print(y)` | Position | document §10 | géré sur parole | `position-retour-reutilise` |
| 58 | `print(print(x))`, `print(x) * 2`, `return print(x)` dans une fonction | Position, composition | inventaire propre | oublié | `position-retour-reutilise` |
| 59 | Dans un rappel fléché de `DArray.map` et de `DCommon.pipe` | Position | inventaire propre | oublié | `position-dans-un-rappel` |
| 60 | Plusieurs `print` comme arguments d'un même appel, dans un ternaire | Composition | document §4 (temporaires) | géré sur parole | `position-ordre-d-evaluation` |
| 61 | Référence nue dans `pipe` | Forme d'écriture | 0 site ; document §7.4 | refusé | `position-reference-nue` |
| 62 | Référence nue dans `DCommon.tap` | Forme d'écriture | `api_list` | oublié | `position-reference-nue` |
| 63 | `print(await x)` | Position asynchrone | 1 site (10) | différé | exercice 10 |
| 64 | `DCommon.forwardLog`, autre fonction de `DCommon` | Composition | `api_list` | refusé | aucune |
| 65 | Couleurs ANSI quand la sortie est un terminal, `FORCE_COLOR` | Environnement | note 02 §2.3 | oublié | aucune (ne dépend pas du programme) |

Hors population, vérifié : `DArray.map(xs, DCommon.print)` est refusé par le typage (`MapTheFunctionParams` n'est pas un `PrintParams`). À l'exécution il passerait par `console.dir` et afficherait les chaînes entre apostrophes.

## 4. Décomptes

Population : 65 cas.

| Classe | Nombre | Lignes |
|---|---|---|
| géré | 12 | 1, 2, 3, 7, 9, 10, 13, 14, 22, 24, 39, 40 |
| géré sur parole | 8 | 4, 8, 15, 16, 41, 56, 57, 60 |
| refusé | 7 | 50, 51, 52, 53, 54, 61, 64 |
| différé | 26 | 17 à 21, 23, 25 à 38, 42, 45, 46, 47, 49, 63 |
| oublié | 12 | 5, 6, 11, 12, 43, 44, 48, 55, 58, 59, 62, 65 |

Total : 12 + 8 + 7 + 26 + 12 = 65. Aucune de ces 12 lignes n'est gérée par le transpileur : elles le sont par le formateur Go écrit à la main et rejoué hors transpileur.

Sur les 26 différés : 12 ont un essai exécuté sur le portage complet (17, 25 à 33, 37, 38), 14 n'en ont pas.

## 5. Sorties de référence

Sorties Node de chaque épreuve : `pnpm --silent exec tsx hackathon-tools/verify/epreuves/affichage/<cas>/index.ts`. Relevés utiles :

| Entrée | Sortie Node |
|---|---|
| `[1, 22, 333, 4444, 55555, 666666, 7777777]` | `[ 1, 22, 333, 4444, 55555, 666666, 7777777 ]` (7 éléments, une ligne) |
| `[-1, 2, -3, 4, -5, 6, -7.5]` | 3 colonnes alignées à droite |
| `["한국어한국어", "1", …, "88888888"]` (9 éléments) | un élément par ligne, sans colonnes |
| `["\ud83d"]` | `[ '\ud83d' ]` |
| `{ b: 1, 2: "x", a: 3, 1: "y" }` | `{ '1': 'y', '2': 'x', b: 1, a: 3 }` |
| `{ "10": 1, "9": 2, "-1": 3, "01": 4, "1.5": 5 }` | `{ '9': 2, '10': 1, '-1': 3, '01': 4, '1.5': 5 }` |
| `print("it's", { depth: 2 })` | `"it's"` (entre guillemets, contrairement à `print("it's")`) |
| `print(nested, { depth: 0 })` | valeur d'Either remplacée par `[Object]` dès le premier niveau |
| `print(3, { columns: ["name"] })` | `3` |
| `print(DEither.right("created"))` | 3 clés, `value: undefined`, pas de marqueur |
| `print(DEither.none())` | `value: null`, marqueur `none` |
| `print(promesse résolue)` | `Promise {` puis l'Either indenté de 2 espaces |
| `print(DArray.group(...))` | `[Object: null prototype] { small: [ 1 ], big: [ 2, 3 ] }` |
| `print(DCommon.memo(...))` | `{ value: [Getter] }`, puis `{ value: 42 }` après lecture |
| `mode-warn-error` | stdout : `avant`, `après` ; stderr : l'Either puis `[ 'échec' ]` |

## 6. Ce qui n'a pas pu être inventorié

- Le comportement du Go : aucune épreuve n'a été transpilée ni rejouée contre le formateur Go. Je n'ai pas rejoué mes cas nouveaux (substitut isolé, 10 000 caractères, largeur Unicode, seuil de tableau) sur le portage complet : il faudrait écrire les valeurs en Go à la main.
- La ligne 5 repose sur une hypothèse : je n'ai pas vérifié comment une opération entre deux littéraux sera émise (`numericLiteral.ts` émet `float64(<littéral>)` ; l'opération binaire n'a pas de transformer aujourd'hui).
- Les valeurs produites par les domaines de `lang` autres que `either`, `array`, `string` et `common` (dates, `clean`, analyseurs de données) : je n'ai pas dressé la liste des formes d'objets qu'ils renvoient et que `print` afficherait (instances de classe avec préfixe de nom, erreurs avec pile d'appels dépendante du chemin).
- Les références circulaires et les instances de classe : pas d'épreuve.
- Les couleurs en terminal : hors de portée d'une épreuve comparée par tube.
- `h usages` ne compte que les appels écrits avec l'espace de noms `DCommon.print` ; un import nommé `print` ou un alias n'apparaîtrait pas dans les 29 sites.

## 7. Épreuves créées (37)

`chaine-plus-de-dix-mille`, `chaine-premier-niveau`, `chaine-substitut-isole`, `either-profondeur-quatre`, `either-valeurs-de-toutes-sortes`, `either-variantes-left`, `either-variantes-right`, `mode-columns`, `mode-depth`, `mode-info-explicite`, `mode-variable`, `mode-warn-error`, `nombre-limites-calcules`, `nombre-litteraux-constants`, `objet-cles-entieres`, `objet-cles-speciales`, `objet-imbrique-profondeur`, `objet-vide-court-long`, `position-dans-un-rappel`, `position-ordre-d-evaluation`, `position-reference-nue`, `position-retour-reutilise`, `tableau-chaines-en-colonnes`, `tableau-d-either`, `tableau-imbrique-profondeur`, `tableau-largeur-unicode`, `tableau-long-sur-une-ligne`, `tableau-plus-de-cent`, `tableau-sept-en-colonnes`, `tableau-seuil-de-ligne`, `tableau-troue`, `tableau-vide-et-court`, `valeur-bigint-date-map`, `valeur-fonction`, `valeur-groupe-prototype-nul`, `valeur-memo-getter`, `valeur-promesse-non-attendue`.

Elles ne sont pas inscrites dans `hackathon-tools/verify/epreuves/README.md` (consigne : plusieurs agents écrivent en parallèle).
