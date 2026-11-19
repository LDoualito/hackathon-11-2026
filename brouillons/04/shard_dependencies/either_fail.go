// BROUILLON écrit à la main : futur runtime de DEither.fail()
// (deviendra src/transpiler/transformers/duplojs/either/fail/fail.go).
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
