import * as DCommon from "@duplojs/lang/common";

function compute(one: number, two: number) {
	const unused = one * two;
	const sum = one + two;
	return sum;
}

DCommon.print(compute(1, 2));
