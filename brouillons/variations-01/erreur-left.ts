import * as DEither from "@duplojs/lang/either";
export function check(value: number): DEither.Left<"negative", number> | DEither.Success<number> {
	return DEither.success(value);
}
