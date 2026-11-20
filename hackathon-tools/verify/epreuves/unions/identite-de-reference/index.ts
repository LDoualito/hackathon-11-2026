import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function add(
	one: number,
	two: number,
): (
	| DEither.Success<number>
	| DEither.Fail
) {
	return DEither.success(one + two);
}

const first = add(1, 2);
const second = add(1, 2);
const alias = first;

if (first === second) {
	DCommon.print(1);
}

if (first === alias) {
	DCommon.print(2);
}

if (first !== second) {
	DCommon.print(3);
}
