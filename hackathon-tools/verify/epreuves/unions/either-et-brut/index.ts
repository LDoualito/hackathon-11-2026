import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";
import * as DArray from "@duplojs/lang/array";

function add(one: number, two: number) {
	if (one === -1) {
		return DEither.fail();
	}
	return DEither.success(one + two);
}

const inputs = [1, -1];

const listsOrFails = DArray.map(
	inputs,
	(one) => DEither.whenIsRight(add(one, 2), DArray.coalescing),
);

DCommon.print(listsOrFails);

const textsOrFails = DArray.map(
	inputs,
	(one) => DEither.whenIsRight(add(one, 2), DString.to),
);

DCommon.print(textsOrFails);

const lengths = DArray.map(
	listsOrFails,
	(value) => DEither.isLeft(value) ? -1 : value.length,
);

DCommon.print(lengths);
