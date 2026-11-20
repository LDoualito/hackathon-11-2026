import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function inner(value: number) {
	return value < 0 ? DEither.left("inner-negative", value) : DEither.success(value);
}

function outer(value: number) {
	return value === 0 ? DEither.left("outer-zero", inner(-1)) : DEither.success(inner(value));
}

const rightOfRight = outer(1);
const rightOfLeft = outer(-2);
const leftOfLeft = outer(0);

DCommon.print(rightOfRight);
DCommon.print(rightOfLeft);
DCommon.print(leftOfLeft);
DCommon.print(DEither.left("outer", DEither.success(1)));

if (DEither.isRight(rightOfLeft)) {
	const unwrapped = DEither.unwrapRight(rightOfLeft);
	DCommon.print(DEither.isLeft(unwrapped));
}

if (DEither.isLeft(leftOfLeft)) {
	const unwrapped = DEither.unwrapLeft(leftOfLeft);
	DCommon.print(DEither.isLeft(unwrapped));
}
