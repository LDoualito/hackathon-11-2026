// Code Go écrit à la main (runtime), copié tel quel dans shard_dependencies
// par le transpileur. Voir sharedDependency.ts à côté de ce fichier.
package shard_dependencies

// EitherSuccessOf correspond à DEither.success(value).
//
// L (le type du côté Left) n'apparaît pas dans les arguments : Go ne peut pas
// le deviner. Le transpileur l'écrit donc toujours explicitement, à partir du
// type TypeScript attendu, par exemple EitherSuccessOf[JSUndefined, float64].
func EitherSuccessOf[L any, R any](value R) Either[L, R] {
	return Either[L, R]{
		IsRight:     true,
		Information: "success",
		Kind:        "success",
		Right:       value,
	}
}
