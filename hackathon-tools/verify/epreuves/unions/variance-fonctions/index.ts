import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function half(value: number): number {
	return value / 2;
}

function rank(value: number | string): number {
	return value === 1 ? 10 : 20;
}

function failing(): DEither.Fail {
	return DEither.fail();
}

function listOf(value: number): number[] {
	return [value];
}

function applyOptional(
	theFunction: (value: number) => number | undefined,
	value: number,
) {
	return theFunction(value);
}

function applyNarrow(
	theFunction: (value: number) => number,
	value: number,
) {
	return theFunction(value);
}

function applyEither(
	theFunction: () => DEither.Success<number> | DEither.Fail,
) {
	return theFunction();
}

function applyList(
	theFunction: (value: number) => (number | string)[],
	value: number,
) {
	return theFunction(value);
}

const stored: (value: number) => number | undefined = half;

DCommon.print(applyOptional(half, 4));
DCommon.print(applyNarrow(rank, 1));
DCommon.print(applyEither(failing));
DCommon.print(applyList(listOf, 3));
DCommon.print(stored(6));
