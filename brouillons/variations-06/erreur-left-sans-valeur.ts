// Refusé : DEither.left sans valeur. Le build s'arrête sur le type Left<"negative", undefined>
// (type `undefined` pas encore traduit : notfound-transformer), avant le contrôle des arguments.
import * as DEither from "@duplojs/lang/either";

export function check(value: number) {
	if (value < 0) {
		return DEither.left("negative");
	}
	return DEither.success(value);
}
