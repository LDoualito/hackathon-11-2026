import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import { wrapped, half } from "./other";

type Mixed = (number | string)[];

function describe(input: DEither.Success<Mixed>) {
	return DArray.map(DEither.unwrapRight(input), (item) => item === 1);
}

function apply(theFunction: (value: number) => DEither.Success<Mixed>, value: number) {
	return describe(theFunction(value));
}

const wide: DEither.Success<Mixed> = wrapped;

DCommon.print(describe(wide));
DCommon.print(apply(half, 2));
