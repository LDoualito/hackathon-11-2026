import { isOdd } from "./odd";

export function isEven(value: number): boolean {
	if (value === 0) {
		return true;
	}
	return isOdd(value - 1);
}
