# Projet 01

## Problématique

### Représenter un retour composé de plusieurs variantes

La fonction `add` déclare un retour qui peut être un `DEither.Success<number>` ou un `DEither.Fail`. Comment représenter en Go un retour qui peut prendre plusieurs formes, tout en conservant le type et la valeur associés à chacune d’elles ? Dans cet exemple, l’implémentation retourne actuellement un succès, mais sa signature annonce également la possibilité d’un échec.

### Traduire une instruction conditionnelle

Dans `index.ts`, l’instruction `if` utilise `DEither.isRight(result)` comme condition et contient un bloc d’instructions à exécuter lorsque cette condition est vraie. Comment traduire une instruction conditionnelle en préservant l’évaluation de sa condition et l’exécution de la bonne branche ?

### Déclarer une variable au niveau du module (problème découvert)

Ce problème n’apparaît pas dans l’énoncé : il a été découvert en lançant `pnpm build:01`. Le build échouait avec `notfound-transformer` sur le nœud `VariableStatement` (affiché `FirstStatement`), dont le parent est le `SourceFile` :

```ts
const result = add(1, 2);
```

Le projet 00 ne contenait aucune déclaration de variable, aucun transformer ne gérait donc ce nœud. La variable est déclarée au niveau du fichier et réutilisée par le `if` qui suit.

### Afficher une valeur (problème découvert)

`DCommon.print(result)` n’avait pas non plus d’équivalent Go dans le transpileur.

## Solution

### Déclarer une variable au niveau du module

```go
var result shard_dependencies.Either

func init() {
	result = add(1, 2)
}
```

En Go, une instruction ne peut pas être écrite au niveau d’un package : seules les déclarations y sont autorisées. La variable est donc **déclarée au niveau du package** (sans valeur), puis **assignée dans `init()`**, comme l’appel au niveau du fichier du projet 00.

Une alternative était de tout mettre dans `init()` (`result := add(1, 2)`). Elle a été écartée : `result` serait alors local à `init()`. En TypeScript, une variable de module est visible par tout le fichier (une fonction du même fichier peut l’utiliser) et peut être exportée. La déclaration au niveau du package conserve cette portée.

Le transformer (`declaration/variable.ts`) renvoie la déclaration comme `result` et l’assignation dans `before`. `transformSourceFile` range automatiquement une déclaration au niveau du package et les instructions `before` dans `init()`. Le type de la variable est lu dans le code ou, s’il n’est pas écrit, déduit par le TypeChecker de TypeScript.

### Représenter un Either et ses variantes

```go
type Either struct {
	IsRight     bool
	Information string
	Value       any
}
```

Tous les types Either de DuploJS (`Success<X>`, `Fail`, `Left<"info", X>`) et toutes leurs unions sont traduits vers **une seule struct** `Either`, placée dans `shard_dependencies` :

- `IsRight` indique s’il s’agit d’un succès ou d’un échec ;
- `Information` conserve l’étiquette DuploJS (`"success"`, `"fail"`, `"negative-operand"`…) ;
- `Value` contient la valeur associée, quel que soit son type.

Les constructeurs sont traduits ainsi :

| TypeScript | Go |
| --- | --- |
| `DEither.success(x)` | `Either{IsRight: true, Information: "success", Value: x}` |
| `DEither.fail()` | `Either{IsRight: false, Information: "fail"}` |
| `DEither.left("info", x)` | `Either{IsRight: false, Information: "info", Value: x}` |

Comme au projet 00, l’argument est d’abord évalué dans une variable temporaire avant la construction, pour conserver l’ordre d’évaluation.

#### Représentations comparées

| Représentation | Avantages | Inconvénients |
| --- | --- | --- |
| Struct `Either[R, L]` avec un champ `Right` et un champ `Left` | Typée, sans allocation | **Écartée** : ne représente que deux variantes. Dès le projet 06/07, une union contient plusieurs échecs différents (`success`, `negative-operand`, `division-by-zero`) |
| Interface + une struct par variante | Typée, nombre de variantes illimité | Allocation à chaque Either, type switch pour lire la variante |
| Struct générée par union (un champ par variante) | La plus rapide, sans allocation | Une struct à générer pour chaque union différente, complexité du transpileur |
| **Struct unique avec `Value any` (retenue)** | Simple, gère n’importe quel nombre de variantes, `success()` n’a pas besoin de connaître l’union complète | Perte du type statique de la valeur (`Value.(float64)` pour la relire), allocation |

La première approche (Right/Left) a été implémentée puis abandonnée après échange avec l’encadrant, car elle ne passe pas à l’échelle des exercices suivants. La représentation avec `any` a été retenue sur sa suggestion.

