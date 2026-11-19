import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function add(one: number, two: number): DEither.Success<number> | DEither.Fail {
	return DEither.success(one + two);
}

const first = add(1, 2);
const second = add(1, 2);
const alias = first;

function locate(candidate: DEither.Success<number> | DEither.Fail) {
	switch (candidate) {
		case second:
			return 1;
		case alias:
			return 2;
		default:
			return 3;
	}
}

DCommon.print(locate(first));
DCommon.print(locate(second));
DCommon.print(locate(add(1, 2)));
