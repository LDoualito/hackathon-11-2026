import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function check(value: number): (
	| DEither.Left<"a-number", number>
	| DEither.Left<"b-text", string>
	| DEither.Left<"c-flag", boolean>
	| DEither.Left<"d-list", readonly number[]>
	| DEither.Left<"e-record", { value: number }>
	| DEither.Left<"f-empty">
	| DEither.Success<number>
) {
	if (value === 0) {
		return DEither.left("a-number", value);
	}
	if (value === 1) {
		return DEither.left("b-text", "one");
	}
	if (value === 2) {
		return DEither.left("c-flag", true);
	}
	if (value === 3) {
		return DEither.left("d-list", [value, value]);
	}
	if (value === 4) {
		return DEither.left("e-record", { value });
	}
	if (value === 5) {
		return DEither.left("f-empty");
	}
	return DEither.success(value);
}

const results = DArray.map([0, 1, 2, 3, 4, 5, 6], (value) => check(value));

DCommon.print(results);

const sides = DArray.map(
	results,
	(result) => {
		if (DEither.isLeft(result)) {
			return "left";
		}
		return "right";
	},
);

DCommon.print(sides);
