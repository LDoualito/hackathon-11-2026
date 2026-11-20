import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function check(value: number) {
	if (value === 0) {
		return DEither.left("zero", value);
	}
	if (value === 1) {
		return DEither.left("one", "one");
	}
	if (value === 2) {
		return DEither.left("two", [value]);
	}
	if (value === 3) {
		return DEither.left("three");
	}
	return DEither.success(value);
}

function leftValue(value: number) {
	const result = check(value);
	if (DEither.isLeft(result)) {
		return DEither.unwrapLeft(result);
	}
	return DEither.unwrapRight(result) * 2;
}

DCommon.print(DArray.map([0, 1, 2, 3, 4], (value) => leftValue(value)));
