import * as DCommon from "@duplojs/lang/common";

function half(value: number): number {
	return value / 2;
}

function apply(
	theFunction: (value: number) => number | undefined,
	value: number,
) {
	return theFunction(value);
}

DCommon.print(apply(half, 4));
