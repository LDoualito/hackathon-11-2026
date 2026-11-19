# 07 — Règles de conception

Règles fournies par l'utilisateur le 2026-11-18. La liste collée contenait des doublons : elle compte 14 règles distinctes, reprises ici une fois chacune.

L'énoncé d'origine est conservé tel quel. Il vient d'un autre projet (Laravel, socket, front Vue, Blender, jeu) ; la ligne « Application au transpileur » en donne la transposition pour ce dépôt. Ces transpositions sont une proposition, pas une consigne validée.

## 1. KISS

Énoncé : pick the simplest design that works. No abstraction, config flag or generic layer until a second real use needs it.

Application au transpileur : un transformer par forme précise, pas de transformer configurable ni de helper de factorisation avant le deuxième usage réel. Le skill `typescript-to-go` impose déjà la même chose.

## 2. YAGNI

Énoncé : build what the current feature needs, nothing "for later". Delete dead code instead of commenting it out.

Application au transpileur : tension à assumer avec l'objectif « anticiper les 100 cas ». Anticiper veut dire choisir une représentation qui ne ferme pas la porte aux cas suivants et les lister dans les notes ; cela ne veut pas dire coder des transformers pour des API qu'aucun exercice n'utilise.

## 3. DRY

Énoncé : a rule, price, constant or formula lives in one place. When two layers (Blender, API, socket, front) must agree on a value, one owns it and the others read it or share a contract doc (`docs/*.md`). Extract code the second time it appears instead of copying and adapting it.

Application au transpileur : les clés de kind, les noms des dépendances partagées et la description d'une API DuploJS (ses deux formes d'appel) vivent à un seul endroit. Les couches qui doivent s'accorder ici sont le transformer de valeur, le transformer de type, la dépendance Go partagée et l'affichage.

## 4. SoC

Énoncé : Laravel owns persistent truth (money, items, ownership), the socket owns live state, timing and anti-cheat, the front only displays and sends intents, and Blender scripts only build assets. Vue components render and delegate logic to composables or plain TS modules.

Application au transpileur : le CLI gère entrées et sorties, le transpileur traduit des nœuds TypeScript en AST Go, le printer rend l'AST en texte, les dépendances partagées portent le runtime Go. Aucune couche ne fait le travail de sa voisine (pas de texte Go fabriqué dans un transformer).

## 5. SOLID

Énoncé : one responsibility per class or service. Extend through new classes or strategies instead of growing `if` chains. Inject dependencies (Laravel container) instead of building them inline.

Application au transpileur : une nouvelle construction s'ajoute par un nouveau transformer dans la liste de sa catégorie, pas par une branche de plus dans un transformer existant. Les outils passent par le contexte (`BuildContext`), ils ne sont pas construits sur place.

## 6. Composition over inheritance

Énoncé : build behaviour from small parts (services, composables, strategies, asset builders) instead of base classes and deep hierarchies.

Application au transpileur : listes de transformers composées par catégorie, routeur de domaine puis handler. Côté Go généré : structs et fonctions génériques, pas de hiérarchie.

## 7. Idempotence

Énoncé : an operation that may be retried (reward, purchase, webhook, seeder, socket message sent twice) gives the same result the second time. Use a unique key or a state check, never "hope it runs once".

Application au transpileur : deux builds de la même entrée produisent exactement les mêmes fichiers. Points sensibles relevés dans la note 03 : numérotation `Generated_N` dépendante de l'ordre de résolution, dépendances partagées enregistrées deux fois, imports dédupliqués par identité d'objet.

## 8. Make illegal states unrepresentable

Énoncé : model state so a wrong combination cannot be written: TS unions instead of flags that can conflict, enums and DB constraints instead of free strings.

Application au transpileur : la représentation Go d'un Either ne doit pas permettre un objet à la fois Right et Left, ni une information hors de l'union déclarée. C'est un critère pour choisir entre struct unique à discriminant et interface à variantes. Côté AST Go, les types empêchent déjà de construire un nœud invalide.

## 9. Law of Demeter

Énoncé : talk to your direct collaborators only; no `a.b.c.d()` chains reaching into another module's internals.

Application au transpileur : un transformer délègue ses enfants par `context.transform` et n'inspecte pas l'intérieur du nœud Go qu'un autre a produit. La note 05 documente le défaut que cela évite (information d'optionalité perdue derrière une référence).

## 10. Design by contract

Énoncé : when two layers must agree (API payload, socket message, asset manifest), the contract is written down in `docs/*.md` and checked on both sides: the server validates every field it receives. New contracts state their fields, types and ranges.

Application au transpileur : le contrat `Transformer` (succès, non pris en charge, erreur, introuvable) et, pour chaque API DuploJS traduite, le contrat entre la sémantique TypeScript et le Go émis, écrit dans le README de l'exercice comme le demande le README racine.

## 11. Fail fast, trust no client

Énoncé : validate at the edge, never trust an amount, position, count or duration sent by the client, and surface errors instead of swallowing them.

Application au transpileur : le « client » est le code TypeScript d'entrée. Une forme non prise en charge doit produire une erreur explicite, jamais un Go faux ou un repli silencieux. La note 03 relève des cas ignorés sans erreur (`async`, génériques, paramètres optionnels, par défaut et rest dans une déclaration de fonction).

## 12. Emergent gameplay

Énoncé : a player does whatever the game lets them do, not what the feature expects. Before an action ships, list what the player can still do while it runs (move, turn, jump, leave the area, press another key, open a menu, do it twice, do it early, late or in the wrong order, disconnect) and decide each case: allowed and handled, or blocked. The server judges an action from where the player really is at that moment, never from where the flow assumes they are. Example: the tennis server could walk away from their toss and still hit it; the fix puts them on the baseline, locks them while they serve and only accepts the hit from under the ball. Each case decided is written in the feature's doc and covered by a test.

Application au transpileur : le développeur écrit tout ce que TypeScript accepte, pas seulement la forme de l'exercice. Avant de livrer un transformer, lister les variantes de la même construction (forme curryfiée ou donnée d'abord, référence nue ou fléchée, alias d'import, valeur déjà Left, imbrication, appel au premier niveau ou dans une fonction) et décider pour chacune : prise en charge, ou refusée avec erreur. Chaque décision est écrite dans le README de l'exercice et couverte par un test. C'est la règle qui correspond à « anticiper les 100 cas ».

## 13. Least astonishment

Énoncé : follow the conventions already in the file or module you touch (naming, folder layout, patterns) before introducing a new one; a function does what its name says and nothing else.

Application au transpileur : suivre les conventions du boilerplate et des skills DuploJS (note 04) : listes en `DCommon.memo`, contrat explicite sur la constante du transformer, rangement par catégorie.

## 14. Boy Scout Rule, in scope

Énoncé : leave the code you touch cleaner than you found it, but no drive-by refactors outside the task.

Application au transpileur : les défauts du boilerplate relevés hors sujet (note 03, note 05) se signalent, ils ne se corrigent pas au passage.
