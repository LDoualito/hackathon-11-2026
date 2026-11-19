import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function check(value: number) {
	if (value === 0) {
		return DEither.fail();
	}
	if (value === 1) {
		return DEither.left("only-information");
	}
	if (value === 2) {
		return DEither.right("only-information");
	}
	return DEither.success(value);
}

const alone = DEither.fail();
const emptyList = DArray.map([], (value: number) => value + 1);

DCommon.print(alone);
DCommon.print(emptyList);
DCommon.print(DArray.map([0, 1, 2, 3], check));
