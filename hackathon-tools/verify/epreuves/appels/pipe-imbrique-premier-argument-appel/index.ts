import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

function add(one: number, two: number) {
	if (one < 0) {
		return DEither.fail();
	}
	return DEither.success(one + two);
}

const output = DCommon.pipe(
	DCommon.pipe(
		add(1, 2),
		DEither.whenIsRight(DArray.coalescing),
	),
	DEither.whenIsRightOtherwise(
		(values) => DCommon.pipe(
			values,
			DArray.map(DString.to),
		),
		() => ["échec"],
	),
);

DCommon.print(output);
DCommon.print(DCommon.pipe(add(-1, 2), DEither.isRight));
