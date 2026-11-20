import * as DCommon from "@duplojs/lang/common";

function isAbsent(value: number | undefined) {
	if (value == null) {
		return 1;
	}
	return 2;
}

function same(first: number | string, second: number | string) {
	if (first == second) {
		return 3;
	}
	return 4;
}

DCommon.print(isAbsent(undefined));
DCommon.print(isAbsent(0));
DCommon.print(same(1, "1"));
DCommon.print(same(1, "2"));
