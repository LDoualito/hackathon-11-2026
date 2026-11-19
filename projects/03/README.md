# Projet 03

## Problématique

### Enchaîner des transformations dans un pipe

Dans `index.ts`, `DCommon.pipe` reçoit le résultat de `add`, puis une transformation construite avec `DEither.whenIsRight(DArray.coalescing)`. Comment traduire une suite d’étapes où chaque étape reçoit le résultat de la précédente, tout en conservant l’ordre d’exécution ?

### Appliquer une fonction partiellement (problème découvert)

Au projet 02, `whenIsRight` recevait deux arguments : le résultat et la fonction. Ici, il n’en reçoit qu’un :

```ts
DEither.whenIsRight(DArray.coalescing)
```

En lisant le code de DuploJS, on voit que cette forme ne fait rien tout de suite : elle **renvoie une fonction** qui attend le résultat plus tard. C’est une version « curryfiée ».

```js
function whenIsRight(...args) {
	if (args.length === 1) {
		const [theFunction] = args;
		return (input) => whenIsRight(input, theFunction);
	}
	// ...
}
```

C’est `pipe` qui appellera ensuite cette fonction avec `result`.

## Solution

### Traduire `pipe`

```go
input := result
step := /* la fonction de l’étape */
output := step(input)
```

`DCommon.pipe(x, f, g)` exécute `g(f(x))`. Le code de DuploJS est une simple boucle :

```js
function pipe(input, ...pipes) {
	let acc = input;
	for (const pipe of pipes) acc = pipe(acc);
	return acc;
}
```

Plutôt que de créer une fonction Go `Pipe` générique, le transpileur **déroule la boucle** au moment de la traduction : la valeur de départ est rangée dans une variable, puis chaque étape est traduite, rangée dans une variable et appelée avec le résultat précédent. Le résultat du `pipe` est celui de la dernière étape.

Pourquoi dérouler plutôt qu’écrire une fonction `Pipe` :

- le nombre d’étapes est connu à la traduction, il n’y a donc pas besoin de boucle à l’exécution ;
- une fonction `Pipe(input any, steps ...func(any) any)` obligerait à construire une liste de fonctions à chaque appel ;
- les étapes sont exécutées exactement dans l’ordre du TypeScript, une par une.

Chaque étape est appelée comme une fonction `func(any) any`, la convention de l’équipe pour les fonctions passées comme valeur (projet 02).

### Traduire `whenIsRight` à un argument

```go
func(value any) any {
	return shard_dependencies.WhenIsRight(value, theFunction)
}
```

Avec un seul argument, `whenIsRight` est traduit par une **fonction Go anonyme** (une *closure*) qui attend la valeur et appelle la fonction `WhenIsRight` du projet 02. Elle a bien le type `func(any) any`, ce qui permet à `pipe` de l’appeler comme n’importe quelle étape.

La fonction passée (`coalescing`) est évaluée **une seule fois**, au moment où `whenIsRight(coalescing)` est appelé, puis capturée par la closure. C’est le même comportement que la flèche `(input) => whenIsRight(input, theFunction)` de DuploJS.

La version à deux arguments du projet 02 est conservée : le transformer choisit selon le nombre d’arguments.

## Résultats

`pnpm build:03` produit un Go qui compile et s’exécute.

| | Sortie |
| --- | --- |
| TypeScript | le succès `3`, puis `[ 3 ]` |
| Go | `{IsRight:true Information:success Value:3}`, puis `[3]` |

Même valeur qu’au projet 02 : l’exercice exprime le même calcul sous une autre forme, et la traduction donne le même résultat.

Go généré pour le `pipe` :

```go
Generated_6 := Sourced_result
Generated_7 := shard_dependencies.Coalescing
Generated_8 := func(value any) (any) {
	return shard_dependencies.WhenIsRight(value, Generated_7)
}
Generated_9 := Generated_8(Generated_6)
Sourced_newResult = Generated_9
```

## Limites

- **Fonction créée à chaque passage** : la closure de `whenIsRight(f)` est recréée à chaque exécution de la ligne, ce qui peut coûter une allocation. Ici le code ne s’exécute qu’une fois, l’effet est négligeable.
- **Étapes à un seul argument** : chaque étape du `pipe` doit être une fonction `func(any) any`. Une fonction qui attend plusieurs arguments ne peut pas être utilisée directement comme étape.
- **Typage perdu** : comme au projet 02, les valeurs qui circulent dans le `pipe` sont des `any`.
- **`pipe` passé comme valeur** : seul l’appel direct `DCommon.pipe(...)` est géré.

## Fichiers modifiés

| Fichier | Rôle |
| --- | --- |
| `duplojs/common/pipe.ts` | `pipe` → appels successifs déroulés |
| `duplojs/common/index.ts` | Ajout de `pipe` à l’aiguillage `DCommon` |
| `duplojs/either/any/whenIsRight.ts` | Ajout de la version à un argument (closure) |
| `package.json` | Commande `build:03` |