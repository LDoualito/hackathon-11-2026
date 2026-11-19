import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function size(value: number): (
	| DEither.Right<"small", number>
	| DEither.Right<"big", number>
	| DEither.Fail
) {
	if (value < 0) {
		return DEither.fail();
	}
	if (value < 10) {
		return DEither.right("small", value);
	}
	return DEither.right("big", value);
}

const small = size(1);
const big = size(20);
const failed = size(-1);

if (DEither.isRight(small)) {
	DCommon.print(small);
}

if (DEither.isRight(big)) {
	DCommon.print(big);
}

if (DEither.isRight(failed)) {
	DCommon.print(failed);
}
