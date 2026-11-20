import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const numbers = [1, 2];
const wrapped = DEither.success(numbers);

function count(lists: (number | string)[][], extra?: (number | string)[][]) {
	return DArray.map(extra ?? lists, (list) => DArray.map(list, (item) => item === 1));
}

function unwrapAll(eithers: DEither.Success<(number | string)[]>[], extra?: DEither.Success<(number | string)[]>[]) {
	return DArray.map(
		extra ?? eithers,
		(either) => DArray.map(DEither.unwrapRight(either), (item) => item === 1),
	);
}

DCommon.print(count([], [numbers]));
DCommon.print(unwrapAll([], [wrapped]));
