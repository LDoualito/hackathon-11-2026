import * as DCommon from "@duplojs/lang/common";

DCommon.print(factorial(5));

function factorial(value: number): number {
	if (value <= 1) {
		return 1;
	}
	return value * factorial(value - 1);
}

const square = (value: number) => value * value;

function applyTwice(operation: (value: number) => number, value: number) {
	return operation(operation(value));
}

DCommon.print(square(3));
DCommon.print(applyTwice(square, 2));
DCommon.print(applyTwice((value) => value + 1, 2));
DCommon.print(((value: number) => value - 1)(10));
