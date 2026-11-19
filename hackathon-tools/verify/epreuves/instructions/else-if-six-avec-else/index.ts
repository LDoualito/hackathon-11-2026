import * as DCommon from "@duplojs/lang/common";

function next(value: number) {
	return value + 1;
}

function rank(value: number) {
	if (next(value) === 1) {
		return "a";
	} else if (next(value) === 2) {
		return "b";
	} else if (next(value) === 3) {
		return "c";
	} else if (next(value) === 4) {
		return "d";
	} else if (next(value) === 5) {
		return "e";
	} else if (next(value) === 6) {
		return "f";
	} else {
		return "rest";
	}
}

DCommon.print(rank(0));
DCommon.print(rank(1));
DCommon.print(rank(2));
DCommon.print(rank(3));
DCommon.print(rank(4));
DCommon.print(rank(5));
DCommon.print(rank(6));
