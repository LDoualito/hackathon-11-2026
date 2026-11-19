// Refusé : deux variantes Left dont les valeurs ont des types Go différents
// (Fail -> JSUndefined, Left<"negative", number> -> float64) : un seul L ne suffit pas.
import * as DEither from "@duplojs/lang/either";
export function check(value: number): DEither.Fail | DEither.Left<"negative", number> | DEither.Success<number> {
	return DEither.success(value);
}
