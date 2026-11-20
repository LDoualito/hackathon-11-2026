import * as DCommon from "@duplojs/lang/common";

function compute(one: number, two: number) {
	const sum = one + two;
	const doubled = sum * 2;
	return doubled;
}

DCommon.print(compute(1, 2));
