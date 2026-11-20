import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const lefts = [
	DEither.left("undefined", undefined),
	DEither.left("null", null),
	DEither.left("zero", 0),
	DEither.left("negative-zero", -0),
	DEither.left("nan", NaN),
	DEither.left("empty-text", ""),
	DEither.left("false", false),
	DEither.left("empty-list", []),
	DEither.left("no-value"),
	DEither.fail(),
	DEither.none(),
];

DCommon.print(lefts);
DCommon.print(DArray.map(lefts, (left) => DEither.isLeft(left)));
DCommon.print(DArray.map(lefts, (left) => DEither.isRight(left)));
