// Code Go écrit à la main (runtime), copié tel quel dans shard_dependencies
// par le transpileur. Voir sharedDependency.ts à côté de ce fichier.
package shard_dependencies

// EitherFailOf correspond à DEither.fail().
//
// Même modèle que EitherSuccessOf : aucun argument, donc Go ne peut deviner ni
// L ni R. Le transpileur les écrit toujours, à partir du type TS attendu :
// EitherFailOf[JSUndefined, float64].
//
// Left n'est pas rempli : il garde sa « valeur zéro ». Pour L = JSUndefined,
// c'est JSUndefined{}, que Print affiche « undefined », comme en TS.
func EitherFailOf[L any, R any]() Either[L, R] {
	return Either[L, R]{
		IsRight:     false,
		Information: "fail",
		Kind:        "fail",
	}
}
