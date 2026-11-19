// BROUILLON écrit à la main : futur runtime de DEither.left(information, value)
// (deviendra src/transpiler/transformers/duplojs/either/left/left.go).
package shard_dependencies

// EitherLeftOf correspond à DEither.left(information, value).
//
// Même modèle que EitherSuccessOf et EitherFailOf : [L, R] écrits par le
// transpileur à partir du type TS attendu.
//
// Kind reste "" : left() n'ajoute pas de 4e clé à l'affichage, contrairement
// à fail() (« fail: null ») ou success() (« success: null »).
func EitherLeftOf[L any, R any](information string, value L) Either[L, R] {
	return Either[L, R]{
		IsRight:     false,
		Information: information,
		Left:        value,
	}
}
