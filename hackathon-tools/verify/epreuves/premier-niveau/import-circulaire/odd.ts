import { isEven } from "./even";

export function isOdd(value: number): boolean {
	if (value === 0) {
		return false;
	}
	return isEven(value - 1);
}
