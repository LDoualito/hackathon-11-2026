import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const rights = [
	DEither.success(undefined),
	DEither.success(null),
	DEither.success(0),
	DEither.success(-0),
	DEither.success(NaN),
	DEither.success(""),
	DEither.success(false),
	DEither.success([]),
	DEither.right("no-value"),
	DEither.ok(),
	DEither.some(null),
];

DCommon.print(rights);
DCommon.print(DArray.map(rights, (right) => DEither.isRight(right)));
DCommon.print(DArray.map(rights, (right) => DEither.isLeft(right)));
