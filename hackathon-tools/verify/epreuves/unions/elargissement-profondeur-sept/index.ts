import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const deep = [[[[[[[1, 2]]]]]]];
const wide: (number | string)[][][][][][][] = deep;
const wrapped: DEither.Success<(number | string)[][][][][][][]> = DEither.success(deep);

function flatten(input: (number | string)[][][][][][][]) {
	return input[0]![0]![0]![0]![0]![0]!;
}

DCommon.print(DArray.map(flatten(wide), (item) => item === 1));
DCommon.print(DArray.map(flatten(DEither.unwrapRight(wrapped)), (item) => item === 2));