#### Coût mesuré

Un micro-benchmark Go (`go test -bench . -benchmem`) compare la création puis la lecture d’un Either à deux variantes :

| Représentation | Temps par opération | Mémoire | Allocations |
| --- | --- | --- | --- |
| Struct générée par union | ~2,3 ns | 0 B | 0 |
| Interface + struct par variante | ~15 ns | 8 B | 1 |
| Struct unique avec `any` | ~19 ns | 8 B | 1 |

Ces chiffres sont des ordres de grandeur sur une seule machine. Ils montrent que le coût vient surtout de l’allocation provoquée par la mise d’une valeur dans `any` ou dans une interface. La struct générée par union serait l’optimisation suivante, au prix d’un transpileur plus complexe.

Un effet secondaire positif : `success()` construisant directement la struct, le Go généré pour le projet 00 compile désormais. Avant, il utilisait la fonction générique `EitherSuccessOf` sans paramètre de type (`cannot use generic function … without instantiation` avec Go 1.24).

### Tester un Either

```go
tested := result
if tested.IsRight {
	// ...
}
```

`DEither.isRight(x)` devient une simple lecture du champ `IsRight`. L’argument est stocké dans une variable temporaire avant la lecture, pour l’ordre d’évaluation.

### Traduire une instruction conditionnelle

```go
condition := /* préparation de la condition */
if condition {
	// bloc then
} else {
	// bloc else éventuel
}
```

La condition est traduite en premier. Ses instructions de préparation (`before`) sont émises **avant** le `if`, et sont donc exécutées une seule fois, avant de choisir la branche. Le bloc `then` et le `else` éventuel sont traduits avec le transformer de bloc existant.

Le `else if` est géré : ses instructions de préparation sont placées dans le `else`, pour ne s’exécuter que si la première condition est fausse, comme en TypeScript.

### Afficher une valeur

```go
func Print[T any](value T) T {
	fmt.Printf("%+v\n", value)
	return value
}
```

`DCommon.print(x)` affiche la valeur puis la renvoie : la fonction Go fait de même. Elle est générique et appelée directement (`Print(x)`), ce qui permet à Go de déduire `T` à partir de l’argument.

### Les parenthèses dans un type

Dans `add.ts`, l’union est écrite entre parenthèses : `( | Success<number> | Fail )`. Le nœud `ParenthesizedType` est traduit en traduisant simplement le type qu’il contient.

## Résultats

`pnpm build:01` produit un Go qui compile et s’exécute. Sortie obtenue :

```
{IsRight:true Information:success Value:3}
```

Go généré pour `index.ts` :

```go
var Sourced_result shard_dependencies.Either

func init() {
	Generated_1 := ….Sourced_add
	Generated_2 := (float64)(1)
	Generated_3 := (float64)(2)
	Sourced_result = Generated_1(Generated_2, Generated_3)
	Generated_4 := Sourced_result
	if Generated_4.IsRight {
		Generated_5 := Sourced_result
		shard_dependencies.Print(Generated_5)
	}
}
```

## Limites

- **Performance** : `Value any` provoque une allocation et fait perdre le type statique de la valeur (voir le benchmark).
- **Format d’affichage** : la valeur affichée est la même qu’en TypeScript, mais pas le format (`console.info` de Node contre `%+v` de Go).
- **Variables** : une seule variable par instruction (`const a = 1, b = 2;` est refusé), pas de déstructuration, une valeur initiale obligatoire. Les variables déclarées à l’intérieur d’une fonction ne sont pas encore gérées.
- **`if`** : le corps doit être un bloc entre accolades (`if (x) foo();` est refusé), car Go impose les accolades.
- **`DEither.left`** : l’information doit être une chaîne écrite en dur.
- **`isRight`, `success`, `fail`, `left`, `print`** : seul l’appel direct est géré. Ces fonctions ne peuvent pas encore être passées comme valeur (par exemple en argument d’une autre fonction).

## Fichiers modifiés

| Fichier | Rôle |
| --- | --- |
| `declaration/variable.ts` | Variable de module : `var` au package, assignation dans `init()` |
| `duplojs/either/any/sharedDependency.ts` | Struct Go `Either` partagée |
| `duplojs/either/any/type.ts` | Types Either et unions d’Either → `Either` |
| `duplojs/either/any/constructors.ts` | `success`, `fail`, `left`, `isRight` |
| `duplojs/either/index.ts` | Aiguillage des fonctions `DEither` |
| `statement/if.ts` | `if`, `else`, `else if` |
| `type/parenthesized.ts` | Types entre parenthèses |
| `duplojs/common/…` | `DCommon.print` → `Print` |