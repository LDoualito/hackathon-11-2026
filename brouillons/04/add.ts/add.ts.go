// BROUILLON écrit à la main : Go attendu pour projects/04/add.ts
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b04001badd001ats

import "duplojs.local/transpiled/shard_dependencies"

// Pas de type de retour écrit en TS : le checker le déduit des deux return,
// Fail | Success<number>. Même type Go que dans l'exercice 01.
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[shard_dependencies.JSUndefined, float64]) {
	// if (one === -1)
	// === devient == (déjà géré par binary.ts).
	// -1 : le moins est appliqué à une VARIABLE, jamais écrit « (float64)(-1) ».
	// Raison : en Go, une constante n'a pas de zéro négatif, « -0 » vaudrait +0.
	Generated_7 := Sourced_one
	Generated_9 := (float64)(1)
	Generated_8 := -Generated_9
	if Generated_7 == Generated_8 {
		// return DEither.fail();
		Generated_10 := shard_dependencies.EitherFailOf[shard_dependencies.JSUndefined, float64]
		return Generated_10()
	}
	// return DEither.success(one + two);   (inchangé depuis l'exercice 01)
	Generated_11 := shard_dependencies.EitherSuccessOf[shard_dependencies.JSUndefined, float64]
	Generated_12 := Sourced_one
	Generated_13 := Sourced_two
	Generated_14 := Generated_12 + Generated_13
	return Generated_11(Generated_14)
}
