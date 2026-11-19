import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function positive(value: number) {
	return value < 0 ? DEither.fail() : DEither.success(value);
}

function named(value: number) {
	return value === 0
		? DEither.left("zero")
		: value < 0
			? DEither.left("negative", value)
			: DEither.right("positive", value);
}

DCommon.print(positive(1));
DCommon.print(positive(-1));
DCommon.print(DArray.map([0, -2, 3], (value) => named(value)));
DCommon.print(DArray.map([1, -1], (value) => value < 0 ? DEither.error("negative") : DEither.ok()));
