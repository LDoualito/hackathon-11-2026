// Code Go écrit à la main (runtime), copié tel quel dans shard_dependencies
// par le transpileur. Voir sharedDependency.ts à côté de ce fichier.
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
