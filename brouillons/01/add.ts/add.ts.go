// BROUILLON écrit à la main : Go attendu pour projects/01/add.ts
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b01001badd001ats

import "duplojs.local/transpiled/shard_dependencies"

// Type de retour TS : DEither.Success<number> | DEither.Fail
//   -> Either[L, R] avec L = valeur de Fail (undefined) et R = valeur de Success (number).
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[shard_dependencies.JSUndefined, float64]) {
	// Instanciation explicite : sans elle, Go refuse de stocker la fonction générique
	// dans une variable (erreur actuelle du projet 00).
	Generated_6 := shard_dependencies.EitherSuccessOf[shard_dependencies.JSUndefined, float64]
	Generated_7 := Sourced_one
	Generated_8 := Sourced_two
	Generated_9 := Generated_7 + Generated_8
	return Generated_6(Generated_9)
}
