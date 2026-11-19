import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function divide(dividend: number, divisor: number) {
	return divisor === 0 ? DEither.left("division-by-zero", dividend) : DEither.success(dividend / divisor);
}

function negated(dividend: number, divisor: number) {
	const result = divide(dividend, divisor);
	if (!DEither.isRight(result)) {
		return DEither.unwrapLeft(result) * 10;
	}
	return DEither.unwrapRight(result);
}

function withElse(dividend: number, divisor: number) {
	const result = divide(dividend, divisor);
	if (DEither.isRight(result)) {
		return DEither.unwrapRight(result);
	} else {
		return DEither.unwrapLeft(result) * 100;
	}
}

function aliased(dividend: number, divisor: number) {
	const result = divide(dividend, divisor);
	const isFailure = DEither.isLeft(result);
	if (isFailure) {
		return DEither.unwrapLeft(result) * 1000;
	}
	return DEither.unwrapRight(result);
}

DCommon.print(DArray.map([0, 2], (divisor) => negated(8, divisor)));
DCommon.print(DArray.map([0, 2], (divisor) => withElse(8, divisor)));
DCommon.print(DArray.map([0, 2], (divisor) => aliased(8, divisor)));
