import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function reject(value: number): (
	| DEither.Left<"odd", number>
	| DEither.Left<"even", string>
) {
	if (value % 2 === 1) {
		return DEither.left("odd", value);
	}
	return DEither.left("even", "even");
}

function alwaysFail(): DEither.Fail {
	return DEither.fail();
}

function check(value: number) {
	if (value > 10) {
		return reject(value);
	}
	if (value < 0) {
		return alwaysFail();
	}
	return DEither.success(value);
}

DCommon.print(reject(1));
DCommon.print(alwaysFail());
DCommon.print(check(11));
DCommon.print(check(12));
DCommon.print(check(-1));
DCommon.print(check(1));
