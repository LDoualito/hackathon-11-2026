import * as DEither from "@duplojs/lang/either";

export const numbers = [1, 2];
export const wrapped = DEither.success(numbers);

export function half(value: number): DEither.Success<number[]> {
	return DEither.success([value / 2, 1]);
}
