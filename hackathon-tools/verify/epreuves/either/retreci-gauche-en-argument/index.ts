import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function add(one: number, two: number): (
	| DEither.Success<number>
	| DEither.Fail
	| DEither.Left<"negative", number>
) {
	if (one === 0) {
		return DEither.fail();
	}
	if (one < 0) {
		return DEither.left("negative", one);
	}
	return DEither.success(one + two);
}

function reportLeft(failure: DEither.Fail | DEither.Left<"negative", number>) {
	DCommon.print(failure);
}

function reportRight(success: DEither.Success<number>) {
	DCommon.print(success);
}

function report(result: DEither.Success<number> | DEither.Fail | DEither.Left<"negative", number>) {
	if (DEither.isLeft(result)) {
		reportLeft(result);
		return;
	}
	reportRight(result);
}

report(add(0, 1));
report(add(-1, 1));
report(add(1, 1));
