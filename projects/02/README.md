# Projet 02

## Problématique

### Transmettre une fonction pour transformer conditionnellement un résultat

Dans `index.ts`, `DEither.whenIsRight` reçoit le résultat de `add` et la fonction `DArray.coalescing`. Comment traduire un appel qui reçoit une fonction en argument et applique cette fonction uniquement à la valeur d’un résultat `Right`, tout en conservant inchangés les autres cas ?

### Représenter une union qui n’est pas uniquement un Either (problème découvert)

Ce problème a été découvert en lançant le build : `notfound-transformer` sur un `UnionType` déduit par le TypeChecker (`text: 'DisplayError'`). Il s’agit du type de `newResult` :

```ts
const newResult: DEither.Fail | readonly [number]
```

En lisant le code de DuploJS, on voit que `whenIsRight` ne renvoie pas un Either en cas de succès : il renvoie directement le résultat de la fonction.

```js
function whenIsRight(input, theFunction) {
	if (isRight(input)) return theFunction(valueKind.getValue(input));
	return input;
}
```

`newResult` est donc soit l’échec d’origine, soit le tableau produit par `coalescing`. Le transformer d’Either du projet 01 n’accepte que des unions composées uniquement d’Either et refusait celle-ci.

## Solution

### Représenter une union mixte

```go
var newResult any
```

Une union qui ne contient pas uniquement des Either (ici `Fail | readonly [number]`) ne correspond à aucun type Go précis. Elle est traduite par `any`. Ce transformer (`type/union.ts`) est placé en dernier dans la liste des types : une union composée uniquement d’Either est d’abord prise par le transformer Either et reste `Either`.

### Représenter une fonction passée comme valeur

```go
func(value any) any
```

Toute fonction passée en argument est représentée par le type Go `func(any) any`. Ce choix est cohérent avec la valeur `any` de l’Either du projet 01 : la fonction reçoit la valeur du succès sans connaître son type, et peut renvoyer n’importe quoi. C’est la convention commune à toute l’équipe, réutilisée par `pipe`, `map` et les fonctions fléchées.

### Traduire `whenIsRight`

```go
func WhenIsRight(input any, theFunction func(value any) any) any {
	var either Either
	var isEither bool
	either, isEither = input.(Either)
	if isEither && either.IsRight {
		return theFunction(either.Value)
	}
	return input
}
```

`DEither.whenIsRight(input, theFunction)` devient un appel à cette fonction de `shard_dependencies`, qui reproduit le code de DuploJS :

- si l’entrée est un Either en succès, la fonction est appliquée à sa valeur et son résultat est renvoyé **tel quel** (pas remis dans un Either) ;
- sinon, l’entrée est renvoyée inchangée.

L’entrée est de type `any` et non `Either`, car au projet 03 `whenIsRight` sera utilisé dans un `pipe`, où la valeur reçue n’est pas forcément un Either. `input.(Either)` (assertion de type avec vérification) permet de tester ce cas sans planter.

Comme pour les autres appels, chaque argument est d’abord évalué dans une variable temporaire, pour conserver l’ordre d’évaluation.

### Traduire `DArray.coalescing`

```go
func Coalescing(value any) any {
	var slice []any
	var isSlice bool
	slice, isSlice = value.([]any)
	if isSlice {
		return slice
	}
	return []any{value}
}
```

`coalescing` renvoie la valeur telle quelle si c’est déjà un tableau, sinon il l’enveloppe dans un tableau (`3` → `[3]`). Ici, il est **passé comme valeur** (sans parenthèses) : on transmet simplement la fonction Go `shard_dependencies.Coalescing`, qui a bien le type `func(any) any`. L’appel direct `DArray.coalescing(x)` est aussi géré.

Les tableaux sont représentés par `[]any`, en cohérence avec `any`.

## Résultats

`pnpm build:02` produit un Go qui compile et s’exécute.

| | Sortie |
| --- | --- |
| TypeScript | le succès `3`, puis `[ 3 ]` |
| Go | `{IsRight:true Information:success Value:3}`, puis `[3]` |

Les valeurs sont identiques, seul le format d’affichage diffère (voir les limites du projet 01).

Go généré pour la nouvelle ligne :

```go
var Sourced_newResult any

func init() {
	// ...
	Generated_6 := Sourced_result
	Generated_7 := shard_dependencies.Coalescing
	Sourced_newResult = shard_dependencies.WhenIsRight(Generated_6, Generated_7)
	Generated_8 := Sourced_newResult
	shard_dependencies.Print(Generated_8)
}
```

## Limites

- **Typage perdu** : `newResult`, les arguments et le résultat des fonctions sont en `any`. Le compilateur Go ne vérifie plus les types, une erreur de type ne serait détectée qu’à l’exécution.
- **Performance** : `any` et `[]any` provoquent des allocations (voir le benchmark du projet 01).
- **`readonly`** : le tuple `readonly [number]` devient un `[]any` modifiable. Go n’a pas d’équivalent, mais aucun code ici ne modifie le tableau.
- **Tuples** : la longueur fixe d’un tuple (`[number]` = exactement un élément) n’est pas conservée dans `[]any`.
- **`whenIsRight`** : seule la version à deux arguments est gérée. La version à un argument (curryfiée, utilisée dans `pipe`) est l’objet du projet 03.
- **Fonctions-valeurs** : toute fonction passée en argument doit pouvoir s’écrire `func(any) any`, avec un seul argument.

## Fichiers modifiés

| Fichier | Rôle |
| --- | --- |
| `type/union.ts` | Unions qui ne sont pas des Either → `any` |
| `duplojs/either/any/whenIsRight.ts` | `whenIsRight` → `WhenIsRight` |
| `duplojs/either/index.ts` | Ajout de `whenIsRight` à l’aiguillage |
| `duplojs/array/coalescing.ts` | `coalescing` → `Coalescing` |
| `duplojs/array/index.ts` | Aiguillage des fonctions `DArray` |
| `duplojs/index.ts` | Enregistrement de l’aiguillage `DArray` |
| `type/index.ts` | Enregistrement du transformer d’union |
| `package.json` | Commande `build:02` |