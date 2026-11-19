import * as DCommon from "@duplojs/lang/common";

function add(one: number, two = 10, three?: number) {
	if (three === undefined) {
		return one + two;
	}
	return one + two + three;
}

function sum(...values: number[]) {
	let total = 0;
	for (const value of values) {
		total += value;
	}
	return total;
}

DCommon.print(add(1));
DCommon.print(add(1, 2));
DCommon.print(add(1, undefined, 3));
DCommon.print(add(1, 2, 3));
DCommon.print(sum());
DCommon.print(sum(1, 2, 3, 4, 5, 6));
