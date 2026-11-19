// Code Go écrit à la main (runtime), copié tel quel dans shard_dependencies
// par le transpileur. Voir sharedDependency.ts à côté de ce fichier.
package shard_dependencies

// Coalescing correspond à DArray.coalescing(value) quand value n'est PAS un tableau :
// la valeur est enveloppée dans un tableau d'un élément (3 -> [3]).
//
// Générique : le type des éléments est celui de la valeur (float64 -> []float64),
// donc pas de any. Le cas « value est déjà un tableau » (renvoyé tel quel en TS)
// est refusé par le transformer : limite documentée.
func Coalescing[T any](value T) []T {
	return []T{value}
}
